import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  SavedSearchEntity,
  OrganizationEntity,
} from '../../../infrastructure/database/orm';
import { SavedSearchController } from './saved-search.controller';
import { SavedSearchService } from '../../../core/services/saved-search.service';
import { SavedSearchRepositoryImpl } from '../../../infrastructure/persistence/saved-search.repository.impl';

@Module({
  imports: [TypeOrmModule.forFeature([SavedSearchEntity, OrganizationEntity])],
  controllers: [SavedSearchController],
  providers: [
    SavedSearchService,
    {
      provide: 'ISavedSearchRepository',
      useClass: SavedSearchRepositoryImpl,
    },
  ],
  exports: [SavedSearchService],
})
export class SavedSearchModule {}
