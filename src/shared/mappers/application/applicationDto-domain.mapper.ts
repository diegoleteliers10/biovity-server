import { ApplicationCreateDto } from '../../../interfaces/dtos/application/application-create.dto';
import { CreateApplicationInput } from '../../../core/use-cases/application/application.use-case';

export class ApplicationDtoDomainMapper {
  static toCreateApplicationInput(
    dto: ApplicationCreateDto,
  ): CreateApplicationInput {
    return {
      jobId: dto.jobId,
      candidateId: dto.candidateId,
      coverLetter: dto.coverLetter,
      salaryMin: dto.salaryMin,
      salaryMax: dto.salaryMax,
      salaryCurrency: dto.salaryCurrency,
      availabilityDate: dto.availabilityDate,
      resumeUrl: dto.resumeUrl,
      answers: dto.answers,
    };
  }
}
