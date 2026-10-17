ALTER TABLE public.job_alert ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.job_alert FROM PUBLIC, anon, authenticated, service_role;
