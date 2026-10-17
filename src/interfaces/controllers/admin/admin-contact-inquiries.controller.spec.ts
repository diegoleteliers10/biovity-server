import type { AuthenticatedUser } from '../../../shared/auth/better-auth-session.service';
import { AdminContactInquiriesService } from '../../../core/services/admin-contact-inquiries.service';
import type { UpdateContactInquiryDto } from '../../dtos/admin/contact-inquiries.dto';
import { AdminContactInquiriesController } from './admin-contact-inquiries.controller';

describe('AdminContactInquiriesController', () => {
  it('forwards updates with the authenticated actor ID', async () => {
    const updateResult = { id: 42, status: 'in_progress' };
    const inquiries = {
      update: jest.fn().mockResolvedValue(updateResult),
    } as unknown as AdminContactInquiriesService;
    const controller = new AdminContactInquiriesController(inquiries);
    const actor: AuthenticatedUser = {
      id: 'admin-id',
      email: 'admin@example.com',
      type: 'admin',
      organizationId: null,
    };
    const input: UpdateContactInquiryDto = { status: 'in_progress' };

    await expect(controller.update(42, input, actor)).resolves.toEqual(
      updateResult,
    );
    expect(inquiries.update).toHaveBeenCalledWith(42, 'admin-id', input);
  });
});
