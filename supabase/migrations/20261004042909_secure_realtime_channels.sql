BEGIN;

CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA private TO anon;

CREATE TABLE private.realtime_user_channel (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.session(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public."user"(id) ON DELETE CASCADE,
  topic_id uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX realtime_user_channel_session_expiry_idx
  ON private.realtime_user_channel (session_id, expires_at);

CREATE TABLE private.realtime_chat_channel (
  chat_id uuid PRIMARY KEY REFERENCES public.chat(id) ON DELETE CASCADE,
  topic_id uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE private.realtime_chat_channel_session (
  chat_id uuid NOT NULL REFERENCES public.chat(id) ON DELETE CASCADE,
  session_id uuid NOT NULL REFERENCES public.session(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public."user"(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  PRIMARY KEY (chat_id, session_id)
);

CREATE INDEX realtime_chat_channel_session_expiry_idx
  ON private.realtime_chat_channel_session (session_id, expires_at);

CREATE TABLE private.realtime_outbox (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  recipient_user_id uuid NOT NULL REFERENCES public."user"(id) ON DELETE CASCADE,
  event text NOT NULL CHECK (event IN ('message_insert', 'notification_insert')),
  payload jsonb NOT NULL,
  available_at timestamptz NOT NULL DEFAULT now(),
  attempts integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  delivered_at timestamptz,
  dead_lettered_at timestamptz,
  last_error text
);

CREATE INDEX realtime_outbox_pending_idx
  ON private.realtime_outbox (available_at, id)
  WHERE delivered_at IS NULL AND dead_lettered_at IS NULL;

CREATE TABLE private.realtime_outbox_delivery (
  outbox_id bigint NOT NULL REFERENCES private.realtime_outbox(id) ON DELETE CASCADE,
  topic_id uuid NOT NULL,
  delivered_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (outbox_id, topic_id)
);

ALTER TABLE private.realtime_outbox ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.realtime_outbox_delivery ENABLE ROW LEVEL SECURITY;

ALTER TABLE private.realtime_user_channel ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.realtime_chat_channel ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.realtime_chat_channel_session ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON ALL TABLES IN SCHEMA private FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION private.can_receive_biovity_realtime()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
  SELECT CASE
    WHEN realtime.topic() LIKE 'biovity:user:%' THEN EXISTS (
      SELECT 1
      FROM private.realtime_user_channel AS channel
      JOIN public.session AS active_session
        ON active_session.id = channel.session_id
       AND active_session.user_id = channel.user_id
      JOIN public."user" AS app_user
        ON app_user.id = channel.user_id
      WHERE 'biovity:user:' || channel.topic_id::text = realtime.topic()
        AND channel.expires_at > now()
        AND active_session.expires_at > now()
        AND app_user."isActive" IS TRUE
    )
    WHEN realtime.topic() LIKE 'biovity:chat:%' THEN EXISTS (
      SELECT 1
      FROM private.realtime_chat_channel AS channel
      JOIN public.chat AS chat ON chat.id = channel.chat_id
      JOIN private.realtime_chat_channel_session AS channel_session
        ON channel_session.chat_id = chat.id
      JOIN public.session AS active_session
        ON active_session.id = channel_session.session_id
       AND active_session.user_id = channel_session.user_id
      JOIN public."user" AS app_user
        ON app_user.id = channel_session.user_id
      WHERE 'biovity:chat:' || channel.topic_id::text = realtime.topic()
        AND channel.expires_at > now()
        AND channel_session.expires_at > now()
        AND active_session.expires_at > now()
        AND app_user."isActive" IS TRUE
        AND channel_session.user_id IN (chat."recruiterId", chat."professionalId")
    )
    ELSE false
  END;
$$;

CREATE OR REPLACE FUNCTION private.can_track_biovity_chat_presence()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
  SELECT realtime.topic() LIKE 'biovity:chat:%'
     AND private.can_receive_biovity_realtime();
$$;

REVOKE ALL ON FUNCTION private.can_receive_biovity_realtime() FROM PUBLIC;
REVOKE ALL ON FUNCTION private.can_track_biovity_chat_presence() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.can_receive_biovity_realtime() TO anon;
GRANT EXECUTE ON FUNCTION private.can_track_biovity_chat_presence() TO anon;

DROP POLICY IF EXISTS anon_select_for_realtime ON public.message;
DROP POLICY IF EXISTS anon_select_for_realtime ON public.chat;
DROP POLICY IF EXISTS anon_select_for_realtime ON public.notification;
REVOKE SELECT ON public.message, public.chat, public.notification FROM PUBLIC, anon;

DROP POLICY IF EXISTS allow_anon_insert_chat_broadcasts ON realtime.messages;
DROP POLICY IF EXISTS allow_anon_select_chat_broadcasts ON realtime.messages;

CREATE POLICY biovity_private_broadcast_receive
  ON realtime.messages
  FOR SELECT TO anon
  USING (
    realtime.messages.extension = 'broadcast'
    AND private.can_receive_biovity_realtime()
  );

CREATE POLICY biovity_private_chat_presence_receive
  ON realtime.messages
  FOR SELECT TO anon
  USING (
    realtime.messages.extension = 'presence'
    AND private.can_track_biovity_chat_presence()
  );

CREATE POLICY biovity_private_chat_presence_publish
  ON realtime.messages
  FOR INSERT TO anon
  WITH CHECK (
    realtime.messages.extension = 'presence'
    AND private.can_track_biovity_chat_presence()
  );

CREATE OR REPLACE FUNCTION private.enqueue_biovity_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  recipient uuid;
  outbox_id bigint;
BEGIN
  FOR recipient IN
    SELECT DISTINCT candidate.user_id
    FROM public.chat AS chat
    CROSS JOIN LATERAL (
      VALUES (chat."recruiterId"), (chat."professionalId")
    ) AS candidate(user_id)
    WHERE chat.id = NEW."chatId"
  LOOP
    INSERT INTO private.realtime_outbox (recipient_user_id, event, payload)
    VALUES (recipient, 'message_insert', to_jsonb(NEW))
    RETURNING id INTO outbox_id;
    PERFORM private.dispatch_biovity_realtime_event(outbox_id);
  END LOOP;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION private.enqueue_biovity_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  outbox_id bigint;
BEGIN
  INSERT INTO private.realtime_outbox (recipient_user_id, event, payload)
  VALUES (NEW.user_id, 'notification_insert', to_jsonb(NEW))
  RETURNING id INTO outbox_id;
  PERFORM private.dispatch_biovity_realtime_event(outbox_id);
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION private.dispatch_biovity_realtime_event(p_outbox_id bigint)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  queued_event record;
  channel record;
  delivery_failed boolean := false;
BEGIN
  SELECT * INTO queued_event
  FROM private.realtime_outbox AS outbox
  WHERE outbox.id = p_outbox_id
    AND outbox.delivered_at IS NULL
    AND outbox.dead_lettered_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  FOR channel IN
    SELECT user_channel.topic_id
    FROM private.realtime_user_channel AS user_channel
    JOIN public.session AS active_session
      ON active_session.id = user_channel.session_id
     AND active_session.user_id = user_channel.user_id
    JOIN public."user" AS app_user ON app_user.id = user_channel.user_id
    WHERE user_channel.user_id = queued_event.recipient_user_id
      AND user_channel.expires_at > now()
      AND active_session.expires_at > now()
      AND app_user."isActive" IS TRUE
      AND NOT EXISTS (
        SELECT 1
        FROM private.realtime_outbox_delivery AS delivery
        WHERE delivery.outbox_id = queued_event.id
          AND delivery.topic_id = user_channel.topic_id
      )
  LOOP
    BEGIN
      PERFORM realtime.send(
        queued_event.payload,
        queued_event.event,
        'biovity:user:' || channel.topic_id::text,
        true
      );

      INSERT INTO private.realtime_outbox_delivery (outbox_id, topic_id)
      VALUES (queued_event.id, channel.topic_id)
      ON CONFLICT DO NOTHING;
    EXCEPTION WHEN OTHERS THEN
      delivery_failed := true;
      UPDATE private.realtime_outbox
      SET last_error = SQLERRM
      WHERE id = queued_event.id;
    END;
  END LOOP;

  IF delivery_failed THEN
    UPDATE private.realtime_outbox
    SET attempts = attempts + 1,
        available_at = now() + make_interval(secs => least(300, power(2, least(attempts, 8))::integer)),
        dead_lettered_at = CASE WHEN attempts + 1 >= 20 THEN now() ELSE NULL END
    WHERE id = queued_event.id;
    RETURN false;
  END IF;

  UPDATE private.realtime_outbox
  SET delivered_at = now(), last_error = NULL
  WHERE id = queued_event.id;
  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION private.dispatch_biovity_realtime_outbox(batch_size integer DEFAULT 100)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  queued_event record;
  delivered_count integer := 0;
BEGIN
  WITH expired_events AS (
    SELECT id
    FROM private.realtime_outbox
    WHERE delivered_at < now() - interval '1 day'
       OR dead_lettered_at < now() - interval '7 days'
    ORDER BY id
    LIMIT 500
    FOR UPDATE SKIP LOCKED
  )
  DELETE FROM private.realtime_outbox AS outbox
  USING expired_events
  WHERE outbox.id = expired_events.id;

  FOR queued_event IN
    SELECT outbox.*
    FROM private.realtime_outbox AS outbox
    WHERE outbox.delivered_at IS NULL
      AND outbox.dead_lettered_at IS NULL
      AND outbox.available_at <= now()
    ORDER BY outbox.id
    LIMIT greatest(1, least(batch_size, 500))
    FOR UPDATE SKIP LOCKED
  LOOP
    IF private.dispatch_biovity_realtime_event(queued_event.id) THEN
      delivered_count := delivered_count + 1;
    END IF;
  END LOOP;

  RETURN delivered_count;
END;
$$;

REVOKE ALL ON FUNCTION private.enqueue_biovity_message() FROM PUBLIC;
REVOKE ALL ON FUNCTION private.enqueue_biovity_notification() FROM PUBLIC;
REVOKE ALL ON FUNCTION private.dispatch_biovity_realtime_event(bigint) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.dispatch_biovity_realtime_outbox(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.dispatch_biovity_realtime_outbox(integer) TO service_role;
GRANT EXECUTE ON FUNCTION private.dispatch_biovity_realtime_outbox(integer) TO postgres;

DROP TRIGGER IF EXISTS biovity_message_realtime_broadcast ON public.message;
CREATE TRIGGER biovity_message_realtime_broadcast
  AFTER INSERT ON public.message
  FOR EACH ROW EXECUTE FUNCTION private.enqueue_biovity_message();

DROP TRIGGER IF EXISTS biovity_notification_realtime_broadcast ON public.notification;
CREATE TRIGGER biovity_notification_realtime_broadcast
  AFTER INSERT ON public.notification
  FOR EACH ROW EXECUTE FUNCTION private.enqueue_biovity_notification();

COMMIT;
