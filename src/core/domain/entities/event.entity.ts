export enum EventType {
  INTERVIEW = 'interview',
  TASK_DEADLINE = 'task_deadline',
  ANNOUNCEMENT = 'announcement',
  ONBOARDING = 'onboarding',
}

export enum EventStatus {
  SCHEDULED = 'scheduled',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export class Event {
  constructor(
    public id: string,
    public title: string,
    public description: string | null,
    public type: EventType,
    public startAt: Date,
    public endAt: Date | null,
    public location: string | null,
    public meetingUrl: string | null,
    public status: EventStatus,
    public organizerId: string,
    public organizationId: string | null,
    public candidateId: string | null,
    public applicationId: string | null,
    public createdAt: Date = new Date(),
    public updatedAt: Date = new Date(),
  ) {}

  public isActive(): boolean {
    return this.status === EventStatus.SCHEDULED;
  }

  public isOrganizer(userId: string): boolean {
    return this.organizerId === userId;
  }

  public cancel(): void {
    this.status = EventStatus.CANCELLED;
    this.updatedAt = new Date();
  }

  public complete(): void {
    this.status = EventStatus.COMPLETED;
    this.updatedAt = new Date();
  }
}

export class EventNote {
  constructor(
    public id: string,
    public eventId: string,
    public authorId: string,
    public content: string,
    public createdAt: Date = new Date(),
  ) {}
}
