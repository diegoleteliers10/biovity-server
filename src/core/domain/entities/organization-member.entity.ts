import type { Organization } from './organization.entity';
import type { User } from './user.entity';

export enum OrganizationMemberRole {
  ADMIN = 'admin',
  RECRUITER = 'recruiter',
  VIEWER = 'viewer',
}

export class OrganizationMember {
  constructor(
    public id: string,
    public organizationId: string,
    public userId: string,
    public role: OrganizationMemberRole = OrganizationMemberRole.VIEWER,
    public createdAt: Date = new Date(),
    public updatedAt: Date = new Date(),
    public organization?: Organization,
    public user?: User,
  ) {}
}