import { ApplicationAnswer } from '../domain/entities/application.entity';

export interface IApplicationAnswerRepository {
  findById(id: string): Promise<ApplicationAnswer | null>;
  findByApplicationId(applicationId: string): Promise<ApplicationAnswer[]>;
  findByApplicationIds(applicationIds: string[]): Promise<ApplicationAnswer[]>;
  create(answer: ApplicationAnswer): Promise<ApplicationAnswer>;
  bulkCreate(answers: ApplicationAnswer[]): Promise<ApplicationAnswer[]>;
  deleteByApplicationId(applicationId: string): Promise<boolean>;
  existsByQuestionId(questionId: string): Promise<boolean>;
}
