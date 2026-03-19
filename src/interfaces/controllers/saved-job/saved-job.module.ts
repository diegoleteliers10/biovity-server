import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  SavedJobEntity,
  JobEntity,
  UserEntity,
  ApplicationEntity,
} from '../../../infrastructure/database/orm';
import { SavedJobController } from './saved-job.controller';
import { SavedJobService } from '../../../core/services/saved-job.service';
import { SavedJobRepositoryImpl } from '../../../infrastructure/persistence/saved-job.repository.impl';
import { JobRepositoryImpl } from '../../../infrastructure/persistence/job.repository.impl';
import { UserRepositoryImpl } from '../../../infrastructure/persistence/user.repository.impl';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SavedJobEntity,
      JobEntity,
      UserEntity,
      ApplicationEntity,
    ]),
  ],
  controllers: [SavedJobController],
  providers: [
    SavedJobService,
    {
      provide: 'ISavedJobRepository',
      useClass: SavedJobRepositoryImpl,
    },
    {
      provide: 'IJobRepository',
      useClass: JobRepositoryImpl,
    },
    {
      provide: 'IUserRepository',
      useClass: UserRepositoryImpl,
    },
  ],
  exports: [SavedJobService],
})
export class SavedJobModule {}
