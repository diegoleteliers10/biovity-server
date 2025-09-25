export class JobPost {
  constructor(
    public id: string,
    public organizationId: string,
    public title: string,
    public description: string,
    public createdAt: Date = new Date(),
    public updatedAt: Date = new Date(),
  ) {}
}
