DO $migration$
DECLARE
	target record;
BEGIN
	FOR target IN
		SELECT n.nspname AS schema_name, c.relname AS table_name
		FROM pg_class c
		JOIN pg_namespace n ON n.oid = c.relnamespace
		WHERE n.nspname = 'public'
			AND c.relkind IN ('r', 'p')
		ORDER BY c.relname
	LOOP
		EXECUTE format(
			'ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY',
			target.schema_name,
			target.table_name
		);
	END LOOP;
END
$migration$;
