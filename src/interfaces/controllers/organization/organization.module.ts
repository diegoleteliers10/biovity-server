import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  OrganizationEntity,
  JobEntity,
  ApplicationEntity,
  EventEntity,
} from '../../../infrastructure/database/orm';
import { OrganizationMemberEntity } from '../../../infrastructure/database/orm/organization-member.entity';
import { OrganizationController } from './organization.controller';
import { OrganizationMetricsController } from './organization-metrics.controller';
import { OrganizationMemberController } from './organization-member.controller';
import { OrganizationService } from '../../../core/services/organization.service';
import { OrganizationMetricsService } from '../../../core/services/organization-metrics.service';
import { OrganizationMemberService } from '../../../core/services/organization-member.service';
import { OrganizationRepositoryImpl } from '../../../infrastructure/persistence/organization.repository.impl';
import { OrganizationMemberRepositoryImpl } from '../../../infrastructure/persistence/organization-member.repository.impl';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      OrganizationEntity,
      JobEntity,
      ApplicationEntity,
      EventEntity,
      OrganizationMemberEntity,
    ]),
  ],
  controllers: [
    OrganizationController,
    OrganizationMetricsController,
    OrganizationMemberController,
  ],
  providers: [
    OrganizationService,
    OrganizationMetricsService,
    OrganizationMemberService,
    {
      provide: 'IOrganizationRepository',
      useClass: OrganizationRepositoryImpl,
    },
    {
      provide: 'IOrganizationMemberRepository',
      useClass: OrganizationMemberRepositoryImpl,
    },
  ],
  exports: [OrganizationService, OrganizationMemberService],
})
export class OrganizationModule {}