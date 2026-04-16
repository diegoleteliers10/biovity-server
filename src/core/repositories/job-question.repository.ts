import {
  JobQuestion,
  QuestionStatus,
} from '../domain/entities/job-question.entity';

export interface IJobQuestionRepository {
  findById(id: string): Promise<JobQuestion | null>;
  findByJobId(jobId: string, status?: QuestionStatus): Promise<JobQuestion[]>;
  findByOrganizationId(organizationId: string): Promise<JobQuestion[]>;
  create(question: JobQuestion): Promise<JobQuestion>;
  update(id: string, data: Partial<JobQuestion>): Promise<JobQuestion | null>;
  delete(id: string): Promise<boolean>;
  getMaxOrderIndex(jobId: string): Promise<number>;
  updateOrderIndex(id: string, orderIndex: number): Promise<void>;
  bulkUpdateOrder(items: { id: string; orderIndex: number }[]): Promise<void>;
  findByIdAndJobId(id: string, jobId: string): Promise<JobQuestion | null>;
}
