import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AiCredentialEntity } from '../../../infrastructure/database/orm/ai-credential.entity';
import { AiCredentialsController } from './ai-credentials.controller';
import { AiCredentialsService } from '../../../core/services/ai-credentials.service';
import { InternalSecretGuard } from '../../../shared/guards/internal-secret.guard';

@Module({
  imports: [TypeOrmModule.forFeature([AiCredentialEntity])],
  controllers: [AiCredentialsController],
  providers: [AiCredentialsService, InternalSecretGuard],
  exports: [AiCredentialsService],
})
export class AiCredentialsModule {}
