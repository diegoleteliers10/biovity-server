import { randomUUID } from 'node:crypto';
import { DataSource, EntitySchema } from 'typeorm';
import { Organization } from '../../core/domain/entities/organization.entity';
import { UserType } from '../../core/domain/enums';
import { OrganizationEntity } from '../database/orm/organization.entity';
import { UserEntity } from '../database/orm/user.entity';
import { OrganizationRepositoryImpl } from './organization.repository.impl';

const localPostgresUrl = process.env.ATS07_LOCAL_POSTGRES_URL;
const isLocalPostgresUrl = (value?: string): value is string => {
  if (
    !value ||
    !/^postgres(?:ql)?:\/\/(?:[^@/]+@)?(?:localhost|127\.0\.0\.1)(?::\d+)?\//.test(
      value,
    )
  )
    return false;
  const query = value.split('?')[1]?.split('#')[0] ?? '';
  for (const [key] of new URLSearchParams(query)) {
    if (key.toLowerCase() === 'host' || key.toLowerCase() === 'hostaddr')
      return false;
  }
  return true;
};
const describeLocalPostgres = isLocalPostgresUrl(localPostgresUrl)
  ? describe
  : describe.skip;

describeLocalPostgres(
  'OrganizationRepositoryImpl with local PostgreSQL',
  () => {
    const schema = `organization_test_${randomUUID().replaceAll('-', '')}`;
    const ownerId = randomUUID();
    const nextOwnerId = randomUUID();
    let admin: DataSource;
    let dataSource: DataSource;
    let repository: OrganizationRepositoryImpl;

    const organization = () =>
      new Organization(randomUUID(), 'BioLab', 'https://biolab.cl');
    const user = async (
      id: string,
      type = UserType.ORGANIZATION,
      organizationId: string | null = null,
    ) => {
      await dataSource.query(
        'INSERT INTO "user" (id, type, "organizationId") VALUES ($1, $2, $3)',
        [id, type, organizationId],
      );
    };
    const owners = async () =>
      dataSource.query('SELECT id, "organizationId" FROM "user" ORDER BY id');
    const members = async () =>
      dataSource.query(
        'SELECT user_id, role FROM organization_member ORDER BY user_id',
      );
    const prepareTransfer = async () => {
      await user(ownerId);
      await user(nextOwnerId);
      const created = await repository.createWithOwner(organization(), ownerId);
      await dataSource.query(
        `INSERT INTO organization_member (organization_id, user_id, role) VALUES ($1, $2, 'recruiter')`,
        [created.id, nextOwnerId],
      );
      return created;
    };
    const rejectUpdates = async (table: 'user' | 'organization_member') => {
      await dataSource.query(`CREATE FUNCTION "${schema}".reject_update() RETURNS trigger AS $$
      BEGIN RAISE EXCEPTION 'injected persistence failure'; END; $$ LANGUAGE plpgsql`);
      await dataSource.query(`CREATE TRIGGER reject_update BEFORE UPDATE ON "${table}"
      FOR EACH ROW EXECUTE FUNCTION "${schema}".reject_update()`);
    };

    beforeAll(async () => {
      admin = new DataSource({
        type: 'postgres',
        url: localPostgresUrl,
        entities: [],
        synchronize: false,
      });
      await admin.initialize();
      await admin.query(`CREATE SCHEMA "${schema}"`);
      dataSource = new DataSource({
        type: 'postgres',
        url: localPostgresUrl,
        schema,
        // Match the runtime DataSource's legacy null handling.
        invalidWhereValuesBehavior: { null: 'ignore', undefined: 'ignore' },
        extra: { options: `-c search_path=${schema},public` },
        entities: [
          new EntitySchema<OrganizationEntity>({
            target: OrganizationEntity,
            name: 'OrganizationEntity',
            tableName: 'organization',
            columns: {
              id: { type: 'uuid', primary: true },
              name: { type: 'varchar' },
              website: { type: 'varchar' },
              createdAt: { type: 'timestamp' },
              updatedAt: { type: 'timestamp' },
            },
          }),
          new EntitySchema<UserEntity>({
            target: UserEntity,
            name: 'UserEntity',
            tableName: 'user',
            columns: {
              id: { type: 'uuid', primary: true },
              type: { type: 'varchar' },
              organizationId: { type: 'uuid', nullable: true, unique: true },
            },
          }),
        ],
        synchronize: false,
      });
      await dataSource.initialize();
      await dataSource.synchronize();
      await dataSource.query(
        `ALTER TABLE "user" ADD FOREIGN KEY ("organizationId") REFERENCES organization(id)`,
      );
      await dataSource.query(`CREATE TABLE organization_member (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      organization_id uuid NOT NULL REFERENCES organization(id),
      user_id uuid NOT NULL REFERENCES "user"(id),
      role varchar NOT NULL,
      updated_at timestamp NOT NULL DEFAULT now(),
      UNIQUE (organization_id, user_id)
    )`);
      repository = new OrganizationRepositoryImpl(
        dataSource.getRepository(OrganizationEntity),
        dataSource,
      );
    });

    beforeEach(async () => {
      await dataSource.query('DROP TRIGGER IF EXISTS reject_update ON "user"');
      await dataSource.query(
        'DROP TRIGGER IF EXISTS reject_update ON organization_member',
      );
      await dataSource.query(
        `DROP FUNCTION IF EXISTS "${schema}".reject_update()`,
      );
      await dataSource.query(
        'TRUNCATE organization_member, "user", organization',
      );
    });

    afterAll(async () => {
      if (dataSource?.isInitialized) await dataSource.destroy();
      if (admin?.isInitialized) {
        await admin.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
        await admin.destroy();
      }
    });

    it('creates the organization and owner link, reusing it on a signup retry', async () => {
      await user(ownerId);
      const input = organization();
      const created = await repository.createWithOwner(input, ownerId);
      const retried = await repository.createWithOwner(organization(), ownerId);
      expect(created).toMatchObject({
        id: input.id,
        name: input.name,
        website: input.website,
      });
      expect(retried.id).toBe(created.id);
      expect(await dataSource.getRepository(OrganizationEntity).count()).toBe(
        1,
      );
      expect(await owners()).toEqual([
        { id: ownerId, organizationId: created.id },
      ]);
    });

    it('serializes concurrent signup retries for the same owner', async () => {
      await user(ownerId);
      const results = await Promise.all([
        repository.createWithOwner(organization(), ownerId),
        repository.createWithOwner(organization(), ownerId),
      ]);
      expect(results[0].id).toBe(results[1].id);
      expect(await dataSource.getRepository(OrganizationEntity).count()).toBe(
        1,
      );
      expect(await owners()).toEqual([
        { id: ownerId, organizationId: results[0].id },
      ]);
    });

    it.each([
      ['missing owner', null, 'Organization owner not found'],
      [
        'professional owner',
        UserType.PROFESSIONAL,
        'Only organization users can create an organization',
      ],
    ])(
      'rejects %s without persisting an organization',
      async (_label, type, message) => {
        if (type) await user(ownerId, type);
        await expect(
          repository.createWithOwner(organization(), ownerId),
        ).rejects.toThrow(message);
        expect(await dataSource.getRepository(OrganizationEntity).count()).toBe(
          0,
        );
      },
    );

    it('rolls back the inserted organization when linking the owner fails', async () => {
      await user(ownerId);
      await rejectUpdates('user');
      await expect(
        repository.createWithOwner(organization(), ownerId),
      ).rejects.toThrow('injected persistence failure');
      expect(await dataSource.getRepository(OrganizationEntity).count()).toBe(
        0,
      );
      expect(await owners()).toEqual([{ id: ownerId, organizationId: null }]);
    });

    it('transfers ownership, promotes the new owner and retains the previous owner as recruiter', async () => {
      const created = await prepareTransfer();
      await repository.transferOwner(created.id, ownerId, nextOwnerId);
      expect(
        await dataSource
          .getRepository(UserEntity)
          .findOneByOrFail({ id: ownerId }),
      ).toMatchObject({ organizationId: null });
      expect(
        await dataSource
          .getRepository(UserEntity)
          .findOneByOrFail({ id: nextOwnerId }),
      ).toMatchObject({ organizationId: created.id });
      expect(await members()).toEqual(
        expect.arrayContaining([
          { user_id: ownerId, role: 'recruiter' },
          { user_id: nextOwnerId, role: 'admin' },
        ]),
      );
      expect(await dataSource.getRepository(OrganizationEntity).count()).toBe(
        1,
      );
    });

    it.each([
      'wrong current owner',
      'nonmember',
      'professional',
      'already owns another organization',
    ])(
      'rejects transfer to %s without modifying ownership or memberships',
      async scenario => {
        const created = await prepareTransfer();
        if (scenario === 'nonmember')
          await dataSource.query('DELETE FROM organization_member');
        if (scenario === 'professional')
          await dataSource
            .getRepository(UserEntity)
            .update(nextOwnerId, { type: UserType.PROFESSIONAL });
        if (scenario === 'already owns another organization')
          await repository.createWithOwner(organization(), nextOwnerId);
        const originalOwners = await owners();
        const originalMembers = await members();
        await expect(
          repository.transferOwner(
            created.id,
            scenario === 'wrong current owner' ? randomUUID() : ownerId,
            nextOwnerId,
          ),
        ).rejects.toThrow();
        expect(await owners()).toEqual(originalOwners);
        expect(await members()).toEqual(originalMembers);
      },
    );

    it('rolls back both owner changes if the membership promotion fails', async () => {
      const created = await prepareTransfer();
      const originalOwners = await owners();
      const originalMembers = await members();
      await rejectUpdates('organization_member');
      await expect(
        repository.transferOwner(created.id, ownerId, nextOwnerId),
      ).rejects.toThrow('injected persistence failure');
      expect(await owners()).toEqual(originalOwners);
      expect(await members()).toEqual(originalMembers);
    });
  },
);
