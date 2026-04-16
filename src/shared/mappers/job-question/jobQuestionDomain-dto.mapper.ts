import { JobQuestion } from '../../../core/domain/entities/job-question.entity';
import { QuestionResponseDto } from '../../../interfaces/dtos/job-question/question-response.dto';
import {
  QuestionType,
  QuestionStatus,
} from '../../../interfaces/dtos/job-question/question.dto';

export class JobQuestionDomainDtoMapper {
  static toDto(domain: JobQuestion): QuestionResponseDto {
    const dto = new QuestionResponseDto();
    dto.id = domain.id;
    dto.jobId = domain.jobId;
    dto.organizationId = domain.organizationId;
    dto.label = domain.label;
    dto.type = domain.type as QuestionType;
    dto.required = domain.required;
    dto.orderIndex = domain.orderIndex;
    dto.status = domain.status as QuestionStatus;
    dto.placeholder = domain.placeholder;
    dto.helperText = domain.helperText;
    dto.options = domain.options;
    dto.createdAt = domain.createdAt;
    dto.updatedAt = domain.updatedAt;
    return dto;
  }

  static toDtoList(domains: JobQuestion[]): QuestionResponseDto[] {
    return domains.map(d => this.toDto(d));
  }
}
