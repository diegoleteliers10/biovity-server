import type { QueryRunner } from 'typeorm';
import { CanonicalApplicationPipelineStages1791800000003 } from './migrations/1791800000003-CanonicalApplicationPipelineStages';
import { EventParticipantStatusHistory1791800000010 } from './migrations/1791800000010-EventParticipantStatusHistory';

describe('CanonicalApplicationPipelineStages1791800000003', () => {
  it('casts enum-backed statuses to text when it links records to stages', async () => {
    const queries: string[] = [];
    const queryRunner = {
      query: async (sql: string) => {
        queries.push(sql);
        return [];
      },
    } as unknown as QueryRunner;

    await new CanonicalApplicationPipelineStages1791800000003().up(queryRunner);

    expect(
      queries.filter(query =>
        query.includes('stage.system_key = app.status::text'),
      ),
    ).toHaveLength(2);
    expect(queries).toEqual(
      expect.arrayContaining([
        expect.stringContaining('stage.system_key = history.new_status::text'),
        expect.stringContaining(
          'stage.system_key = history.previous_status::text',
        ),
      ]),
    );
  });
});

describe('EventParticipantStatusHistory1791800000010', () => {
  it('uses the participant status enum already defined by the database', async () => {
    const queries: string[] = [];
    const queryRunner = {
      query: async (sql: string) => {
        queries.push(sql);
        return [];
      },
    } as unknown as QueryRunner;

    await new EventParticipantStatusHistory1791800000010().up(queryRunner);

    expect(queries[0]).toContain(
      'from_status participant_status_enum NOT NULL',
    );
    expect(queries[0]).toContain('to_status participant_status_enum NOT NULL');
  });
});
