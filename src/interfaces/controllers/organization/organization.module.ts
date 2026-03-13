import { Module } from '@nestjs/common';
import { ConditionalDatabaseModule } from '../../../infrastructure/config/conditional-database.module';
import { OrganizationEntity } from '../../../infrastructure/database/orm';
import { OrganizationController } from './organization.controller';
import { OrganizationService } from '../../../core/services/organization.service';
import { OrganizationRepositoryImpl } from '../../../infrastructure/persistence/organization.repository.impl';

@Module({
  imports: [ConditionalDatabaseModule.forFeature([OrganizationEntity])],
  controllers: [OrganizationController],
  providers: [
    OrganizationService,
    {
      provide: 'IOrganizationRepository',
      useClass: OrganizationRepositoryImpl,
    },
  ],
  exports: [OrganizationService],
})
export class OrganizationModule {}
