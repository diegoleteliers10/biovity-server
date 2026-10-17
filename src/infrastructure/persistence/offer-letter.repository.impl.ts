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
      entity.expiresAt,
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

  async createWithMessage(input: {
    offerLetter: OfferLetter;
    recruiterId: string;
    messageTitle: string;
    expiresOn?: string;
  }): Promise<{ offerLetter: OfferLetter; chatId: string; messageId: string }> {
    return this.repository.manager.transaction(async manager => {
      const saved = await manager.save(OfferLetterEntity, {
        applicationId: input.offerLetter.applicationId,
        jobId: input.offerLetter.jobId,
        organizationId: input.offerLetter.organizationId,
        candidateId: input.offerLetter.candidateId,
        status: input.offerLetter.status,
        letterData: input.offerLetter.letterData as Record<string, unknown>,
        title: input.offerLetter.title ?? null,
        pdfPath: input.offerLetter.pdfPath ?? null,
        chatId: null,
        messageId: null,
      });
      if (input.expiresOn) {
        await manager.query(
          `UPDATE offer_letter
           SET expires_at = (($2::date + 1)::timestamp AT TIME ZONE 'America/Santiago')
           WHERE id = $1::uuid`,
          [saved.id, input.expiresOn],
        );
      }

      const chats = await manager.query<Array<{ id: string }>>(
        `SELECT id FROM chat
         WHERE "recruiterId" = $1 AND "professionalId" = $2
           AND "is_archived_recruiter" = false AND "is_archived_professional" = false
         ORDER BY "createdAt" DESC LIMIT 1`,
        [input.recruiterId, input.offerLetter.candidateId],
      );

      const chatId = chats[0]
        ? chats[0].id
        : (
            await manager.query<Array<{ id: string }>>(
              `INSERT INTO chat ("id", "recruiterId", "professionalId")
               VALUES (uuid_generate_v4(), $1, $2) RETURNING id`,
              [input.recruiterId, input.offerLetter.candidateId],
            )
          )[0].id;

      const messages = await manager.query<Array<{ id: string }>>(
        `INSERT INTO message
          ("id", "chatId", "senderId", "content", "type", "content_type")
         VALUES (
           uuid_generate_v4(), $1, $2, $3, 'offer', $4::jsonb
         ) RETURNING id`,
        [
          chatId,
          input.recruiterId,
          input.messageTitle,
          JSON.stringify({
            offerLetterId: saved.id,
            title: input.messageTitle,
            status: 'sent',
            expiresOn: input.expiresOn ?? null,
          }),
        ],
      );
      const messageId = messages[0].id;

      await manager.query(
        `UPDATE chat SET "lastMessage" = $2, "updatedAt" = now() WHERE id = $1`,
        [chatId, input.messageTitle],
      );
      await manager.update(
        OfferLetterEntity,
        { id: saved.id },
        { chatId, messageId, updatedAt: new Date() },
      );
      await manager.query(
        `INSERT INTO message_notification_intent (message_id, chat_id, recipient_id)
         VALUES ($1::uuid, $2::uuid, $3::uuid)`,
        [messageId, chatId, input.offerLetter.candidateId],
      );

      return {
        offerLetter: this.toDomain({ ...saved, chatId, messageId }),
        chatId,
        messageId,
      };
    });
  }

  async findById(id: string): Promise<OfferLetter | null> {
    const found = await this.repository.findOne({ where: { id } });
    return found ? this.toDomain(found) : null;
  }

  async cancel(
    id: string,
    organizationId: string,
    actorId: string,
  ): Promise<boolean> {
    return this.repository.manager.transaction(async manager => {
      const rows = await manager.query<Array<{ message_id: string | null }>>(
        `UPDATE offer_letter
         SET status = 'cancelled', updated_at = now()
         WHERE id = $1::uuid AND organization_id = $2::uuid
           AND status = 'sent' AND expires_at > now()
         RETURNING message_id`,
        [id, organizationId],
      );
      if (!rows[0]) return false;
      if (rows[0].message_id) {
        await manager.query(
          `UPDATE message SET content_type = jsonb_set(content_type, '{status}', '"cancelled"')
           WHERE id = $1::uuid`,
          [rows[0].message_id],
        );
      }
      await manager.query(
        `INSERT INTO offer_letter_action_audit (offer_id, actor_id, action)
         VALUES ($1::uuid, $2::uuid, 'cancelled')`,
        [id, actorId],
      );
      return true;
    });
  }

  async resend(
    id: string,
    organizationId: string,
    actorId: string,
    expiresOn: string,
    pdfPath: string,
  ): Promise<boolean> {
    return this.repository.manager.transaction(async manager => {
      const rows = await manager.query<
        Array<{
          chat_id: string;
          candidate_id: string;
          title: string;
        }>
      >(
        `UPDATE offer_letter
         SET expires_at = (($3::date + 1)::timestamp AT TIME ZONE 'America/Santiago'),
             sent_at = now(), updated_at = now(), pdf_path = $4,
             letter_data = jsonb_set(letter_data, '{offerValidUntil}', to_jsonb($3::text), true)
         WHERE id = $1::uuid AND organization_id = $2::uuid AND chat_id IS NOT NULL
           AND status = 'sent' AND expires_at > now()
         RETURNING chat_id, candidate_id, title`,
        [id, organizationId, expiresOn, pdfPath],
      );
      const offer = rows[0];
      if (!offer) return false;
      await manager.query(
        `UPDATE message
         SET content_type = jsonb_set(content_type, '{status}', '"superseded"')
         WHERE type = 'offer' AND content_type->>'offerLetterId' = $1
           AND content_type->>'status' = 'sent'`,
        [id],
      );
      const message = await manager.query<Array<{ id: string }>>(
        `INSERT INTO message (id, "chatId", "senderId", content, type, content_type)
         VALUES (uuid_generate_v4(), $1::uuid, $2::uuid, $3, 'offer',
           jsonb_build_object('offerLetterId', $4::text, 'title', $3, 'status', 'sent', 'expiresOn', $5::text))
         RETURNING id`,
        [offer.chat_id, actorId, offer.title, id, expiresOn],
      );
      await manager.query(
        `UPDATE chat SET "lastMessage" = $2, "updatedAt" = now() WHERE id = $1::uuid`,
        [offer.chat_id, offer.title],
      );
      await manager.query(
        `UPDATE offer_letter SET message_id = $2::uuid WHERE id = $1::uuid`,
        [id, message[0].id],
      );
      await manager.query(
        `INSERT INTO message_notification_intent (message_id, chat_id, recipient_id)
         VALUES ($1::uuid, $2::uuid, $3::uuid)`,
        [message[0].id, offer.chat_id, offer.candidate_id],
      );
      await manager.query(
        `INSERT INTO offer_letter_action_audit (offer_id, actor_id, action, expires_on)
         VALUES ($1::uuid, $2::uuid, 'resent', $3::date)`,
        [id, actorId, expiresOn],
      );
      return true;
    });
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
    const result = await this.repository.update(
      { id, status: 'sent' },
      { status, respondedAt: new Date(), updatedAt: new Date() },
    );
    if (result.affected === 0) return null;
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
