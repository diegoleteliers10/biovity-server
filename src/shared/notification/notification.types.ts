import { NotificationType } from '../../core/domain/enums';

export type NotificationData = Record<string, unknown>;

export interface CreateNotificationInput {
  readonly userId: string;
  readonly type: NotificationType;
  readonly title: string;
  readonly body?: string;
  readonly link?: string;
  readonly data?: NotificationData;
  readonly dedupKey?: string;
}
