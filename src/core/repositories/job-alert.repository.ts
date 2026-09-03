import { JobAlert } from '../domain/entities/job-alert.entity';

export interface IJobAlertRepository {
  create(entity: JobAlert): Promise<JobAlert>;
  findById(id: string): Promise<JobAlert | null>;
  findByUserId(userId: string): Promise<JobAlert[]>;
  delete(id: string): Promise<boolean>;
}
