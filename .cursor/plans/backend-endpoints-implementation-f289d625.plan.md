<!-- f289d625-080b-447e-8a26-636d95857771 31b940ae-91e9-46bc-b2dd-871a4b1d322d -->
# Plan de Implementación: Backend Endpoints Completo

## 1. Configuración Base y Dependencias

**Instalar dependencias necesarias:**

- `@nestjs/jwt`, `@nestjs/passport`, `passport`, `passport-jwt`, `@types/passport-jwt`
- `class-validator`, `class-transformer`
- `bcrypt`, `@types/bcrypt`

**Crear archivo `.env.example`** con variables:

```
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=password
DB_NAME=biovity
JWT_SECRET=your-secret-key
JWT_EXPIRATION=7d
PORT=3000
```

## 2. Capa de Infraestructura - Persistencia

**Crear repositorios concretos en `src/infrastructure/persistence/`:**

- `user.repository.impl.ts` - Implementa `IUserRepository` usando TypeORM
- `organization.repository.impl.ts` - Implementa `IOrganizationRepository`
- `job.repository.impl.ts` - Implementa `IJobRepository`
- `application.repository.impl.ts` - Implementa `IApplicationRepository`
- `resume.repository.impl.ts` - Implementa `IResumeRepository`

Cada repositorio inyecta `Repository<EntityORM>` de TypeORM y usa mappers para convertir entre dominio y ORM.

## 3. Capa Shared - Errores y Utilidades

**Crear en `src/shared/errors/`:**

- `domain.exception.ts` - Excepciones de dominio base
- `not-found.exception.ts`, `validation.exception.ts`, `unauthorized.exception.ts`

**Crear en `src/shared/utils/`:**

- `password.util.ts` - Hash y comparación de contraseñas con bcrypt

**Crear filtro global en `src/infrastructure/framework/filters/`:**

- `http-exception.filter.ts` - Captura y formatea errores

## 4. DTOs de Interfaces

**Crear DTOs en `src/interfaces/dtos/` organizados por módulo:**

**Users:**

- `create-user.dto.ts` - email, name, password, type
- `login.dto.ts` - email, password
- `update-user.dto.ts` - Campos opcionales
- `user-response.dto.ts` - Respuesta sin password

**Organizations:**

- `create-organization.dto.ts`, `update-organization.dto.ts`, `organization-response.dto.ts`

**Jobs:**

- `create-job.dto.ts`, `update-job.dto.ts`, `job-response.dto.ts`, `job-filter.dto.ts`

**Applications:**

- `create-application.dto.ts`, `update-application.dto.ts`, `application-response.dto.ts`

**Resumes:**

- `create-resume.dto.ts`, `update-resume.dto.ts`, `resume-response.dto.ts`

Todos con decoradores de `class-validator` (@IsEmail, @IsNotEmpty, @IsOptional, etc.)

## 5. Casos de Uso

**Crear casos de uso en `src/core/use-cases/` por módulo:**

**user/**

- `create-user.use-case.ts` - Registrar usuario, hashear password
- `login-user.use-case.ts` - Validar credenciales, generar JWT
- `get-user.use-case.ts` - Obtener por ID
- `update-user.use-case.ts` - Actualizar datos
- `delete-user.use-case.ts` - Eliminar usuario

**organization/**

- `create-organization.use-case.ts`, `get-organization.use-case.ts`, `update-organization.use-case.ts`, `delete-organization.use-case.ts`

**job/**

- `create-job.use-case.ts`, `get-job.use-case.ts`, `list-jobs.use-case.ts`, `update-job.use-case.ts`, `delete-job.use-case.ts`

**application/**

- `create-application.use-case.ts`, `get-application.use-case.ts`, `list-applications.use-case.ts`, `update-application.use-case.ts`

**resume/**

- `create-resume.use-case.ts`, `get-resume.use-case.ts`, `update-resume.use-case.ts`, `delete-resume.use-case.ts`

Cada caso de uso inyecta interfaces de repositorios y ejecuta lógica de negocio.

## 6. Autenticación JWT

**Crear en `src/infrastructure/framework/auth/`:**

- `jwt.strategy.ts` - Estrategia Passport JWT
- `jwt-auth.guard.ts` - Guard para proteger rutas
- `auth.module.ts` - Módulo de autenticación con JwtModule

**Actualizar `src/core/domain/entities/user.entity.ts`:**

- Agregar campo `password` (hasheado)

**Actualizar `src/infrastructure/database/orm/user.entity.ts`:**

- Agregar columna `password`

## 7. Controladores

**Crear controladores en `src/interfaces/controllers/`:**

- `user.controller.ts` - POST /users/register, POST /users/login, GET /users/:id, PATCH /users/:id, DELETE /users/:id
- `organization.controller.ts` - CRUD completo en /organizations
- `job.controller.ts` - CRUD completo en /jobs, GET /jobs (con filtros)
- `application.controller.ts` - CRUD en /applications
- `resume.controller.ts` - CRUD en /resumes

Usar `@UseGuards(JwtAuthGuard)` en rutas protegidas, validar DTOs con `ValidationPipe`.

## 8. Módulos de Funcionalidad

**Crear módulos NestJS en `src/infrastructure/framework/modules/`:**

- `user.module.ts` - Providers: casos de uso, repositorio impl, exporta servicios
- `organization.module.ts`
- `job.module.ts`
- `application.module.ts`
- `resume.module.ts`

Cada módulo:

- Importa `TypeOrmModule.forFeature([EntityORM])`
- Registra repositorio concreto con token de interfaz
- Registra casos de uso como providers
- Registra controladores

## 9. Integración en AppModule

**Actualizar `src/app.module.ts`:**

- Importar AuthModule y todos los módulos de funcionalidad
- Configurar ValidationPipe global
- Registrar filtro de excepciones global

**Actualizar `src/main.ts`:**

- Configurar CORS
- Habilitar ValidationPipe con `whitelist: true, transform: true`
- Configurar prefijo global `/api`

## 10. Migraciones de Base de Datos

**Crear script de migración en `src/infrastructure/database/migrations/`:**

- Migración inicial con todas las tablas (users con password, organizations, jobs, applications, resumes, subscriptions)

**Agregar scripts en `package.json`:**

```json
"typeorm": "typeorm-ts-node-commonjs",
"migration:generate": "npm run typeorm -- migration:generate",
"migration:run": "npm run typeorm -- migration:run",
"migration:revert": "npm run typeorm -- migration:revert"
```

## Archivos Clave a Modificar/Crear

- `src/app.module.ts` - Integrar todos los módulos
- `src/main.ts` - Configuración global
- `src/core/domain/entities/user.entity.ts` - Agregar password
- `src/infrastructure/database/orm/user.entity.ts` - Agregar columna password
- `src/shared/mappers/*.mapper.ts` - Actualizar mappers según necesidad
- Nuevos: ~50 archivos entre repositorios, DTOs, casos de uso, controladores, módulos

## Orden de Implementación

1. Dependencias y configuración base
2. Errores y utilidades compartidas
3. Repositorios concretos (infrastructure/persistence)
4. DTOs con validaciones
5. Casos de uso
6. Autenticación JWT
7. Controladores
8. Módulos NestJS
9. Integración en AppModule
10. Migraciones y testing

### To-dos

- [x] Instalar dependencias: JWT, Passport, class-validator, bcrypt
- [ ] Crear .env.example y configuración de variables de entorno
- [ ] Crear excepciones de dominio y filtro global de errores
- [ ] Crear utilidades (password hash, etc.)
- [ ] Agregar campo password a entidades User (dominio y ORM)
- [ ] Implementar repositorios concretos para todas las entidades
- [ ] Crear todos los DTOs con validaciones class-validator
- [ ] Implementar casos de uso de User (register, login, CRUD)
- [ ] Implementar casos de uso de Organization
- [ ] Implementar casos de uso de Job
- [ ] Implementar casos de uso de Application y Resume
- [ ] Implementar autenticación JWT (strategy, guard, module)
- [ ] Crear todos los controladores con rutas y guards
- [ ] Crear módulos NestJS para cada funcionalidad
- [ ] Integrar todos los módulos en AppModule y configurar main.ts
- [ ] Crear migración inicial de base de datos con todas las tablas