import {
  CreateQuestionDto,
  UpdateQuestionDto,
} from '../../../interfaces/dtos/job-question/question.dto';
import {
  CreateQuestionInput,
  UpdateQuestionInput,
} from '../../../core/use-cases/job-question/job-question.use-case';

export class JobQuestionDtoDomainMapper {
  static toCreateInput(
    dto: CreateQuestionDto,
    jobId: string,
    organizationId: string,
  ): CreateQuestionInput {
    return {
      jobId,
      organizationId,
      label: dto.label,
      type: dto.type,
      required: dto.required,
      orderIndex: dto.orderIndex,
      status: dto.status,
      placeholder: dto.placeholder,
      helperText: dto.helperText,
      options: dto.options,
    };
  }

  static toUpdateInput(dto: UpdateQuestionDto): UpdateQuestionInput {
    return {
      label: dto.label,
      type: dto.type,
      required: dto.required,
      orderIndex: dto.orderIndex,
      status: dto.status,
      placeholder: dto.placeholder,
      helperText: dto.helperText,
      options: dto.options,
    };
  }
}
