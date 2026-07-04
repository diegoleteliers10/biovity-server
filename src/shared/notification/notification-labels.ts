import { ApplicationStatus, EventType } from '../../core/domain/enums';

const APPLICATION_STATUS_LABELS: Record<ApplicationStatus, string> = {
  [ApplicationStatus.PENDIENTE]: 'Pendiente',
  [ApplicationStatus.ENTREVISTA]: 'Entrevista',
  [ApplicationStatus.OFERTA]: 'Oferta',
  [ApplicationStatus.CONTRATADO]: 'Contratado',
  [ApplicationStatus.RECHAZADO]: 'Rechazado',
};

export function applicationStatusLabel(status: ApplicationStatus): string {
  return APPLICATION_STATUS_LABELS[status];
}

const EVENT_TYPE_LABELS: Record<EventType, string> = {
  [EventType.INTERVIEW]: 'Entrevista',
  [EventType.TASK_DEADLINE]: 'Tarea',
  [EventType.ANNOUNCEMENT]: 'Anuncio',
  [EventType.ONBOARDING]: 'Onboarding',
};

export function eventTypeLabel(type: EventType): string {
  return EVENT_TYPE_LABELS[type];
}

export function formatEventDate(date: Date): string {
  return date.toLocaleString('es-MX', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
