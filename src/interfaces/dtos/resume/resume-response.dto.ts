export class ResumeResponseDto {
  id: string;
  userId: string;
  summary?: string;
  experiences: {
    jobTitle: string;
    company: string;
    startDate: Date;
    endDate?: Date;
    description?: string;
    achievements?: string[];
  }[];
  education: {
    institution: string;
    level: 'Primaria' | 'Secundaria' | 'Superior';
    degree: string;
    startDate: Date;
    endDate?: Date;
    description?: string;
  }[];
  skills: string[];
  certifications: string[];
  languages: {
    name: string;
    proficiency: 'Principiante' | 'Intermedio' | 'Avanzado' | 'Nativo';
  }[];
  links: string[];
  createdAt: Date;
  updatedAt: Date;

  // Información relacionada (opcional)
  user?: {
    id: string;
    name: string;
    email: string;
  };
}
