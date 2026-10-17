import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ResumeEntity, UserEntity } from '../../../infrastructure/database/orm';
import { ResumeController } from './resume.controller';
import { ResumeService } from '../../../core/services/resume.service';
import { ResumeRepositoryImpl } from '../../../infrastructure/persistence/resume.repository.impl';
import { UserRepositoryImpl } from '../../../infrastructure/persistence/user.repository.impl';
import { ResumeCvLifecycleService } from '../../../core/services/resume-cv-lifecycle.service';
import { AdminCvCleanupController } from '../admin/admin-cv-cleanup.controller';
import { InternalSecretGuard } from '../../../shared/guards/internal-secret.guard';
import { CryptoModule } from '../../../shared/crypto/crypto.module';

@Module({
  imports: [TypeOrmModule.forFeature([ResumeEntity, UserEntity]), CryptoModule],
  controllers: [ResumeController, AdminCvCleanupController],
  providers: [
    ResumeService,
    ResumeCvLifecycleService,
    InternalSecretGuard,
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
