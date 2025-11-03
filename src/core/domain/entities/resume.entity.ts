interface Certificates {
  name: string;
  issuer: string;
  dateIssued: Date;
  expirationDate?: Date;
  credentialId?: string;
  credentialUrl?: string;
}

interface Languages {
  name: string;
  proficiency: 'Principiante' | 'Intermedio' | 'Avanzado' | 'Nativo';
}

interface Links {
  url: string;
}

export interface FileInfo {
  url: string;
  originalName: string;
  mimeType: string;
  size: number; // bytes
  uploadedAt: Date;
}

interface Education {
  institution: string;
  level: 'Primaria' | 'Secundaria' | 'Superior';
  degree: string;
  startDate: Date;
  endDate?: Date;
  description?: string;
}

export class Resume {
  constructor(
    public id: string,
    public userId: string,
    public summary?: string,
    public experiences: Education[] = [],
    public education: {
      institution: string;
      level: 'Primaria' | 'Secundaria' | 'Superior';
      degree: string;
      startDate: Date;
      endDate?: Date;
      description?: string;
    }[] = [],
    public skills: string[] = [],
    public certifications: Certificates[] = [],
    public languages: Languages[] = [],
    public links: Links[] = [],
    public cvFile?: FileInfo,
    public createdAt: Date = new Date(),
    public updatedAt: Date = new Date(),
  ) {}
}
