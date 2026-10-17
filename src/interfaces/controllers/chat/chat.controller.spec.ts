import { Chat } from '../../../core/domain/entities/chat.entity';
import { ChatService } from '../../../core/services/chat.service';
import type { AuthenticatedUser } from '../../../shared/auth/better-auth-session.service';
import { OrganizationAccessService } from '../../../shared/auth/organization-access.service';
import { ChatController } from './chat.controller';

describe('ChatController.createChat', () => {
  it('validates and stores the requested organization ID', async () => {
    const organizationId = '11111111-1111-4111-8111-111111111111';
    const recruiterId = '22222222-2222-4222-8222-222222222222';
    const professionalId = '33333333-3333-4333-8333-333333333333';
    const requester: AuthenticatedUser = {
      id: recruiterId,
      email: 'recruiter@example.com',
      type: 'organization',
      organizationId: null,
    };
    const assertChatCreation = jest.fn().mockResolvedValue(undefined);
    const createChat = jest.fn().mockResolvedValue(
      new Chat(
        '44444444-4444-4444-8444-444444444444',
        recruiterId,
        professionalId,
        undefined,
        0,
        0,
        new Date('2026-01-01T00:00:00.000Z'),
        undefined,
        false,
        false,
        false,
        false,
        organizationId,
      ),
    );
    const controller = new ChatController(
      { createChat } as unknown as ChatService,
      { assertChatCreation } as unknown as OrganizationAccessService,
    );

    const response = await controller.createChat(
      { recruiterId, professionalId, organizationId },
      requester,
    );

    expect(assertChatCreation).toHaveBeenCalledWith(
      recruiterId,
      professionalId,
      organizationId,
      requester,
    );
    expect(createChat).toHaveBeenCalledWith({
      recruiterId,
      professionalId,
      organizationId,
      lastMessage: undefined,
    });
    expect(response.organizationId).toBe(organizationId);
  });
});
