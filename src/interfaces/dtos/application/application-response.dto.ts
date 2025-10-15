export class ApplicationResponseDto {
  id: string;
  jobId: string;
  candidateId: string;
  status: 'pendiente' | 'oferta' | 'entrevista' | 'rechazado' | 'contratado';
  createdAt: Date;
  updatedAt: Date;

  // Información relacionada (opcional)
  job?: {
    id: string;
    title: string;
    organization: {
      id: string;
      name: string;
    };
  };

  candidate?: {
    id: string;
    name: string;
    email: string;
  };
}
