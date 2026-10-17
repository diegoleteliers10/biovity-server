import { ApplicationStatus } from '../../../core/domain/enums';
import { Application } from '../../../core/domain/entities/application.entity';
import { ApplicationDomainDtoMapper } from './applicationDomain-dto.mapper';

describe('ApplicationDomainDtoMapper hiring plan visibility', () => {
  const application = new Application(
    'application-id',
    'job-id',
    'candidate-id',
    new Date('2026-10-01T00:00:00Z'),
    new Date('2026-10-02T00:00:00Z'),
    ApplicationStatus.PENDIENTE,
    new Date('2026-10-01T00:00:00Z'),
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    'stage-id',
    'recruiter-id',
    'Llamar al candidato',
    '2026-11-30',
  );

  it('shows the hiring plan to recruiters', () => {
    const dto = ApplicationDomainDtoMapper.toDto(application, 'recruiter');
    expect(dto).toMatchObject({
      assigneeId: 'recruiter-id',
      nextAction: 'Llamar al candidato',
      targetDate: '2026-11-30',
    });
  });

  it('hides the hiring plan from candidate-facing projections', () => {
    const dto = ApplicationDomainDtoMapper.toDto(application, 'full');
    expect(dto.assigneeId).toBeUndefined();
    expect(dto.nextAction).toBeUndefined();
    expect(dto.targetDate).toBeUndefined();
  });
});
