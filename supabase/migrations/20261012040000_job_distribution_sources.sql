CREATE TABLE public.job_distribution_source (
  id uuid PRIMARY KEY,
  job_id uuid NOT NULL REFERENCES public.job(id) ON DELETE CASCADE,
  source_channel text NOT NULL
    CHECK (source_channel IN ('biovity', 'linkedin', 'laborum', 'other_job_board', 'company_website', 'social_media', 'university', 'referral', 'event', 'other')),
  created_at timestamptz NOT NULL DEFAULT now(),
  disabled_at timestamptz NULL,
  CONSTRAINT job_distribution_source_id_job_channel_key
    UNIQUE (id, job_id, source_channel)
);

CREATE INDEX idx_job_distribution_source_job_created
  ON public.job_distribution_source (job_id, created_at DESC, id DESC);

ALTER TABLE public.application
  ADD CONSTRAINT application_distribution_source_job_channel_fkey
  FOREIGN KEY (distribution_source_id, "jobId", source_channel)
  REFERENCES public.job_distribution_source (id, job_id, source_channel)
  ON DELETE CASCADE;

ALTER TABLE public.job_distribution_source ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.job_distribution_source
  FROM PUBLIC, anon, authenticated, service_role;
