import { DataSource, QueryRunner } from 'typeorm';
import type { AuthenticatedUser } from './better-auth-session.service';
import { OrganizationAccessService } from './organization-access.service';

const localPostgresUrl = process.env.ATS07_LOCAL_POSTGRES_URL;
const hasHostOverride = (connectionString: string): boolean => {
  const query = connectionString.split('?')[1]?.split('#')[0] ?? '';
  let found = false;
  new URLSearchParams(query).forEach((_value, key) => {
    if (key.toLowerCase() === 'host' || key.toLowerCase() === 'hostaddr')
      found = true;
  });
  return found;
};
const isLocalPostgresUrl = (connectionString?: string): boolean =>
  Boolean(
    connectionString &&
    !hasHostOverride(connectionString) &&
    /^postgres(?:ql)?:\/\/(?:[^@/]+@)?(?:localhost|127\.0\.0\.1)(?::\d+)?\//.test(
      connectionString,
    ),
  );
const canUseLocalPostgres = isLocalPostgresUrl(localPostgresUrl);
const describeLocalPostgres = canUseLocalPostgres ? describe : describe.skip;
const organizationUser = (id: string, email: string): AuthenticatedUser => ({
  id,
  email,
  type: 'organization',
  organizationId: null,
});

describe('local PostgreSQL URL guard', () => {
  it('allows a localhost connection', () => {
    expect(isLocalPostgresUrl('postgres://localhost:5432/ats_test')).toBe(true);
  });

  it('rejects a remote host override', () => {
    expect(
      isLocalPostgresUrl(
        'postgres://localhost:5432/ats_test?host=db.example.com',
      ),
    ).toBe(false);
    expect(
      isLocalPostgresUrl(
        'postgres://localhost:5432/ats_test?%68ost=db.example.com',
      ),
    ).toBe(false);
    expect(
      isLocalPostgresUrl(
        'postgres://localhost:5432/ats_test?hostaddr=203.0.113.10',
      ),
    ).toBe(false);
  });
});

describeLocalPostgres('OrganizationAccessService with PostgreSQL', () => {
  let dataSource: DataSource;
  let queryRunner: QueryRunner;
  let access: OrganizationAccessService;

  beforeAll(async () => {
    dataSource = new DataSource({
      type: 'postgres',
      url: localPostgresUrl,
      entities: [],
      synchronize: false,
    });
    await dataSource.initialize();
    queryRunner = dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    await queryRunner.query(`
      CREATE TEMP TABLE organization (
        id uuid PRIMARY KEY,
        verification_status text NOT NULL
      );
      CREATE TEMP TABLE "user" (
        id uuid PRIMARY KEY,
        "organizationId" uuid
      );
      CREATE TEMP TABLE organization_member (
        id uuid PRIMARY KEY,
        organization_id uuid NOT NULL,
        user_id uuid NOT NULL,
        role text NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now()
      );
      CREATE TEMP TABLE candidate_tag (
        id uuid PRIMARY KEY,
        organization_id uuid NOT NULL
      );
      INSERT INTO organization (id, verification_status) VALUES
        ('00000000-0000-4000-8000-000000000001', 'verified'),
        ('00000000-0000-4000-8000-000000000002', 'unverified');
      INSERT INTO "user" (id, "organizationId") VALUES
        ('00000000-0000-4000-8000-000000000011', '00000000-0000-4000-8000-000000000001'),
        ('00000000-0000-4000-8000-000000000012', NULL),
        ('00000000-0000-4000-8000-000000000013', NULL),
        ('00000000-0000-4000-8000-000000000014', NULL),
        ('00000000-0000-4000-8000-000000000015', NULL);
      INSERT INTO organization_member (id, organization_id, user_id, role) VALUES
        ('00000000-0000-4000-8000-000000000021', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000012', 'recruiter'),
        ('00000000-0000-4000-8000-000000000022', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000013', 'viewer'),
        ('00000000-0000-4000-8000-000000000023', '00000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000014', 'recruiter');
      INSERT INTO candidate_tag (id, organization_id) VALUES
        ('00000000-0000-4000-8000-000000000031', '00000000-0000-4000-8000-000000000001'),
        ('00000000-0000-4000-8000-000000000032', '00000000-0000-4000-8000-000000000002');
    `);
    access = new OrganizationAccessService({
      query: (sql: string, parameters?: unknown[]) =>
        queryRunner.query(sql, parameters),
    } as DataSource);
  });

  afterAll(async () => {
    if (queryRunner?.isTransactionActive)
      await queryRunner.rollbackTransaction();
    if (queryRunner) await queryRunner.release();
    if (dataSource?.isInitialized) await dataSource.destroy();
  });

  it('grants owner and recruiter access with current organization roles', async () => {
    await expect(
      access.assertAccess(
        '00000000-0000-4000-8000-000000000001',
        organizationUser(
          '00000000-0000-4000-8000-000000000011',
          'owner@example.com',
        ),
        'manage',
      ),
    ).resolves.toBeUndefined();
    await expect(
      access.assertAccess(
        '00000000-0000-4000-8000-000000000001',
        organizationUser(
          '00000000-0000-4000-8000-000000000012',
          'recruiter@example.com',
        ),
        'recruit',
      ),
    ).resolves.toBeUndefined();
  });

  it('denies viewer writes and cross-organization access', async () => {
    await expect(
      access.assertAccess(
        '00000000-0000-4000-8000-000000000001',
        organizationUser(
          '00000000-0000-4000-8000-000000000013',
          'viewer@example.com',
        ),
        'recruit',
      ),
    ).rejects.toMatchObject({ status: 403 });
    await expect(
      access.assertAccess(
        '00000000-0000-4000-8000-000000000001',
        organizationUser(
          '00000000-0000-4000-8000-000000000014',
          'other@example.com',
        ),
        'read',
      ),
    ).rejects.toMatchObject({ status: 403 });
  });

  it('requires verified organizations for recruiter actions', async () => {
    await expect(
      access.assertAccess(
        '00000000-0000-4000-8000-000000000002',
        organizationUser(
          '00000000-0000-4000-8000-000000000014',
          'other@example.com',
        ),
        'recruit',
      ),
    ).rejects.toMatchObject({ status: 400 });
  });

  it('checks the tag organization before granting tag access', async () => {
    await expect(
      access.assertCandidateTagAccess(
        '00000000-0000-4000-8000-000000000032',
        organizationUser(
          '00000000-0000-4000-8000-000000000012',
          'recruiter@example.com',
        ),
        'recruit',
      ),
    ).rejects.toMatchObject({ status: 403 });
  });
});
