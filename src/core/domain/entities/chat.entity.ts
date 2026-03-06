export class Chat {
  constructor(
    public id: string,
    public recruiterId: string,
    public professionalId: string,
    public jobId?: string,
    public lastMessage?: string,
    public unreadCountRecruiter: number = 0,
    public unreadCountProfessional: number = 0,
    public createdAt: Date = new Date(),
    public updatedAt?: Date,
  ) {}
}
