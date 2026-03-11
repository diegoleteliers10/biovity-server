import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ResumeEntity, UserEntity } from '../../../infrastructure/database/orm';
import { ResumeController } from './resume.controller';
import { ResumeService } from '../../../core/services/resume.service';
import { ResumeRepositoryImpl } from '../../../infrastructure/persistence/resume.repository.impl';
import { UserRepositoryImpl } from '../../../infrastructure/persistence/user.repository.impl';

@Module({
  imports: [TypeOrmModule.forFeature([ResumeEntity, UserEntity])],
  controllers: [ResumeController],
  providers: [
    ResumeService,
    {
      provide: 'IResumeRepository',
      useClass: ResumeRepositoryImpl,
    },
    {
      provide: 'IUserRepository',
      useClass: UserRepositoryImpl,
    },
  ],
  exports: [ResumeService],
})
export class ResumeModule {}
