import { Organization } from './organization.entity';
import { Resume } from './resume.entity';

export enum UserType {
  Organization = 'organization',
  Candidate = 'candidate',
}

export class User {
  constructor(
    public id: string,
    public email: string,
    public name: string,
    public type: UserType,
    public isEmailVerified: boolean = false,
    public isActive: boolean = false,
    public verificationToken?: string,
    public organization?: Organization,
    public resume?: Resume,
  ) {}
}
