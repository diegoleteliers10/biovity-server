import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MessageTemplateEntity } from '../../infrastructure/database/orm/message-template.entity';

export interface CreateMessageTemplateInput {
  organizationId: string;
  title: string;
  content: string;
}

export interface UpdateMessageTemplateInput {
  title?: string;
  content?: string;
}

@Injectable()
export class MessageTemplateService {
  constructor(
    @InjectRepository(MessageTemplateEntity)
    private readonly repo: Repository<MessageTemplateEntity>,
  ) {}

  async findByOrganization(
    organizationId: string,
  ): Promise<MessageTemplateEntity[]> {
    return this.repo.find({
      where: { organizationId },
      order: { createdAt: 'DESC' },
    });
  }

  async findById(
    id: string,
    organizationId: string,
  ): Promise<MessageTemplateEntity | null> {
    return this.repo.findOne({ where: { id, organizationId } });
  }

  async create(
    input: CreateMessageTemplateInput,
  ): Promise<MessageTemplateEntity> {
    const entity = this.repo.create({
      organizationId: input.organizationId,
      title: input.title,
      content: input.content,
    });
    return this.repo.save(entity);
  }

  async update(
    id: string,
    organizationId: string,
    input: UpdateMessageTemplateInput,
  ): Promise<MessageTemplateEntity | null> {
    const existing = await this.repo.findOne({ where: { id, organizationId } });
    if (!existing) return null;

    if (input.title !== undefined) existing.title = input.title;
    if (input.content !== undefined) existing.content = input.content;

    return this.repo.save(existing);
  }

  async delete(id: string, organizationId: string): Promise<boolean> {
    const result = await this.repo.delete({ id, organizationId });
    return (result.affected ?? 0) > 0;
  }
}
