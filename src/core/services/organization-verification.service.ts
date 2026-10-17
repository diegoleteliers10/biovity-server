import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { NotificationService } from '../../shared/notification/notification.service';
import { NotificationType } from '../domain/enums';
import type { OrganizationVerificationSubmitDto } from '../../interfaces/dtos/organization/organization-verification.dto';

export type OrganizationVerificationStatus =
  'unverified' | 'pending' | 'verified' | 'rejected' | 'suspended';

export type OrganizationVerificationRequest = {
  id: string;
  organizationId: string;
  legalName: string;
  countryCode: string;
  registrationNumber: string;
  registryUrl: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewerUserId: string | null;
  reviewedAt: Date | null;
  reviewReason: string | null;
  createdAt: Date;
  readiness?: OrganizationVerificationReadiness;
  ownerEmail?: string | null;
};

export type OrganizationVerificationReadiness = {
  corporateEmailVerified: boolean;
  profileComplete: boolean;
  missingProfileFields: string[];
  ready: boolean;
};

type OrganizationReadinessRow = {
  name: string | null;
  website: string | null;
  description: string | null;
  industry: string | null;
  size: string | null;
  city: string | null;
  country: string | null;
  ownerEmail: string | null;
  ownerEmailVerified: boolean | null;
};

type OrganizationVerificationQueueRow = OrganizationVerificationRequest &
  OrganizationReadinessRow & { organizationName: string };

const getReadiness = (
  organization: OrganizationReadinessRow,
): OrganizationVerificationReadiness => {
  const profileFields: Array<[string, string | null]> = [
    ['name', organization.name],
    ['website', organization.website],
    ['description', organization.description],
    ['industry', organization.industry],
    ['size', organization.size],
    ['city', organization.city],
    ['country', organization.country],
  ];
  const missingProfileFields = profileFields
    .filter(([, value]) => !value?.trim())
    .map(([field]) => field);
  const emailParts = organization.ownerEmail?.trim().toLowerCase().split('@');
  const emailDomain =
    emailParts?.length === 2 ? emailParts[1].replace(/\.$/, '') : null;
  const websiteDomain = organization.website
    ?.trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .split(/[/?#]/, 1)[0]
    ?.replace(/:\d+$/, '')
    .replace(/^www\./, '')
    .replace(/\.$/, '');
  const corporateEmailVerified =
    organization.ownerEmailVerified === true &&
    Boolean(emailParts?.[0]) &&
    Boolean(emailDomain) &&
    emailDomain === websiteDomain;
  return {
    corporateEmailVerified,
    profileComplete: missingProfileFields.length === 0,
    missingProfileFields,
    ready: corporateEmailVerified && missingProfileFields.length === 0,
  };
};

const ORGANIZATION_READINESS_SELECT = `SELECT organization.name, organization.website, organization.description,
    organization.industry, organization.size,
    organization.address ->> 'city' AS city,
    organization.address ->> 'country' AS country,
    owner.email AS "ownerEmail",
    owner."isEmailVerified" AS "ownerEmailVerified"
   FROM organization
   LEFT JOIN "user" owner ON owner."organizationId" = organization.id
   WHERE organization.id = $1::uuid`;

@Injectable()
export class OrganizationVerificationService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly notifications: NotificationService,
  ) {}

  async getOrganizationStatus(organizationId: string): Promise<{
    status: OrganizationVerificationStatus;
    latestRequest: OrganizationVerificationRequest | null;
    readiness: OrganizationVerificationReadiness;
  }> {
    const organizations = await this.dataSource.query<
      Array<{ verificationStatus: OrganizationVerificationStatus }>
    >(
      `SELECT verification_status AS "verificationStatus"
       FROM organization WHERE id = $1::uuid LIMIT 1`,
      [organizationId],
    );
    const organization = organizations[0];
    if (!organization) throw new NotFoundException('Organization not found');
    const requests = await this.dataSource.query<
      OrganizationVerificationRequest[]
    >(
      `SELECT id, organization_id AS "organizationId",
        legal_name AS "legalName", country_code AS "countryCode",
        registration_number AS "registrationNumber", registry_url AS "registryUrl",
        status, reviewer_user_id AS "reviewerUserId", reviewed_at AS "reviewedAt",
        review_reason AS "reviewReason", created_at AS "createdAt"
       FROM organization_verification_request
       WHERE organization_id = $1::uuid
       ORDER BY created_at DESC LIMIT 1`,
      [organizationId],
    );
    const readinessRows = await this.dataSource.query<
      OrganizationReadinessRow[]
    >(ORGANIZATION_READINESS_SELECT, [organizationId]);
    return {
      status: organization.verificationStatus,
      latestRequest: requests[0] ?? null,
      readiness: getReadiness(readinessRows[0]),
    };
  }

  async submit(
    organizationId: string,
    input: OrganizationVerificationSubmitDto,
  ): Promise<OrganizationVerificationRequest> {
    const request = await this.dataSource.transaction(async manager => {
      const organizations = await manager.query<
        Array<{ verificationStatus: OrganizationVerificationStatus }>
      >(
        `SELECT verification_status AS "verificationStatus"
         FROM organization WHERE id = $1::uuid FOR UPDATE`,
        [organizationId],
      );
      const status = organizations[0]?.verificationStatus;
      if (!status) throw new NotFoundException('Organization not found');
      if (status === 'verified' || status === 'suspended') {
        throw new BadRequestException(
          'This organization cannot submit a verification request.',
        );
      }
      await manager.query(
        `SELECT id FROM "user" WHERE "organizationId" = $1::uuid FOR UPDATE`,
        [organizationId],
      );
      const readinessRows = await manager.query<OrganizationReadinessRow[]>(
        `${ORGANIZATION_READINESS_SELECT} FOR UPDATE OF organization`,
        [organizationId],
      );
      const readiness = getReadiness(readinessRows[0]);
      if (!readiness.ready) {
        const missing = [
          ...readiness.missingProfileFields,
          ...(readiness.corporateEmailVerified
            ? []
            : ['correo corporativo confirmado con dominio coincidente']),
        ];
        throw new BadRequestException(
          `Completa estos requisitos antes de solicitar la verificación: ${missing.join(', ')}.`,
        );
      }
      const pending = await manager.query<Array<{ id: string }>>(
        `SELECT id FROM organization_verification_request
         WHERE organization_id = $1::uuid AND status = 'pending' LIMIT 1`,
        [organizationId],
      );
      if (pending[0]) {
        throw new BadRequestException(
          'A verification request is already pending.',
        );
      }
      await manager.query(
        `UPDATE organization SET verification_status = 'pending' WHERE id = $1::uuid`,
        [organizationId],
      );
      const rows = await manager.query<OrganizationVerificationRequest[]>(
        `INSERT INTO organization_verification_request
          (organization_id, legal_name, country_code, registration_number, registry_url)
         VALUES ($1::uuid, $2, UPPER($3), $4, $5)
         RETURNING id, organization_id AS "organizationId",
          legal_name AS "legalName", country_code AS "countryCode",
          registration_number AS "registrationNumber", registry_url AS "registryUrl",
          status, reviewer_user_id AS "reviewerUserId", reviewed_at AS "reviewedAt",
          review_reason AS "reviewReason", created_at AS "createdAt"`,
        [
          organizationId,
          input.legalName.trim(),
          input.countryCode.trim(),
          input.registrationNumber.trim(),
          input.registryUrl.trim(),
        ],
      );
      const request = rows[0];
      const adminEmails = [
        ...new Set(
          (process.env.ADMIN_EMAILS ?? '')
            .split(',')
            .map(email => email.trim().toLowerCase())
            .filter(Boolean),
        ),
      ];
      await manager.query(
        `WITH configured_admins AS (
           SELECT DISTINCT LOWER(TRIM(email)) AS email
           FROM unnest($2::text[]) AS configured(email)
           WHERE TRIM(email) <> ''
         ), recipients AS (
           SELECT LOWER("user".email) AS email
           FROM "user"
           WHERE "user"."isActive" = true
             AND ("user".type = 'admin' OR LOWER("user".email) = ANY($2::text[]))
           UNION
           SELECT email FROM configured_admins
         ), intent_ids AS (
           SELECT gen_random_uuid() AS id, email FROM recipients
         )
         INSERT INTO organization_verification_email_intent
           (id, event_key, request_id, recipient_email)
         SELECT intent_ids.id, 'organization-verification:' || intent_ids.id::text,
           $1::uuid, intent_ids.email
         FROM intent_ids
         ON CONFLICT DO NOTHING`,
        [request.id, adminEmails],
      );
      return request;
    });

    await this.notifications.createForAdmins({
      type: NotificationType.SYSTEM,
      title: 'Nueva solicitud de verificación',
      body: `Solicitud de ${request.legalName}`,
      link: '/dashboard/organizations',
      data: { organizationId, requestId: request.id },
      dedupKey: `organization-verification:${request.id}`,
    });

    return request;
  }

  async listPending(): Promise<OrganizationVerificationRequest[]> {
    const rows = await this.dataSource.query<
      OrganizationVerificationQueueRow[]
    >(
      `SELECT request.id, request.organization_id AS "organizationId",
        organization.name AS "organizationName", organization.website,
        organization.description, organization.industry, organization.size,
        organization.address ->> 'city' AS city,
        organization.address ->> 'country' AS country,
        owner.email AS "ownerEmail",
        owner."isEmailVerified" AS "ownerEmailVerified",
        request.legal_name AS "legalName", request.country_code AS "countryCode",
        request.registration_number AS "registrationNumber",
        request.registry_url AS "registryUrl", request.status,
        request.created_at AS "createdAt"
       FROM organization_verification_request request
       JOIN organization ON organization.id = request.organization_id
       LEFT JOIN "user" owner ON owner."organizationId" = organization.id
       WHERE request.status = 'pending'
       ORDER BY request.created_at ASC`,
    );
    return rows.map(row => {
      const {
        description,
        industry,
        size,
        city,
        country,
        ownerEmailVerified,
        ...request
      } = row;
      return {
        ...request,
        readiness: getReadiness({
          name: row.organizationName ?? row.name,
          website: row.website,
          description,
          industry,
          size,
          city,
          country,
          ownerEmail: row.ownerEmail,
          ownerEmailVerified,
        }),
      };
    });
  }

  async review(
    requestId: string,
    reviewerUserId: string,
    decision: 'approved' | 'rejected',
    reason: string,
  ): Promise<void> {
    const result = await this.dataSource.transaction(async manager => {
      const requests = await manager.query<
        Array<{ organizationId: string; status: string }>
      >(
        `SELECT organization_id AS "organizationId", status
         FROM organization_verification_request WHERE id = $1::uuid FOR UPDATE`,
        [requestId],
      );
      const request = requests[0];
      if (!request)
        throw new NotFoundException('Verification request not found');
      if (request.status !== 'pending') {
        throw new BadRequestException(
          'This request has already been reviewed.',
        );
      }
      const organizations = await manager.query<
        Array<{ verificationStatus: OrganizationVerificationStatus }>
      >(
        `SELECT verification_status AS "verificationStatus"
         FROM organization WHERE id = $1::uuid FOR UPDATE`,
        [request.organizationId],
      );
      if (organizations[0]?.verificationStatus !== 'pending') {
        throw new BadRequestException(
          'The organization no longer has a pending verification.',
        );
      }
      if (decision === 'approved') {
        await manager.query(
          `SELECT id FROM "user" WHERE "organizationId" = $1::uuid FOR UPDATE`,
          [request.organizationId],
        );
        const readinessRows = await manager.query<OrganizationReadinessRow[]>(
          `${ORGANIZATION_READINESS_SELECT} FOR UPDATE OF organization`,
          [request.organizationId],
        );
        if (!getReadiness(readinessRows[0]).ready) {
          throw new BadRequestException(
            'The company no longer meets onboarding requirements. Reject this request with the missing items, then ask the company to update its profile.',
          );
        }
      }
      const organizationStatus =
        decision === 'approved' ? 'verified' : 'rejected';
      await manager.query(
        `UPDATE organization_verification_request
         SET status = $2, reviewer_user_id = $3::uuid, reviewed_at = now(), review_reason = $4
         WHERE id = $1::uuid`,
        [requestId, decision, reviewerUserId, reason.trim()],
      );
      await manager.query(
        `UPDATE organization SET verification_status = $2
         WHERE id = $1::uuid AND verification_status = 'pending'`,
        [request.organizationId, organizationStatus],
      );
      const recipients = await manager.query<Array<{ id: string }>>(
        `SELECT DISTINCT member.id
         FROM "user" member
         LEFT JOIN organization_member membership
           ON membership.user_id = member.id
          AND membership.organization_id = $1::uuid
         WHERE member."isActive" IS TRUE
           AND member.type = 'organization'
           AND (member."organizationId" = $1::uuid
             OR membership.role IN ('admin', 'recruiter'))`,
        [request.organizationId],
      );
      return { organizationId: request.organizationId, recipients };
    });

    const approved = decision === 'approved';
    await this.notifications.createMany(
      result.recipients.map(({ id }) => ({
        userId: id,
        type: NotificationType.SYSTEM,
        title: approved
          ? 'Empresa verificada'
          : 'Solicitud de verificación rechazada',
        body: approved
          ? 'La empresa ya puede publicar vacantes y usar las funciones de reclutamiento.'
          : `Motivo: ${reason.trim()}`,
        link: '/dashboard',
        data: { organizationId: result.organizationId, requestId, decision },
        dedupKey: `organization-verification-review:${requestId}`,
      })),
    );
  }
}
