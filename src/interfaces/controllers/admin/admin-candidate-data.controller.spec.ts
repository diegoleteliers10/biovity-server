import type { AuthenticatedUser } from '../../../shared/auth/better-auth-session.service';
import { CandidateDataLifecycleService } from '../../../core/services/candidate-data-lifecycle.service';
import { AdminCandidateDataController } from './admin-candidate-data.controller';

describe('AdminCandidateDataController', () => {
  it('forwards the candidate and authenticated actor IDs to the export service', async () => {
    const exportResult = { candidate: { id: 'candidate-id' } };
    const lifecycle = {
      exportCandidateData: jest.fn().mockResolvedValue(exportResult),
    } as unknown as CandidateDataLifecycleService;
    const controller = new AdminCandidateDataController(lifecycle);
    const actor: AuthenticatedUser = {
      id: 'admin-id',
      email: 'admin@example.com',
      type: 'admin',
      organizationId: null,
    };

    await expect(
      controller.exportCandidateData('candidate-id', actor),
    ).resolves.toEqual(exportResult);
    expect(lifecycle.exportCandidateData).toHaveBeenCalledWith(
      'candidate-id',
      'admin-id',
    );
  });
});
