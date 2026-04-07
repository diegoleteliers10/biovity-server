export enum ApplicationStatus {
  PENDIENTE = 'pendiente',
  OFERTA = 'oferta',
  ENTREVISTA = 'entrevista',
  RECHAZADO = 'rechazado',
  CONTRATADO = 'contratado',
}

export class Application {
  constructor(
    public id: string,
    public jobId: string,
    public candidateId: string,
    public createdAt: Date = new Date(),
    public updatedAt: Date = new Date(),
    public status: ApplicationStatus = ApplicationStatus.PENDIENTE,
    public stageChangedAt: Date = new Date(),
  ) {}
}
