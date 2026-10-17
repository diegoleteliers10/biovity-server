import type { EntityManager } from 'typeorm';
import {
  candidateSearchProfileChanged,
  recordCandidateProfileChange,
  resumeSearchDataChanged,
} from './candidate-profile-change';

describe('candidate profile change snapshots', () => {
  it('detects only user fields used by candidate search', () => {
    const before = {
      name: 'Candidate',
      email: 'candidate@example.com',
      type: 'professional',
      isActive: true,
      profession: 'Biologist',
      experienceLevel: 'mid',
      availability: 'immediate',
      location: { city: 'Santiago', country: 'Chile' },
    };

    expect(candidateSearchProfileChanged(before, { ...before })).toBe(false);
    expect(
      candidateSearchProfileChanged(before, {
        ...before,
        location: { ...before.location, city: 'Valparaíso' },
      }),
    ).toBe(true);
    expect(
      candidateSearchProfileChanged(before, { ...before, isActive: false }),
    ).toBe(true);
  });

  it('detects changes to searchable resume fields only', () => {
    const before = {
      skills: [{ name: 'PCR' }],
      experiences: [{ startYear: '2020' }],
    };

    expect(resumeSearchDataChanged(before, { ...before })).toBe(false);
    expect(
      resumeSearchDataChanged(before, {
        ...before,
        skills: [{ name: 'qPCR' }],
      }),
    ).toBe(true);
    expect(resumeSearchDataChanged(before, null)).toBe(true);
  });

  it('stores the ordered resume snapshot in the caller transaction', async () => {
    const manager = {
      query: jest.fn().mockResolvedValue([]),
    } as unknown as EntityManager;

    await recordCandidateProfileChange(manager, 'candidate-id');

    const [query, parameters] = jest.mocked(manager.query).mock.calls[0] ?? [];
    expect(query).toContain('INSERT INTO candidate_profile_change');
    expect(query).toContain('LEFT JOIN LATERAL');
    expect(query).toContain('resume."updatedAt" DESC');
    expect(parameters).toEqual([
      expect.stringMatching(/^[0-9a-f-]{36}$/),
      'candidate-id',
    ]);
  });
});
