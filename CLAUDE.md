# Biovity Server

NestJS-based backend API server for a job posting and application platform.

## Tech Stack

- **Framework:** NestJS v11
- **Language:** TypeScript v5.7
- **Database:** PostgreSQL
- **ORM:** TypeORM v0.3.27
- **Testing:** Jest
- **Code Quality:** ESLint + Prettier

## Architecture

This project follows **Domain-Driven Design (DDD)** with clear layer separation:

```
src/
├── core/                    # Domain layer (business logic)
│   ├── domain/entities/    # Domain entities (pure business objects)
│   ├── repositories/       # Repository interfaces (abstractions)
│   ├── services/          # Service implementations
│   └── use-cases/         # Use case interfaces
│
├── infrastructure/         # Infrastructure layer
│   ├── config/            # Configuration modules
│   ├── database/orm/     # TypeORM entities
│   └── persistence/      # Repository implementations
│
├── interfaces/            # Presentation layer
│   ├── controllers/      # REST API controllers
│   └── dtos/            # Data Transfer Objects
│
└── shared/               # Shared utilities
    ├── errors/           # Custom exceptions
    └── mappers/           # Object mappers
```

### Key Patterns

- **Repository Pattern:** Abstract data access via interfaces in `src/core/repositories/`
- **Mapper Pattern:** Separate mappers for ORM ↔ Domain ↔ DTO conversions in `src/shared/mappers/`
- **DTO Pattern:** Request/response validation via `class-validator`
- **Custom Exceptions:** Domain-specific errors in `src/shared/errors/`

## Database Entities

| Domain Entity | Description |
|---------------|-------------|
| `User` | User accounts (professionals and organizations) |
| `Organization` | Company/organization profiles |
| `Job` | Job postings |
| `Application` | Job applications |
| `Resume` | User resumes/CVs |
| `Subscription` | Subscription plans |
| `Waitlist` | Waitlist entries |

## API Structure

All API endpoints use the global prefix `api/v1`:
- `/api/v1/users` - User endpoints
- `/api/v1/jobs` - Job endpoints
- `/api/v1/organizations` - Organization endpoints
- `/api/v1/applications` - Application endpoints
- `/api/v1/resumes` - Resume endpoints
- `/api/v1/subscriptions` - Subscription endpoints

## Yaak CLI Integration

This project uses **Yaak** (API client) for testing endpoints. The workspace ID is `wk_znJBX8zwZo`.

### Adding New Endpoints to Yaak

When creating a new module with endpoints, follow these steps to add them to Yaak:

#### Step 1: Create the Folder

```bash
yaak folder create wk_znJBX8zwZo --json '{"name": "FolderName"}'
```

#### Step 2: Create the Requests

For each endpoint, create a request:

```bash
# GET request
yaak request create wk_znJBX8zwZo --json '{
  "name": "Request Name",
  "method": "GET",
  "url": "http://localhost:3001/api/v1/endpoint",
  "folderId": "fl_XXXXX"
}'

# POST request
yaak request create wk_znJBX8zwZo --json '{
  "name": "Create Resource",
  "method": "POST",
  "url": "http://localhost:3001/api/v1/resource",
  "folderId": "fl_XXXXX"
}'

# PUT request
yaak request create wk_znJBX8zwZo --json '{
  "name": "Update Resource",
  "method": "PUT",
  "url": "http://localhost:3001/api/v1/resource/:id",
  "folderId": "fl_XXXXX"
}'

# DELETE request
yaak request create wk_znJBX8zwZo --json '{
  "name": "Delete Resource",
  "method": "DELETE",
  "url": "http://localhost:3001/api/v1/resource/:id",
  "folderId": "fl_XXXXX"
}'
```

#### Step 3: List Folders (to get folder IDs)

```bash
yaak folder list wk_znJBX8zwZo
```

#### Common Yaak Commands

```bash
# List all workspaces
yaak workspace list

# List folders in a workspace
yaak folder list wk_znJBX8zwZo

# Send a request
yaak send rq_XXXXX

# View request schema
yaak request schema http

# Create a folder
yaak folder create wk_znJBX8zwZo --json '{"name": "FolderName"}'

# Create a request
yaak request create wk_znJBX8zwZo --json '{...}'
```

## Commands

```bash
# Development
bun run start:dev          # Start with hot reload

# Build
bun run build              # Build for production

# Testing
bun run test              # Run unit tests
bun run test:e2e          # Run end-to-end tests
bun run test:cov          # Run tests with coverage

# Database Migrations
bun run migration:generate # Generate a new migration
bun run migration:create   # Create a new migration
bun run migration:run      # Run pending migrations
bun run migration:revert   # Revert last migration
bun run migration:show     # Show migration status

# Code Quality
bun run lint               # Lint and fix
bun run format             # Format code
```

## Environment Variables

Required in `.env`:
- `DATABASE_*` - PostgreSQL connection (host, port, username, password, name)
- `JWT_SECRET` - Secret for JWT token signing
- `SUPABASE_*` - Supabase configuration (if used)

## Conventions

1. **Entity Files:** Domain entities in `src/core/domain/entities/`, ORM entities in `src/infrastructure/database/orm/`
2. **Repository Interfaces:** Define in `src/core/repositories/`, implement in `src/infrastructure/persistence/`
3. **Mappers:** Use naming convention `entityDomain-entityMapper.mapper.ts` (e.g., `userDomain-orm.mapper.ts`)
4. **DTOs:** Separate request DTOs from response DTOs in `src/interfaces/dtos/`
5. **Errors:** Use custom exceptions from `src/shared/errors/`
6. **Testing:** Place test files alongside source files with `.spec.ts` suffix

## Project Root Files

| File | Purpose |
|------|---------|
| `data-source.ts` | TypeORM data source for migrations |
| `tsconfig.json` | TypeScript configuration |
| `nest-cli.json` | NestJS CLI configuration |
| `eslint.config.mjs` | ESLint rules |
| `.prettierrc` | Prettier formatting rules |