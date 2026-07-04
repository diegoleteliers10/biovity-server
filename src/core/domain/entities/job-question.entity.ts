import { QuestionType, QuestionStatus } from '../enums';

export class JobQuestion {
  constructor(
    public id: string,
    public jobId: string,
    public organizationId: string,
    public label: string,
    public type: QuestionType,
    public required: boolean = false,
    public orderIndex: number = 0,
    public status: QuestionStatus = QuestionStatus.DRAFT,
    public placeholder?: string,
    public helperText?: string,
    public options?: string[],
    public createdAt: Date = new Date(),
    public updatedAt: Date = new Date(),
  ) {}
}
