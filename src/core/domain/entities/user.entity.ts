import { Organization } from './organization.entity';

// export enum UserType {
//   Organization = 'organización',
//   Candidate = 'persona',
// }

export class User {
  constructor(
    public id: string,
    public email: string,
    public name: string,
    public password: string,
    public type: 'organización' | 'persona',
    public isEmailVerified: boolean = false,
    public isActive: boolean = false,
    public verificationToken?: string,
    public organization?: Organization,
  ) {}
}
