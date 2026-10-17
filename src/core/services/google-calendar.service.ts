import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectDataSource } from '@nestjs/typeorm';
import { Result } from 'better-result';
import { createHash, randomBytes } from 'crypto';
import { google } from 'googleapis';
import type { DataSource } from 'typeorm';
import { EncryptionService } from '../../shared/crypto/encryption.service';
import { Event } from '../domain/entities/event.entity';
import { EventStatus } from '../domain/enums';

const GOOGLE_CALENDAR_SCOPES = [
  'https://www.googleapis.com/auth/calendar.events',
  'openid',
  'email',
];

type CalendarOwner =
  { kind: 'user'; id: string } | { kind: 'organization'; id: string };

type GoogleCalendarConnectionRow = {
  refresh_token_ciphertext: string;
  refresh_token_iv: string;
  refresh_token_auth_tag: string;
  calendar_id: string;
};

type OAuthStateRow = {
  owner_type: CalendarOwner['kind'];
  owner_id: string;
};

type EventRow = {
  id: string;
  title: string;
  description: string | null;
  type: Event['type'];
  startAt: Date;
  endAt: Date | null;
  location: string | null;
  meetingUrl: string | null;
  status: EventStatus;
  organizerId: string;
  organizationId: string | null;
  candidateId: string | null;
  applicationId: string | null;
  timeZone: string;
  calendarProvider: 'biovity' | 'google';
  syncStatus: 'not_connected' | 'synced' | 'cancelled' | 'failed';
};

@Injectable()
export class GoogleCalendarService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly encryption: EncryptionService,
  ) {}

  async getStatus(owner: CalendarOwner) {
    const rows = await this.dataSource.query<
      Array<{ account_email: string; calendar_id: string; connected_at: Date }>
    >(
      `SELECT account_email, calendar_id, connected_at
       FROM google_calendar_connection WHERE owner_type = $1 AND owner_id = $2::uuid`,
      [owner.kind, owner.id],
    );
    const connection = rows[0];
    return connection
      ? {
          connected: true as const,
          accountEmail: connection.account_email,
          calendarId: connection.calendar_id,
          connectedAt: connection.connected_at,
        }
      : { connected: false as const };
  }

  async isConnected(owner: CalendarOwner): Promise<boolean> {
    return Boolean(await this.getConnection(owner));
  }

  async startConnection(
    owner: CalendarOwner,
    userId: string,
  ): Promise<{ authorizationUrl: string } | null> {
    const oauth = this.createOAuthClient();
    if (!oauth) return null;

    const state = randomBytes(32).toString('base64url');
    const stateHash = createHash('sha256').update(state).digest('hex');
    await this.dataSource.query(
      `DELETE FROM google_calendar_oauth_state WHERE expires_at <= now()`,
    );
    await this.dataSource.query(
      `INSERT INTO google_calendar_oauth_state
         (state_hash, created_by_user_id, owner_type, owner_id, expires_at)
       VALUES ($1, $2::uuid, $3, $4::uuid, now() + interval '10 minutes')`,
      [stateHash, userId, owner.kind, owner.id],
    );
    return {
      authorizationUrl: oauth.generateAuthUrl({
        access_type: 'offline',
        prompt: 'consent',
        scope: GOOGLE_CALENDAR_SCOPES,
        state,
      }),
    };
  }

  async finishConnection(
    code: string,
    state: string,
  ): Promise<'connected' | 'invalid_state' | 'failed'> {
    const stateHash = createHash('sha256').update(state).digest('hex');
    const states = await this.dataSource.query<OAuthStateRow[]>(
      `DELETE FROM google_calendar_oauth_state
       WHERE state_hash = $1 AND expires_at > now()
       RETURNING owner_type, owner_id`,
      [stateHash],
    );
    const oauthState = states[0];
    if (!oauthState) return 'invalid_state';

    const oauth = this.createOAuthClient();
    if (!oauth) return 'failed';
    const tokenResult = await Result.tryPromise({
      try: () => oauth.getToken(code),
      catch: cause => cause,
    });
    if (tokenResult.isErr()) return 'failed';

    const owner: CalendarOwner = {
      kind: oauthState.owner_type,
      id: oauthState.owner_id,
    };
    const tokens = tokenResult.value.tokens;
    const previous = await this.getConnection(owner);
    const refreshToken = tokens.refresh_token ?? previous?.refreshToken;
    if (!refreshToken) return 'failed';

    oauth.setCredentials(tokens);
    const profileResult = await Result.tryPromise({
      try: () => google.oauth2({ version: 'v2', auth: oauth }).userinfo.get(),
      catch: cause => cause,
    });
    if (profileResult.isErr()) return 'failed';
    const accountEmail = profileResult.value.data.email;
    if (!accountEmail) return 'failed';

    const encrypted = this.encryption.encrypt(refreshToken);
    await this.dataSource.query(
      `INSERT INTO google_calendar_connection
         (owner_type, owner_id, account_email, refresh_token_ciphertext,
          refresh_token_iv, refresh_token_auth_tag, calendar_id)
       VALUES ($1, $2::uuid, $3, $4, $5, $6, 'primary')
       ON CONFLICT (owner_type, owner_id) DO UPDATE SET
         account_email = EXCLUDED.account_email,
         refresh_token_ciphertext = EXCLUDED.refresh_token_ciphertext,
         refresh_token_iv = EXCLUDED.refresh_token_iv,
         refresh_token_auth_tag = EXCLUDED.refresh_token_auth_tag,
         updated_at = now()`,
      [
        owner.kind,
        owner.id,
        accountEmail,
        encrypted.ciphertext,
        encrypted.iv,
        encrypted.authTag,
      ],
    );
    return 'connected';
  }

  async disconnect(owner: CalendarOwner): Promise<void> {
    await this.dataSource.query(
      `DELETE FROM google_calendar_connection WHERE owner_type = $1 AND owner_id = $2::uuid`,
      [owner.kind, owner.id],
    );
  }

  async syncEvent(event: Event): Promise<void> {
    if (event.calendarProvider !== 'google') return;
    const owner: CalendarOwner = event.organizationId
      ? { kind: 'organization', id: event.organizationId }
      : { kind: 'user', id: event.organizerId };
    const connection = await this.getConnection(owner);
    if (!connection) {
      await this.updateSyncStatus(event.id, 'not_connected', null, null);
      return;
    }

    const oauth = this.createOAuthClient();
    if (!oauth) {
      await this.updateSyncStatus(
        event.id,
        'failed',
        'Google OAuth is not configured.',
        null,
      );
      return;
    }
    oauth.setCredentials({ refresh_token: connection.refreshToken });
    const syncResult = await this.syncGoogleEvent(
      event,
      connection.calendarId,
      oauth,
    );
    if (syncResult.isErr()) {
      await this.updateSyncStatus(
        event.id,
        'failed',
        this.errorMessage(syncResult.error),
        null,
      );
      return;
    }
    await this.updateSyncStatus(event.id, syncResult.value, null, new Date());
  }

  async removeEventFromGoogle(event: Event): Promise<void> {
    const owner: CalendarOwner = event.organizationId
      ? { kind: 'organization', id: event.organizationId }
      : { kind: 'user', id: event.organizerId };
    const connection = await this.getConnection(owner);
    if (!connection) {
      await this.updateSyncStatus(event.id, 'not_connected', null, null);
      return;
    }

    const oauth = this.createOAuthClient();
    if (!oauth) {
      await this.updateSyncStatus(
        event.id,
        'failed',
        'Google OAuth is not configured.',
        null,
      );
      return;
    }

    oauth.setCredentials({ refresh_token: connection.refreshToken });
    const cancelledEvent = new Event(
      event.id,
      event.title,
      event.description,
      event.type,
      event.startAt,
      event.endAt,
      event.location,
      event.meetingUrl,
      EventStatus.CANCELLED,
      event.organizerId,
      event.organizationId,
      event.candidateId,
      event.applicationId,
      event.createdAt,
      event.updatedAt,
      event.participants,
      event.timeZone,
      event.pipelineStageId,
      event.pipelineStageNameSnapshot,
      event.rubricVersionId,
      event.calendarProvider,
    );
    const removed = await this.syncGoogleEvent(
      cancelledEvent,
      connection.calendarId,
      oauth,
    );
    await this.updateSyncStatus(
      event.id,
      removed.isOk() ? 'not_connected' : 'failed',
      removed.isErr() ? this.errorMessage(removed.error) : null,
      null,
    );
  }

  private async syncGoogleEvent(
    event: Event,
    calendarId: string,
    oauth: InstanceType<typeof google.auth.OAuth2>,
  ): Promise<Result<'synced' | 'cancelled', unknown>> {
    const calendar = google.calendar({ version: 'v3', auth: oauth });
    const eventId = createHash('sha256')
      .update(`biovity:${event.id}`)
      .digest('hex');
    if (event.status === EventStatus.CANCELLED) {
      const deleted = await Result.tryPromise({
        try: () => calendar.events.delete({ calendarId, eventId }),
        catch: cause => cause,
      });
      return deleted.isOk() || this.isGoogleErrorCode(deleted.error, 404)
        ? Result.ok('cancelled')
        : Result.err(deleted.error);
    }

    const requestBody = {
      id: eventId,
      summary: event.title,
      description: event.description ?? undefined,
      location: event.location ?? undefined,
      start: {
        dateTime: event.startAt.toISOString(),
        timeZone: event.timeZone,
      },
      end: {
        dateTime: (
          event.endAt ?? new Date(event.startAt.getTime() + 60 * 60 * 1000)
        ).toISOString(),
        timeZone: event.timeZone,
      },
      source: {
        title: 'Biovity ATS',
        url: `${process.env.WEB_APP_URL ?? 'https://biovity.cl'}/dashboard/calendar`,
      },
      extendedProperties: { private: { biovityEventId: event.id } },
    };
    const existing = await Result.tryPromise({
      try: () => calendar.events.get({ calendarId, eventId }),
      catch: cause => cause,
    });
    if (existing.isErr() && !this.isGoogleErrorCode(existing.error, 404)) {
      return Result.err(existing.error);
    }
    if (existing.isOk()) {
      const update = await Result.tryPromise({
        try: () => calendar.events.patch({ calendarId, eventId, requestBody }),
        catch: cause => cause,
      });
      return update.isOk() ? Result.ok('synced') : Result.err(update.error);
    }

    const insert = await Result.tryPromise({
      try: () => calendar.events.insert({ calendarId, requestBody }),
      catch: cause => cause,
    });
    if (insert.isOk()) return Result.ok('synced');
    if (!this.isGoogleErrorCode(insert.error, 409))
      return Result.err(insert.error);
    const update = await Result.tryPromise({
      try: () => calendar.events.patch({ calendarId, eventId, requestBody }),
      catch: cause => cause,
    });
    return update.isOk() ? Result.ok('synced') : Result.err(update.error);
  }

  async syncUpcomingEvents(owner: CalendarOwner): Promise<number> {
    const connection = await this.getConnection(owner);
    if (!connection) return 0;
    const rows = await this.dataSource.query<Array<{ id: string }>>(
      owner.kind === 'organization'
        ? `SELECT id FROM event WHERE "organizationId" = $1::uuid
           AND ((calendar_provider = 'google'
                 AND ((status = 'scheduled' AND "startAt" > now()
                       AND google_calendar_sync_status <> 'synced')
                      OR (status = 'cancelled' AND google_calendar_sync_status <> 'cancelled')))
                OR (calendar_provider = 'biovity' AND google_calendar_sync_status = 'failed'))
           ORDER BY "startAt" LIMIT 100`
        : `SELECT id FROM event WHERE "organizerId" = $1::uuid
           AND "organizationId" IS NULL
           AND ((calendar_provider = 'google'
                 AND ((status = 'scheduled' AND "startAt" > now()
                       AND google_calendar_sync_status <> 'synced')
                      OR (status = 'cancelled' AND google_calendar_sync_status <> 'cancelled')))
                OR (calendar_provider = 'biovity' AND google_calendar_sync_status = 'failed'))
           ORDER BY "startAt" LIMIT 100`,
      [owner.id],
    );
    for (const row of rows) await this.retryEvent(row.id);
    return rows.length;
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  async retryPendingSyncs(): Promise<void> {
    const owners = await this.dataSource.query<
      Array<{ owner_type: CalendarOwner['kind']; owner_id: string }>
    >('SELECT owner_type, owner_id FROM google_calendar_connection');
    for (const owner of owners) {
      await this.syncUpcomingEvents({
        kind: owner.owner_type,
        id: owner.owner_id,
      });
    }
  }

  async retryEvent(eventId: string): Promise<boolean> {
    const rows = await this.dataSource.query<EventRow[]>(
      `SELECT id, title, description, type, "startAt", "endAt", location,
              "meetingUrl", status, "organizerId", "organizationId",
              "candidateId", "applicationId", "timeZone", calendar_provider AS "calendarProvider",
              google_calendar_sync_status AS "syncStatus"
       FROM event WHERE id = $1::uuid`,
      [eventId],
    );
    const row = rows[0];
    if (!row) return false;
    const event = new Event(
      row.id,
      row.title,
      row.description,
      row.type,
      row.startAt,
      row.endAt,
      row.location,
      row.meetingUrl,
      row.status,
      row.organizerId,
      row.organizationId,
      row.candidateId,
      row.applicationId,
      new Date(),
      new Date(),
      [],
      row.timeZone,
      null,
      null,
      null,
      row.calendarProvider,
    );
    if (row.calendarProvider === 'google') await this.syncEvent(event);
    else if (row.syncStatus === 'failed')
      await this.removeEventFromGoogle(event);
    return true;
  }

  private createOAuthClient(): InstanceType<typeof google.auth.OAuth2> | null {
    const clientId = process.env.GOOGLE_CALENDAR_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CALENDAR_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_CALENDAR_REDIRECT_URI;
    if (!clientId || !clientSecret || !redirectUri) return null;
    return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
  }

  private async getConnection(owner: CalendarOwner) {
    const rows = await this.dataSource.query<GoogleCalendarConnectionRow[]>(
      `SELECT refresh_token_ciphertext, refresh_token_iv,
              refresh_token_auth_tag, calendar_id
       FROM google_calendar_connection WHERE owner_type = $1 AND owner_id = $2::uuid`,
      [owner.kind, owner.id],
    );
    const row = rows[0];
    if (!row) return null;
    return {
      calendarId: row.calendar_id,
      refreshToken: this.encryption.decrypt({
        ciphertext: row.refresh_token_ciphertext,
        iv: row.refresh_token_iv,
        authTag: row.refresh_token_auth_tag,
      }),
    };
  }

  private async updateSyncStatus(
    eventId: string,
    status: 'not_connected' | 'synced' | 'cancelled' | 'failed',
    error: string | null,
    syncedAt: Date | null,
  ): Promise<void> {
    await this.dataSource.query(
      `UPDATE event SET google_calendar_sync_status = $2,
         google_calendar_sync_error = $3,
         google_calendar_synced_at = $4
       WHERE id = $1::uuid`,
      [eventId, status, error, syncedAt],
    );
  }

  private isGoogleErrorCode(error: unknown, code: number): boolean {
    return Boolean(
      error &&
      typeof error === 'object' &&
      'code' in error &&
      error.code === code,
    );
  }

  private errorMessage(error: unknown): string {
    return error instanceof Error
      ? error.message.slice(0, 500)
      : 'Google Calendar synchronization failed';
  }
}
