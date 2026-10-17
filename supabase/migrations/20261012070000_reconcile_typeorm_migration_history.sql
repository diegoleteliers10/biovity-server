INSERT INTO public.migrations (timestamp, name)
SELECT pending.timestamp, pending.name
FROM (
  VALUES
    (1791800000026::bigint, 'ApplicationSourceAttribution1791800000026'::text),
    (1791800000027::bigint, 'InterviewRubricVersions1791800000027'::text),
    (1791800000027::bigint, 'JobDistributionSource1791800000027'::text),
    (1791800000028::bigint, 'ApplicationDistributionSourceIndex1791800000028'::text),
    (1791800000028::bigint, 'InterviewRolesAndAtsApiLockdown1791800000028'::text),
    (1791800000029::bigint, 'ServerServiceRoleAtsReads1791800000029'::text)
) AS pending(timestamp, name)
WHERE NOT EXISTS (
  SELECT 1
  FROM public.migrations AS applied
  WHERE applied.name = pending.name
);
