import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrganizationEntity, JobEntity, ApplicationEntity, EventEntity } from '../../../infrastructure/database/orm';
import { OrganizationController } from './organization.controller';
import { OrganizationMetricsController } from './organization-metrics.controller';
import { OrganizationService } from '../../../core/services/organization.service';
import { OrganizationMetricsService } from '../../../core/services/organization-metrics.service';
import { OrganizationRepositoryImpl } from '../../../infrastructure/persistence/organization.repository.impl';

@Module({
  imports: [TypeOrmModule.forFeature([OrganizationEntity, JobEntity, ApplicationEntity, EventEntity])],
  controllers: [OrganizationController, OrganizationMetricsController],
  providers: [
    OrganizationService,
    OrganizationMetricsService,
    {
      provide: 'IOrganizationRepository',
      useClass: OrganizationRepositoryImpl,
    },
  ],
  exports: [OrganizationService],
})
export class OrganizationModule {}
