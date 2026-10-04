import { ApplicationController } from './application.controller';
import { ApplicationService } from '../../../core/services/application.service';
import { Application } from '../../../core/domain/entities/application.entity';
import { OrganizationAccessService } from '../../../shared/auth/organization-access.service';
import { ApplicationQueryDto } from '../../dtos/application/application-query.dto';

describe('Application contact access', () => {
  const application = Object.assign(
    new Application('app', 'job', 'candidate'),
    {
      resumeUrl: '/api/cv/signed-url?path=private',
      coverLetter: 'Private contact text',
      candidate: {
        id: 'candidate',
        name: 'Candidate',
        email: 'private@example.invalid',
      },
      job: { id: 'job', title: 'Job', organizationId: 'organization' },
    },
  );
  const requester = {
    id: 'member',
    email: 'member@example.invalid',
    type: 'organization',
    organizationId: 'organization',
  };
  const run = async (canRecruit: boolean) => {
    const controller = new ApplicationController(
      {
        getApplicationsByJobId: jest
          .fn()
          .mockResolvedValue({ data: [application], total: 1 }),
      } as unknown as ApplicationService,
      {
        assertJobAccess: jest.fn(),
        hasAccess: jest.fn().mockResolvedValue(canRecruit),
      } as unknown as OrganizationAccessService,
    );
    return controller.getApplicationsByJob(
      'job',
      {} as ApplicationQueryDto,
      requester,
    );
  };
  it('keeps a viewer list without candidate contact, CV, or free text', async () => {
    const result = await run(false);
    expect(result.data[0].candidate?.name).toBe('Candidate');
    expect(result.data[0].candidate?.email).toBeUndefined();
    expect(result.data[0].resumeUrl).toBeUndefined();
    expect(result.data[0].coverLetter).toBeUndefined();
  });
  it('keeps full candidate data for an authorized recruiter', async () => {
    const result = await run(true);
    expect(result.data[0].candidate?.email).toBe('private@example.invalid');
    expect(result.data[0].resumeUrl).toBeDefined();
  });
});
