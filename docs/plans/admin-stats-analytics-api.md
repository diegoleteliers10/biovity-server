# Plan: Admin Stats & Analytics API — biovity-server

## Estado: LISTO PARA IMPLEMENTAR

---

## Paso 1 — Explorar entidades y módulos ✓

**Entities disponibles:**

| Entity | Campos clave |
|--------|-------------|
| `UserEntity` | `type: UserType` (PROFESSIONAL/ORGANIZATION), `isActive`, `createdAt` |
| `ApplicationEntity` | `status: ApplicationStatus`, `createdAt`, `candidateId`, `jobId` |
| `JobEntity` | `status: JobStatus`, `views`, `organizationId`, `createdAt` |
| `WaitlistEntity` | `role: WaitlistRole`, `createdAt` |
| `OrganizationEntity` | `name`, `id` |

**Arquitectura modules:**
- Cada módulo (UserModule, OrganizationModule, etc.) importa `TypeOrmModule.forFeature([...entities])` y exporta sus servicios
- `AppModule` centraliza todos los módulos
- Los servicios de metrics (UserMetricsService, OrganizationMetricsService) ya exportados

**Patrón de queries** (reutilizado de services existentes):
- Filtro Chile timezone: `TO_CHAR(createdAt AT TIME ZONE 'America/Santiago', 'YYYY-MM-DD') >= :date`
- Enum filtering: `type = :type` (TypeORM convierte automáticamente)
- Trends: count actual vs count período anterior → `% change`

---

## Paso 2 — Crear `AdminService`

**Archivo:** `src/core/services/admin.service.ts`

```ts
@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(UserEntity) private userRepo: Repository<UserEntity>,
    @InjectRepository(WaitlistEntity) private waitlistRepo: Repository<WaitlistEntity>,
    @InjectRepository(ApplicationEntity) private applicationRepo: Repository<ApplicationEntity>,
    @InjectRepository(JobEntity) private jobRepo: Repository<JobEntity>,
    @InjectRepository(OrganizationEntity) private organizationRepo: Repository<OrganizationEntity>,
    private dataSource: DataSource,
  ) {}

  async getAdminStats(): Promise<AdminStats>
  async getRegistrationsTrend(days: 30 | 90): Promise<RegistrationsTrendResponse>
  async getTopJobs(limit: number): Promise<TopJobsResponse>
  async getApplicationsTrend(days: 30 | 90): Promise<ApplicationsTrendResponse>
  async getAdminHealthDetailed(): Promise<AdminHealthDetailed>
}
```

**DTOs a crear en** `src/interfaces/dtos/admin/`:
- `admin-stats.dto.ts`
- `admin-analytics.dto.ts`

---

## Paso 3 — Crear `AdminController` + `AdminModule`

**Estructura de archivos:**
```
src/interfaces/controllers/admin/
├── admin.controller.ts
├── admin.module.ts
src/interfaces/dtos/admin/
├── admin-stats.dto.ts
├── admin-analytics.dto.ts
```

**Rutas:**

| Method | Path | Handler |
|--------|------|---------|
| GET | `/api/v1/admin/stats` | `getAdminStats()` |
| GET | `/api/v1/admin/analytics/registrations?period=30\|90` | `getRegistrationsTrend()` |
| GET | `/api/v1/admin/analytics/top-jobs?limit=10` | `getTopJobs()` |
| GET | `/api/v1/admin/analytics/applications-trend?period=30\|90` | `getApplicationsTrend()` |
| GET | `/api/v1/admin/health/detailed` | `getAdminHealthDetailed()` |

---

## Paso 4 — Registrar en `AppModule`

```ts
// app.module.ts
import { AdminModule } from './interfaces/controllers/admin/admin.module';

@Module({
  imports: [
    // ... existing
    AdminModule,
  ],
})
```

---

## Response shapes (DTOs)

```ts
// GET /api/v1/admin/stats
type AdminStats = {
  users: {
    total: number;
    professionals: number;
    organizations: number;
    active: number;
    inactive: number;
    recentCount: number;       // últimos 7 días
    recentTrend: number;      // % change vs 7 días anteriores
  };
  waitlist: {
    total: number;
    professionals: number;
    organizations: number;
  };
  platform: {
    activeJobs: number;
    totalApplications: number;
    totalOrganizations: number;
  };
}

// GET /api/v1/admin/analytics/registrations?period=30
type RegistrationsTrendResponse = {
  data: Array<{
    date: string;           // 'YYYY-MM-DD'
    professionals: number;
    organizations: number;
  }>;
  totals: { professionals: number; organizations: number; };
}

// GET /api/v1/admin/analytics/top-jobs?limit=10
type TopJobsResponse = {
  data: Array<{
    jobId: string;
    title: string;
    organizationName: string;
    applications: number;
    views: number;
    applicationRate: number;  // applications/views * 100
  }>;
}

// GET /api/v1/admin/analytics/applications-trend?period=30
type ApplicationsTrendResponse = {
  data: Array<{
    date: string;            // 'YYYY-MM-DD'
    count: number;
  }>;
  total: number;
}

// GET /api/v1/admin/health/detailed
type AdminHealthDetailed = {
  status: 'ok' | 'degraded';
  timestamp: string;
  latencyMs: number;
  checks: {
    database: { status: 'up' | 'down'; message?: string };
  };
}
```

---

## Métricas adicionales a calcular (diferencial vs actual)

| Métrica | Cómo |
|---------|------|
| `recentTrend` (% crecimiento registros) | `(recentCount / previous7DaysCount - 1) * 100` |
| `applicationRate` en top jobs | `applications / views * 100` |
| Registrations trend por día | Group by date, split por `type` |
| Applications trend por día | Group by date |

---

## Orden de implementación

1. Crear DTOs (`admin-stats.dto.ts`, `admin-analytics.dto.ts`)
2. Crear `AdminService` con todos los métodos
3. Crear `AdminController`
4. Crear `AdminModule`
5. Registrar en `AppModule`
6. Actualizar `HealthService` para `/health/detailed` (integrado en AdminService)
7. Testear con curl/Postman