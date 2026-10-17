import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Not, Raw, Repository } from 'typeorm';
import { OrganizationRejectionReasonEntity } from '../../infrastructure/database/orm/organization-rejection-reason.entity';
import { OrganizationEntity } from '../../infrastructure/database/orm/organization.entity';

@Injectable()
export class OrganizationRejectionReasonService {
  constructor(
    @InjectRepository(OrganizationRejectionReasonEntity)
    private readonly repository: Repository<OrganizationRejectionReasonEntity>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  list(organizationId: string): Promise<OrganizationRejectionReasonEntity[]> {
    return this.repository.find({
      where: { organizationId },
      order: { sortOrder: 'ASC', createdAt: 'ASC' },
    });
  }

  async create(
    organizationId: string,
    label: string,
  ): Promise<OrganizationRejectionReasonEntity> {
    const normalizedLabel = label.trim();
    if (!normalizedLabel)
      throw new BadRequestException('A rejection reason label is required');

    return this.dataSource.transaction(async manager => {
      await this.lockOrganization(manager, organizationId);
      const repository = manager.getRepository(
        OrganizationRejectionReasonEntity,
      );
      const duplicate = await repository.findOne({
        where: {
          organizationId,
          label: this.labelEquals(normalizedLabel),
          active: true,
        },
      });
      if (duplicate)
        throw new BadRequestException(
          'An active reason with this label already exists',
        );

      const sortOrder = await repository.count({ where: { organizationId } });
      return repository.save(
        repository.create({
          organizationId,
          label: normalizedLabel,
          sortOrder,
        }),
      );
    });
  }

  async update(
    organizationId: string,
    id: string,
    input: { label?: string; active?: boolean },
  ): Promise<OrganizationRejectionReasonEntity> {
    return this.dataSource.transaction(async manager => {
      await this.lockOrganization(manager, organizationId);
      const repository = manager.getRepository(
        OrganizationRejectionReasonEntity,
      );
      const reason = await repository.findOne({
        where: { id, organizationId },
      });
      if (!reason) throw new NotFoundException('Rejection reason not found');

      const label = input.label?.trim();
      if (input.label !== undefined && !label)
        throw new BadRequestException('A rejection reason label is required');

      const nextLabel = label ?? reason.label;
      const active = input.active ?? reason.active;
      if (active) {
        const duplicate = await repository.findOne({
          where: {
            id: Not(id),
            organizationId,
            label: this.labelEquals(nextLabel),
            active: true,
          },
        });
        if (duplicate)
          throw new BadRequestException(
            'An active reason with this label already exists',
          );
      }
      reason.label = nextLabel;
      reason.active = active;
      return repository.save(reason);
    });
  }

  private async lockOrganization(
    manager: EntityManager,
    organizationId: string,
  ): Promise<void> {
    const organization = await manager.findOne(OrganizationEntity, {
      where: { id: organizationId },
      lock: { mode: 'pessimistic_write' },
    });
    if (!organization) throw new NotFoundException('Organization not found');
  }

  private labelEquals(label: string) {
    return Raw(column => `LOWER(${column}) = LOWER(:label)`, { label });
  }
}
