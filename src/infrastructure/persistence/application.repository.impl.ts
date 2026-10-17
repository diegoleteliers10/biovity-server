import * as crypto from 'crypto';
import { Injectable } from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource, EntityManager } from 'typeorm';
import { BadRequestException } from '@nestjs/common';
import {
  ApplicationEntity,
  ApplicationStatusHistoryEntity,
  PipelineStageEntity,
  OrganizationRejectionReasonEntity,
  JobEntity,
} from '../database/orm';
import { Application } from '../../core/domain/entities/application.entity';
import { ApplicationDomainOrmMapper } from '../../shared/mappers/application/applicationDomain-orm.mapper';
import type {
  IApplicationRepository,
  ApplicationFilters,
  PaginationOptions,
  PaginatedResult,
  ApplicationStatusHistoryItem,
  UpdateApplicationStatusInput,
  UpdateApplicationHiringPlanInput,
  ReopenApplicationInput,
  UpdateApplicationStageInput,
} from '../../core/repositories/application.respository';
import { ApplicationStatus } from '../../core/domain/enums';
import {
  isOpenApplicationStatus,
  isTerminalApplicationStatus,
} from '../../core/domain/application-status-policy';
import { applicationStatusLabel } from '../../shared/notification/notification-labels';

type StageTransitionAudit =
  { kind: 'stage'; note: null } | { kind: 'reopen'; note: string };

@Injectable()
export class ApplicationRepositoryImpl implements IApplicationRepository {
  constructor(
    @InjectRepository(ApplicationEntity)
    private readonly applicationRepository: Repository<ApplicationEntity>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  async create(entity: Application): Promise<Application> {
    const applicationOrm = ApplicationDomainOrmMapper.toOrm(entity);
    const savedApplication = await this.dataSource.transaction(
      async manager => {
        const saved = await manager.save(ApplicationEntity, applicationOrm);
        await manager.insert(ApplicationStatusHistoryEntity, {
          applicationId: saved.id,
          previousStatus: null,
          newStatus: saved.status,
          changedAt: saved.createdAt,
          changedById: saved.candidateId,
        });
        return saved;
      },
    );
    return ApplicationDomainOrmMapper.toDomain(savedApplication);
  }

  async findById(id: string): Promise<Application | null> {
    const applicationOrm = await this.applicationRepository.findOne({
      where: { id },
      relations: { job: true, candidate: true, answers: true },
    });
    return applicationOrm
      ? ApplicationDomainOrmMapper.toDomain(applicationOrm)
      : null;
  }

  async findByJobAndCandidate(
    jobId: string,
    candidateId: string,
  ): Promise<Application | null> {
    const applicationOrm = await this.applicationRepository.findOne({
      where: { jobId, candidateId },
      relations: { job: true, candidate: true },
    });
    return applicationOrm
      ? ApplicationDomainOrmMapper.toDomain(applicationOrm)
      : null;
  }

  async findAll(
    filters?: ApplicationFilters,
    pagination?: PaginationOptions,
  ): Promise<PaginatedResult<Application>> {
    return this.findByFilters(filters, pagination);
  }

  async findByJobId(
    jobId: string,
    pagination?: PaginationOptions,
  ): Promise<PaginatedResult<Application>> {
    return this.findByFilters({ jobId }, pagination);
  }

  async findByCandidateId(
    candidateId: string,
    pagination?: PaginationOptions,
  ): Promise<PaginatedResult<Application>> {
    return this.findByFilters({ candidateId }, pagination);
  }

  async findByOrganizationId(
    organizationId: string,
    pagination?: PaginationOptions,
  ): Promise<PaginatedResult<Application>> {
    return this.findByFiltersWithOrganization(organizationId, pagination);
  }

  private async findByFiltersWithOrganization(
    organizationId: string,
    pagination?: PaginationOptions,
  ): Promise<PaginatedResult<Application>> {
    const page = pagination?.page || 1;
    const limit = pagination?.limit || 10;
    const skip = (page - 1) * limit;

    const queryBuilder = this.applicationRepository
      .createQueryBuilder('application')
      .leftJoinAndSelect('application.job', 'job')
      .leftJoinAndSelect('application.candidate', 'candidate')
      .leftJoinAndSelect('job.organization', 'organization')
      .where('organization.id = :organizationId', { organizationId });

    const total = await queryBuilder.getCount();

    queryBuilder
      .skip(skip)
      .take(limit)
      .orderBy('application.createdAt', 'DESC');

    const applicationsOrm = await queryBuilder.getMany();
    const data = applicationsOrm.map(app =>
      ApplicationDomainOrmMapper.toDomain(app),
    );

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  private async findByFilters(
    filters?: ApplicationFilters,
    pagination?: PaginationOptions,
  ): Promise<PaginatedResult<Application>> {
    const page = pagination?.page || 1;
    const limit = pagination?.limit || 10;
    const skip = (page - 1) * limit;

    const queryBuilder = this.applicationRepository
      .createQueryBuilder('application')
      .leftJoinAndSelect('application.job', 'job')
      .leftJoinAndSelect('application.candidate', 'candidate');

    if (filters?.jobId) {
      queryBuilder.andWhere('application.jobId = :jobId', {
        jobId: filters.jobId,
      });
    }

    if (filters?.candidateId) {
      queryBuilder.andWhere('application.candidateId = :candidateId', {
        candidateId: filters.candidateId,
      });
    }

    if (filters?.status) {
      queryBuilder.andWhere('application.status = :status', {
        status: filters.status,
      });
    }

    const total = await queryBuilder.getCount();

    queryBuilder
      .skip(skip)
      .take(limit)
      .orderBy('application.createdAt', 'DESC');

    const applicationsOrm = await queryBuilder.getMany();
    const data = applicationsOrm.map(app =>
      ApplicationDomainOrmMapper.toDomain(app),
    );

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async update(
    input: UpdateApplicationStatusInput,
  ): Promise<Application | null> {
    await this.dataSource.transaction(async manager => {
      const current = await manager.findOne(ApplicationEntity, {
        where: { id: input.id },
        select: {
          id: true,
          jobId: true,
          candidateId: true,
          status: true,
          pipelineStageId: true,
        },
        lock: { mode: 'pessimistic_write' },
      });
      if (!current) return;
      const stage = await manager.findOne(PipelineStageEntity, {
        where: { jobId: current.jobId, systemKey: input.status },
        lock: { mode: 'pessimistic_write' },
      });
      if (!stage || stage.isArchived) {
        throw new BadRequestException(
          `Active built-in stage not found for status ${input.status}`,
        );
      }
      const previousStage = current.pipelineStageId
        ? await manager.findOne(PipelineStageEntity, {
            where: { id: current.pipelineStageId, jobId: current.jobId },
            lock: { mode: 'pessimistic_write' },
          })
        : null;
      const transition = await this.saveStageTransition(
        manager,
        current,
        previousStage,
        stage,
        input.changedById,
        input.rejectionNote,
        input.rejectionReasonId ?? null,
        { kind: 'stage', note: null },
      );
      if (transition?.statusChanged) {
        await this.enqueueStatusChangeNotice(
          manager,
          current,
          stage,
          transition.historyId,
        );
      }
    });

    return this.findById(input.id);
  }

  async transitionStage(
    input: UpdateApplicationStageInput,
  ): Promise<Application | null> {
    return this.applyStageTransition(input, { kind: 'stage', note: null });
  }

  async reopen(input: ReopenApplicationInput): Promise<Application | null> {
    return this.applyStageTransition(
      {
        id: input.id,
        stageId: input.stageId,
        changedById: input.changedById,
        rejectionNote: null,
        rejectionReasonId: null,
      },
      { kind: 'reopen', note: input.reason.trim() },
    );
  }

  private async applyStageTransition(
    input: UpdateApplicationStageInput,
    audit: StageTransitionAudit,
  ): Promise<Application | null> {
    await this.dataSource.transaction(async manager => {
      const current = await manager.findOne(ApplicationEntity, {
        where: { id: input.id },
        select: {
          id: true,
          jobId: true,
          candidateId: true,
          status: true,
          pipelineStageId: true,
        },
        lock: { mode: 'pessimistic_write' },
      });
      if (!current) return;
      const stage = await manager.findOne(PipelineStageEntity, {
        where: { id: input.stageId, jobId: current.jobId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!stage || stage.isArchived) {
        throw new BadRequestException(
          'Pipeline stage is missing, archived, or belongs to another job',
        );
      }
      const previousStage = current.pipelineStageId
        ? await manager.findOne(PipelineStageEntity, {
            where: { id: current.pipelineStageId, jobId: current.jobId },
            lock: { mode: 'pessimistic_write' },
          })
        : null;
      const transition = await this.saveStageTransition(
        manager,
        current,
        previousStage,
        stage,
        input.changedById,
        input.rejectionNote,
        input.rejectionReasonId ?? null,
        audit,
      );
      if (transition?.statusChanged) {
        await this.enqueueStatusChangeNotice(
          manager,
          current,
          stage,
          transition.historyId,
        );
      }
    });

    return this.findById(input.id);
  }

  async updateHiringPlan(
    input: UpdateApplicationHiringPlanInput,
  ): Promise<Application | null> {
    const entity = await this.dataSource.transaction(async manager => {
      const scopeRows = await manager.query<Array<{ organizationId: string }>>(
        `SELECT job."organizationId"
         FROM application
         JOIN job ON job.id = application."jobId"
         WHERE application.id = $1::uuid
         FOR UPDATE OF application`,
        [input.id],
      );
      const organizationId = scopeRows[0]?.organizationId;
      if (!organizationId) return null;

      if (input.assigneeId) {
        const ownerRows = await manager.query<Array<{ id: string }>>(
          `SELECT id FROM "user"
           WHERE id = $1::uuid AND type = 'organization' AND "organizationId" = $2::uuid
           FOR SHARE`,
          [input.assigneeId, organizationId],
        );
        if (!ownerRows[0]) {
          const memberRows = await manager.query<Array<{ id: string }>>(
            `SELECT member.id
             FROM organization_member member
             JOIN "user" recruiter ON recruiter.id = member.user_id
             WHERE member.organization_id = $1::uuid
               AND member.user_id = $2::uuid
               AND member.role IN ('admin', 'recruiter')
               AND recruiter.type = 'organization'
             FOR SHARE OF member, recruiter`,
            [organizationId, input.assigneeId],
          );
          if (!memberRows[0]) {
            return Promise.reject(
              new BadRequestException(
                'El responsable debe ser administrador o reclutador de la organización',
              ),
            );
          }
        }
      }

      const update: Partial<ApplicationEntity> = {};
      if (input.assigneeId !== undefined) update.assigneeId = input.assigneeId;
      if (input.nextAction !== undefined) update.nextAction = input.nextAction;
      if (input.targetDate !== undefined) update.targetDate = input.targetDate;
      if (Object.keys(update).length === 0) return null;

      const repository = manager.getRepository(ApplicationEntity);
      const result = await repository.update({ id: input.id }, update);
      if (!result.affected) return null;
      return repository.findOne({
        where: { id: input.id },
        relations: { job: true, candidate: true, answers: true },
      });
    });
    return entity ? ApplicationDomainOrmMapper.toDomain(entity) : null;
  }

  private async saveStageTransition(
    manager: EntityManager,
    current: ApplicationEntity,
    previousStage: PipelineStageEntity | null,
    stage: PipelineStageEntity,
    changedById: string | null,
    rejectionNote: string | null,
    rejectionReasonId: string | null,
    audit: StageTransitionAudit,
  ): Promise<{ historyId: string; statusChanged: boolean } | null> {
    const previousStatus = current.status;
    const wasTerminal = isTerminalApplicationStatus(previousStatus);
    if (audit.kind === 'stage' && wasTerminal) {
      return Promise.reject(
        new BadRequestException(
          'A closed application must be reopened with a reason',
        ),
      );
    }
    if (audit.kind === 'reopen' && !wasTerminal) {
      return Promise.reject(
        new BadRequestException('Only a closed application can be reopened'),
      );
    }
    if (
      audit.kind === 'reopen' &&
      !isOpenApplicationStatus(stage.statusProjection)
    ) {
      return Promise.reject(
        new BadRequestException('Reopen the application into an active stage'),
      );
    }
    if (audit.kind === 'reopen' && !audit.note.trim()) {
      return Promise.reject(
        new BadRequestException(
          'A reason is required to reopen an application',
        ),
      );
    }
    if (stage.id === current.pipelineStageId) return null;
    if (
      stage.statusProjection !== ApplicationStatus.RECHAZADO &&
      rejectionNote
    ) {
      throw new BadRequestException(
        'A rejection note is only valid for a rejected application',
      );
    }
    let rejectionReason: OrganizationRejectionReasonEntity | null = null;
    if (stage.statusProjection === ApplicationStatus.RECHAZADO) {
      if (!rejectionReasonId) {
        throw new BadRequestException('A rejection reason is required');
      }
      const job = await manager.findOne(JobEntity, {
        where: { id: current.jobId },
      });
      if (!job) throw new BadRequestException('Application job not found');
      rejectionReason = await manager.findOne(
        OrganizationRejectionReasonEntity,
        {
          where: {
            id: rejectionReasonId,
            organizationId: job.organizationId,
            active: true,
          },
          lock: { mode: 'pessimistic_write' },
        },
      );
      if (!rejectionReason) {
        throw new BadRequestException(
          'Rejection reason is inactive or does not belong to this organization',
        );
      }
    } else if (rejectionReasonId) {
      throw new BadRequestException(
        'A rejection reason is only valid for a rejected application',
      );
    }
    await manager.update(ApplicationEntity, current.id, {
      status: stage.statusProjection,
      pipelineStageId: stage.id,
      stageChangedAt: new Date(),
      updatedAt: new Date(),
    });

    if (
      stage.id !== current.pipelineStageId ||
      stage.statusProjection !== previousStatus
    ) {
      const historyId = crypto.randomUUID();
      await manager.insert(ApplicationStatusHistoryEntity, {
        id: historyId,
        applicationId: current.id,
        previousStatus,
        newStatus: stage.statusProjection,
        changedAt: new Date(),
        changedById,
        rejectionNote:
          stage.statusProjection === ApplicationStatus.RECHAZADO
            ? rejectionNote
            : null,
        rejectionReasonId: rejectionReason?.id ?? null,
        rejectionReasonSnapshot: rejectionReason?.label ?? null,
        previousStageId: previousStage?.id ?? current.pipelineStageId,
        newStageId: stage.id,
        previousStageName: previousStage?.name ?? null,
        newStageName: stage.name,
        transitionKind: audit.kind,
        transitionNote: audit.kind === 'reopen' ? audit.note : null,
      });
      return {
        historyId,
        statusChanged: stage.statusProjection !== previousStatus,
      };
    }
    return null;
  }

  private async enqueueStatusChangeNotice(
    manager: EntityManager,
    current: ApplicationEntity,
    stage: PipelineStageEntity,
    historyId: string,
  ): Promise<void> {
    if (stage.statusProjection === current.status) return;

    const job = await manager.findOne(JobEntity, {
      where: { id: current.jobId },
      select: { id: true, title: true },
    });
    if (!job) throw new BadRequestException('Application job not found');

    const statusLabel = applicationStatusLabel(stage.statusProjection);
    await manager.query(
      `INSERT INTO application_status_notification_intent
        (id, event_key, application_id, recipient_id, job_id, application_status,
         job_title, status_label, status_history_id, available_at)
       VALUES ($1, $1, $2, $3, $4, $5, $6, $7, $1, now())
       ON CONFLICT (event_key) DO NOTHING`,
      [
        historyId,
        current.id,
        current.candidateId,
        current.jobId,
        stage.statusProjection,
        job.title,
        statusLabel,
      ],
    );
  }

  async findStatusHistoryByApplicationId(
    applicationId: string,
  ): Promise<ApplicationStatusHistoryItem[]> {
    const history = await this.dataSource
      .getRepository(ApplicationStatusHistoryEntity)
      .find({
        where: { applicationId },
        relations: { changedBy: true },
        order: { changedAt: 'DESC' },
      });

    return history.map(item => ({
      id: item.id,
      previousStatus: item.previousStatus,
      newStatus: item.newStatus,
      changedAt: item.changedAt,
      changedById: item.changedById,
      changedByName: item.changedBy?.name ?? null,
      rejectionNote: item.rejectionNote,
      rejectionReasonId: item.rejectionReasonId,
      rejectionReasonSnapshot: item.rejectionReasonSnapshot,
      previousStageId: item.previousStageId,
      newStageId: item.newStageId,
      previousStageName: item.previousStageName,
      newStageName: item.newStageName,
      transitionKind: item.transitionKind,
      transitionNote: item.transitionNote,
    }));
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.applicationRepository.delete(id);
    return result.affected != null && result.affected > 0;
  }
}
