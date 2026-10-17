import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import type { IChatRepository } from '../repositories/chat.repository';
import { AdminLegacyChatsService } from './admin-legacy-chats.service';

describe('AdminLegacyChatsService', () => {
  it('keeps the repository queue scoped to unassigned chats', async () => {
    const findUnassignedForReview = jest.fn().mockResolvedValue({ data: [], total: 0 });
    const service = new AdminLegacyChatsService({
      findUnassignedForReview,
    } as unknown as IChatRepository);

    await service.list({ page: 2, limit: 25 });

    expect(findUnassignedForReview).toHaveBeenCalledWith({ take: 25, skip: 25 });
  });

  it('lists verified organizations as assignment choices', async () => {
    const findVerifiedOrganizationsForReview = jest.fn().mockResolvedValue({
      data: [{ id: 'org-1', name: 'Verified Labs' }],
      total: 1,
    });
    const service = new AdminLegacyChatsService({
      findVerifiedOrganizationsForReview,
    } as unknown as IChatRepository);

    await service.listVerifiedOrganizations({ page: 1, limit: 20, search: 'Verified' });

    expect(findVerifiedOrganizationsForReview).toHaveBeenCalledWith({
      take: 20,
      skip: 0,
      search: 'Verified',
    });
  });

  it('does not return detail for a chat outside the unassigned queue', async () => {
    const findUnassignedForReviewById = jest.fn().mockResolvedValue(null);
    const service = new AdminLegacyChatsService({
      findUnassignedForReviewById,
    } as unknown as IChatRepository);

    await expect(service.get('chat-1')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('records the authenticated actor when assigning a verified organization', async () => {
    const assignedAt = new Date('2026-10-09T12:00:00.000Z');
    jest.useFakeTimers().setSystemTime(assignedAt);
    const assignVerifiedOrganizationToUnassignedChat = jest
      .fn()
      .mockResolvedValue({ kind: 'assigned', assignedAt });
    const service = new AdminLegacyChatsService({
      assignVerifiedOrganizationToUnassignedChat,
    } as unknown as IChatRepository);

    const result = await service.assign({
      chatId: 'chat-1',
      organizationId: 'org-1',
      actorId: 'admin-1',
    });

    expect(result.assignedAt).toEqual(assignedAt);
    expect(assignVerifiedOrganizationToUnassignedChat).toHaveBeenCalledWith({
      chatId: 'chat-1',
      organizationId: 'org-1',
      actorId: 'admin-1',
      assignedAt,
    });
    jest.useRealTimers();
  });

  it('rejects an unverified organization', async () => {
    const service = new AdminLegacyChatsService({
      assignVerifiedOrganizationToUnassignedChat: jest
        .fn()
        .mockResolvedValue({ kind: 'organization_not_verified' }),
    } as unknown as IChatRepository);

    await expect(
      service.assign({ chatId: 'chat-1', organizationId: 'org-1', actorId: 'admin-1' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects a chat another admin already assigned', async () => {
    const service = new AdminLegacyChatsService({
      assignVerifiedOrganizationToUnassignedChat: jest
        .fn()
        .mockResolvedValue({ kind: 'already_assigned' }),
    } as unknown as IChatRepository);

    await expect(
      service.assign({ chatId: 'chat-1', organizationId: 'org-1', actorId: 'admin-1' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
