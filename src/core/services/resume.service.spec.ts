import { ResumeService } from './resume.service';
import { Resume } from '../domain/entities/resume.entity';
import type { IResumeRepository } from '../repositories/resume.repository';
import type { IUserRepository } from '../repositories/user.repository';
import { ResumeDtoDomainMapper } from '../../shared/mappers/resume/resumeDto-domain.mapper';

describe('Resume CV clear contract', () => {
  const repository = { findById: jest.fn(), update: jest.fn() };
  const service = new ResumeService(repository as unknown as IResumeRepository, {} as IUserRepository);
  const cvFile = { url: '/api/cv/signed-url?path=cv/file_owner.pdf', path: 'cv/file_owner.pdf' };
  beforeEach(() => {
    jest.clearAllMocks();
    const resume = new Resume('resume', 'owner');
    resume.cvFile = cvFile;
    repository.findById.mockResolvedValue(resume);
    repository.update.mockImplementation((_id: string, resume: Resume) => Promise.resolve(resume));
  });

  it('preserves the CV when a profile update omits it', async () => {
    await service.updateResume('resume', { summary: 'Updated' });
    expect(repository.update).toHaveBeenCalledWith('resume', expect.objectContaining({ cvFile }));
  });

  it('persists null when the owner deletes the CV', async () => {
    const input = ResumeDtoDomainMapper.toCreateResumeInput({ userId: 'owner', cvFile: null });
    await service.updateResume('resume', input);
    expect(repository.update).toHaveBeenCalledWith('resume', expect.objectContaining({ cvFile: null }));
  });

  it('preserves the storage path through DTO mapping', () => {
    expect(ResumeDtoDomainMapper.toCreateResumeInput({ userId: 'owner', cvFile }).cvFile).toEqual(expect.objectContaining(cvFile));
  });
});
