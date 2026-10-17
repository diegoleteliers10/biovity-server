import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { IOfferLetterRepository } from '../repositories/offer-letter.repository';
import { NotificationType } from '../domain/enums';
import { NotificationService } from '../../shared/notification/notification.service';
import { IOfferResponseEmailIntentRepository } from '../repositories/offer-response-email-intent.repository';
import type {
  OfferLetter,
  OfferLetterData,
  OfferLetterStatus,
} from '../domain/entities/index';

export interface CreateOfferLetterInput {
  applicationId: string;
  title?: string;
  letterData: OfferLetterData;
  pdfPath: string;
  chatId?: string;
  expiresOn?: string;
}

export interface OfferLetterWithMeta {
  offerLetter: OfferLetter;
  chatId: string | null;
}

export type CreateOfferLetterResult =
  OfferLetterWithMeta | { kind: 'invalid_expiry' };

const santiagoDate = (date: Date): string => {
  const parts = new Intl.DateTimeFormat('en', {
    timeZone: 'America/Santiago',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  return `${parts.find(part => part.type === 'year')?.value}-${parts.find(part => part.type === 'month')?.value}-${parts.find(part => part.type === 'day')?.value}`;
};

const isOfferPdfPath = (applicationId: string, pdfPath: string): boolean =>
  new RegExp(
    `^offer-letters/${applicationId}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\\.pdf$`,
    'i',
  ).test(pdfPath);

@Injectable()
export class OfferLetterService {
  constructor(
    @Inject('IOfferLetterRepository')
    private readonly offerLetterRepository: IOfferLetterRepository,
    @Inject('IOfferResponseEmailIntentRepository')
    private readonly emailIntentRepository: IOfferResponseEmailIntentRepository,
    private readonly notificationService: NotificationService,
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  private async assertApplication(applicationId: string): Promise<{
    jobId: string;
    candidateId: string;
    organizationId: string;
    jobTitle: string;
  }> {
    const rows = await this.dataSource.query<
      Array<{
        id: string;
        jobId: string;
        candidateId: string;
        organizationId: string;
        jobTitle: string;
      }>
    >(
      `SELECT a.id, a."jobId" AS "jobId", a."candidateId" AS "candidateId",
              j."organizationId" AS "organizationId", j.title AS "jobTitle"
       FROM application a
       INNER JOIN job j ON j.id = a."jobId"
       WHERE a.id = $1
       LIMIT 1`,
      [applicationId],
    );
    if (!rows[0]) throw new NotFoundException('Application not found');
    return rows[0];
  }

  async createAndSend(
    input: CreateOfferLetterInput,
    requesterId: string,
  ): Promise<CreateOfferLetterResult> {
    if (input.expiresOn && input.expiresOn < santiagoDate(new Date())) {
      return { kind: 'invalid_expiry' };
    }
    const app = await this.assertApplication(input.applicationId);

    const offerLetter: OfferLetter = {
      id: '',
      applicationId: input.applicationId,
      jobId: app.jobId,
      organizationId: app.organizationId,
      candidateId: app.candidateId,
      status: 'sent',
      letterData: input.letterData,
      title: input.title ?? `Carta de oferta - ${app.jobTitle}`,
      pdfPath: input.pdfPath,
      chatId: input.chatId ?? null,
      sentAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
      expiresAt: null,
    };
    const title = input.title ?? `Carta de oferta - ${app.jobTitle}`;
    const created = await this.offerLetterRepository.createWithMessage({
      offerLetter,
      recruiterId: requesterId,
      messageTitle: title,
      expiresOn: input.expiresOn,
    });

    return { offerLetter: created.offerLetter, chatId: created.chatId };
  }

  async findById(id: string): Promise<OfferLetter | null> {
    return this.offerLetterRepository.findById(id);
  }

  async findByApplicationId(applicationId: string): Promise<OfferLetter[]> {
    return this.offerLetterRepository.findByApplicationId(applicationId);
  }

  async cancel(id: string, actorId: string): Promise<boolean> {
    const offer = await this.findById(id);
    if (!offer) return false;
    return this.offerLetterRepository.cancel(id, offer.organizationId, actorId);
  }

  async resend(
    id: string,
    actorId: string,
    expiresOn: string,
    pdfPath: string,
  ): Promise<boolean | 'invalid_expiry' | 'invalid_pdf_path'> {
    if (expiresOn < santiagoDate(new Date())) {
      return 'invalid_expiry';
    }
    const offer = await this.findById(id);
    if (!offer) return false;
    if (!isOfferPdfPath(offer.applicationId, pdfPath)) {
      return 'invalid_pdf_path';
    }
    return this.offerLetterRepository.resend(
      id,
      offer.organizationId,
      actorId,
      expiresOn,
      pdfPath,
    );
  }

  assertCanView(
    offer: OfferLetter,
    requester: { id: string; type?: string } | undefined,
  ): void {
    if (!requester) throw new ForbiddenException('No autorizado');
    if (requester.type === 'organization') {
      // Membership check happens in the controller via assertApplicationAccess;
      // here we only guard the candidate path.
      return;
    }
    if (offer.candidateId === requester.id) return;
    throw new ForbiddenException('No tienes acceso a esta carta de oferta.');
  }

  async respond(
    id: string,
    response: 'accepted' | 'rejected',
    requesterId: string,
  ): Promise<OfferLetter> {
    const offer = await this.offerLetterRepository.findById(id);
    if (!offer) throw new NotFoundException('Offer letter not found');
    if (offer.candidateId !== requesterId) {
      throw new ForbiddenException(
        'Solo el candidato puede responder a esta oferta.',
      );
    }
    if (offer.status !== 'sent') {
      throw new BadRequestException('Esta oferta ya fue respondida.');
    }

    const nextStatus: OfferLetterStatus = response;
    const committed = await this.emailIntentRepository.commitResponse({
      offerId: offer.id,
      candidateId: requesterId,
      response,
    });
    if (committed.kind === 'already_responded') {
      throw new BadRequestException(
        'La oferta ya no está disponible para responder.',
      );
    }

    if (committed.recipientId) {
      await this.notifyRecruiter(committed.recipientId, offer, response);
    }

    return { ...offer, status: nextStatus, respondedAt: new Date() };
  }

  @Cron(CronExpression.EVERY_MINUTE, { disabled: process.env.VERCEL === '1' })
  async expireDueOffers(): Promise<void> {
    await this.dataSource.transaction(async manager => {
      await manager.query(
        `WITH due AS (
           SELECT id
           FROM offer_letter
           WHERE status = 'sent' AND expires_at <= now()
           ORDER BY expires_at, id
           FOR UPDATE SKIP LOCKED
           LIMIT 100
         ), expired AS (
           UPDATE offer_letter offer
           SET status = 'expired', updated_at = now()
           FROM due
           WHERE offer.id = due.id
           RETURNING offer.id, offer.message_id
         ), message_updates AS (
           UPDATE message
           SET content_type = jsonb_set(content_type, '{status}', '"expired"')
           FROM expired
           WHERE message.id = expired.message_id
         )
         INSERT INTO offer_letter_action_audit (offer_id, action)
         SELECT id, 'expired' FROM expired`,
      );
    });
  }

  private async notifyRecruiter(
    recruiterId: string,
    offer: OfferLetter,
    response: 'accepted' | 'rejected',
  ): Promise<void> {
    const data = offer.letterData;
    const candidateName = data.candidateName || 'El candidato';
    const jobTitle = data.jobTitle || 'la vacante';
    const accepted = response === 'accepted';
    const notification = this.notificationService.create({
      userId: recruiterId,
      type: NotificationType.APPLICATION,
      title: accepted ? 'Oferta aceptada' : 'Oferta rechazada',
      body: `${candidateName} ${accepted ? 'acepto' : 'rechazo'} tu oferta para ${jobTitle}.`,
      link: `/dashboard/offers/${offer.jobId}/applications/${offer.applicationId}`,
      data: {
        offerLetterId: offer.id,
        applicationId: offer.applicationId,
        jobId: offer.jobId,
        response,
      },
      dedupKey: `offer:${offer.id}:${response}`,
    });
    await notification.then(
      () => undefined,
      error => {
        console.error(
          '[OfferLetterService] recruiter notification failed:',
          error,
        );
      },
    );
  }
}
