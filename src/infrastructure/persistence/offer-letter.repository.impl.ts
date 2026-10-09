import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IOfferLetterRepository } from '../../core/repositories/offer-letter.repository';
import { OfferLetter } from '../../core/domain/entities/index';
import { OfferLetterEntity } from '../database/orm';

@Injectable()
export class OfferLetterRepositoryImpl implements IOfferLetterRepository {
  constructor(
    @InjectRepository(OfferLetterEntity)
    private readonly repository: Repository<OfferLetterEntity>,
  ) {}

  private toDomain(entity: OfferLetterEntity): OfferLetter {
    return new OfferLetter(
      entity.id,
      entity.applicationId,
      entity.jobId,
      entity.organizationId,
      entity.candidateId,
      entity.status,
      entity.letterData as OfferLetter['letterData'],
      entity.chatId,
      entity.messageId,
      entity.title,
      entity.pdfPath,
      entity.sentAt,
      entity.respondedAt,
      entity.createdAt,
      entity.updatedAt,
    );
  }

  async create(entity: OfferLetter): Promise<OfferLetter> {
    const saved = await this.repository.save({
      applicationId: entity.applicationId,
      jobId: entity.jobId,
      organizationId: entity.organizationId,
      candidateId: entity.candidateId,
      status: entity.status,
      letterData: entity.letterData as Record<string, unknown>,
      title: entity.title ?? null,
      pdfPath: entity.pdfPath ?? null,
      chatId: entity.chatId ?? null,
      messageId: entity.messageId ?? null,
    });
    return this.toDomain(saved);
  }

  async findById(id: string): Promise<OfferLetter | null> {
    const found = await this.repository.findOne({ where: { id } });
    return found ? this.toDomain(found) : null;
  }

  async findByApplicationId(applicationId: string): Promise<OfferLetter[]> {
    const rows = await this.repository.find({
      where: { applicationId },
      order: { createdAt: 'DESC' },
    });
    return rows.map(row => this.toDomain(row));
  }

  async updateStatus(
    id: string,
    status: OfferLetter['status'],
  ): Promise<OfferLetter | null> {
    await this.repository.update(
      { id },
      { status, respondedAt: new Date(), updatedAt: new Date() },
    );
    const updated = await this.findById(id);
    return updated;
  }

  async setMessageContext(
    id: string,
    chatId: string,
    messageId: string,
  ): Promise<void> {
    await this.repository.update(
      { id },
      { chatId, messageId, updatedAt: new Date() },
    );
  }
}
