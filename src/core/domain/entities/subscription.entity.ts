export enum SubscriptionPlan {
  FREE = 'free',
  BASIC = 'basic',
  PREMIUM = 'premium',
  ENTERPRISE = 'enterprise',
}

export class Subscription {
  constructor(
    public id: string,
    public organizationId: string,
    public startedAt: Date,
    public expiresAt: Date,
    public features: Record<string, boolean>,
    public isActive: boolean = true,
    public planName: SubscriptionPlan = SubscriptionPlan.FREE,
  ) {}
}
