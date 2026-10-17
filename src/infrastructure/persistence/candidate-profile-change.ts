import * as crypto from 'crypto';
import type { EntityManager } from 'typeorm';

export function candidateSearchProfileChanged(
  before: {
    name: string;
    email: string;
    type: string;
    isActive: boolean;
    profession?: string | null;
    experienceLevel?: string | null;
    availability?: string | null;
    location?: { city?: string; country?: string } | null;
  },
  after: {
    name: string;
    email: string;
    type: string;
    isActive: boolean;
    profession?: string | null;
    experienceLevel?: string | null;
    availability?: string | null;
    location?: { city?: string; country?: string } | null;
  },
): boolean {
  return (
    before.name !== after.name ||
    before.email !== after.email ||
    before.type !== after.type ||
    before.isActive !== after.isActive ||
    before.profession !== after.profession ||
    before.experienceLevel !== after.experienceLevel ||
    before.availability !== after.availability ||
    before.location?.city !== after.location?.city ||
    before.location?.country !== after.location?.country
  );
}

export function resumeSearchDataChanged(
  before: { skills?: unknown; experiences?: unknown } | null,
  after: { skills?: unknown; experiences?: unknown } | null,
): boolean {
  return (
    JSON.stringify(before?.skills ?? []) !==
      JSON.stringify(after?.skills ?? []) ||
    JSON.stringify(before?.experiences ?? []) !==
      JSON.stringify(after?.experiences ?? [])
  );
}

export async function recordCandidateProfileChange(
  manager: EntityManager,
  candidateId: string,
): Promise<void> {
  await manager.query(
    `INSERT INTO candidate_profile_change (id, candidate_id, snapshot)
     SELECT $1::uuid,
            profile.id,
            jsonb_build_object(
              'name', profile.name,
              'email', profile.email,
              'type', profile.type,
              'isActive', profile."isActive",
              'profession', profile.profession,
              'experienceLevel', profile."experienceLevel",
              'availability', profile.availability,
              'location', profile.location,
              'skills', COALESCE(latest_resume.skills, '[]'::json),
              'experiences', COALESCE(latest_resume.experiences, '[]'::json)
            )
       FROM "user" profile
       LEFT JOIN LATERAL (
         SELECT resume.skills, resume.experiences
           FROM resume
          WHERE resume."userId" = profile.id
          ORDER BY resume."updatedAt" DESC, resume."createdAt" DESC, resume.id DESC
          LIMIT 1
       ) latest_resume ON true
      WHERE profile.id = $2::uuid`,
    [crypto.randomUUID(), candidateId],
  );
}
