import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  Inject,
} from '@nestjs/common';
import type { IChatRepository } from '../repositories/chat.repository';
import type {
  UnassignedChatReviewDetail,
  UnassignedChatReviewSummary,
  VerifiedChatReviewOrganization,
} from '../repositories/chat.repository';
import type { AdminLegacyChatsQueryDto } from '../../interfaces/dtos/admin/admin-legacy-chats.dto';

export type AdminLegacyChatsPage = {
  data: UnassignedChatReviewSummary[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

export type AdminVerifiedOrganizationsPage = {
  data: VerifiedChatReviewOrganization[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

export type AdminLegacyChatAssignment = {
  chatId: string;
  organizationId: string;
  assignedById: string;
  assignedAt: Date;
};

@Injectable()
export class AdminLegacyChatsService {
  constructor(
    @Inject('IChatRepository')
    private readonly chats: IChatRepository,
  ) {}

  async list(query: AdminLegacyChatsQueryDto): Promise<AdminLegacyChatsPage> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const result = await this.chats.findUnassignedForReview({
      take: limit,
      skip: (page - 1) * limit,
    });

    return {
      ...result,
      page,
      limit,
      totalPages: Math.ceil(result.total / limit),
    };
  }

  async get(chatId: string): Promise<UnassignedChatReviewDetail> {
    const chat = await this.chats.findUnassignedForReviewById(chatId);
    if (!chat) throw new NotFoundException('Unassigned chat not found');
    return chat;
  }

  async listVerifiedOrganizations(
    query: AdminLegacyChatsQueryDto,
  ): Promise<AdminVerifiedOrganizationsPage> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const result = await this.chats.findVerifiedOrganizationsForReview({
      take: limit,
      skip: (page - 1) * limit,
      search: query.search,
    });

    return {
      ...result,
      page,
      limit,
      totalPages: Math.ceil(result.total / limit),
    };
  }

  async assign(input: {
    chatId: string;
    organizationId: string;
    actorId: string;
  }): Promise<AdminLegacyChatAssignment> {
    const assignedAt = new Date();
    const result = await this.chats.assignVerifiedOrganizationToUnassignedChat({
      ...input,
      assignedAt,
    });

    switch (result.kind) {
      case 'assigned':
        return {
          chatId: input.chatId,
          organizationId: input.organizationId,
          assignedById: input.actorId,
          assignedAt,
        };
      case 'chat_not_found':
        throw new NotFoundException('Unassigned chat not found');
      case 'already_assigned':
        throw new ConflictException('Chat already has an organization');
      case 'organization_not_found':
        throw new NotFoundException('Organization not found');
      case 'organization_not_verified':
        throw new BadRequestException('Organization must be verified');
      default: {
        const exhaustive: never = result;
        return exhaustive;
      }
    }
  }
}
