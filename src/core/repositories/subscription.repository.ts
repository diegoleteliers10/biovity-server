import { Subscription } from '../domain/entities/index';

export interface ISubscriptionRepository {
  create(entity: Subscription): Promise<Subscription>;
  findById(id: string): Promise<Subscription | null>;
  findAll(): Promise<Subscription[]>;
  update(
    id: string,
    entity: Partial<Subscription>,
  ): Promise<Subscription | null>;
  delete(id: string): Promise<boolean>;
}
