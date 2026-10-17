import { IsIn, IsObject, IsOptional, IsString, IsUUID } from 'class-validator';
import type { EvaluationRating } from '../../../core/domain/entities/application-evaluation';

export class ApplicationEvaluationDto {
  @IsUUID()
  applicationId: string;

  @IsIn(['positive', 'neutral', 'negative'])
  rating: EvaluationRating;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsObject()
  skillsAssessment?: Record<string, string>;
}
