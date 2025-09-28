export class Application {
  constructor(
    public id: string,
    public jobId: string,
    public candidateId: string,
    public createdAt: Date = new Date(),
    public updatedAt: Date = new Date(),
    public status:
      | 'pendiente'
      | 'oferta'
      | 'entrevista'
      | 'rechazado'
      | 'contratado' = 'pendiente',
  ) {}
}
