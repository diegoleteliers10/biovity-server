import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  OrganizationEntity,
  JobEntity,
  ApplicationEntity,
  ApplicationStatusHistoryEntity,
  EventEntity,
} from '../../../infrastructure/database/orm';
import { OrganizationMemberEntity } from '../../../infrastructure/database/orm/organization-member.entity';
import { OrganizationController } from './organization.controller';
import { OrganizationMetricsController } from './organization-metrics.controller';
import { OrganizationMemberController } from './organization-member.controller';
import { OrganizationVerificationController } from './organization-verification.controller';
import { OrganizationService } from '../../../core/services/organization.service';
import { OrganizationPublicService } from '../../../core/services/organization-public.service';
import { OrganizationMetricsService } from '../../../core/services/organization-metrics.service';
import { OrganizationMemberService } from '../../../core/services/organization-member.service';
import { OrganizationVerificationService } from '../../../core/services/organization-verification.service';
import { OrganizationRepositoryImpl } from '../../../infrastructure/persistence/organization.repository.impl';
import { OrganizationMemberRepositoryImpl } from '../../../infrastructure/persistence/organization-member.repository.impl';
import { InternalSecretGuard } from '../../../shared/guards/internal-secret.guard';
import { OrganizationVerificationEmailBridgeService } from '../../../core/services/organization-verification-email-bridge.service';
import { OrganizationVerificationEmailIntentRepositoryImpl } from '../../../infrastructure/persistence/organization-verification-email-intent.repository.impl';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      OrganizationEntity,
      JobEntity,
      ApplicationEntity,
      ApplicationStatusHistoryEntity,
      EventEntity,
      OrganizationMemberEntity,
    ]),
  ],
  controllers: [
    OrganizationController,
    OrganizationMetricsController,
    OrganizationMemberController,
    OrganizationVerificationController,
  ],
  providers: [
    OrganizationService,
    OrganizationPublicService,
    OrganizationMetricsService,
    OrganizationMemberService,
    OrganizationVerificationService,
    OrganizationVerificationEmailBridgeService,
    {
      provide: 'OrganizationVerificationEmailIntentRepository',
      useClass: OrganizationVerificationEmailIntentRepositoryImpl,
    },
    InternalSecretGuard,
    {
      provide: 'IOrganizationRepository',
      useClass: OrganizationRepositoryImpl,
    },
    {
      provide: 'IOrganizationMemberRepository',
      useClass: OrganizationMemberRepositoryImpl,
    },
  ],
  exports: [
    OrganizationService,
    OrganizationMemberService,
    OrganizationVerificationEmailBridgeService,
  ],
})
export class OrganizationModule {}
