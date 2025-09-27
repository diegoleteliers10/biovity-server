export class Job {
  constructor(
    public id: string,
    public organizationId: string,
    public title: string,
    public description: string,
    public amount: number,
    public location: string,
    public employmentType: 'Full-time' | 'Part-time' | 'Contrato' | 'Practica',
    public experienceLevel:
      | 'Entrante'
      | 'Junior'
      | 'Mid-Senior'
      | 'Senior'
      | 'Ejecutivo',
    public benefits: {
      title: string;
      description?: string;
    }[] = [],
    public createdAt: Date = new Date(),
    public updatedAt: Date = new Date(),
  ) {}
}
