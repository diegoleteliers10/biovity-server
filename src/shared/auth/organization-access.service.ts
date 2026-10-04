import { ForbiddenException, Injectable } from '@nestjs/common';
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

  async assertAccess(
    organizationId: string,
    requester: AuthenticatedUser | undefined,
    permission: OrganizationPermission,
  ): Promise<void> {
    if (await this.hasAccess(organizationId, requester, permission)) return;
    throw new ForbiddenException('No tienes permisos para esta acción.');
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
    if (
      requester.id === recruiterId &&
      requester.type === 'organization' &&
      requester.organizationId
    ) {
      await this.assertAccess(requester.organizationId, requester, 'recruit');
      return;
    }
    if (requester.id === professionalId && requester.type === 'professional') {
      throw new ForbiddenException(
        'El profesional no puede iniciar este chat.',
      );
    }
    throw new ForbiddenException('Solo el reclutador puede iniciar este chat.');
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
               SELECT "userId" FROM organization_member WHERE organization_id = $1::uuid
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
      await this.assertAccess(requester.organizationId, requester, 'read');
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
        isParticipant: boolean;
      }>
    >(
      `SELECT event."organizerId", event."candidateId", event."organizationId",
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
    if (permission === 'rsvp') {
      if (event.isParticipant && !ownsEvent) return event;
      throw new ForbiddenException('No puedes responder por otra persona.');
    }
    if (permission === 'manage') {
      if (ownsEvent) return event;
      if (event.organizationId) {
        await this.assertAccess(event.organizationId, requester, 'recruit');
        return event;
      }
      throw new ForbiddenException(
        'No tienes permisos para cambiar este evento.',
      );
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
      organizerId: string;
      organizationId?: string;
      candidateId?: string;
      applicationId?: string;
    },
  ): Promise<void> {
    if (!requester)
      throw new ForbiddenException('Se requiere una sesión de usuario.');
    if (requester.type === 'admin' || isAdminUser(requester)) return;
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
