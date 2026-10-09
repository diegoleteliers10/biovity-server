export type OfferLetterStatus = 'sent' | 'accepted' | 'rejected';

export interface OfferLetterData {
  companyName: string;
  candidateName: string;
  jobTitle: string;
  greeting?: string;
  intro?: string;
  positionSummary?: string;
  compensation?: string;
  compensationDetail?: string;
  benefits?: string[];
  startDate?: string;
  workMode?: string;
  conditions?: string;
  closing?: string;
  signerName?: string;
  signerRole?: string;
  companyAddress?: string;
  [key: string]: unknown;
}

export class OfferLetter {
  constructor(
    public id: string,
    public applicationId: string,
    public jobId: string,
    public organizationId: string,
    public candidateId: string,
    public status: OfferLetterStatus,
    public letterData: OfferLetterData,
    public chatId?: string | null,
    public messageId?: string | null,
    public title?: string | null,
    public pdfPath?: string | null,
    public sentAt: Date = new Date(),
    public respondedAt?: Date | null,
    public createdAt: Date = new Date(),
    public updatedAt: Date = new Date(),
  ) {}
}
