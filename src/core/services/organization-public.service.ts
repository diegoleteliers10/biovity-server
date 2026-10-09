import { Inject, Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { parsePagination, paginated } from '../../shared/pagination/pagination';
import type {
  PaginationQuery,
  PaginatedResponse,
} from '../../shared/pagination/pagination';
import type { OrganizationPublicResponseDto } from '../../interfaces/dtos/organization/organization-public-response.dto';

interface OrganizationPublicRow {
  id: string;
  name: string;
  slug: string | null;
  website: string;
  logo: string | null;
  description: string | null;
  industry: string | null;
  size: string | null;
  foundedYear: number | null;
  linkedinUrl: string | null;
  twitterUrl: string | null;
  address: {
    street?: string;
    city?: string;
    state?: string;
    country?: string;
    zipCode?: string;
  } | null;
  createdAt: Date;
  activeJobsCount: string | number;
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const SELECT_COLUMNS = `
  o.id,
  o.name,
  o.slug,
  o.website,
  o.logo,
  o.description,
  o.industry,
  o.size,
  o."foundedYear",
  o."linkedinUrl",
  o."twitterUrl",
  o.address,
  o."createdAt",
  (
    SELECT COUNT(*) FROM job j
    WHERE j."organizationId" = o.id AND j.status = 'active'
  ) AS "activeJobsCount"
`;

@Injectable()
export class OrganizationPublicService {
  constructor(
    @Inject(DataSource)
    private readonly dataSource: DataSource,
  ) {}

  private toPublicDto(
    row: OrganizationPublicRow,
  ): OrganizationPublicResponseDto {
    return {
      id: row.id,
      name: row.name,
      slug: row.slug ?? undefined,
      website: row.website,
      logo: row.logo ?? undefined,
      description: row.description ?? undefined,
      industry: row.industry ?? undefined,
      size: row.size ?? undefined,
      foundedYear: row.foundedYear ?? undefined,
      linkedinUrl: row.linkedinUrl ?? undefined,
      twitterUrl: row.twitterUrl ?? undefined,
      location: row.address
        ? {
            city: row.address.city,
            state: row.address.state,
            country: row.address.country,
          }
        : undefined,
      activeJobsCount: Number(row.activeJobsCount) || 0,
      createdAt: row.createdAt.toISOString(),
    };
  }

  async getPublicBySlugOrId(
    slugOrId: string,
  ): Promise<OrganizationPublicResponseDto | null> {
    const isUuid = UUID_PATTERN.test(slugOrId);
    const rows = await this.dataSource.query<OrganizationPublicRow[]>(
      `SELECT ${SELECT_COLUMNS}
       FROM organization o
       WHERE o.slug = $1 ${isUuid ? 'OR o.id = $2::uuid' : ''}
       LIMIT 1`,
      isUuid ? [slugOrId, slugOrId] : [slugOrId],
    );
    return rows[0] ? this.toPublicDto(rows[0]) : null;
  }

  async listPublic(
    pagination?: PaginationQuery,
  ): Promise<PaginatedResponse<OrganizationPublicResponseDto>> {
    const { page, limit, skip } = parsePagination(pagination ?? {});
    const [rows, totalResult] = await Promise.all([
      this.dataSource.query<OrganizationPublicRow[]>(
        `SELECT ${SELECT_COLUMNS}
         FROM organization o
         ORDER BY "activeJobsCount" DESC, o."createdAt" DESC
         LIMIT $1 OFFSET $2`,
        [limit, skip],
      ),
      this.dataSource.query<Array<{ count: string }>>(
        `SELECT COUNT(*) AS count FROM organization`,
      ),
    ]);
    const total = Number(totalResult[0]?.count) || 0;
    return paginated(
      rows.map(row => this.toPublicDto(row)),
      total,
      page,
      limit,
    );
  }
}
