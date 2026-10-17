import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import type { ApplicationSourceChannel } from '../domain/application-source';
import * as crypto from 'crypto';

export type JobDistributionSource = {
  id: string;
  jobId: string;
  sourceChannel: Exclude<ApplicationSourceChannel, 'unknown'>;
  createdAt: Date;
  disabledAt: Date | null;
};

@Injectable()
export class JobDistributionSourceService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async create(
    jobId: string,
    sourceChannel: JobDistributionSource['sourceChannel'],
  ): Promise<JobDistributionSource> {
    const rows = await this.dataSource.query<JobDistributionSource[]>(
      `INSERT INTO job_distribution_source (id, job_id, source_channel)
       VALUES ($1::uuid, $2::uuid, $3)
       RETURNING id, job_id AS "jobId", source_channel AS "sourceChannel",
                 created_at AS "createdAt", disabled_at AS "disabledAt"`,
      [crypto.randomUUID(), jobId, sourceChannel],
    );
    return rows[0];
  }

  list(jobId: string): Promise<JobDistributionSource[]> {
    return this.dataSource.query<JobDistributionSource[]>(
      `SELECT id, job_id AS "jobId", source_channel AS "sourceChannel",
              created_at AS "createdAt", disabled_at AS "disabledAt"
       FROM job_distribution_source
       WHERE job_id = $1::uuid
       ORDER BY created_at DESC, id DESC`,
      [jobId],
    );
  }

  async disable(jobId: string, sourceId: string): Promise<boolean> {
    const rows = await this.dataSource.query<Array<{ id: string }>>(
      `UPDATE job_distribution_source
       SET disabled_at = now()
       WHERE id = $1::uuid AND job_id = $2::uuid AND disabled_at IS NULL
       RETURNING id`,
      [sourceId, jobId],
    );
    return Boolean(rows[0]);
  }
}
