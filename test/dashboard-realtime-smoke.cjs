const { test } = require('node:test')
const assert = require('node:assert/strict')
const { readFileSync } = require('node:fs')
const { Pool } = require('pg')
process.loadEnvFile(process.env.TEST_ENV_FILE ?? '.env')

test('resource migration routes private invalidations and rolls back every probe', async (t) => {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 1, connectionTimeoutMillis: 5000 })
  const client = await pool.connect()
  t.after(async () => { await client.query('ROLLBACK'); client.release(); await pool.end() })
  const migration = readFileSync('supabase/migrations/20261004083000_dashboard_resource_events.sql', 'utf8')
  await client.query(process.env.TEST_MIGRATION_APPLIED === 'true' ? 'BEGIN' : migration.replace(/COMMIT;\s*$/, ''))
  const fixture = await client.query(`
    SELECT session.id AS session_id, app_user.id AS user_id
    FROM public.session JOIN public."user" app_user ON app_user.id = session.user_id
    WHERE session.expires_at > now() AND app_user."isActive" IS TRUE LIMIT 1
  `)
  assert.ok(fixture.rows[0], 'An active test session is required')
  const row = fixture.rows[0]
  await client.query(`INSERT INTO private.realtime_user_channel (session_id, user_id, expires_at)
    VALUES ($1, $2, now() + interval '1 minute')`, [row.session_id, row.user_id])
  const own = await client.query(`SELECT * FROM private.biovity_resource_recipients('saved_job', $1::jsonb) AS user_id`,
    [JSON.stringify({ userId: row.user_id })])
  assert.ok(own.rows.some(recipient => recipient.user_id === row.user_id))
  const forbidden = await client.query(`SELECT count(*)::integer AS count
    FROM private.biovity_resource_recipients('saved_job', $1::jsonb) recipient
    JOIN public."user" app_user ON app_user.id = recipient
    WHERE app_user.id <> $2 AND app_user.type <> 'admin' AND app_user.role <> 'admin'`,
    [JSON.stringify({ userId: row.user_id }), row.user_id])
  assert.equal(forbidden.rows[0].count, 0, 'Other users must not receive private saved-job changes')
  const before = await client.query('SELECT coalesce(max(id), 0)::text AS id FROM private.realtime_outbox')
  await client.query(`UPDATE public."user" SET phone = coalesce(phone, '') || 'probe' WHERE id = $1`, [row.user_id])
  const events = await client.query(`SELECT payload FROM private.realtime_outbox WHERE id > $1 AND event = 'resource_changed'`, [before.rows[0].id])
  assert.ok(events.rows.length > 0, 'A row mutation must enqueue resource invalidations')
  for (const event of events.rows) assert.deepEqual(Object.keys(event.payload).sort(), ['id', 'operation', 'resource'])
  const permissions = await client.query(`SELECT
    has_function_privilege('anon', 'private.biovity_resource_recipients(text,jsonb)', 'EXECUTE') AS can_execute,
    has_table_privilege('anon', 'private.realtime_outbox', 'SELECT') AS can_read`)
  assert.equal(permissions.rows[0].can_execute, false)
  assert.equal(permissions.rows[0].can_read, false)
})
