import { Injectable } from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'crypto';
import { DataSource } from 'typeorm';

export type UserRole = 'professional' | 'organization' | 'admin' | 'none';

export type OrganizationMemberRole = 'admin' | 'recruiter' | 'viewer';

export interface AuthenticatedUser {
  id: string;
  email: string;
  type: string;
  organizationId: string | null;
  /**
   * Role inside the resolved organization ('admin' | 'recruiter' | 'viewer').
   * The organization owner is an implicit member with role 'admin'.
   */
  memberRole?: OrganizationMemberRole;
}

/**
 * Mirrors the frontend rule: emails listed in ADMIN_EMAILS are admins
 * regardless of their user type.
 */
export function isAdminUser(user: AuthenticatedUser): boolean {
  const adminEmails = (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map(e => e.trim().toLowerCase())
    .filter(Boolean);
  return adminEmails.includes(user.email.toLowerCase());
}

/**
 * Resolves the platform role for authorization:
 * - 'admin': user.type 'admin' or email in ADMIN_EMAILS. Passes every @Roles.
 * - 'organization': organization-typed user with a resolved organizationId
 *   (owner via user.organizationId, or organization_member row).
 * - 'professional': professional-typed user.
 * - 'none': everything else (e.g. organization-typed user without any
 *   membership). Fails every @Roles check instead of falling back silently.
 */
export function resolveUserRole(user: AuthenticatedUser): UserRole {
  if (user.type === 'admin' || isAdminUser(user)) return 'admin';
  if (user.type === 'organization') {
    return user.organizationId ? 'organization' : 'none';
  }
  if (user.type === 'professional') return 'professional';
  return 'none';
}

/**
 * Validates Better Auth sessions against the shared Postgres database.
 *
 * Cookie format (better-call `signCookieValue`):
 *   `encodeURIComponent(`${token}.${base64(HMAC-SHA256(token, secret))}`)`
 * The session token is stored verbatim in the `session` table.
 */
@Injectable()
export class BetterAuthSessionService {
  constructor(private readonly dataSource: DataSource) {}

  async validateSessionCookie(
    cookieValue: string | undefined,
  ): Promise<AuthenticatedUser | null> {
    if (!cookieValue) return null;
    const token = this.extractSignedToken(cookieValue);
    if (!token) return null;
    return this.findActiveSession(token);
  }

  private extractSignedToken(cookieValue: string): string | null {
    const secret = process.env.BETTER_AUTH_SECRET;
    if (!secret) return null;
    const lastDot = cookieValue.lastIndexOf('.');
    if (lastDot <= 0) return null;
    const token = cookieValue.slice(0, lastDot);
    const signature = cookieValue.slice(lastDot + 1);
    const expected = createHmac('sha256', secret)
      .update(token)
      .digest('base64');
    const given = Buffer.from(signature);
    const wanted = Buffer.from(expected);
    if (given.length === wanted.length && timingSafeEqual(given, wanted)) {
      return token;
    }
    return null;
  }

  /**
   * Resolves the active session plus organization membership in one query.
   * `user.organizationId` (the owner pointer) wins; otherwise the newest
   * `organization_member` row is used, preferring the 'admin' role. A user can
   * hold several member rows, so `ORDER BY` picks a deterministic one.
   */
  private async findActiveSession(
    token: string,
  ): Promise<AuthenticatedUser | null> {
    const rows: Array<{
      userId: string;
      email: string;
      type: string;
      isActive: boolean;
      organizationId: string | null;
      memberOrganizationId: string | null;
      memberRole: OrganizationMemberRole | null;
    }> = await this.dataSource.query(
      `SELECT u."id" AS "userId", u."email", u."type", u."isActive", u."organizationId",
              om."organization_id" AS "memberOrganizationId", om."role" AS "memberRole"
       FROM session s
       JOIN "user" u ON u."id" = s."user_id"
       LEFT JOIN organization_member om ON om."user_id" = u."id"
       WHERE s."token" = $1 AND s."expires_at" > NOW()
       ORDER BY (om."role" = 'admin') DESC, om."created_at" DESC, om."id" DESC
       LIMIT 1`,
      [token],
    );
    const row = rows[0];
    if (!row || row.isActive !== true) return null;

    const organizationId =
      row.organizationId ?? row.memberOrganizationId ?? null;
    const memberRole = row.organizationId
      ? 'admin'
      : (row.memberRole ?? undefined);

    return {
      id: row.userId,
      email: row.email,
      type: row.type,
      organizationId,
      memberRole,
    };
  }
}
