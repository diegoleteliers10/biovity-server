import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SubscriptionEntity } from '../../../infrastructure/database/orm/subscription.entity';
import { OrganizationEntity } from '../../../infrastructure/database/orm/organization.entity';
import { SubscriptionController } from './subscription.controller';
import { SubscriptionService } from '../../../core/services/subscription.service';
import { SubscriptionRepositoryImpl } from '../../../infrastructure/persistence/subscription.repository.impl';
import { OrganizationRepositoryImpl } from '../../../infrastructure/persistence/organization.repository.impl';

@Module({
  imports: [TypeOrmModule.forFeature([SubscriptionEntity, OrganizationEntity])],
  controllers: [SubscriptionController],
  providers: [
    SubscriptionService,
    {
      provide: 'ISubscriptionRepository',
      useClass: SubscriptionRepositoryImpl,
    },
    {
      provide: 'IOrganizationRepository',
      useClass: OrganizationRepositoryImpl,
    },
  ],
  exports: [SubscriptionService],
})
export class SubscriptionModule {}
