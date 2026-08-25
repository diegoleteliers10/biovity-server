# Plan: Roadmap Backend Biovity — Hardening, Cron, Emails y Deuda

## Estado: APROBADO

Fecha: 2026-08-24
Fuente: Issues de Linear, proyecto *Biovity Backend/API* y *Biovity Landing*.
Repos: `biovity-server` (NestJS) y `biovity` (Next.js).

---

## Alcance

Este plan cubre el trabajo de backend pendiente y el trabajo del frontend que debe hacerse a la par.

**Fuera de alcance** (se definen después, no están en este plan):

- BIO-53 Recomendaciones personalizadas de empleos.
- BIO-54 AI matching de candidatos en home organización.
- BIO-51 Integración UI de suscripción con Mercado Pago.

---

## Punto de partida: estado real del repo

Linear está desactualizado frente al código. Verificado en `biovity-server`:

| Tema | Estado en código | Issue | Acción |
|------|------------------|-------|--------|
| Auth sesiones (Better Auth) | Existe. `SessionAuthGuard` global, `@Public()`, `x-internal-key` | BIO-33 cancelada | Nada |
| Guards de autorización | Falta `RolesGuard` y `@Roles()` | BIO-37 In Progress | Completar |
| Interceptors | Existe. Logging, transform, cache, timeout, error-format | BIO-38 Done | Nada |
| Swagger | Existe en `/api/docs` (no producción) | BIO-34 Done | Nada |
| Filtros de excepciones globales | No existe. Sin `APP_FILTER` ni `useGlobalFilters` | BIO-36 Backlog | Hacer |
| Rate limiting | No existe. Sin `@nestjs/throttler` | BIO-35 Backlog | Hacer |
| Validación de variables de entorno | No existe. `ConfigModule.forRoot` sin schema | BIO-39 Backlog | Hacer |
| Graceful shutdown | No existe. Sin `enableShutdownHooks` | BIO-41 Backlog | Hacer |
| Cron | `@nestjs/schedule` instalado. Solo cron semanal de métricas | BIO-55 Backlog | Hacer |
| Emails | `EmailService` con Resend. Fallo silencioso si falta API key. `NotificationService` escribe notificaciones pero nada despacha email | BIO-52, BIO-62 Backlog | Hacer |

En `biovity` (Next.js):

- `app/api/cron/route.ts` solo hace `SELECT 1` y no tiene autenticación (BIO-7).
- `lib/mail.ts` usa fallback `re_mock_key`. Los emails fallan en silencio en producción (BIO-62).
- Migraciones 001 a 021 en `lib/db/migrations/` escriben sobre la misma DB Supabase que NestJS (BIO-65).

---

## Fase 0 — Frontera de doble escritor

**Issue:** BIO-65
**Duración estimada:** medio día
**Repo:** `biovity-server` (doc) y `biovity` (referencia)

### Trabajo

1. Crear `docs/adr/001-table-ownership.md` con la matriz de ownership:

   | Dueño | Tablas |
   |-------|--------|
   | NestJS | `job`, `application`, `application_answer`, `application_status_history`, `resume`, `organization`, `organization_member`, `user`, `subscription`, `saved_job`, `saved_search`, `pipeline_stage`, `job_question`, `job_template`, `candidate_tag`, `candidate_tag_assignment`, `saved_candidate`, `salary_submission`, `event`, `event_participant`, `chat`, `message`, `ai_credential`, `api_key`, `activity_log` |
   | Next.js | `waitlist`, `notification`, `contact_message`, `application_evaluation`, `application_note`, `short_link` |

2. Declarar la regla: un servicio no escribe tablas del otro. Lecturas cruzadas se documentan caso por caso.
3. Listar dependencias cruzadas actuales. Ejemplo: `organization_ai_credentials` la escribe NestJS y la lee Next.js. Definir plan para cada una.
4. Definir el proceso de migración coordinado entre repos: numeración por rango (Next.js continúa su serie, NestJS usa timestamps).

### Criterios de aceptación

- La matriz vive en `docs/` y referencia las migraciones de ambos repos.
- Cada tabla tiene un único dueño declarado.
- Las dependencias cruzadas quedan listadas con plan.

### Por qué primero

BIO-52 y BIO-55 escriben tablas sensibles. Sin frontera definida, ambos corren riesgo de conflicto de esquema y de doble escritura.

---

## Fase 1 — Hardening del backend

**Issues:** BIO-36, BIO-39, BIO-41, BIO-35, BIO-37, espejo de BIO-62
**Duración estimada:** 2 a 3 días
**Repo:** `biovity-server`, salvo punto 6

### 1.1 Filtros de excepciones globales (BIO-36)

- `HttpExceptionFilter`: formatea errores HTTP con shape consistente `{ success, message, error, statusCode, timestamp, path }`.
- `AllExceptionsFilter`: captura errores no manejados, loguea con contexto, responde 500 sin filtrar internals.
- Registrar como `APP_FILTER` en `app.module.ts`.
- Alinear el shape con `error-format.interceptor.ts` existente. Un solo formato de error en toda la API.

### 1.2 Validación de variables de entorno (BIO-39)

- Crear `src/infrastructure/config/env.schema.ts` con zod (ya instalado).
- Validar al inicio en `main.ts` antes de `NestFactory.create`.
- Mensajes de error claros: variable faltante, formato inválido.
- Variables mínimas: `DATABASE_*`, `JWT_SECRET`, `INTERNAL_API_KEY`, `RESEND_API_KEY` (condicional a entorno), `MERCADOPAGO_*` (condicional a entorno).
- Fail-fast: la app no arranca con config inválida.

### 1.3 Graceful shutdown (BIO-41)

- `app.enableShutdownHooks()` en `main.ts`.
- Cerrar el pool de PostgreSQL (`DataSource.destroy`) en `onModuleDestroy` de `DatabaseConfig`.
- Manejar `SIGTERM` y `SIGINT`. Loguear el cierre.

### 1.4 Rate limiting (BIO-35)

- Instalar `@nestjs/throttler`.
- Storage distribuido con Upstash Redis. Comparte la cuenta con BIO-59 del frontend.
- Límites por tipo de ruta:

  | Grupo | Límite propuesto |
  |-------|------------------|
  | Default global | 100 req / minuto |
  | Auth y login | 5 req / minuto |
  | Escrituras (POST/PUT/DELETE) | 30 req / minuto |
  | Público (jobs, salaries) | 60 req / minuto |

- Mantener fallback en memoria para desarrollo local.
- Headers estándar de rate limit en la respuesta.

### 1.5 Cerrar guards de autorización (BIO-37)

- Crear `RolesGuard` en `src/shared/guards/`.
- Crear decorador `@Roles(...)` en `src/shared/decorators/`.
- Aplicar `@Roles('admin')` a las rutas de `admin.controller.ts` y `api-keys`, `ai-credentials`.
- Auditar cobertura: todo endpoint es `@Public()` o requiere sesión por decisión explícita, no por omisión.
- Documentar la matriz rol-ruta en `docs/`.

### 1.6 Fix de fallo silencioso de emails (espejo de BIO-62)

- `email.service.ts`: en producción, sin `RESEND_API_KEY` o `EMAIL_FROM`, el envío falla con error explícito. No usa mock.
- Mock permitido solo con `NODE_ENV` development o test.
- Loguear cada envío con destinatario y template.
- Misma corrección ya agendada en `biovity` (BIO-62). Hacer ambos en el mismo PR cruzado o en PRs coordinados el mismo día.

### Criterios de aceptación de la fase

- `bun run build` y `bun run lint` pasan.
- Un error no manejado responde con el shape global de error, no con stack trace.
- La app no arranca sin env requerido, con mensaje que nombra la variable.
- `kill -TERM` cierra conexiones sin errores.
- Un burst de peticiones recibe 429 con headers.
- Un usuario no admin recibe 403 en rutas admin.

---

## Fase 2 — Cron y emails transaccionales

**Issues:** BIO-55, BIO-7, BIO-52
**Duración estimada:** 1 a 2 semanas
**Repositorios:** ambos

### 2.1 Expiración automática de ofertas (BIO-55)

Backend, NestJS es dueño de la tabla `job`:

1. `JobExpirationService` con `@Cron` diario (ejemplo: 03:00 America/Santiago).
2. Query: ofertas con `deadline < now` y estado abierto. Cerrar estado y quitar del listado público.
3. Loguear cuántas ofertas expiraron en cada corrida.
4. Endpoint interno de trigger manual para probar: `POST /api/v1/internal/jobs/expire` protegido con `InternalSecretGuard` existente.

Frontend, a la par (BIO-7):

1. Eliminar el keep-alive `SELECT 1` de `app/api/cron/route.ts` o dejarlo solo si Vercel lo exige para el plan.
2. Si queda ruta cron: verificar `Authorization: Bearer CRON_SECRET` o `x-vercel-cron`. Retornar 401 sin credencial válida.
3. Agregar `CRON_SECRET` a `.env.example` de `biovity`.
4. Actualizar `vercel.json`.

### 2.2 Dispatcher de notificaciones por email (BIO-52)

Backend NestJS, según la frontera de la Fase 0 (`notification` es de Next.js, el dispatch se coordina):

1. Definir el contrato en el ADR de la Fase 0: quién escribe `notification`, quién despacha email, con qué trigger.
2. Opción recomendada: NestJS expone el envío transaccional. Next.js, al escribir la notificación, encola el email vía API interna o el cron procesa la cola `notification` no despachada.
3. Emails clave:

   | Evento | Destinatario | Trigger |
   |--------|--------------|---------|
   | Postulación nueva | Organización | Creación de application en NestJS |
   | Cambio de estado de postulación | Profesional | Update de application en NestJS |
   | Nuevo mensaje | Contraparte del chat | Creación de message en NestJS |

4. Respetar las preferencias de notificación existentes en el frontend (`use-notification-preferences`). El backend consulta el flag de opt-out por tipo antes de enviar.
5. Idempotencia: marcar la notificación como despachada. Un reenvío de cron no duplica emails.
6. Plantillas con el layout de marca existente en `lib/mail.ts`. Mover o compartir el layout para no duplicarlo en NestJS.

### Criterios de aceptación de la fase

- Una oferta vencida queda cerrada sin acción manual y desaparece del listado público.
- El cron del frontend responde 401 sin secreto válido.
- Una postulación nueva genera email a la organización.
- Un cambio de estado genera email al profesional.
- Las preferencias de opt-out se respetan.
- Ningún email se envía dos veces por el mismo evento.

---

## Fase 3 — Alertas de empleo

**Issue:** BIO-17
**Duración estimada:** 1 semana
**Repositorios:** ambos

### 3.1 Backend

1. Entidad y tabla `job_alert`: `id`, `userId`, `keywords`, `location`, `frequency` (daily, weekly), `isActive`, `createdAt`, `updatedAt`.
2. CRUD completo: crear, listar, editar, eliminar. Rutas bajo `/api/v1/job-alerts`, protegidas por sesión.
3. DTOs con validación class-validator, mappers siguiendo la convención `jobAlertDomain-orm.mapper.ts`.
4. Matcher: query de ofertas nuevas que calzan con keywords y ubicación desde la última corrida. Se ejecuta en el cron diario junto a la Fase 2.
5. El matcher genera notificaciones y emails reutilizando el dispatcher de BIO-52.

### 3.2 Frontend

1. `jobAlertsCard.tsx`: inputs controlados con `value` y `onChange` para keywords, ubicación, frecuencia.
2. Conectar `homeContent.tsx` con los endpoints vía hook nuevo. Reemplazar el `console.log` con TODO.
3. Estados de loading y error en el card.

### Criterios de aceptación

- Un profesional crea, edita y elimina alertas desde el dashboard.
- Una oferta nueva que calza genera notificación y email según la frecuencia configurada.
- Sin alertas activas, el card muestra el estado vacío correcto.

---

## Fase 4 — Calidad y deuda

**Issues:** BIO-32, BIO-59, BIO-10, BIO-66, BIO-63
**Duración estimada:** flexible, orden por valor

### 4.1 Unificar sistemas de tipos (BIO-32, High)

- Generar tipos canónicos desde el OpenAPI del backend (`swagger.json` de `/api/docs`).
- Migrar `lib/types/dashboard.ts`, `lib/types/messages.ts`, `lib/types/trabajos.ts` a los tipos de la API.
- Alinear `jobPostingSchema` con el contrato real.
- Espejo en backend: mantener los DTO response como fuente única de verdad y exportar el JSON schema en CI.

### 4.2 CSP y rate limiting distribuido (BIO-59)

- CSP en `next.config.ts` compatible con Supabase, Resend, Vercel Analytics y Featurebase.
- Migrar rate limiting en memoria de `lib/rate-limit.ts` y `lib/ai/rate-limit.ts` a Upstash Redis.
- Comparte la cuenta Upstash con el punto 1.4 de la Fase 1. Hacer juntos.

### 4.3 Límites en rutas de upload (BIO-10, High)

- `app/api/upload/cv/route.ts`: límite de 5 MB y validación de tipo MIME real, no solo extensión.
- `app/api/upload/avatar/route.ts`: usar `validateAvatarFile` de `lib/validations/profile.ts`. Eliminar la validación duplicada.
- Rate limiting a ambas rutas con la infraestructura del punto 4.2.

### 4.4 Auditoría de grants de admin (BIO-66, Low)

- Migrar `ADMIN_EMAILS` a tabla o campo en DB con auditoría: quién, cuándo, por qué.
- `ADMIN_EMAILS` queda solo como bootstrap del primer admin.
- Segunda fase opcional: vista de gestión en el dashboard admin.

### 4.5 Chores (BIO-63, Low)

- Corregir drift de `.env.example`, remover `console.log`, actualizar `CLAUDE.md`, resolver lockfile duplicado.

---

## Dependencias y orden

```text
Fase 0 (BIO-65)
  └── Fase 2 (BIO-55 + BIO-7, luego BIO-52)
        └── Fase 3 (BIO-17 depende del dispatcher de emails)

Fase 1 (independiente, puede correr en paralelo con Fase 0 y 2)
  └── 1.4 throttler Upstash se coordina con 4.2 (BIO-59)

Fase 4 (después de Fase 1 y 2)
  └── 4.1 depende de OpenAPI estable, es decir, después de Fase 2
  └── 4.3 depende de 4.2
```

Reglas:

- BIO-52 y BIO-55 requieren la Fase 0 completada.
- BIO-7 y BIO-55 se hacen juntos, mismo día.
- BIO-35 backend y BIO-59 frontend comparten cuenta Upstash. Coordinar.
- BIO-17 depende del dispatcher de BIO-52.

---

## Definiciones pendientes (fuera de este plan)

| Issue | Bloqueo |
|-------|---------|
| BIO-53 | Definir heurística de recomendación y criterios de ranking |
| BIO-54 | Definir qué subsistema de scoring se usa y si se persisten scores |
| BIO-51 | Definir flujo de pago: webhook vs redirect, planes, ciclo de facturación |

Cuando estén definidas, se agregan como fase nueva en este documento.
