import { ISubscriptionRepository } from '../../core/repositories/subscription.repository';
import { Injectable } from '@nestjs/common';
import { SubscriptionEntity } from '../database/orm';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Subscription } from '../../core/domain/entities/subscription.entity';
import { SubscriptionDomainOrmMapper } from '../../shared/mappers/subscription/subscriptionDomain-orm.mapper';

@Injectable()
export class SubscriptionRepositoryImpl implements ISubscriptionRepository {
  constructor(
    @InjectRepository(SubscriptionEntity)
    private readonly subscriptionRepository: Repository<SubscriptionEntity>,
  ) {}

  async create(entity: Subscription): Promise<Subscription> {
    const subscriptionOrm = SubscriptionDomainOrmMapper.toOrm(entity);
    const savedSubscription =
      await this.subscriptionRepository.save(subscriptionOrm);
    return SubscriptionDomainOrmMapper.toDomain(savedSubscription);
  }

  async findById(id: string): Promise<Subscription | null> {
    const subscriptionOrm = await this.subscriptionRepository.findOne({
      where: { id },
      relations: ['organization'],
    });
    return subscriptionOrm
      ? SubscriptionDomainOrmMapper.toDomain(subscriptionOrm)
      : null;
  }

  async findAll(): Promise<Subscription[]> {
    const subscriptionsOrm = await this.subscriptionRepository.find({
      relations: ['organization'],
    });
    return subscriptionsOrm.map(subscriptionOrm =>
      SubscriptionDomainOrmMapper.toDomain(subscriptionOrm),
    );
  }

  async update(
    id: string,
    entity: Partial<Subscription>,
  ): Promise<Subscription | null> {
    const existingSubscription = await this.subscriptionRepository.findOne({
      where: { id },
    });
    if (!existingSubscription) return null;

    const updatedSubscriptionOrm = {
      ...existingSubscription,
      ...SubscriptionDomainOrmMapper.toOrm(entity as Subscription),
    };
    const savedSubscription = await this.subscriptionRepository.save(
      updatedSubscriptionOrm,
    );
    return SubscriptionDomainOrmMapper.toDomain(savedSubscription);
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.subscriptionRepository.delete(id);
    return result.affected != null && result.affected > 0;
  }
}
