type CandidateSearchSnapshot = {
  type?: unknown;
  isActive?: unknown;
  name?: unknown;
  email?: unknown;
  profession?: unknown;
  experienceLevel?: unknown;
  availability?: unknown;
  location?: unknown;
  skills?: unknown;
  experiences?: unknown;
};

export type CandidateSearchFilters = {
  search?: string;
  profession?: string;
  city?: string;
  country?: string;
  experienceLevel?: 'junior' | 'mid' | 'senior' | 'lead' | 'manager';
  availability?: 'immediate' | '2weeks' | '1month' | 'open';
  skills?: string;
  minExp?: number;
  maxExp?: number;
};

export type CandidateSearchFilterParse =
  { kind: 'valid'; filters: CandidateSearchFilters } | { kind: 'invalid' };

function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return undefined;
  }
  return value as Record<string, unknown>;
}

function text(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

export function parseCandidateSearchFilters(
  value: unknown,
): CandidateSearchFilterParse {
  const filters = asRecord(value);
  if (!filters) return { kind: 'invalid' };

  const allowed = new Set([
    'search',
    'profession',
    'city',
    'country',
    'experienceLevel',
    'availability',
    'skills',
    'minExp',
    'maxExp',
  ]);
  if (Object.keys(filters).some(key => !allowed.has(key))) {
    return { kind: 'invalid' };
  }

  if (
    !Object.values(filters).some(
      value =>
        typeof value === 'number' ||
        (typeof value === 'string' && value.trim().length > 0),
    )
  ) {
    return { kind: 'invalid' };
  }

  for (const field of [
    'search',
    'profession',
    'city',
    'country',
    'skills',
  ] as const) {
    if (filters[field] !== undefined && typeof filters[field] !== 'string') {
      return { kind: 'invalid' };
    }
  }

  if (
    filters.experienceLevel !== undefined &&
    !['junior', 'mid', 'senior', 'lead', 'manager'].includes(
      String(filters.experienceLevel),
    )
  ) {
    return { kind: 'invalid' };
  }
  if (
    filters.availability !== undefined &&
    !['immediate', '2weeks', '1month', 'open'].includes(
      String(filters.availability),
    )
  ) {
    return { kind: 'invalid' };
  }

  for (const field of ['minExp', 'maxExp'] as const) {
    const years = filters[field];
    if (
      years !== undefined &&
      (typeof years !== 'number' ||
        !Number.isInteger(years) ||
        years < 0 ||
        years > 50)
    ) {
      return { kind: 'invalid' };
    }
  }
  if (
    typeof filters.minExp === 'number' &&
    typeof filters.maxExp === 'number' &&
    filters.minExp > filters.maxExp
  ) {
    return { kind: 'invalid' };
  }

  return {
    kind: 'valid',
    filters: {
      search: filters.search as string | undefined,
      profession: filters.profession as string | undefined,
      city: filters.city as string | undefined,
      country: filters.country as string | undefined,
      experienceLevel:
        filters.experienceLevel as CandidateSearchFilters['experienceLevel'],
      availability:
        filters.availability as CandidateSearchFilters['availability'],
      skills: filters.skills as string | undefined,
      minExp: filters.minExp as number | undefined,
      maxExp: filters.maxExp as number | undefined,
    },
  };
}

function ilikeContains(value: unknown, filter: string): boolean {
  const source = text(value);
  if (source === undefined) return false;
  let pattern = '';
  const sqlPattern = `%${filter}%`;
  for (let index = 0; index < sqlPattern.length; index += 1) {
    const character = sqlPattern[index];
    if (character === '\\' && index + 1 < sqlPattern.length) {
      index += 1;
      pattern += sqlPattern[index].replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    } else if (character === '%') {
      pattern += '.*';
    } else if (character === '_') {
      pattern += '.';
    } else {
      pattern += character.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
  }
  return new RegExp(`.*${pattern}.*`, 'ius').test(source);
}

function validYearValue(value: unknown): string | undefined {
  const candidate = text(value);
  return candidate?.match(/^[0-9]{4}(?:-[0-9]{2}(?:-[0-9]{2})?)?$/)
    ? candidate
    : undefined;
}

function normalizedSkill(value: unknown): string | undefined {
  const record = asRecord(value);
  const name = typeof value === 'string' ? value : text(record?.name);
  return name?.normalize('NFKC').trim().replace(/\s+/g, ' ').toLowerCase();
}

function experiencesInYears(value: unknown, currentYear: number): number {
  if (!Array.isArray(value)) return 0;
  const years = new Set<number>();

  for (const item of value) {
    const experience = asRecord(item);
    if (!experience) continue;

    const startValue =
      validYearValue(experience.startDate) ??
      validYearValue(experience.startYear);
    const startYear = startValue ? Number(startValue.slice(0, 4)) : undefined;
    const stillWorking =
      String(
        experience.stillWorking ?? experience.current ?? 'false',
      ).toLowerCase() === 'true';
    const endValue =
      validYearValue(experience.endDate) ?? validYearValue(experience.endYear);
    const endYear = stillWorking
      ? currentYear
      : endValue
        ? Number(endValue.slice(0, 4))
        : undefined;

    if (
      startYear === undefined ||
      endYear === undefined ||
      startYear < 1900 ||
      startYear > currentYear ||
      endYear < startYear ||
      endYear > currentYear
    ) {
      continue;
    }

    for (let year = startYear; year < endYear; year += 1) years.add(year);
  }

  return years.size;
}

export function matchesCandidateProfileSearch(
  snapshot: CandidateSearchSnapshot,
  filters: CandidateSearchFilters,
  currentYear = new Date().getUTCFullYear(),
): boolean {
  if (snapshot.type !== 'professional' || snapshot.isActive !== true)
    return false;

  if (typeof filters.search === 'string' && filters.search.length > 0) {
    const search = filters.search;
    if (
      ![snapshot.name, snapshot.email, snapshot.profession].some(value =>
        ilikeContains(value, search),
      )
    ) {
      return false;
    }
  }

  if (
    typeof filters.profession === 'string' &&
    filters.profession.length > 0 &&
    !ilikeContains(snapshot.profession, filters.profession)
  ) {
    return false;
  }

  const location = asRecord(snapshot.location);
  for (const field of ['city', 'country'] as const) {
    const filter = filters[field];
    if (typeof filter === 'string' && filter.length > 0) {
      if (!ilikeContains(location?.[field], filter)) return false;
    }
  }

  for (const field of ['experienceLevel', 'availability'] as const) {
    const filter = filters[field];
    if (filter !== undefined && snapshot[field] !== filter) return false;
  }

  if (typeof filters.skills === 'string' && filters.skills.trim().length > 0) {
    const wanted = filters.skills
      .split(',')
      .map(skill => normalizedSkill(skill))
      .filter((skill): skill is string => Boolean(skill));
    const available = Array.isArray(snapshot.skills)
      ? snapshot.skills
          .map(normalizedSkill)
          .filter((skill): skill is string => Boolean(skill))
      : [];
    if (!wanted.some(skill => available.includes(skill))) return false;
  }

  const experience = experiencesInYears(snapshot.experiences, currentYear);
  if (typeof filters.minExp === 'number' && experience < filters.minExp)
    return false;
  if (typeof filters.maxExp === 'number' && experience > filters.maxExp)
    return false;
  return true;
}
