export class OrganizationResponseDto {
  id: string;
  name: string;
  website: string;
  phone?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    country?: string;
    zipCode?: string;
  };
  subscription?: {
    id: string;
    planName: string;
    isActive: boolean;
    startDate: Date;
    endDate?: Date;
  };
  createdAt: Date;
  updatedAt: Date;
}
