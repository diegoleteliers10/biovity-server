import type { Subscription } from './subscription.entity';

export class Organization {
  constructor(
    public id: string,
    public name: string,
    public website: string,
    public phone?: string,
    public address?: {
      street?: string;
      city?: string;
      state?: string;
      country?: string;
      zipCode?: string;
    },
    public createdAt: Date = new Date(),
    public updatedAt: Date = new Date(),
    public subscriptionId?: string,
    public subscription?: Subscription,
    public integrations?: {
      slackWebhookUrl?: string;
      discordWebhookUrl?: string;
      enabled?: boolean;
    },
    public logo?: string,
    public description?: string,
    public industry?: string,
    public size?: string,
  ) {}
}
