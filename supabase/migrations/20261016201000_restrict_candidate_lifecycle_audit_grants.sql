REVOKE ALL ON TABLE public.candidate_data_lifecycle_audit
  FROM PUBLIC, anon, authenticated, service_role;

GRANT SELECT, INSERT ON TABLE public.candidate_data_lifecycle_audit
  TO service_role;
