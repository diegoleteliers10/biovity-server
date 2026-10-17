import { UnauthorizedException } from '@nestjs/common';
import { ROLES_KEY } from '../../../shared/decorators/roles.decorator';
import { AdminLegacyChatsController } from './admin-legacy-chats.controller';

describe('AdminLegacyChatsController', () => {
  it('restricts all legacy chat review routes to admins', () => {
    expect(Reflect.getMetadata(ROLES_KEY, AdminLegacyChatsController)).toEqual(['admin']);
  });

  it('takes the assignment actor from the authenticated requester', async () => {
    const assign = jest.fn().mockResolvedValue({ chatId: 'chat-1' });
    const controller = new AdminLegacyChatsController({ assign } as never);

    await controller.assignOrganization(
      'chat-1',
      { organizationId: 'org-1' },
      { id: 'admin-1', email: 'admin@example.test', type: 'admin' } as never,
    );

    expect(assign).toHaveBeenCalledWith({
      chatId: 'chat-1',
      organizationId: 'org-1',
      actorId: 'admin-1',
    });
  });

  it('rejects assignment without an authenticated admin identity', async () => {
    const controller = new AdminLegacyChatsController({ assign: jest.fn() } as never);

    await expect(
      controller.assignOrganization('chat-1', { organizationId: 'org-1' }, undefined),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects internal-key requests without an actor before reading chat data', async () => {
    const list = jest.fn().mockResolvedValue({ data: [] });
    const listVerifiedOrganizations = jest.fn().mockResolvedValue({ data: [] });
    const get = jest.fn().mockResolvedValue({ messages: ['private message'] });
    const assign = jest.fn().mockResolvedValue({ chatId: 'chat-1' });
    const controller = new AdminLegacyChatsController({
      list,
      listVerifiedOrganizations,
      get,
      assign,
    } as never);

    await expect(Reflect.apply(controller.list, controller, [{}, undefined])).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    await expect(
      Reflect.apply(controller.listVerifiedOrganizations, controller, [{}, undefined]),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    await expect(Reflect.apply(controller.get, controller, ['chat-1', undefined])).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    await expect(
      Reflect.apply(controller.assignOrganization, controller, [
        'chat-1',
        { organizationId: 'org-1' },
        undefined,
      ]),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    expect(list).not.toHaveBeenCalled();
    expect(listVerifiedOrganizations).not.toHaveBeenCalled();
    expect(get).not.toHaveBeenCalled();
    expect(assign).not.toHaveBeenCalled();
  });

  it('rejects non-admin users before reading or assigning chats', async () => {
    const list = jest.fn().mockResolvedValue({ data: [] });
    const listVerifiedOrganizations = jest.fn().mockResolvedValue({ data: [] });
    const get = jest.fn().mockResolvedValue({ messages: ['private message'] });
    const assign = jest.fn().mockResolvedValue({ chatId: 'chat-1' });
    const controller = new AdminLegacyChatsController({
      list,
      listVerifiedOrganizations,
      get,
      assign,
    } as never);
    const actor = { id: 'organization-user', email: 'user@example.test', type: 'organization', organizationId: 'org-1' } as never;

    await expect(Reflect.apply(controller.list, controller, [{}, actor])).rejects.toMatchObject({
      status: 403,
    });
    await expect(
      Reflect.apply(controller.listVerifiedOrganizations, controller, [{}, actor]),
    ).rejects.toMatchObject({ status: 403 });
    await expect(Reflect.apply(controller.get, controller, ['chat-1', actor])).rejects.toMatchObject({
      status: 403,
    });
    await expect(
      Reflect.apply(controller.assignOrganization, controller, [
        'chat-1',
        { organizationId: 'org-1' },
        actor,
      ]),
    ).rejects.toMatchObject({ status: 403 });

    expect(list).not.toHaveBeenCalled();
    expect(listVerifiedOrganizations).not.toHaveBeenCalled();
    expect(get).not.toHaveBeenCalled();
    expect(assign).not.toHaveBeenCalled();
  });
});
