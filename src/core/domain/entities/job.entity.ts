export enum BenefitType {
  HEALTH = 'health',
  FINANCIAL = 'financial',
  TIME_OFF = 'time_off',
  PROFESSIONAL = 'professional',
  LIFESTYLE = 'lifestyle',
  TECHNOLOGY = 'technology',
  TRANSPORTATION = 'transportation',
  FAMILY = 'family',
  OTHER = 'other',
}

export interface BenefitMetadata {
  type: BenefitType;
  icon: string;
  color?: string;
  priority?: number;
}

// Catálogo predefinido de beneficios comunes
export const COMMON_BENEFITS: Record<string, BenefitMetadata> = {
  'Seguro médico': {
    type: BenefitType.HEALTH,
    icon: 'medical-heart',
    color: '#ef4444',
  },
  'Seguro dental': {
    type: BenefitType.HEALTH,
    icon: 'tooth',
    color: '#ef4444',
  },
  'Seguro de vida': {
    type: BenefitType.HEALTH,
    icon: 'shield-check',
    color: '#ef4444',
  },
  'Bono anual': {
    type: BenefitType.FINANCIAL,
    icon: 'money-dollar-circle',
    color: '#10b981',
  },
  'Stock options': {
    type: BenefitType.FINANCIAL,
    icon: 'trending-up',
    color: '#10b981',
  },
  'Vacaciones pagadas': {
    type: BenefitType.TIME_OFF,
    icon: 'calendar-days',
    color: '#3b82f6',
  },
  'Días de enfermedad': {
    type: BenefitType.TIME_OFF,
    icon: 'bed',
    color: '#3b82f6',
  },
  Capacitación: {
    type: BenefitType.PROFESSIONAL,
    icon: 'academic-cap',
    color: '#8b5cf6',
  },
  Conferencias: {
    type: BenefitType.PROFESSIONAL,
    icon: 'presentation-chart-bar',
    color: '#8b5cf6',
  },
  'Trabajo remoto': {
    type: BenefitType.LIFESTYLE,
    icon: 'home',
    color: '#f59e0b',
  },
  'Horario flexible': {
    type: BenefitType.LIFESTYLE,
    icon: 'clock',
    color: '#f59e0b',
  },
  Laptop: {
    type: BenefitType.TECHNOLOGY,
    icon: 'computer-desktop',
    color: '#6b7280',
  },
  Transporte: {
    type: BenefitType.TRANSPORTATION,
    icon: 'truck',
    color: '#06b6d4',
  },
  Guardería: {
    type: BenefitType.FAMILY,
    icon: 'heart',
    color: '#ec4899',
  },
};

interface Benefits {
  title: string;
  description?: string;
  metadata?: BenefitMetadata; // Información para UI
  isCustom?: boolean; // Si es un beneficio personalizado
}

export enum JobStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  PAUSED = 'paused',
  CLOSED = 'closed',
  EXPIRED = 'expired',
}

export enum Currency {
  USD = 'USD',
  CLP = 'CLP',
  // Agregar según necesites
}

export class Job {
  constructor(
    public id: string,
    public organizationId: string,
    public title: string,
    public description: string,
    public salary: {
      min: number;
      max: number;
      currency: Currency;
      period: 'hourly' | 'monthly' | 'yearly';
      isNegotiable?: boolean;
    },
    public location: {
      city?: string;
      state?: string;
      country: string;
      isRemote: boolean;
      isHybrid?: boolean;
    },
    public employmentType: 'Full-time' | 'Part-time' | 'Contrato' | 'Practica',
    public experienceLevel:
      | 'Entrante'
      | 'Junior'
      | 'Mid-Senior'
      | 'Senior'
      | 'Ejecutivo',
    public benefits: Benefits[] = [],
    public status: JobStatus = JobStatus.DRAFT,
    public applicationsCount: number = 0,
    public expiresAt?: Date,
    public createdAt: Date = new Date(),
    public updatedAt: Date = new Date(),
  ) {}

  // Métodos de dominio útiles
  public isActive(): boolean {
    return (
      this.status === JobStatus.ACTIVE &&
      (!this.expiresAt || this.expiresAt > new Date())
    );
  }

  public incrementApplicationsCount(): void {
    this.applicationsCount += 1;
  }

  public canReceiveApplications(): boolean {
    return this.isActive();
  }

  public isRemoteWork(): boolean {
    return this.location.isRemote;
  }
}
