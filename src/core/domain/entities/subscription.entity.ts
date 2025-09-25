export class Subscription {
  constructor(
    public id: string,
    public organizationId: string,
    public planName: string,
    public startedAt: Date,
    public expiresAt: Date,
    public features: string[],
    public isActive: boolean = true,
  ) {}
}
