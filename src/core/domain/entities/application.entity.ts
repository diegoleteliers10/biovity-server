export enum ApplicationStatus {
  PENDING = 'pendiente',
  OFFER = 'oferta',
  INTERVIEW = 'entrevista',
  REJECTED = 'rechazado',
  HIRED = 'contratado',
}

export class Application {
  constructor(
    public id: string,
    public jobId: string,
    public candidateId: string,
    public createdAt: Date = new Date(),
    public updatedAt: Date = new Date(),
    public status: ApplicationStatus = ApplicationStatus.PENDING,
  ) {}
}
