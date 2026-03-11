import type { Organization } from './organization.entity';

export enum UserType {
  PROFESSIONAL = 'professional',
  ORGANIZATION = 'organization',
}

export class User {
  constructor(
    public id: string,
    public email: string,
    public name: string,
    public type: UserType,
    public isEmailVerified: boolean = false,
    public isActive: boolean = true,
    public verificationToken?: string,
    public organizationId?: string,
    public organization?: Organization,
    public createdAt: Date = new Date(),
    public updatedAt: Date = new Date(),
    public avatar?: string,
    public profession?: string,
    public birthday?: string,
    public phone?: string,
    public location?: {
      city?: string;
      country?: string;
    },
  ) {}
}
