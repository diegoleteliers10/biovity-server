import {
  IsIn,
  IsArray,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  ArrayMaxSize,
  MaxLength,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import type {
  InterviewRating,
  InterviewRecommendation,
} from '../../../core/repositories/event-interview.repository';

export class SaveEventInterviewEvaluationDto {
  @IsIn(['positive', 'neutral', 'negative'])
  rating: InterviewRating;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  notes?: string;

  @IsOptional()
  @IsObject()
  skillsAssessment?: Record<string, string>;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => InterviewCriterionResponseDto)
  criterionResponses?: InterviewCriterionResponseDto[];

  @IsOptional()
  @IsIn(['advance', 'hold', 'no_advance'])
  recommendation?: InterviewRecommendation;
}

export class InterviewCriterionResponseDto {
  @IsString()
  @IsUUID()
  criterionId: string;

  @IsInt()
  @Min(1)
  @Max(5)
  score: number;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  evidence?: string;
}

export class SaveEventInterviewOutcomeDto {
  @IsIn(['advance', 'hold', 'no_advance'])
  outcome: InterviewRecommendation;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  notes?: string;
}
