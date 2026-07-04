import { ParticipantRole, ParticipantStatus } from '../enums';

export class EventParticipant {
  constructor(
    public id: string,
    public eventId: string,
    public userId: string,
    public role: ParticipantRole,
    public status: ParticipantStatus,
    public createdAt: Date = new Date(),
  ) {}

  public hasResponded(): boolean {
    return (
      this.status === ParticipantStatus.ACCEPTED ||
      this.status === ParticipantStatus.DECLINED
    );
  }
}
