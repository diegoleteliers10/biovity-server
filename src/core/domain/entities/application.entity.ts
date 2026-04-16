export enum ApplicationStatus {
  PENDIENTE = 'pendiente',
  OFERTA = 'oferta',
  ENTREVISTA = 'entrevista',
  RECHAZADO = 'rechazado',
  CONTRATADO = 'contratado',
}

export class ApplicationAnswer {
  constructor(
    public id: string,
    public applicationId: string,
    public questionId: string,
    public value: string,
    public createdAt: Date = new Date(),
  ) {}
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
    public coverLetter?: string,
    public salaryMin?: number,
    public salaryMax?: number,
    public salaryCurrency?: string,
    public availabilityDate?: string,
    public resumeUrl?: string,
    public answers?: ApplicationAnswer[],
  ) {}
}
