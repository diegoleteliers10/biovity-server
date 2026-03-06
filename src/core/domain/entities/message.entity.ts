export class Message {
  constructor(
    public id: string,
    public chatId: string,
    public senderId: string,
    public content: string,
    public isRead: boolean = false,
    public createdAt: Date = new Date(),
  ) {}
}
