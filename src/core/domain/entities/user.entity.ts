import type { Organization } from './organization.entity';

export class User {
  constructor(
    public id: string,
    public email: string,
    public name: string,
    public type: 'organización' | 'persona',
    public isEmailVerified: boolean = false,
    public isActive: boolean = true,
    public verificationToken?: string,
    public organization?: Organization,
    public createdAt: Date = new Date(),
    public updatedAt: Date = new Date(),
    public avatar?: string,
  ) {}
}
