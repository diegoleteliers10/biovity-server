import { BadRequestException } from '@nestjs/common';
import { MessageService } from '../../../core/services/message.service';
import { OrganizationAccessService } from '../../../shared/auth/organization-access.service';
import type { AuthenticatedUser } from '../../../shared/auth/better-auth-session.service';
import { MessageController } from './message.controller';

describe('MessageController verification access', () => {
  const candidate: AuthenticatedUser = {
    id: 'candidate-id',
    email: 'candidate@example.com',
    type: 'professional',
    organizationId: null,
  };

  it('does not create a message when chat access fails', async () => {
    const messageService = { createMessage: jest.fn() };
    const organizationAccess = {
      assertChatParticipant: jest
        .fn()
        .mockRejectedValue(new BadRequestException()),
    };
    const controller = new MessageController(
      messageService as unknown as MessageService,
      organizationAccess as unknown as OrganizationAccessService,
    );

    await expect(
      controller.createMessage(
        { chatId: 'chat-id', senderId: candidate.id, content: 'Hello' },
        candidate,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(messageService.createMessage).not.toHaveBeenCalled();
  });

  it('keeps candidate messages available in an existing chat', async () => {
    const message = {
      id: 'message-id',
      chatId: 'chat-id',
      senderId: candidate.id,
      content: 'Hello',
      createdAt: new Date(),
      read: false,
    };
    const messageService = { createMessage: jest.fn().mockResolvedValue(message) };
    const organizationAccess = {
      assertChatParticipant: jest.fn().mockResolvedValue({
        participantId: candidate.id,
        role: 'professional',
      }),
    };
    const controller = new MessageController(
      messageService as unknown as MessageService,
      organizationAccess as unknown as OrganizationAccessService,
    );

    await controller.createMessage(
      { chatId: 'chat-id', senderId: candidate.id, content: 'Hello' },
      candidate,
    );

    expect(messageService.createMessage).toHaveBeenCalledWith(
      expect.objectContaining({ senderId: candidate.id }),
    );
  });
});
