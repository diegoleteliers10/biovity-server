export class UserResponseDto {
  id: string;
  email: string;
  name: string;
  type: 'organización' | 'persona';
  isEmailVerified: boolean;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  organization?: {
    id: string;
    name: string;
    website?: string;
    phone?: string;
    address?: string;
  };
}
