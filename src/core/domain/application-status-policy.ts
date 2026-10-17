import { ApplicationStatus } from './enums';

const TERMINAL_STATUSES: ReadonlySet<ApplicationStatus> = new Set([
  ApplicationStatus.CONTRATADO,
  ApplicationStatus.RECHAZADO,
  ApplicationStatus.DESISTIDO,
]);

export const isTerminalApplicationStatus = (
  status: ApplicationStatus,
): boolean => TERMINAL_STATUSES.has(status);

export const isOpenApplicationStatus = (status: ApplicationStatus): boolean =>
  !isTerminalApplicationStatus(status);
