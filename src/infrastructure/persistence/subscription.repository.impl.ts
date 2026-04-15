import {
  ISubscriptionRepository,
  SubscriptionFilters,
} from '../../core/repositories/subscription.repository';
import { Injectable } from '@nestjs/common';
import { SubscriptionEntity } from '../database/orm/subscription.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Subscription,
  PaymentStatus,
} from '../../core/domain/entities/subscription.entity';
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

  async findByOrganizationId(
    organizationId: string,
  ): Promise<Subscription | null> {
    const subscriptionOrm = await this.subscriptionRepository.findOne({
      where: { organizationId },
      relations: ['organization'],
    });
    return subscriptionOrm
      ? SubscriptionDomainOrmMapper.toDomain(subscriptionOrm)
      : null;
  }

  async findAll(filters?: SubscriptionFilters): Promise<Subscription[]> {
    const queryBuilder = this.subscriptionRepository
      .createQueryBuilder('subscription')
      .leftJoinAndSelect('subscription.organization', 'organization');

    if (filters?.organizationId) {
      queryBuilder.andWhere('subscription.organizationId = :organizationId', {
        organizationId: filters.organizationId,
      });
    }

    if (filters?.planName) {
      queryBuilder.andWhere('subscription.planName = :planName', {
        planName: filters.planName,
      });
    }

    if (filters?.isActive !== undefined) {
      queryBuilder.andWhere('subscription.isActive = :isActive', {
        isActive: filters.isActive,
      });
    }

    const subscriptionsOrm = await queryBuilder.getMany();
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

  async updatePaymentInfo(
    id: string,
    data: {
      mercadopagoPaymentId?: string;
      mercadopagoPreferenceId?: string;
      mercadopagoMerchantOrderId?: string;
      paymentStatus?: PaymentStatus;
      lastPaymentAt?: Date;
      isActive?: boolean;
      expiresAt?: Date;
    },
  ): Promise<Subscription | null> {
    const existingSubscription = await this.subscriptionRepository.findOne({
      where: { id },
    });
    if (!existingSubscription) return null;

    const updatedSubscriptionOrm = {
      ...existingSubscription,
      mercadopagoPaymentId:
        data.mercadopagoPaymentId ?? existingSubscription.mercadopagoPaymentId,
      mercadopagoPreferenceId:
        data.mercadopagoPreferenceId ??
        existingSubscription.mercadopagoPreferenceId,
      mercadopagoMerchantOrderId:
        data.mercadopagoMerchantOrderId ??
        existingSubscription.mercadopagoMerchantOrderId,
      paymentStatus: data.paymentStatus ?? existingSubscription.paymentStatus,
      lastPaymentAt: data.lastPaymentAt ?? existingSubscription.lastPaymentAt,
      isActive: data.isActive ?? existingSubscription.isActive,
      expiresAt: data.expiresAt ?? existingSubscription.expiresAt,
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
