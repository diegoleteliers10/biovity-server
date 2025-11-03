export enum SubscriptionFeature {
  JOB_POSTING = 'job_posting',
  CANDIDATE_SEARCH = 'candidate_search',
  ADVANCED_FILTERS = 'advanced_filters',
  ANALYTICS = 'analytics',
  BULK_MESSAGING = 'bulk_messaging',
  CUSTOM_BRANDING = 'custom_branding',
  PRIORITY_SUPPORT = 'priority_support',
  // Agregar más según necesites
}

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
    public planName: SubscriptionPlan,
    public startedAt: Date,
    public expiresAt: Date,
    public features: SubscriptionFeature[],
    public isActive: boolean = true,
  ) {}

  // Método de dominio útil
  public hasFeature(feature: SubscriptionFeature): boolean {
    return this.isActive && this.features.includes(feature);
  }
}
