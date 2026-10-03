import { JobStatus } from '../enums';

/**
 * A job summary carried alongside a SavedJob when the caller asked for the
 * `job` relation. Absent when the relation was not loaded.
 */
export interface SavedJobSummary {
  id: string;
  title: string;
  organizationId: string;
  status: JobStatus;
}

export class SavedJob {
  /** Present only when the `job` relation was loaded. */
  job?: SavedJobSummary;

  constructor(
    public id: string,
    public userId: string,
    public jobId: string,
    public createdAt: Date = new Date(),
  ) {}
}
