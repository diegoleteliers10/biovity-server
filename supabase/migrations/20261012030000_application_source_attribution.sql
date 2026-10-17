ALTER TABLE public.application
  ADD COLUMN source_channel text NOT NULL DEFAULT 'unknown',
  ADD COLUMN source_method text NOT NULL DEFAULT 'unknown',
  ADD COLUMN distribution_source_id uuid NULL;

ALTER TABLE public.application
  ADD CONSTRAINT application_source_channel_check
    CHECK (source_channel IN ('biovity', 'linkedin', 'laborum', 'other_job_board', 'company_website', 'social_media', 'university', 'referral', 'event', 'other', 'unknown')),
  ADD CONSTRAINT application_source_method_check
    CHECK (source_method IN ('tracked_link', 'self_reported', 'unknown')),
  ADD CONSTRAINT application_unknown_source_method_check
    CHECK (
      (source_channel = 'unknown' AND source_method = 'unknown' AND distribution_source_id IS NULL) OR
      (source_channel <> 'unknown' AND source_method = 'self_reported' AND distribution_source_id IS NULL) OR
      (source_channel <> 'unknown' AND source_method = 'tracked_link' AND distribution_source_id IS NOT NULL)
    );

CREATE INDEX idx_application_source_cohort
  ON public.application ("jobId", source_channel, source_method, "createdAt" DESC, id DESC);
