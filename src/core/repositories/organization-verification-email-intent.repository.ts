export type OrganizationVerificationEmailIntent = {
  id: string;
  eventKey: string;
  requestId: string;
  legalName: string;
  recipientEmail: string;
  attemptCount: number;
};

export type OrganizationVerificationEmailIntentRepository = {
  claimDue(limit: number): Promise<OrganizationVerificationEmailIntent[]>;
  markAccepted(id: string): Promise<void>;
  markRetry(id: string, errorCode: string): Promise<void>;
};
