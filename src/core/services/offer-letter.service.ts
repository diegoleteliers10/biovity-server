import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { IOfferLetterRepository } from '../repositories/offer-letter.repository';
import { ApplicationStatus, NotificationType } from '../domain/enums';
import { ApplicationService } from './application.service';
import { EmailService } from './email.service';
import { NotificationService } from '../../shared/notification/notification.service';
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
}

export interface OfferLetterWithMeta {
  offerLetter: OfferLetter;
  chatId: string | null;
}

interface UserRow {
  id: string;
  name: string | null;
  email: string;
}

@Injectable()
export class OfferLetterService {
  constructor(
    @Inject('IOfferLetterRepository')
    private readonly offerLetterRepository: IOfferLetterRepository,
    private readonly applicationService: ApplicationService,
    private readonly notificationService: NotificationService,
    private readonly emailService: EmailService,
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
  ): Promise<OfferLetterWithMeta> {
    const app = await this.assertApplication(input.applicationId);

    const offerLetter = await this.offerLetterRepository.create({
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
    });

    // Insert the chat message from the recruiter and link it to the letter.
    // Column names come from the ORM entities: chats archive per side and
    // carry DB defaults for timestamps, so only the required fields are set.
    let chatId: string;
    const chats = await this.dataSource.query<Array<{ id: string }>>(
      `SELECT id FROM chat
       WHERE "recruiterId" = $1 AND "professionalId" = $2
         AND "is_archived_recruiter" = false AND "is_archived_professional" = false
       ORDER BY "createdAt" DESC LIMIT 1`,
      [requesterId, app.candidateId],
    );

    if (chats[0]) {
      chatId = chats[0].id;
    } else {
      const created = await this.dataSource.query<Array<{ id: string }>>(
        `INSERT INTO chat ("id", "recruiterId", "professionalId")
         VALUES (uuid_generate_v4(), $1, $2) RETURNING id`,
        [requesterId, app.candidateId],
      );
      chatId = created[0].id;
    }

    const title = input.title ?? `Carta de oferta - ${app.jobTitle}`;
    const inserted = await this.dataSource.query<Array<{ id: string }>>(
      `INSERT INTO message
        ("id", "chatId", "senderId", "content", "type", "content_type")
       VALUES (
         uuid_generate_v4(), $1, $2, $3, 'offer', $4::jsonb
       ) RETURNING id`,
      [
        chatId,
        requesterId,
        title,
        JSON.stringify({
          offerLetterId: offerLetter.id,
          title,
          status: 'sent',
        }),
      ],
    );
    const messageId = inserted[0].id;

    // Mirror the chat row update that MessageService performs on send.
    await this.dataSource.query(
      `UPDATE chat SET "lastMessage" = $2, "updatedAt" = now() WHERE id = $1`,
      [chatId, title],
    );

    await this.offerLetterRepository.setMessageContext(
      offerLetter.id,
      chatId,
      messageId,
    );

    // The message is inserted directly, so notify the candidate here (the
    // MessageService notification does not run for this path).
    try {
      await this.notificationService.create({
        userId: app.candidateId,
        type: NotificationType.MESSAGE,
        title: 'Nueva carta de oferta',
        body: `Recibiste una carta de oferta para ${app.jobTitle}.`,
        link: `/dashboard/messages?chat=${chatId}`,
        data: { offerLetterId: offerLetter.id, chatId, jobId: app.jobId },
        dedupKey: `offer:${offerLetter.id}:sent`,
      });
    } catch (error) {
      console.error(
        '[OfferLetterService] candidate notification failed:',
        error,
      );
    }

    return { offerLetter: { ...offerLetter, chatId, messageId }, chatId };
  }

  private async touchMessage(
    messageId: string | null,
    content: {
      offerLetterId: string;
      title: string;
      status: OfferLetterStatus;
    },
  ): Promise<void> {
    if (!messageId) return;
    await this.dataSource.query(
      `UPDATE message SET "content_type" = $2::jsonb WHERE id = $1`,
      [messageId, JSON.stringify(content)],
    );
  }

  async findById(id: string): Promise<OfferLetter | null> {
    return this.offerLetterRepository.findById(id);
  }

  async findByApplicationId(applicationId: string): Promise<OfferLetter[]> {
    return this.offerLetterRepository.findByApplicationId(applicationId);
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
    const updated = await this.offerLetterRepository.updateStatus(
      id,
      nextStatus,
    );

    await this.touchMessage(offer.messageId ?? null, {
      offerLetterId: offer.id,
      title: offer.title ?? 'Carta de oferta',
      status: nextStatus,
    });

    // Pipeline: accepted -> contratado, rejected -> rechazado.
    await this.applicationService.updateApplicationStatus(
      offer.applicationId,
      response === 'accepted'
        ? ApplicationStatus.CONTRATADO
        : ApplicationStatus.RECHAZADO,
      requesterId,
    );

    await this.notifyRecruiter(offer, response);

    return updated ?? offer;
  }

  private async notifyRecruiter(
    offer: OfferLetter,
    response: 'accepted' | 'rejected',
  ): Promise<void> {
    try {
      const data = offer.letterData;
      const candidateName = data.candidateName || 'El candidato';
      const jobTitle = data.jobTitle || 'la vacante';
      const accepted = response === 'accepted';

      let chat: { recruiterId: string } | undefined;
      if (offer.chatId) {
        const rows = await this.dataSource.query<
          Array<{ recruiterId: string }>
        >(`SELECT "recruiterId" FROM chat WHERE id = $1 LIMIT 1`, [
          offer.chatId,
        ]);
        chat = rows[0];
      }
      if (!chat) {
        const rows = await this.dataSource.query<
          Array<{ recruiterId: string }>
        >(
          `SELECT r."id" AS "recruiterId"
           FROM "user" r
           WHERE r."organizationId" = $1 AND r.type = 'organization'
           ORDER BY r."createdAt" ASC LIMIT 1`,
          [offer.organizationId],
        );
        chat = rows[0];
      }

      if (chat?.recruiterId) {
        await this.notificationService.create({
          userId: chat.recruiterId,
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

        const recruiter = await this.findUserById(chat.recruiterId);
        if (recruiter) {
          await this.emailService.send(
            recruiter.email,
            accepted
              ? `${candidateName} acepto tu oferta | Biovity`
              : `${candidateName} rechazo tu oferta | Biovity`,
            this.recruiterResponseEmailHtml({
              recruiterName: recruiter.name ?? '',
              candidateName,
              jobTitle,
              accepted,
            }),
          );
        }
      }
    } catch (error) {
      // Best-effort: the offer response itself is already committed.
      console.error(
        '[OfferLetterService] recruiter notification failed:',
        error,
      );
    }
  }

  private async findUserById(id: string): Promise<UserRow | null> {
    const rows = await this.dataSource.query<UserRow[]>(
      `SELECT id, name, email FROM "user" WHERE id = $1 LIMIT 1`,
      [id],
    );
    return rows[0] ?? null;
  }

  private recruiterResponseEmailHtml(input: {
    recruiterName: string;
    candidateName: string;
    jobTitle: string;
    accepted: boolean;
  }): string {
    const { recruiterName, candidateName, jobTitle, accepted } = input;
    const headline = accepted
      ? `${candidateName} acepto tu oferta`
      : `${candidateName} rechazo tu oferta`;
    const detail = accepted
      ? `La postulacion a <strong>${jobTitle}</strong> paso a <strong>Contratado</strong>.`
      : `La postulacion a <strong>${jobTitle}</strong> paso a <strong>Rechazado</strong>.`;
    return `
      <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto;">
        <h2 style="color: #0d3d3d;">${headline}</h2>
        <p>Hola ${recruiterName},</p>
        <p>${detail}</p>
        <p>Revisa el detalle de la postulacion en tu dashboard de Biovity.</p>
      </div>
    `;
  }
}
