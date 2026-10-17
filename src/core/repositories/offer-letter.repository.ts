import { OfferLetter } from '../domain/entities/index';

export interface IOfferLetterRepository {
  create(entity: OfferLetter): Promise<OfferLetter>;
  createWithMessage(input: {
    offerLetter: OfferLetter;
    recruiterId: string;
    messageTitle: string;
    expiresOn?: string;
  }): Promise<{ offerLetter: OfferLetter; chatId: string; messageId: string }>;
  findById(id: string): Promise<OfferLetter | null>;
  findByApplicationId(applicationId: string): Promise<OfferLetter[]>;
  cancel(id: string, organizationId: string, actorId: string): Promise<boolean>;
  resend(
    id: string,
    organizationId: string,
    actorId: string,
    expiresOn: string,
    pdfPath: string,
  ): Promise<boolean>;
  updateStatus(
    id: string,
    status: OfferLetter['status'],
  ): Promise<OfferLetter | null>;
  setMessageContext(
    id: string,
    chatId: string,
    messageId: string,
  ): Promise<void>;
}
