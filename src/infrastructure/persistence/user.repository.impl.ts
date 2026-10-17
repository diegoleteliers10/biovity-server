import { IUserRepository } from '../../core/repositories/user.repository';
import { Injectable } from '@nestjs/common';
import { UserEntity } from '../database/orm';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../core/domain/entities/user.entity';
import { UserType } from '../../core/domain/enums';
import { UserDomainOrmMapper } from '../../shared/mappers/user/userDomain-orm.mapper';
import {
  candidateSearchProfileChanged,
  recordCandidateProfileChange,
} from './candidate-profile-change';
import {
  UserFilters,
  PaginationOptions,
  PaginatedResult,
} from '../../core/repositories/user.repository';

const CURRENT_RESUME_ID = `(
  SELECT candidate_resume.id
  FROM resume candidate_resume
  WHERE candidate_resume."userId" = user.id
  ORDER BY candidate_resume."updatedAt" DESC,
           candidate_resume."createdAt" DESC,
           candidate_resume.id DESC
  LIMIT 1
)`;

const CANDIDATE_EXPERIENCE_YEARS = `(
  SELECT COUNT(DISTINCT work_year)::int
  FROM (
    SELECT generate_series(years.start_year, years.end_year - 1) AS work_year
    FROM resume experience_resume
    CROSS JOIN LATERAL json_array_elements(
      CASE
        WHEN json_typeof(COALESCE(experience_resume.experiences, '[]'::json)) = 'array'
          THEN COALESCE(experience_resume.experiences, '[]'::json)
        ELSE '[]'::json
      END
    ) AS experience(value)
    CROSS JOIN LATERAL (
      SELECT
        CASE
          WHEN raw.start_value ~ '^[0-9]{4}(-[0-9]{2}(-[0-9]{2})?)?$'
            THEN LEFT(raw.start_value, 4)::int
          ELSE NULL
        END AS start_year,
        CASE
          WHEN LOWER(COALESCE(experience.value->>'stillWorking', experience.value->>'current', 'false')) = 'true'
            THEN EXTRACT(YEAR FROM now() AT TIME ZONE 'UTC')::int
          WHEN raw.end_value ~ '^[0-9]{4}(-[0-9]{2}(-[0-9]{2})?)?$'
            THEN LEFT(raw.end_value, 4)::int
          ELSE NULL
        END AS end_year
      FROM (
        SELECT
          COALESCE(
            CASE WHEN experience.value->>'startDate' ~ '^[0-9]{4}(-[0-9]{2}(-[0-9]{2})?)?$' THEN experience.value->>'startDate' END,
            CASE WHEN experience.value->>'startYear' ~ '^[0-9]{4}(-[0-9]{2}(-[0-9]{2})?)?$' THEN experience.value->>'startYear' END
          ) AS start_value,
          COALESCE(
            CASE WHEN experience.value->>'endDate' ~ '^[0-9]{4}(-[0-9]{2}(-[0-9]{2})?)?$' THEN experience.value->>'endDate' END,
            CASE WHEN experience.value->>'endYear' ~ '^[0-9]{4}(-[0-9]{2}(-[0-9]{2})?)?$' THEN experience.value->>'endYear' END
          ) AS end_value
      ) raw
    ) years
    WHERE experience_resume.id = ${CURRENT_RESUME_ID}
      AND years.start_year BETWEEN 1900 AND EXTRACT(YEAR FROM now() AT TIME ZONE 'UTC')::int
      AND years.end_year BETWEEN years.start_year AND EXTRACT(YEAR FROM now() AT TIME ZONE 'UTC')::int
  ) experience_years
)`;

const normalizeSkillFilter = (value: string): string =>
  value.normalize('NFKC').trim().replace(/\s+/g, ' ').toLowerCase();

@Injectable()
export class UserRepositoryImpl implements IUserRepository {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
  ) {}

  async create(entity: User): Promise<User> {
    return this.userRepository.manager.transaction(async manager => {
      const savedUser = await manager
        .getRepository(UserEntity)
        .save(UserDomainOrmMapper.toOrm(entity));
      if (savedUser.type === UserType.PROFESSIONAL) {
        await recordCandidateProfileChange(manager, savedUser.id);
      }
      return UserDomainOrmMapper.toDomain(savedUser);
    });
  }

  async findById(id: string): Promise<User | null> {
    const userOrm = await this.userRepository.findOne({
      where: { id },
      relations: { organization: true },
    });
    return userOrm ? UserDomainOrmMapper.toDomain(userOrm) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const userOrm = await this.userRepository.findOne({
      where: { email },
      relations: { organization: true },
    });
    return userOrm ? UserDomainOrmMapper.toDomain(userOrm) : null;
  }

  async findIdsByOrganizationId(
    organizationId: string,
    type?: UserType,
  ): Promise<string[]> {
    const queryBuilder = this.userRepository
      .createQueryBuilder('user')
      .select('user.id', 'id')
      .where('user.organizationId = :organizationId', { organizationId });

    if (type) {
      queryBuilder.andWhere('user.type = :type', { type });
    }

    const rows = await queryBuilder.getRawMany<{ id: string }>();
    return rows.map(row => row.id);
  }

  async findAll(
    filters?: UserFilters,
    pagination?: PaginationOptions,
  ): Promise<PaginatedResult<User>> {
    const page = pagination?.page || 1;
    const limit = pagination?.limit || 10;
    const skip = (page - 1) * limit;

    // Build query builder
    const queryBuilder = this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.organization', 'organization')
      .leftJoinAndSelect('user.resumes', 'resumes');

    // Apply filters
    if (filters?.type) {
      queryBuilder.andWhere('user.type = :type', { type: filters.type });
    }

    if (filters?.isActive !== undefined) {
      queryBuilder.andWhere('user.isActive = :isActive', {
        isActive: filters.isActive,
      });
    }

    if (filters?.search) {
      queryBuilder.andWhere(
        '(user.name ILIKE :search OR user.email ILIKE :search OR user.profession ILIKE :search)',
        { search: `%${filters.search}%` },
      );
    }

    if (filters?.profession) {
      queryBuilder.andWhere('user.profession ILIKE :profession', {
        profession: `%${filters.profession}%`,
      });
    }

    if (filters?.experienceLevel) {
      queryBuilder.andWhere('user.experienceLevel = :experienceLevel', {
        experienceLevel: filters.experienceLevel,
      });
    }

    if (filters?.city) {
      queryBuilder.andWhere("user.location->>'city' ILIKE :city", {
        city: `%${filters.city}%`,
      });
    }

    if (filters?.country) {
      queryBuilder.andWhere("user.location->>'country' ILIKE :country", {
        country: `%${filters.country}%`,
      });
    }

    if (filters?.availability) {
      queryBuilder.andWhere('user.availability = :availability', {
        availability: filters.availability,
      });
    }

    const skills = filters?.skills?.map(normalizeSkillFilter).filter(Boolean);
    if (skills?.length) {
      queryBuilder.andWhere(
        `EXISTS (
          SELECT 1
          FROM resume skill_resume
          CROSS JOIN LATERAL json_array_elements(
            CASE
              WHEN json_typeof(COALESCE(skill_resume.skills, '[]'::json)) = 'array'
                THEN COALESCE(skill_resume.skills, '[]'::json)
              ELSE '[]'::json
            END
          ) AS skill(value)
          WHERE skill_resume.id = ${CURRENT_RESUME_ID}
            AND LOWER(BTRIM(REGEXP_REPLACE(NORMALIZE(
              CASE
                WHEN json_typeof(skill.value) = 'string' THEN skill.value #>> '{}'
                ELSE skill.value->>'name'
              END,
              NFKC
            ), '[[:space:]]+', ' ', 'g'))) IN (:...skills)
        )`,
        { skills },
      );
    }

    if (filters?.minExperience != null) {
      queryBuilder.andWhere(`${CANDIDATE_EXPERIENCE_YEARS} >= :minExperience`, {
        minExperience: filters.minExperience,
      });
    }

    if (filters?.maxExperience != null) {
      queryBuilder.andWhere(`${CANDIDATE_EXPERIENCE_YEARS} <= :maxExperience`, {
        maxExperience: filters.maxExperience,
      });
    }

    // Get total count
    const total = await queryBuilder.getCount();

    // Apply pagination
    const sortField = filters?.sort?.field ?? 'createdAt';
    const sortDirection = filters?.sort?.direction ?? 'DESC';
    queryBuilder
      .skip(skip)
      .take(limit)
      .orderBy(`user.${sortField}`, sortDirection);
    queryBuilder
      .addOrderBy('resumes.updatedAt', 'DESC')
      .addOrderBy('resumes.createdAt', 'DESC')
      .addOrderBy('resumes.id', 'DESC');

    const usersOrm = await queryBuilder.getMany();
    const data = usersOrm.map(userOrm => UserDomainOrmMapper.toDomain(userOrm));

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async update(id: string, entity: Partial<User>): Promise<User | null> {
    return this.userRepository.manager.transaction(async manager => {
      const repository = manager.getRepository(UserEntity);
      const existingUser = await repository.findOne({
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!existingUser) return null;
      if (
        existingUser.type === UserType.PROFESSIONAL &&
        !existingUser.isActive &&
        entity.isActive !== true
      ) {
        return null;
      }

      const updatedUserOrm = {
        ...existingUser,
        ...UserDomainOrmMapper.toOrm(entity as User),
      };
      const savedUser = await repository.save(updatedUserOrm);
      if (candidateSearchProfileChanged(existingUser, savedUser)) {
        await recordCandidateProfileChange(manager, id);
      }
      return UserDomainOrmMapper.toDomain(savedUser);
    });
  }

  async incrementViews(id: string): Promise<User | null> {
    await this.userRepository.increment({ id }, 'profileViews', 1);
    return this.findById(id);
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.userRepository.delete(id);
    return result.affected != null && result.affected > 0;
  }
}
