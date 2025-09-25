import { Subscription } from './subscription.entity';

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
    public subscription?: Subscription,
    public createdAt: Date = new Date(),
    public updatedAt: Date = new Date(),
  ) {}
}
