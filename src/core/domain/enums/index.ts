export { AiProvider } from './ai-provider';

export enum JobStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  PAUSED = 'paused',
  CLOSED = 'closed',
  EXPIRED = 'expired',
}

export enum JobEmploymentType {
  FULL_TIME = 'Full-time',
  PART_TIME = 'Part-time',
  CONTRATO = 'Contrato',
  PRACTICA = 'Practica',
}

export enum JobExperienceLevel {
  ENTRANTE = 'Entrante',
  JUNIOR = 'Junior',
  MID_SENIOR = 'Mid-Senior',
  SENIOR = 'Senior',
  EJECUTIVO = 'Ejecutivo',
}

export enum JobAlertFrequency {
  INSTANTANEA = 'instantanea',
  DIARIA = 'diaria',
  SEMANAL = 'semanal',
}

export enum ApplicationStatus {
  PENDIENTE = 'pendiente',
  OFERTA = 'oferta',
  ENTREVISTA = 'entrevista',
  RECHAZADO = 'rechazado',
  CONTRATADO = 'contratado',
  DESISTIDO = 'desistido',
}

export enum UserType {
  PROFESSIONAL = 'professional',
  ORGANIZATION = 'organization',
}

export enum SubscriptionPlan {
  FREE = 'free',
  BASIC = 'basic',
  PREMIUM = 'premium',
  ENTERPRISE = 'enterprise',
}

export enum PaymentStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  CANCELLED = 'cancelled',
}

export enum SkillLevel {
  ADVANCED = 'advanced',
  INTERMEDIATE = 'intermediate',
  ENTRY = 'entry',
}

export enum LanguageLevel {
  ADVANCED = 'advanced',
  INTERMEDIATE = 'intermediate',
  ENTRY = 'entry',
}

export enum EventType {
  INTERVIEW = 'interview',
  TASK_DEADLINE = 'task_deadline',
  ANNOUNCEMENT = 'announcement',
  ONBOARDING = 'onboarding',
}

export enum EventStatus {
  SCHEDULED = 'scheduled',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export enum MessageType {
  TEXT = 'text',
  FILE = 'file',
  AUDIO = 'audio',
  IMAGE = 'image',
  EVENT = 'event',
}

export enum QuestionType {
  TEXT = 'text',
  TEXTAREA = 'textarea',
  NUMBER = 'number',
  SELECT = 'select',
  MULTISELECT = 'multiselect',
  BOOLEAN = 'boolean',
  DATE = 'date',
}

export enum QuestionStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
}

export enum NotificationType {
  APPLICATION = 'application',
  INTERVIEW = 'interview',
  MESSAGE = 'message',
  JOB_ALERT = 'job_alert',
  SYSTEM = 'system',
}

export enum ParticipantRole {
  ORGANIZER = 'organizer',
  ATTENDEE = 'attendee',
  GUEST = 'guest',
}

export enum ParticipantStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  DECLINED = 'declined',
}

export enum SalaryExperienceLevel {
  JUNIOR = 'JUNIOR',
  MID = 'MID',
  SENIOR = 'SENIOR',
  LEAD = 'LEAD',
}

export enum SalaryEducationLevel {
  LICENCIATURA = 'LICENCIATURA',
  MAGISTER = 'MAGISTER',
  DOCTORADO = 'DOCTORADO',
  POSTDOC = 'POSTDOC',
}

export enum SalaryWorkMode {
  PRESENCIAL = 'PRESENCIAL',
  HIBRIDO = 'HIBRIDO',
  REMOTO = 'REMOTO',
}

export enum ChileanRegion {
  ARICA_Y_PARINACOTA = 'ARICA_Y_PARINACOTA',
  TARAPACA = 'TARAPACA',
  ANTOFAGASTA = 'ANTOFAGASTA',
  ATACAMA = 'ATACAMA',
  COQUIMBO = 'COQUIMBO',
  VALPARAISO = 'VALPARAISO',
  METROPOLITANA = 'METROPOLITANA',
  OHIGGINS = 'OHIGGINS',
  MAULE = 'MAULE',
  NUBLE = 'NUBLE',
  BIOBIO = 'BIOBIO',
  ARAUCANIA = 'ARAUCANIA',
  LOS_RIOS = 'LOS_RIOS',
  LOS_LAGOS = 'LOS_LAGOS',
  AYSEN = 'AYSEN',
  MAGALLANES = 'MAGALLANES',
}
