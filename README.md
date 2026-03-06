# Biovity Server

API backend para la plataforma de empleo y aplicaciones Biovity. Construido con NestJS y arquitectura Domain-Driven Design (DDD).

## Características

- **Plataforma de empleo:** Publicación de ofertas, aplicaciones y gestión de candidatos
- **Organizaciones:** Perfiles de empresas y gestión de vacantes
- **Usuarios:** Profesionales con currículums y perfiles
- **Chat:** Sistema de mensajería entre usuarios
- **Autenticación:** JWT con cookies y Passport
- **Validación:** DTOs con class-validator y class-transformer

## Stack tecnológico

| Tecnología | Versión |
|------------|---------|
| NestJS | v11 |
| TypeScript | v5.7 |
| PostgreSQL | - |
| TypeORM | v0.3 |
| Bun / npm | - |
| Jest | - |
| ESLint + Prettier | - |

## Requisitos previos

- [Bun](https://bun.sh) o Node.js 18+
- PostgreSQL
- Variables de entorno configuradas (ver sección [Variables de entorno](#variables-de-entorno))

## Instalación

```bash
# Con Bun
bun install

# Con npm
npm install
```

## Ejecución

```bash
# Desarrollo (con hot reload)
bun run start:dev
# o
npm run start:dev

# Producción
bun run build && bun run start:prod
```

La API estará disponible en `http://localhost:3001` con el prefijo `/api/v1`.

## Estructura del proyecto

```
src/
├── core/                      # Capa de dominio
│   ├── domain/entities/       # Entidades de dominio
│   ├── repositories/          # Interfaces de repositorios
│   ├── services/              # Servicios de negocio
│   └── use-cases/             # Casos de uso
│
├── infrastructure/            # Capa de infraestructura
│   ├── config/                # Configuración
│   ├── database/orm/          # Entidades TypeORM
│   └── persistence/           # Implementación de repositorios
│
├── interfaces/                # Capa de presentación
│   ├── controllers/           # Controladores REST
│   └── dtos/                  # Objetos de transferencia
│
└── shared/                    # Utilidades compartidas
    ├── errors/                # Excepciones personalizadas
    └── mappers/               # Mapeadores ORM ↔ Domain ↔ DTO
```

## Entidades del dominio

| Entidad | Descripción |
|---------|-------------|
| User | Usuarios (profesionales y organizaciones) |
| Organization | Perfiles de empresas |
| Job | Ofertas de empleo |
| Application | Candidaturas a ofertas |
| Resume | Currículums de usuarios |
| Subscription | Planes de suscripción |
| Chat | Conversaciones |
| Message | Mensajes de chat |
| Waitlist | Lista de espera |

## Endpoints API

Base URL: `/api/v1`

| Recurso | Ruta |
|---------|------|
| Usuarios | `/users` |
| Organizaciones | `/organizations` |
| Ofertas de empleo | `/jobs` |
| Chat | `/chat` |
| Mensajes | `/messages` |

## Variables de entorno

Crea un archivo `.env` en la raíz del proyecto:

```env
# Base de datos
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=tu_password
DB_NAME=biovity

# JWT
JWT_SECRET=tu_secreto_jwt

# Opcional: Supabase
# SUPABASE_URL=
# SUPABASE_ANON_KEY=
```

## Comandos disponibles

| Comando | Descripción |
|---------|-------------|
| `bun run start:dev` | Inicia en modo desarrollo |
| `bun run build` | Compila para producción |
| `bun run test` | Ejecuta tests unitarios |
| `bun run test:e2e` | Ejecuta tests end-to-end |
| `bun run test:cov` | Tests con cobertura |
| `bun run lint` | Linter y corrección automática |
| `bun run format` | Formatea el código con Prettier |

### Migraciones de base de datos

```bash
bun run migration:generate  # Genera migración desde entidades
bun run migration:create   # Crea migración vacía
bun run migration:run      # Ejecuta migraciones pendientes
bun run migration:revert   # Revierte la última migración
bun run migration:show     # Muestra estado de migraciones
```

## Patrones utilizados

- **Repository Pattern:** Acceso a datos abstraído mediante interfaces
- **Mapper Pattern:** Conversiones entre ORM, dominio y DTOs
- **DTO Pattern:** Validación de request/response con class-validator
- **Excepciones de dominio:** Errores específicos en `src/shared/errors/`

## Licencia

UNLICENSED - Uso privado.
