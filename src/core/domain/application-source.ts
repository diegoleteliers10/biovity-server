export const APPLICATION_SOURCE_CHANNELS = [
  'biovity',
  'linkedin',
  'laborum',
  'other_job_board',
  'company_website',
  'social_media',
  'university',
  'referral',
  'event',
  'other',
  'unknown',
] as const;

export type ApplicationSourceChannel =
  (typeof APPLICATION_SOURCE_CHANNELS)[number];

export type ApplicationSourceMethod =
  'tracked_link' | 'self_reported' | 'unknown';
