import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import * as crypto from 'crypto';
import { IResumeRepository } from '../repositories/resume.repository';
import { IUserRepository } from '../repositories/user.repository';
import {
  IResumeUseCase,
  CreateResumeInput,
} from '../use-cases/resume/resume.use-case';
import { Resume } from '../domain/entities/resume.entity';

@Injectable()
export class ResumeService implements IResumeUseCase {
  constructor(
    @Inject('IResumeRepository')
    private readonly resumeRepository: IResumeRepository,
    @Inject('IUserRepository')
    private readonly userRepository: IUserRepository,
  ) {}

  private generateId(): string {
    return crypto.randomUUID();
  }

  async createResume(data: CreateResumeInput): Promise<Resume> {
    const user = await this.userRepository.findById(data.userId);
    if (!user) {
      throw new NotFoundException(`User with id ${data.userId} not found`);
    }

    // Check if user already has a resume
    const existingResume = await this.resumeRepository.findByUserId(
      data.userId,
    );
    if (existingResume) {
      throw new NotFoundException(
        `User with id ${data.userId} already has a resume`,
      );
    }

    const resume = new Resume(
      this.generateId(),
      data.userId,
      data.summary,
      data.experiences || [],
      data.education || [],
      data.skills || [],
      data.certifications || [],
      data.languages || [],
      data.links || [],
      data.cvFile,
      new Date(),
      new Date(),
    );

    return this.resumeRepository.create(resume);
  }

  async getResumeById(id: string): Promise<Resume | null> {
    return this.resumeRepository.findById(id);
  }

  async getResumeByUserId(userId: string): Promise<Resume | null> {
    return this.resumeRepository.findByUserId(userId);
  }

  async getAllResumes(): Promise<Resume[]> {
    return this.resumeRepository.findAll();
  }

  async updateResume(
    id: string,
    data: Partial<CreateResumeInput>,
  ): Promise<Resume | null> {
    const existingResume = await this.resumeRepository.findById(id);
    if (!existingResume) {
      throw new NotFoundException(`Resume with id ${id} not found`);
    }

    const updatedResume: Partial<Resume> = {
      ...existingResume,
      summary: data.summary ?? existingResume.summary,
      experiences: data.experiences ?? existingResume.experiences,
      education: data.education ?? existingResume.education,
      skills: data.skills ?? existingResume.skills,
      certifications: data.certifications ?? existingResume.certifications,
      languages: data.languages ?? existingResume.languages,
      links: data.links ?? existingResume.links,
      cvFile: data.cvFile ?? existingResume.cvFile,
      updatedAt: new Date(),
    };

    return this.resumeRepository.update(id, updatedResume);
  }

  async deleteResume(id: string): Promise<boolean> {
    const existingResume = await this.resumeRepository.findById(id);
    if (!existingResume) {
      throw new NotFoundException(`Resume with id ${id} not found`);
    }

    return this.resumeRepository.delete(id);
  }
}
