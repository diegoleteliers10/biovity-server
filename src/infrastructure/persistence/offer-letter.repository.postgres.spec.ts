import { randomUUID } from 'node:crypto';
import { DataSource, EntitySchema } from 'typeorm';
import { OfferLetterEntity } from '../database/orm/offer-letter.entity';
import { OfferLetterRepositoryImpl } from './offer-letter.repository.impl';

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

describeLocalPostgres('OfferLetterRepositoryImpl with local PostgreSQL', () => {
  const schema = `ats07_${randomUUID().replaceAll('-', '')}`;
  let adminDataSource: DataSource;
  let dataSource: DataSource;
  let repository: OfferLetterRepositoryImpl;

  beforeAll(async () => {
    adminDataSource = new DataSource({
      type: 'postgres',
      url: localPostgresUrl,
      entities: [],
      synchronize: false,
    });
    await adminDataSource.initialize();
    await adminDataSource.query(`CREATE SCHEMA "${schema}"`);
    dataSource = new DataSource({
      type: 'postgres',
      url: localPostgresUrl,
      schema,
      entities: [
        new EntitySchema<OfferLetterEntity>({
          target: OfferLetterEntity,
          name: 'OfferLetterEntity',
          tableName: 'offer_letter',
          columns: {
            id: { type: 'uuid', primary: true, generated: 'uuid' },
            applicationId: { name: 'application_id', type: 'uuid' },
            jobId: { name: 'job_id', type: 'uuid' },
            organizationId: { name: 'organization_id', type: 'uuid' },
            candidateId: { name: 'candidate_id', type: 'uuid' },
            status: { type: 'varchar' },
            letterData: { name: 'letter_data', type: 'jsonb' },
            chatId: { name: 'chat_id', type: 'uuid', nullable: true },
            messageId: { name: 'message_id', type: 'uuid', nullable: true },
            title: { type: 'varchar', nullable: true },
            pdfPath: { name: 'pdf_path', type: 'text', nullable: true },
            sentAt: { name: 'sent_at', type: 'timestamptz', nullable: true },
            respondedAt: {
              name: 'responded_at',
              type: 'timestamptz',
              nullable: true,
            },
            createdAt: {
              name: 'created_at',
              type: 'timestamptz',
              default: () => 'now()',
            },
            updatedAt: {
              name: 'updated_at',
              type: 'timestamptz',
              default: () => 'now()',
            },
            expiresAt: {
              name: 'expires_at',
              type: 'timestamptz',
              nullable: true,
            },
          },
        }),
      ],
      synchronize: true,
      dropSchema: false,
    });
    await dataSource.initialize();
    repository = new OfferLetterRepositoryImpl(
      dataSource.getRepository(OfferLetterEntity),
    );
  });

  afterAll(async () => {
    if (dataSource?.isInitialized) await dataSource.destroy();
    if (adminDataSource?.isInitialized) {
      await adminDataSource.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
      await adminDataSource.destroy();
    }
  });

  it('allows only one concurrent terminal response', async () => {
    const id = randomUUID();
    await dataSource.query(
      `INSERT INTO "${schema}".offer_letter
       (id, application_id, job_id, organization_id, candidate_id, status, letter_data)
       VALUES ($1, $2, $3, $4, $5, 'sent', $6::jsonb)`,
      [
        id,
        randomUUID(),
        randomUUID(),
        randomUUID(),
        randomUUID(),
        JSON.stringify({
          companyName: 'Biovity',
          candidateName: 'Candidate',
          jobTitle: 'Role',
        }),
      ],
    );

    const outcomes = await Promise.all([
      repository.updateStatus(id, 'accepted'),
      repository.updateStatus(id, 'rejected'),
    ]);
    const stored = await dataSource.query(
      `SELECT status FROM "${schema}".offer_letter WHERE id = $1`,
      [id],
    );

    expect(outcomes.filter(Boolean)).toHaveLength(1);
    expect(outcomes.filter(value => value === null)).toHaveLength(1);
    expect(['accepted', 'rejected']).toContain(stored[0].status);
  });
});
