export class JobResponseDto {
  id: string;
  organizationId: string;
  title: string;
  description: string;
  amount: number;
  location: string;
  employmentType: 'Full-time' | 'Part-time' | 'Contrato' | 'Practica';
  experienceLevel:
    | 'Entrante'
    | 'Junior'
    | 'Mid-Senior'
    | 'Senior'
    | 'Ejecutivo';
  benefits: {
    title: string;
    description?: string;
  }[];
  organization?: {
    id: string;
    name: string;
    website: string;
  };
  createdAt: Date;
  updatedAt: Date;
}
