CREATE INDEX application_distribution_source_fk_idx
  ON public.application (distribution_source_id, "jobId", source_channel);
