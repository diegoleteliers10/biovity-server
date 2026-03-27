import { Injectable, NotFoundException, ConflictException, Inject } from '@nestjs/common';
import * as crypto from 'crypto';
import { ISavedJobRepository } from '../repositories/saved-job.repository';
import { IJobRepository } from '../repositories/job.repository';
import { IUserRepository } from '../repositories/user.repository';
import { SavedJob } from '../domain/entities/saved-job.entity';
import { CreateSavedJobInput } from '../../shared/mappers/saved-job/savedJobDto-domain.mapper';

@Injectable()
export class SavedJobService {
  constructor(
    @Inject('ISavedJobRepository')
    private readonly savedJobRepository: ISavedJobRepository,
    @Inject('IJobRepository')
    private readonly jobRepository: IJobRepository,
    @Inject('IUserRepository')
    private readonly userRepository: IUserRepository,
  ) {}

  private generateId(): string {
    return crypto.randomUUID();
  }

  async saveJob(data: CreateSavedJobInput): Promise<SavedJob> {
    // Verify job exists
    const job = await this.jobRepository.findById(data.jobId);
    if (!job) {
      throw new NotFoundException(`Job with id ${data.jobId} not found`);
    }

    // Verify user exists
    const user = await this.userRepository.findById(data.userId);
    if (!user) {
      throw new NotFoundException(`User with id ${data.userId} not found`);
    }

    // Check if job is already saved by this user
    const existingSavedJob = await this.savedJobRepository.findByUserAndJob(
      data.userId,
      data.jobId,
    );
    if (existingSavedJob) {
      throw new ConflictException(
        `Job with id ${data.jobId} is already saved by user ${data.userId}`,
      );
    }

    const savedJob = new SavedJob(
      this.generateId(),
      data.userId,
      data.jobId,
      new Date(),
    );

    return this.savedJobRepository.create(savedJob);
  }

  async getSavedJobById(id: string): Promise<SavedJob | null> {
    return this.savedJobRepository.findById(id);
  }

  async getSavedJobsByUserId(
    userId: string,
    pagination?: { page?: number; limit?: number },
  ): Promise<{
    data: SavedJob[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    return this.savedJobRepository.findByUserId(userId, pagination);
  }

  async getSavedJobsByJobId(
    jobId: string,
    pagination?: { page?: number; limit?: number },
  ): Promise<{
    data: SavedJob[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    return this.savedJobRepository.findByJobId(jobId, pagination);
  }

  async checkIfJobIsSaved(userId: string, jobId: string): Promise<boolean> {
    const savedJob = await this.savedJobRepository.findByUserAndJob(userId, jobId);
    return !!savedJob;
  }

  async unsaveJob(userId: string, jobId: string): Promise<boolean> {
    // Check if the saved job exists
    const existingSavedJob = await this.savedJobRepository.findByUserAndJob(
      userId,
      jobId,
    );
    if (!existingSavedJob) {
      throw new NotFoundException(
        `Saved job not found for user ${userId} and job ${jobId}`,
      );
    }

    return this.savedJobRepository.deleteByUserAndJob(userId, jobId);
  }

  async deleteSavedJob(id: string): Promise<boolean> {
    const existingSavedJob = await this.savedJobRepository.findById(id);
    if (!existingSavedJob) {
      throw new NotFoundException(`Saved job with id ${id} not found`);
    }

    return this.savedJobRepository.delete(id);
  }
}
