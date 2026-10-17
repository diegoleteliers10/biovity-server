import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import type { AuthenticatedUser } from './better-auth-session.service';
import { isAdminUser } from './better-auth-session.service';

export type OrganizationPermission = 'read' | 'recruit' | 'manage';

type OrganizationMemberRole = 'admin' | 'recruiter' | 'viewer';
type MembershipRow = { role: OrganizationMemberRole | null };

const ROLE_PERMISSIONS: Record<
  OrganizationMemberRole,
  readonly OrganizationPermission[]
> = {
  admin: ['read', 'recruit', 'manage'],
  recruiter: ['read', 'recruit'],
  viewer: ['read'],
};

@Injectable()
export class OrganizationAccessService {
  constructor(private readonly dataSource: DataSource) {}

  async getOrganizationOwner(
    organizationId: string,
  ): Promise<{ id: string; name: string; email: string } | null> {
    const rows = await this.dataSource.query<
      Array<{ id: string; name: string; email: string }>
    >(
      `SELECT id, name, email FROM "user" WHERE "organizationId" = $1::uuid LIMIT 1`,
      [organizationId],
    );
    return rows[0] ?? null;
  }

  async assertAccess(
    organizationId: string,
    requester: AuthenticatedUser | undefined,
    permission: OrganizationPermission,
  ): Promise<void> {
    if (!(await this.hasAccess(organizationId, requester, permission))) {
      throw new ForbiddenException('No tienes permisos para esta acción.');
    }
    if (
      permission === 'recruit' &&
      requester?.type !== 'admin' &&
      !(requester && isAdminUser(requester))
    ) {
      await this.assertRecruitingEnabled(organizationId);
    }
  }

  async assertRecruitingEnabled(organizationId: string): Promise<void> {
    const rows = await this.dataSource.query<
      Array<{ verificationStatus: string }>
    >(
      `SELECT verification_status AS "verificationStatus"
       FROM organization WHERE id = $1::uuid LIMIT 1`,
      [organizationId],
    );
    const status = rows[0]?.verificationStatus;
    if (status === 'verified') return;
    throw new BadRequestException({
      code: 'ORGANIZATION_VERIFICATION_REQUIRED',
      message: 'Verify the company before you publish jobs or manage hiring.',
      status: status ?? 'unverified',
    });
  }

  async isOrganizationVerified(organizationId: string): Promise<boolean> {
    const rows = await this.dataSource.query<Array<{ verified: boolean }>>(
      `SELECT verification_status = 'verified' AS verified
       FROM organization WHERE id = $1::uuid LIMIT 1`,
      [organizationId],
    );
    return rows[0]?.verified === true;
  }

  async hasAccess(
    organizationId: string,
    requester: AuthenticatedUser | undefined,
    permission: OrganizationPermission,
  ): Promise<boolean> {
    if (requester?.type === 'admin' || (requester && isAdminUser(requester)))
      return true;
    if (!requester) {
      return false;
    }
    if (requester.type !== 'organization') {
      return false;
    }

    const memberships = await this.dataSource.query<MembershipRow[]>(
      `SELECT CASE
                WHEN owner."organizationId" = $1::uuid THEN 'admin'
                ELSE membership.role
              END AS role
       FROM "user" AS owner
       LEFT JOIN organization_member AS membership
         ON membership.organization_id = $1::uuid
        AND membership.user_id = owner.id
       WHERE owner.id = $2::uuid
         AND (owner."organizationId" = $1::uuid OR membership.id IS NOT NULL)
       LIMIT 1`,
      [organizationId, requester.id],
    );
    const role = memberships[0]?.role;
    return Boolean(role && ROLE_PERMISSIONS[role]?.includes(permission));
  }

  async assertOrganizationOwner(
    organizationId: string,
    requester: AuthenticatedUser | undefined,
  ): Promise<void> {
    if (!requester || requester.type !== 'organization') {
      throw new ForbiddenException(
        'Solo el propietario puede transferir la organización.',
      );
    }
    const rows = await this.dataSource.query<Array<{ id: string }>>(
      `SELECT id FROM "user" WHERE id = $1::uuid AND "organizationId" = $2::uuid LIMIT 1`,
      [requester.id, organizationId],
    );
    if (!rows[0]) {
      throw new ForbiddenException(
        'Solo el propietario puede transferir la organización.',
      );
    }
  }

  async assertChatCreation(
    recruiterId: string,
    professionalId: string,
    organizationId: string,
    requester: AuthenticatedUser | undefined,
  ): Promise<void> {
    if (!requester) {
      throw new ForbiddenException('Se requiere autorización de usuario.');
    }
    const rows = await this.dataSource.query<
      Array<{ recruiterType: string; professionalType: string }>
    >(
      `SELECT recruiter.type AS "recruiterType", professional.type AS "professionalType"
       FROM "user" AS recruiter
       CROSS JOIN "user" AS professional
       WHERE recruiter.id = $1::uuid AND professional.id = $2::uuid
       LIMIT 1`,
      [recruiterId, professionalId],
    );
    const participants = rows[0];
    if (
      !participants ||
      participants.recruiterType !== 'organization' ||
      participants.professionalType !== 'professional'
    ) {
      throw new ForbiddenException(
        'El chat requiere una organización y un profesional.',
      );
    }
    if (isAdminUser(requester) || requester.type === 'admin') return;
    if (requester.id === recruiterId && requester.type === 'organization') {
      await this.assertAccess(organizationId, requester, 'recruit');
      return;
    }
    if (requester.id === professionalId && requester.type === 'professional') {
      throw new ForbiddenException(
        'El profesional no puede iniciar este chat.',
      );
    }
    throw new ForbiddenException('Solo el reclutador puede iniciar este chat.');
  }

  async assertChatOrganizationSend(
    chatId: string,
    requester: AuthenticatedUser | undefined,
  ): Promise<void> {
    if (!requester) {
      throw new ForbiddenException('Se requiere autorización de usuario.');
    }
    const rows = await this.dataSource.query<
      Array<{ organizationId: string | null }>
    >(`SELECT "organizationId" FROM chat WHERE id = $1::uuid LIMIT 1`, [
      chatId,
    ]);
    const organizationId = rows[0]?.organizationId;
    if (!organizationId) {
      throw new ForbiddenException(
        'Este chat no tiene una organización confirmada.',
      );
    }
    await this.assertAccess(organizationId, requester, 'recruit');
  }

  async hasCandidateRelationship(
    organizationId: string,
    candidateId: string,
  ): Promise<boolean> {
    const rows = await this.dataSource.query<Array<{ related: boolean }>>(
      `SELECT (
         EXISTS (
           SELECT 1 FROM saved_candidate
           WHERE organization_id = $1::uuid AND candidate_id = $2::uuid
         ) OR EXISTS (
           SELECT 1 FROM application
           JOIN job ON job.id = application."jobId"
           WHERE job."organizationId" = $1::uuid
             AND application."candidateId" = $2::uuid
         ) OR EXISTS (
           SELECT 1 FROM chat
           WHERE chat."professionalId" = $2::uuid
             AND chat."recruiterId" IN (
               SELECT user_id FROM organization_member WHERE organization_id = $1::uuid
               UNION
               SELECT id FROM "user" WHERE "organizationId" = $1::uuid
             )
         )
       ) AS related`,
      [organizationId, candidateId],
    );
    return rows[0]?.related === true;
  }

  async assertOrganizationMemberUser(userId: string): Promise<void> {
    const rows = await this.dataSource.query<Array<{ type: string }>>(
      `SELECT type FROM "user" WHERE id = $1::uuid LIMIT 1`,
      [userId],
    );
    if (!rows[0] || rows[0].type !== 'organization') {
      throw new ForbiddenException(
        'Los miembros deben tener una cuenta de organización.',
      );
    }
  }

  async assertJobAccess(
    jobId: string,
    requester: AuthenticatedUser | undefined,
    permission: OrganizationPermission,
  ): Promise<void> {
    const rows = await this.dataSource.query<Array<{ organizationId: string }>>(
      `SELECT "organizationId" FROM job WHERE id = $1::uuid LIMIT 1`,
      [jobId],
    );
    const organizationId = rows[0]?.organizationId;
    if (!organizationId) {
      throw new ForbiddenException('No tienes acceso a este recurso.');
    }
    await this.assertAccess(organizationId, requester, permission);
  }

  async assertJobOrganizationAccess(
    jobId: string,
    organizationId: string,
    requester: AuthenticatedUser | undefined,
    permission: OrganizationPermission,
  ): Promise<void> {
    const rows = await this.dataSource.query<Array<{ id: string }>>(
      `SELECT id FROM job WHERE id = $1::uuid AND "organizationId" = $2::uuid LIMIT 1`,
      [jobId, organizationId],
    );
    if (!rows[0])
      throw new ForbiddenException(
        'La oferta no pertenece a esta organización.',
      );
    await this.assertAccess(organizationId, requester, permission);
  }

  async assertApplicationAccess(
    applicationId: string,
    requester: AuthenticatedUser | undefined,
    permission: OrganizationPermission,
  ): Promise<void> {
    const rows = await this.dataSource.query<Array<{ organizationId: string }>>(
      `SELECT job."organizationId"
       FROM application
       JOIN job ON job.id = application."jobId"
       WHERE application.id = $1::uuid
       LIMIT 1`,
      [applicationId],
    );
    const organizationId = rows[0]?.organizationId;
    if (!organizationId) {
      throw new ForbiddenException('No tienes acceso a este recurso.');
    }
    await this.assertAccess(organizationId, requester, permission);
  }

  async assertApplicationOrganizationAccess(
    applicationId: string,
    organizationId: string,
    requester: AuthenticatedUser | undefined,
    permission: OrganizationPermission,
  ): Promise<void> {
    const rows = await this.dataSource.query<Array<{ id: string }>>(
      `SELECT application.id
       FROM application
       JOIN job ON job.id = application."jobId"
       WHERE application.id = $1::uuid
         AND job."organizationId" = $2::uuid
       LIMIT 1`,
      [applicationId, organizationId],
    );
    if (!rows[0]) {
      throw new ForbiddenException(
        'La postulación no pertenece a esta organización.',
      );
    }
    await this.assertAccess(organizationId, requester, permission);
  }

  async assertCompletedInterviewAccess(
    eventId: string,
    requester: AuthenticatedUser | undefined,
    requireInterviewer: boolean,
    permission: OrganizationPermission = 'recruit',
  ): Promise<{
    organizationId: string;
    isInterviewer: boolean;
    interviewerRoleId: string | null;
    interviewerRoleLabel: string | null;
    canViewHiringRecords: boolean;
  }> {
    if (!requester) {
      throw new ForbiddenException('Se requiere autorización de usuario.');
    }
    const rows = await this.dataSource.query<
      Array<{
        type: string;
        status: string;
        organizationId: string | null;
        applicationOrganizationId: string | null;
        isInterviewer: boolean;
        interviewerRoleId: string | null;
        interviewerRoleLabel: string | null;
      }>
    >(
      `SELECT event.type,
              event.status,
              event."organizationId",
              job."organizationId" AS "applicationOrganizationId",
              EXISTS (
                SELECT 1 FROM event_interviewer interviewer
                WHERE interviewer.event_id = event.id
                  AND interviewer.user_id = $2::uuid
              ) AS "isInterviewer",
              interviewer.role_id AS "interviewerRoleId",
              interviewer.role_label_snapshot AS "interviewerRoleLabel"
       FROM event
       LEFT JOIN application ON application.id = event."applicationId"
       LEFT JOIN job ON job.id = application."jobId"
       LEFT JOIN event_interviewer interviewer
         ON interviewer.event_id = event.id
        AND interviewer.user_id = $2::uuid
       WHERE event.id = $1::uuid
       LIMIT 1`,
      [eventId, requester.id],
    );
    const event = rows[0];
    if (
      !event ||
      event.type !== 'interview' ||
      event.status !== 'completed' ||
      !event.organizationId ||
      event.organizationId !== event.applicationOrganizationId
    ) {
      throw new BadRequestException(
        'La entrevista debe estar completada y vinculada a una postulación de la misma empresa.',
      );
    }
    await this.assertAccess(event.organizationId, requester, permission);
    if (requireInterviewer && !event.isInterviewer) {
      throw new ForbiddenException(
        'Solo un entrevistador asignado puede guardar su evaluación.',
      );
    }
    const canViewHiringRecords =
      permission === 'recruit' ||
      requester.type === 'admin' ||
      isAdminUser(requester) ||
      ((await this.hasAccess(event.organizationId, requester, 'recruit')) &&
        (await this.isOrganizationVerified(event.organizationId)));
    return {
      organizationId: event.organizationId,
      isInterviewer: event.isInterviewer,
      interviewerRoleId: event.interviewerRoleId,
      interviewerRoleLabel: event.interviewerRoleLabel,
      canViewHiringRecords,
    };
  }

  async assertChatParticipant(
    chatId: string,
    requester: AuthenticatedUser | undefined,
  ): Promise<{ participantId: string; role: 'recruiter' | 'professional' }> {
    if (!requester) {
      throw new ForbiddenException('Se requiere autorización de usuario.');
    }
    const rows = await this.dataSource.query<
      Array<{ recruiterId: string; professionalId: string }>
    >(
      `SELECT "recruiterId", "professionalId" FROM chat WHERE id = $1::uuid LIMIT 1`,
      [chatId],
    );
    const chat = rows[0];
    if (!chat) throw new ForbiddenException('No tienes acceso a este chat.');
    if (chat.recruiterId === requester.id) {
      return { participantId: requester.id, role: 'recruiter' };
    }
    if (chat.professionalId === requester.id) {
      return { participantId: requester.id, role: 'professional' };
    }
    throw new ForbiddenException('No tienes acceso a este chat.');
  }

  async assertChatExists(chatId: string): Promise<void> {
    const rows = await this.dataSource.query<Array<{ id: string }>>(
      `SELECT id FROM chat WHERE id = $1::uuid LIMIT 1`,
      [chatId],
    );
    if (!rows[0]) throw new ForbiddenException('No tienes acceso a este chat.');
  }

  async assertCandidateTagAccess(
    tagId: string,
    requester: AuthenticatedUser | undefined,
    permission: OrganizationPermission,
  ): Promise<string> {
    if (!requester) {
      throw new ForbiddenException('Se requiere autorización de usuario.');
    }
    const rows = await this.dataSource.query<Array<{ organizationId: string }>>(
      `SELECT organization_id AS "organizationId" FROM candidate_tag WHERE id = $1::uuid LIMIT 1`,
      [tagId],
    );
    const organizationId = rows[0]?.organizationId;
    if (!organizationId)
      throw new ForbiddenException('No tienes acceso a esta etiqueta.');
    await this.assertAccess(organizationId, requester, permission);
    return organizationId;
  }

  async assertSavedSearchAccess(
    savedSearchId: string,
    requester: AuthenticatedUser | undefined,
    permission: OrganizationPermission,
  ): Promise<void> {
    if (!requester) {
      throw new ForbiddenException('Se requiere autorización de usuario.');
    }
    const rows = await this.dataSource.query<Array<{ organizationId: string }>>(
      `SELECT organization_id AS "organizationId" FROM saved_search WHERE id = $1::uuid LIMIT 1`,
      [savedSearchId],
    );
    const organizationId = rows[0]?.organizationId;
    if (!organizationId)
      throw new ForbiddenException('No tienes acceso a esta búsqueda.');
    await this.assertAccess(organizationId, requester, permission);
  }

  async assertPipelineStageAccess(
    stageId: string,
    requester: AuthenticatedUser | undefined,
    permission: OrganizationPermission,
  ): Promise<void> {
    const rows = await this.dataSource.query<Array<{ jobId: string }>>(
      `SELECT job_id AS "jobId" FROM pipeline_stage WHERE id = $1::uuid LIMIT 1`,
      [stageId],
    );
    const jobId = rows[0]?.jobId;
    if (!jobId) throw new ForbiddenException('No tienes acceso a esta etapa.');
    await this.assertJobAccess(jobId, requester, permission);
  }

  async assertJobQuestionAccess(
    questionId: string,
    requester: AuthenticatedUser | undefined,
    permission: OrganizationPermission,
  ): Promise<void> {
    const rows = await this.dataSource.query<Array<{ jobId: string }>>(
      `SELECT job_id AS "jobId" FROM job_question WHERE id = $1::uuid LIMIT 1`,
      [questionId],
    );
    const jobId = rows[0]?.jobId;
    if (!jobId)
      throw new ForbiddenException('No tienes acceso a esta pregunta.');
    await this.assertJobAccess(jobId, requester, permission);
  }

  async assertResumeAccess(
    resumeId: string,
    requester: AuthenticatedUser | undefined,
    permission: OrganizationPermission,
  ): Promise<void> {
    const rows = await this.dataSource.query<
      Array<{ userId: string; type: string }>
    >(
      `SELECT resume."userId", "user".type FROM resume
       JOIN "user" ON "user".id = resume."userId"
       WHERE resume.id = $1::uuid LIMIT 1`,
      [resumeId],
    );
    const target = rows[0];
    if (!target)
      throw new ForbiddenException('No tienes acceso a este currículum.');
    if (!requester)
      throw new ForbiddenException('Se requiere autorización de usuario.');
    if (
      requester.id === target.userId ||
      requester.type === 'admin' ||
      isAdminUser(requester)
    )
      return;
    if (
      requester.type === 'organization' &&
      target.type === 'professional' &&
      permission === 'read' &&
      requester.organizationId
    ) {
      await this.assertAccess(requester.organizationId, requester, 'recruit');
      return;
    }
    throw new ForbiddenException('No tienes acceso a este currículum.');
  }

  async assertEventAccess(
    eventId: string,
    requester: AuthenticatedUser | undefined,
    permission: OrganizationPermission | 'rsvp',
  ): Promise<{
    organizerId: string;
    candidateId: string | null;
    organizationId: string | null;
  }> {
    if (!requester) {
      throw new ForbiddenException('Se requiere autorización de usuario.');
    }
    const rows = await this.dataSource.query<
      Array<{
        organizerId: string;
        candidateId: string | null;
        organizationId: string | null;
        eventType: string;
        isParticipant: boolean;
      }>
    >(
      `SELECT event."organizerId", event."candidateId", event."organizationId",
              event.type AS "eventType",
              EXISTS (
                SELECT 1 FROM event_participant participant
                WHERE participant.event_id = event.id AND participant.user_id = $2::uuid
              ) AS "isParticipant"
       FROM event WHERE event.id = $1::uuid LIMIT 1`,
      [eventId, requester.id],
    );
    const event = rows[0];
    if (!event) throw new ForbiddenException('No tienes acceso a este evento.');
    if (
      (requester.type === 'admin' || isAdminUser(requester)) &&
      permission !== 'rsvp'
    )
      return event;

    const ownsEvent = event.organizerId === requester.id;
    const isCandidate = event.candidateId === requester.id;
    const isInternalInterviewer =
      event.eventType === 'interview' &&
      event.isParticipant &&
      !ownsEvent &&
      !isCandidate;
    if (permission === 'rsvp') {
      if (event.isParticipant && !ownsEvent) {
        if (isInternalInterviewer) {
          if (!event.organizationId) {
            throw new ForbiddenException('No tienes acceso a esta entrevista.');
          }
          await this.assertAccess(event.organizationId, requester, 'recruit');
        }
        return event;
      }
      throw new ForbiddenException('No puedes responder por otra persona.');
    }
    if (permission === 'manage') {
      if (event.organizationId) {
        await this.assertAccess(event.organizationId, requester, 'recruit');
        return event;
      }
      if (ownsEvent) return event;
      throw new ForbiddenException(
        'No tienes permisos para cambiar este evento.',
      );
    }
    if (isInternalInterviewer) {
      if (!event.organizationId) {
        throw new ForbiddenException('No tienes acceso a esta entrevista.');
      }
      await this.assertAccess(event.organizationId, requester, 'recruit');
      return event;
    }
    if (ownsEvent || isCandidate || event.isParticipant) return event;
    if (event.organizationId) {
      await this.assertAccess(event.organizationId, requester, 'read');
      return event;
    }
    throw new ForbiddenException('No tienes acceso a este evento.');
  }

  async assertEventCreation(
    requester: AuthenticatedUser | undefined,
    input: {
      type?: string;
      organizerId: string;
      organizationId?: string;
      candidateId?: string;
      applicationId?: string;
      interviewerIds?: string[];
    },
  ): Promise<void> {
    if (!requester)
      throw new ForbiddenException('Se requiere una sesión de usuario.');
    const isAdmin = requester.type === 'admin' || isAdminUser(requester);
    if (!isAdmin) {
      if (
        requester.type !== 'organization' ||
        input.organizerId !== requester.id
      ) {
        throw new ForbiddenException(
          'Solo puedes crear eventos desde tu cuenta de organización.',
        );
      }
      if (!input.organizationId)
        throw new ForbiddenException('organizationId es requerido.');
      await this.assertAccess(input.organizationId, requester, 'recruit');
    }

    const interviewerIds = input.interviewerIds ?? [];
    if (interviewerIds.length > 0) {
      if (input.type !== 'interview') {
        throw new BadRequestException(
          'Solo las entrevistas pueden tener entrevistadores.',
        );
      }
      if (!input.organizationId) {
        throw new BadRequestException(
          'Se requiere una organización para asignar entrevistadores.',
        );
      }
      if (
        new Set(interviewerIds).size !== interviewerIds.length ||
        interviewerIds.includes(input.organizerId) ||
        (input.candidateId && interviewerIds.includes(input.candidateId))
      ) {
        throw new BadRequestException(
          'La lista de entrevistadores contiene personas repetidas o no válidas.',
        );
      }
      const eligible = await this.dataSource.query<Array<{ id: string }>>(
        `SELECT attendee.id
         FROM "user" attendee
         WHERE attendee.id = ANY($2::uuid[])
           AND attendee."isActive" = true
           AND (
             (attendee."organizationId" = $1::uuid AND attendee.type = 'organization')
             OR EXISTS (
               SELECT 1
               FROM organization_member member
               WHERE member.organization_id = $1::uuid
                 AND member.user_id = attendee.id
                 AND member.role IN ('admin', 'recruiter')
             )
           )`,
        [input.organizationId, interviewerIds],
      );
      if (eligible.length !== interviewerIds.length) {
        throw new ForbiddenException(
          'Todos los entrevistadores deben tener acceso activo de reclutamiento a la organización.',
        );
      }
    }

    if (isAdmin && !input.organizationId) return;
    if (input.applicationId) {
      const rows = await this.dataSource.query<
        Array<{ organizationId: string; candidateId: string }>
      >(
        `SELECT job."organizationId", application."candidateId"
         FROM application JOIN job ON job.id = application."jobId"
         WHERE application.id = $1::uuid LIMIT 1`,
        [input.applicationId],
      );
      const application = rows[0];
      if (
        !application ||
        !input.organizationId ||
        application.organizationId !== input.organizationId ||
        (input.candidateId && application.candidateId !== input.candidateId)
      ) {
        throw new ForbiddenException(
          'La postulación no corresponde al evento.',
        );
      }
    }
    if (input.candidateId) {
      const rows = await this.dataSource.query<Array<{ type: string }>>(
        `SELECT type FROM "user" WHERE id = $1::uuid LIMIT 1`,
        [input.candidateId],
      );
      if (!rows[0] || rows[0].type !== 'professional') {
        throw new ForbiddenException(
          'El participante debe ser un profesional válido.',
        );
      }
    }
  }
}
