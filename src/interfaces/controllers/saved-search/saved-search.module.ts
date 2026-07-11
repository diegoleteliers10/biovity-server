import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  SavedSearchEntity,
  OrganizationEntity,
  UserEntity,
} from '../../../infrastructure/database/orm';
import { SavedSearchController } from './saved-search.controller';
import { SavedSearchService } from '../../../core/services/saved-search.service';
import { SavedSearchRepositoryImpl } from '../../../infrastructure/persistence/saved-search.repository.impl';
import { UserRepositoryImpl } from '../../../infrastructure/persistence/user.repository.impl';
import { NotificationModule } from '../../../shared/notification';

@Module({
  imports: [
    TypeOrmModule.forFeature([SavedSearchEntity, OrganizationEntity, UserEntity]),
    NotificationModule,
  ],
  controllers: [SavedSearchController],
  providers: [
    SavedSearchService,
    {
      provide: 'ISavedSearchRepository',
      useClass: SavedSearchRepositoryImpl,
    },
    {
      provide: 'IUserRepository',
      useClass: UserRepositoryImpl,
    },
  ],
  exports: [SavedSearchService],
})
export class SavedSearchModule {}
