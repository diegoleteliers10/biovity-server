import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SavedCandidateEntity } from '../../../infrastructure/database/orm/saved-candidate.entity';
import { SavedCandidateController } from './saved-candidate.controller';
import { SavedCandidateService } from '../../../core/services/saved-candidate.service';

@Module({
  imports: [TypeOrmModule.forFeature([SavedCandidateEntity])],
  controllers: [SavedCandidateController],
  providers: [SavedCandidateService],
  exports: [SavedCandidateService],
})
export class SavedCandidateModule {}
