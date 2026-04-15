export enum SubscriptionPlan {
  FREE = 'free',
  BASIC = 'basic',
  PREMIUM = 'premium',
  ENTERPRISE = 'enterprise',
}

export enum PaymentStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  CANCELLED = 'cancelled',
}

export interface SubscriptionFeatures {
  maxJobs: number;
  maxApplications: number;
  featuredJobs: number;
  prioritySupport: boolean;
  analyticsDashboard: boolean;
  apiAccess: boolean;
}

export class Subscription {
  constructor(
    public id: string,
    public organizationId: string,
    public planName: SubscriptionPlan = SubscriptionPlan.FREE,
    public startedAt: Date = new Date(),
    public expiresAt: Date | null = null,
    public isActive: boolean = false,
    public features: SubscriptionFeatures = {
      maxJobs: 5,
      maxApplications: 20,
      featuredJobs: 0,
      prioritySupport: false,
      analyticsDashboard: false,
      apiAccess: false,
    },
    // MercadoPago fields
    public mercadopagoPaymentId: string | null = null,
    public mercadopagoPreferenceId: string | null = null,
    public mercadopagoMerchantOrderId: string | null = null,
    public externalReference: string | null = null,
    public paymentStatus: PaymentStatus = PaymentStatus.PENDING,
    public lastPaymentAt: Date | null = null,
    public createdAt: Date = new Date(),
    public updatedAt: Date = new Date(),
  ) {}

  public isValid(): boolean {
    return this.isActive && (!this.expiresAt || this.expiresAt > new Date());
  }

  public activate(): void {
    this.isActive = true;
    this.paymentStatus = PaymentStatus.APPROVED;
    this.expiresAt = new Date();
    this.expiresAt.setMonth(this.expiresAt.getMonth() + 1);
  }

  public canPostJobs(): boolean {
    return this.isValid();
  }
}
