import { ApplicationCreateDto } from '../../../interfaces/dtos/application/application-create.dto';
import { CreateApplicationInput } from '../../../core/use-cases/application/application.use-case';

export class ApplicationDtoDomainMapper {
  static toCreateApplicationInput(
    dto: ApplicationCreateDto,
  ): CreateApplicationInput {
    return {
      jobId: dto.jobId,
      candidateId: dto.candidateId,
    };
  }
}
