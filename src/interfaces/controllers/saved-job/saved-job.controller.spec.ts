import { ForbiddenException } from '@nestjs/common';
import { SavedJobService } from '../../../core/services/saved-job.service';
import type { AuthenticatedUser } from '../../../shared/auth/better-auth-session.service';
import { SavedJobController } from './saved-job.controller';

const requester: AuthenticatedUser = {
  id: 'owner', email: 'owner@example.com', type: 'professional', organizationId: null,
};

describe('SavedJobController ownership', () => {
  const service = {
    saveJob: jest.fn(), getSavedJobsByUserId: jest.fn(), checkIfJobIsSaved: jest.fn(),
    getSavedJobById: jest.fn(), deleteSavedJob: jest.fn(), unsaveJob: jest.fn(),
  };
  const controller = new SavedJobController(service as unknown as SavedJobService);

  beforeEach(() => jest.clearAllMocks());

  it('rejects saves, lists, checks and deletes for another user', async () => {
    await expect(controller.saveJob({ userId: 'other', jobId: 'job' }, requester)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(controller.getSavedJobsByUser('other', {}, requester)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(controller.checkIfJobIsSaved('other', 'job', requester)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(controller.unsaveJob('other', 'job', requester)).rejects.toBeInstanceOf(ForbiddenException);
    expect(service.saveJob).not.toHaveBeenCalled();
    expect(service.getSavedJobsByUserId).not.toHaveBeenCalled();
    expect(service.checkIfJobIsSaved).not.toHaveBeenCalled();
    expect(service.unsaveJob).not.toHaveBeenCalled();
  });

  it('rejects access by saved record ID before a delete', async () => {
    service.getSavedJobById.mockResolvedValue({ id: 'saved', userId: 'other', jobId: 'job' });
    await expect(controller.getSavedJobById('saved', requester)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(controller.deleteSavedJob('saved', requester)).rejects.toBeInstanceOf(ForbiddenException);
    expect(service.deleteSavedJob).not.toHaveBeenCalled();
  });

  it('permits the owner and rejects a missing session', async () => {
    service.checkIfJobIsSaved.mockResolvedValue(true);
    await expect(controller.checkIfJobIsSaved('owner', 'job', requester)).resolves.toEqual({ isSaved: true });
    await expect(controller.checkIfJobIsSaved('owner', 'job', undefined)).rejects.toBeInstanceOf(ForbiddenException);
  });
});
