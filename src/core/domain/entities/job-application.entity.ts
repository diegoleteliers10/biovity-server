export class JobApplication {
  constructor(
    public id: string,
    public jobPostId: string,
    public candidateId: string,
    public createdAt: Date = new Date(),
    public updatedAt: Date = new Date(),
    public status:
      | 'pending'
      | 'reviewed'
      | 'interview'
      | 'rejected'
      | 'hired' = 'pending',
  ) {}
}
