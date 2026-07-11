import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CandidateTagEntity } from '../../../infrastructure/database/orm/candidate-tag.entity';
import { CandidateTagAssignmentEntity } from '../../../infrastructure/database/orm/candidate-tag-assignment.entity';
import { CandidateTagController } from './candidate-tag.controller';
import { CandidateTagService } from '../../../core/services/candidate-tag.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CandidateTagEntity,
      CandidateTagAssignmentEntity,
    ]),
  ],
  controllers: [CandidateTagController],
  providers: [CandidateTagService],
  exports: [CandidateTagService],
})
export class CandidateTagModule {}
