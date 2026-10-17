CREATE TABLE public.pipeline_stage_rubric_version (
	id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	pipeline_stage_id uuid NOT NULL REFERENCES public.pipeline_stage(id) ON DELETE RESTRICT,
	version integer NOT NULL CHECK (version > 0),
	criteria jsonb NOT NULL CHECK (
		jsonb_typeof(criteria) = 'array'
		AND jsonb_array_length(criteria) BETWEEN 0 AND 20
	),
	created_at timestamptz NOT NULL DEFAULT now(),
	UNIQUE (pipeline_stage_id, version),
	UNIQUE (id, pipeline_stage_id)
);

CREATE FUNCTION public.reject_pipeline_stage_rubric_version_mutation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog
AS $$
BEGIN
	RAISE EXCEPTION 'pipeline stage rubric versions are immutable';
END;
$$;

CREATE TRIGGER pipeline_stage_rubric_version_immutable
BEFORE UPDATE OR DELETE ON public.pipeline_stage_rubric_version
FOR EACH ROW EXECUTE FUNCTION public.reject_pipeline_stage_rubric_version_mutation();

ALTER TABLE public.pipeline_stage
	ADD COLUMN current_rubric_version_id uuid,
	ADD CONSTRAINT fk_pipeline_stage_current_rubric_version
		FOREIGN KEY (current_rubric_version_id, id)
		REFERENCES public.pipeline_stage_rubric_version(id, pipeline_stage_id) ON DELETE RESTRICT;

ALTER TABLE public.event
	ADD COLUMN pipeline_stage_id uuid,
	ADD COLUMN pipeline_stage_name_snapshot text,
	ADD COLUMN rubric_version_id uuid,
	ADD CONSTRAINT fk_event_pipeline_stage
		FOREIGN KEY (pipeline_stage_id) REFERENCES public.pipeline_stage(id) ON DELETE RESTRICT,
	ADD CONSTRAINT fk_event_rubric_stage_version
		FOREIGN KEY (rubric_version_id, pipeline_stage_id)
		REFERENCES public.pipeline_stage_rubric_version(id, pipeline_stage_id) ON DELETE RESTRICT,
	ADD CONSTRAINT uq_event_id_rubric_version UNIQUE (id, rubric_version_id),
	ADD CONSTRAINT ck_event_pipeline_stage_snapshot
		CHECK (
			(pipeline_stage_id IS NULL) = (pipeline_stage_name_snapshot IS NULL)
			AND (rubric_version_id IS NULL OR pipeline_stage_id IS NOT NULL)
		);

ALTER TABLE public.event_interview_evaluation
	ADD COLUMN rubric_version_id uuid,
	ADD COLUMN criterion_responses jsonb NOT NULL DEFAULT '[]'::jsonb
		CHECK (jsonb_typeof(criterion_responses) = 'array'),
	ADD CONSTRAINT fk_evaluation_event_rubric_version
		FOREIGN KEY (event_id, rubric_version_id)
		REFERENCES public.event(id, rubric_version_id) ON DELETE CASCADE;

ALTER TABLE public.pipeline_stage_rubric_version ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.pipeline_stage_rubric_version
	FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.reject_pipeline_stage_rubric_version_mutation()
	FROM PUBLIC, anon, authenticated, service_role;
