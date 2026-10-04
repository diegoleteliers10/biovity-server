import { NotFoundException } from '@nestjs/common';
import { Job } from '../../../core/domain/entities/job.entity';
import { JobService } from '../../../core/services/job.service';
import { OrganizationAccessService } from '../../../shared/auth/organization-access.service';
import { JobQuestionService } from '../../../core/services/job-question.service';
import { JobQuestionController } from './job-question.controller';

describe('JobQuestionController public questions', () => {
  const jobQuestionService = {
    getQuestionsByJobId: jest.fn(),
  };
  const organizationAccess = {};
  const jobService = {
    getJobById: jest.fn(),
  };
  const controller = new JobQuestionController(
    jobQuestionService as unknown as JobQuestionService,
    organizationAccess as unknown as OrganizationAccessService,
    jobService as unknown as JobService,
  );

  beforeEach(() => jest.clearAllMocks());

  it('does not expose published questions for a draft job', async () => {
    jobService.getJobById.mockResolvedValue(
      new Job('job-id', 'org-id', 'Draft', 'Description'),
    );

    await expect(
      controller.getPublishedQuestionsCanonical('job-id'),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(jobQuestionService.getQuestionsByJobId).not.toHaveBeenCalled();
  });
});
