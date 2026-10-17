import { Chat } from '../domain/entities/index';

export interface ChatPagination {
  take?: number;
  skip?: number;
}

export type ChatReviewParticipant = {
  id: string;
  name: string;
  email: string;
};

export type UnassignedChatReviewSummary = {
  id: string;
  createdAt: Date;
  updatedAt: Date | null;
  recruiter: ChatReviewParticipant;
  professional: ChatReviewParticipant;
};

export type UnassignedChatReviewMessage = {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  createdAt: Date;
};

export type UnassignedChatReviewDetail = UnassignedChatReviewSummary & {
  messages: UnassignedChatReviewMessage[];
};

export type VerifiedChatReviewOrganization = {
  id: string;
  name: string;
};

export type VerifiedChatOrganizationAssignmentInput = {
  chatId: string;
  organizationId: string;
  actorId: string;
  assignedAt: Date;
};

export type VerifiedChatOrganizationAssignmentResult =
  | { kind: 'assigned' }
  | { kind: 'chat_not_found' }
  | { kind: 'already_assigned' }
  | { kind: 'organization_not_found' }
  | { kind: 'organization_not_verified' };

export interface IChatRepository {
  create(entity: Chat): Promise<Chat>;
  findById(id: string): Promise<Chat | null>;
  findByRecruiterAndProfessional(
    recruiterId: string,
    professionalId: string,
    organizationId?: string,
  ): Promise<Chat | null>;
  findByRecruiterId(
    recruiterId: string,
    pagination?: ChatPagination,
  ): Promise<Chat[]>;
  findByProfessionalId(
    professionalId: string,
    pagination?: ChatPagination,
  ): Promise<Chat[]>;
  countByRecruiterId(recruiterId: string): Promise<number>;
  countByProfessionalId(professionalId: string): Promise<number>;
  findUnassignedForReview(
    pagination?: ChatPagination,
  ): Promise<{ data: UnassignedChatReviewSummary[]; total: number }>;
  findUnassignedForReviewById(
    id: string,
  ): Promise<UnassignedChatReviewDetail | null>;
  findVerifiedOrganizationsForReview(input: {
    take: number;
    skip: number;
    search?: string;
  }): Promise<{ data: VerifiedChatReviewOrganization[]; total: number }>;
  assignVerifiedOrganizationToUnassignedChat(
    input: VerifiedChatOrganizationAssignmentInput,
  ): Promise<VerifiedChatOrganizationAssignmentResult>;
  update(id: string, entity: Partial<Chat>): Promise<Chat | null>;
  delete(id: string): Promise<boolean>;
}
