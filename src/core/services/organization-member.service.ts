import {
  Injectable,
  NotFoundException,
  ConflictException,
  Inject,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { IOrganizationMemberRepository } from '../repositories/organization-member.repository';
import {
  OrganizationMember,
  OrganizationMemberRole,
} from '../domain/entities/organization-member.entity';
import {
  parsePagination,
  paginated,
  type PaginatedResponse,
  type PaginationQuery,
} from '../../shared/pagination/pagination';

export interface AddMemberInput {
  organizationId: string;
  userId: string;
  role: OrganizationMemberRole;
}

export interface UpdateMemberRoleInput {
  role: OrganizationMemberRole;
}

@Injectable()
export class OrganizationMemberService {
  constructor(
    @Inject('IOrganizationMemberRepository')
    private readonly memberRepository: IOrganizationMemberRepository,
  ) {}

  private generateId(): string {
    return crypto.randomUUID();
  }

  async addMember(input: AddMemberInput): Promise<OrganizationMember> {
    const existing = await this.memberRepository.findByOrganizationAndUser(
      input.organizationId,
      input.userId,
    );
    if (existing) {
      throw new ConflictException(
        'User is already a member of this organization',
      );
    }

    const member = new OrganizationMember(
      this.generateId(),
      input.organizationId,
      input.userId,
      input.role,
    );

    return this.memberRepository.create(member);
  }

  async getMembers(
    organizationId: string,
    pagination?: PaginationQuery,
  ): Promise<PaginatedResponse<OrganizationMember>> {
    const { page, limit, skip } = parsePagination(pagination ?? {});
    const [members, total] = await Promise.all([
      this.memberRepository.findByOrganization(organizationId, {
        take: limit,
        skip,
      }),
      this.memberRepository.countByOrganization(organizationId),
    ]);
    return paginated(members, total, page, limit);
  }

  async getMemberById(id: string): Promise<OrganizationMember> {
    const member = await this.memberRepository.findById(id);
    if (!member) throw new NotFoundException('Member not found');
    return member;
  }

  async updateMemberRole(
    id: string,
    input: UpdateMemberRoleInput,
  ): Promise<OrganizationMember> {
    const member = await this.memberRepository.findById(id);
    if (!member) throw new NotFoundException('Member not found');

    const updated = await this.memberRepository.update(id, {
      role: input.role,
    });
    if (!updated) throw new NotFoundException('Failed to update member');
    return updated;
  }

  async removeMember(id: string): Promise<boolean> {
    const member = await this.memberRepository.findById(id);
    if (!member) throw new NotFoundException('Member not found');

    return this.memberRepository.delete(id);
  }

  async getUserRole(
    organizationId: string,
    userId: string,
  ): Promise<OrganizationMemberRole | null> {
    const member = await this.memberRepository.findByOrganizationAndUser(
      organizationId,
      userId,
    );
    return member?.role ?? null;
  }
}
