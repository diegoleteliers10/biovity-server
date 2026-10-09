import { OfferLetter } from '../domain/entities/index';

export interface IOfferLetterRepository {
  create(entity: OfferLetter): Promise<OfferLetter>;
  findById(id: string): Promise<OfferLetter | null>;
  findByApplicationId(applicationId: string): Promise<OfferLetter[]>;
  updateStatus(
    id: string,
    status: OfferLetter['status'],
  ): Promise<OfferLetter | null>;
  setMessageContext(id: string, chatId: string, messageId: string): Promise<void>;
}
