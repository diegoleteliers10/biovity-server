import {
  JobQuestion,
  QuestionType,
  QuestionStatus,
} from '../../domain/entities/job-question.entity';

export interface CreateQuestionInput {
  jobId: string;
  organizationId: string;
  label: string;
  type: QuestionType;
  required?: boolean;
  orderIndex?: number;
  status?: QuestionStatus;
  placeholder?: string;
  helperText?: string;
  options?: string[];
}

export interface UpdateQuestionInput {
  label?: string;
  type?: QuestionType;
  required?: boolean;
  orderIndex?: number;
  status?: QuestionStatus;
  placeholder?: string;
  helperText?: string;
  options?: string[];
}

export interface IJobQuestionUseCase {
  createQuestion(data: CreateQuestionInput): Promise<JobQuestion>;
  getQuestionById(id: string): Promise<JobQuestion | null>;
  getQuestionsByJobId(jobId: string): Promise<JobQuestion[]>;
  getQuestionsByOrganizationId(organizationId: string): Promise<JobQuestion[]>;
  updateQuestion(
    id: string,
    data: UpdateQuestionInput,
  ): Promise<JobQuestion | null>;
  publishQuestion(id: string): Promise<JobQuestion | null>;
  unpublishQuestion(id: string): Promise<JobQuestion | null>;
  reorderQuestions(
    jobId: string,
    items: { id: string; orderIndex: number }[],
  ): Promise<void>;
  deleteQuestion(id: string): Promise<boolean>;
}
