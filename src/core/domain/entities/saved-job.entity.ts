export class SavedJob {
  constructor(
    public id: string,
    public userId: string,
    public jobId: string,
    public createdAt: Date = new Date(),
  ) {}
}
