import {
  matchesCandidateProfileSearch,
  parseCandidateSearchFilters,
} from './candidate-profile-search-matcher';

const activeCandidate = {
  type: 'professional',
  isActive: true,
  name: 'María Vega',
  email: 'maria@example.com',
  profession: 'Bioquímica',
  experienceLevel: 'senior',
  availability: 'immediate',
  location: { city: 'Santiago', country: 'Chile' },
  skills: ['Ａnálisis de datos', { name: 'PCR' }],
  experiences: [
    { startYear: '2018', endYear: '2021' },
    { startYear: '2020', endYear: '2023' },
  ],
};

describe('matchesCandidateProfileSearch', () => {
  it('rejects unsupported or malformed saved filters', () => {
    expect(parseCandidateSearchFilters({})).toEqual({ kind: 'invalid' });
    expect(parseCandidateSearchFilters({ search: '   ' })).toEqual({
      kind: 'invalid',
    });
    expect(parseCandidateSearchFilters({ minExp: 5, extra: true })).toEqual({
      kind: 'invalid',
    });
    expect(parseCandidateSearchFilters({ minExp: 6, maxExp: 5 })).toEqual({
      kind: 'invalid',
    });
    expect(parseCandidateSearchFilters({ skills: ['PCR'] })).toEqual({
      kind: 'invalid',
    });
  });

  it('matches all saved talent filters with the same any-skill and year rules', () => {
    expect(
      matchesCandidateProfileSearch(
        activeCandidate,
        {
          search: 'maria@%',
          profession: 'bioquímica',
          city: 'santia',
          country: 'chile',
          experienceLevel: 'senior',
          availability: 'immediate',
          skills: 'PCR, estadística',
          minExp: 5,
          maxExp: 5,
        },
        2026,
      ),
    ).toBe(true);
  });

  it('does not match inactive or non-professional accounts', () => {
    expect(
      matchesCandidateProfileSearch(
        { ...activeCandidate, isActive: false },
        {},
        2026,
      ),
    ).toBe(false);
    expect(
      matchesCandidateProfileSearch(
        { ...activeCandidate, type: 'organization' },
        {},
        2026,
      ),
    ).toBe(false);
  });

  it('normalizes Unicode and whitespace in skill names', () => {
    expect(
      matchesCandidateProfileSearch(
        { ...activeCandidate, skills: ['  Ａnálisis   de datos  '] },
        { skills: 'análisis de datos' },
        2026,
      ),
    ).toBe(true);
  });

  it('matches escaped LIKE wildcards as literal characters', () => {
    expect(
      matchesCandidateProfileSearch(
        { ...activeCandidate, name: 'Ana 100% Bio' },
        { search: '\\%' },
        2026,
      ),
    ).toBe(true);
  });

  it('treats regex-only characters as literal LIKE characters', () => {
    expect(
      matchesCandidateProfileSearch(
        { ...activeCandidate, name: 'Ana *? Bio' },
        { search: '*?' },
        2026,
      ),
    ).toBe(true);
  });

  it('uses exclusive end years and counts overlapping work years once', () => {
    expect(
      matchesCandidateProfileSearch(activeCandidate, { minExp: 6 }, 2026),
    ).toBe(false);
  });

  it('uses the current UTC year for ongoing work', () => {
    expect(
      matchesCandidateProfileSearch(
        {
          ...activeCandidate,
          experiences: [{ startYear: '2022', stillWorking: true }],
        },
        { minExp: 4 },
        2026,
      ),
    ).toBe(true);
  });

  it('falls back to valid year fields when date fields are malformed', () => {
    expect(
      matchesCandidateProfileSearch(
        {
          ...activeCandidate,
          experiences: [
            {
              startDate: 'invalid',
              startYear: '2022',
              endDate: 'invalid',
              endYear: '2026',
            },
          ],
        },
        { minExp: 4, maxExp: 4 },
        2026,
      ),
    ).toBe(true);
  });
});
