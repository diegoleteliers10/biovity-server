export type EventChangeAction = 'updated' | 'cancelled';

export type EventChangeField =
  | 'title'
  | 'description'
  | 'type'
  | 'timeZone'
  | 'startAt'
  | 'endAt'
  | 'location'
  | 'meetingUrl'
  | 'status'
  | 'calendarProvider';

export type EventFieldChange = {
  from: string | null;
  to: string | null;
};

export type EventChangeSet = Partial<
  Record<EventChangeField, EventFieldChange>
>;

export type EventChangeHistory = {
  id: string;
  eventId: string;
  actorUserId: string | null;
  action: EventChangeAction;
  changes: EventChangeSet;
  createdAt: Date;
};
