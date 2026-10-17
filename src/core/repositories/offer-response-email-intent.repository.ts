export type OfferResponse = 'accepted' | 'rejected';

export type OfferResponseEmailIntent = {
  id: string;
  eventKey: string;
  offerId: string;
  organizationId: string;
  response: OfferResponse;
  recipientId: string;
  recipientEmail: string;
  candidateName: string;
  jobTitle: string;
  attemptCount: number;
};

export type OfferResponseCommit =
  | { kind: 'committed'; recipientId: string | null }
  | { kind: 'already_responded' };

export interface IOfferResponseEmailIntentRepository {
  commitResponse(input: {
    offerId: string;
    candidateId: string;
    response: OfferResponse;
  }): Promise<OfferResponseCommit>;
  claimDue(limit: number): Promise<OfferResponseEmailIntent[]>;
  markAccepted(id: string): Promise<void>;
  markRetry(id: string, errorCode: string): Promise<void>;
  reconcilePendingRecipients(): Promise<void>;
}
