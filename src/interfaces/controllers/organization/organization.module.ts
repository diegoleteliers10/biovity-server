import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrganizationEntity } from '../../../infrastructure/database/orm';
import { OrganizationController } from './organization.controller';
import { OrganizationService } from '../../../core/services/organization.service';
import { OrganizationRepositoryImpl } from '../../../infrastructure/persistence/organization.repository.impl';

@Module({
  imports: [TypeOrmModule.forFeature([OrganizationEntity])],
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
