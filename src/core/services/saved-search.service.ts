import {
  Injectable,
  NotFoundException,
  Inject,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { ISavedSearchRepository } from '../repositories/saved-search.repository';
import { IUserRepository } from '../repositories/user.repository';
import { SavedSearch } from '../domain/entities/saved-search.entity';
import { NotificationService } from '../../shared/notification/notification.service';
import { CreateSavedSearchInput, UpdateSavedSearchInput } from '../../shared/mappers/saved-search/savedSearchDto-domain.mapper';
import { CreateNotificationInput } from '../../shared/notification/notification.types';

@Injectable()
export class SavedSearchService {
  constructor(
    @Inject('ISavedSearchRepository')
    private readonly repository: ISavedSearchRepository,
    @Inject('IUserRepository')
    private readonly userRepository: IUserRepository,
    private readonly notificationService: NotificationService,
  ) {}

  private generateId(): string {
    return crypto.randomUUID();
  }

  async create(data: CreateSavedSearchInput): Promise<SavedSearch> {
    const savedSearch = new SavedSearch(
      this.generateId(),
      data.organizationId,
      data.name,
      data.filters ?? {},
      data.notifyEnabled ?? false,
      new Date(),
      new Date(),
    );
    return this.repository.create(savedSearch);
  }

  async getById(id: string): Promise<SavedSearch | null> {
    return this.repository.findById(id);
  }

  async getByOrganizationId(organizationId: string): Promise<SavedSearch[]> {
    return this.repository.findByOrganizationId(organizationId);
  }

  async update(id: string, data: UpdateSavedSearchInput): Promise<SavedSearch | null> {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new NotFoundException(`Saved search with id ${id} not found`);
    }
    return this.repository.update(id, data);
  }

  async delete(id: string): Promise<boolean> {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new NotFoundException(`Saved search with id ${id} not found`);
    }
    return this.repository.delete(id);
  }

  async execute(id: string): Promise<SavedSearch> {
    const savedSearch = await this.repository.findById(id);
    if (!savedSearch) {
      throw new NotFoundException(`Saved search with id ${id} not found`);
    }

    if (savedSearch.notifyEnabled) {
      const userIds = await this.userRepository.findIdsByOrganizationId(
        savedSearch.organizationId,
      );

      const notificationInputs: CreateNotificationInput[] = userIds.map(userId => ({
        userId,
        type: 'job_alert' as any,
        title: `Nuevos resultados para: ${savedSearch.name}`,
        body: `Tu busqueda guardada "${savedSearch.name}" tiene nuevos matches.`,
        link: '/dashboard/organization/talent',
        data: { savedSearchId: savedSearch.id },
      }));

      await this.notificationService.createMany(notificationInputs);
    }

    return savedSearch;
  }
}
