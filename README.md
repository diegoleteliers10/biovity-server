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

## 👥 Guía para Colaboradores

### 🌿 Creación de Ramas

Utilizamos un sistema de ramas basado en el tipo de trabajo que se está realizando. Todas las ramas deben crearse desde `main` o `develop`.

#### Convención de Nombres

Las ramas deben seguir el siguiente formato:

```
<tipo>/<descripción-corta>
```

#### Tipos de Ramas

- **`feat/`** - Nueva funcionalidad

  ```bash
  git checkout -b feat/user-profile-page
  git checkout -b feat/job-search-filters
  ```

- **`fix/`** - Corrección de bugs

  ```bash
  git checkout -b fix/login-validation-error
  git checkout -b fix/mobile-responsive-header
  ```

- **`hotfix/`** - Corrección urgente en producción

  ```bash
  git checkout -b hotfix/critical-security-patch
  git checkout -b hotfix/payment-processing-error
  ```

- **`design/`** - Cambios de diseño/UI/UX

  ```bash
  git checkout -b design/landing-page-redesign
  git checkout -b design/dashboard-sidebar-improvement
  ```

- **`refactor/`** - Refactorización de código

  ```bash
  git checkout -b refactor/auth-service-modularization
  git checkout -b refactor/component-structure-reorganization
  ```

- **`docs/`** - Documentación

  ```bash
  git checkout -b docs/api-documentation
  git checkout -b docs/setup-guide-update
  ```

- **`test/`** - Pruebas

  ```bash
  git checkout -b test/add-unit-tests-auth
  git checkout -b test/integration-tests-job-search
  ```

- **`chore/`** - Tareas de mantenimiento

  ```bash
  git checkout -b chore/update-dependencies
  git checkout -b chore/ci-cd-pipeline-setup
  ```

#### Ejemplos de Buenas Prácticas

✅ **Buenos nombres de ramas:**

```bash
feat/user-dashboard-metrics
fix/header-scroll-behavior
design/landing-hero-section-animation
refactor/auth-middleware-cleanup
```

❌ **Nombres a evitar:**

```bash
feature                    # Muy genérico
fix-bug                   # Sin prefijo de tipo
new-feature               # No sigue la convención
mi-cambio                 # No descriptivo
```

### 💬 Convención de Commits

Utilizamos [Conventional Commits](https://www.conventionalcommits.org/) para mantener un historial de commits limpio y fácil de entender.

#### Formato de Commits

```
<tipo>(<alcance>): <descripción>

[descripción opcional más detallada]

[footer opcional]
```

#### Tipos de Commits

- **`feat:`** - Nueva funcionalidad

  ```bash
  git commit -m "feat: agregar filtro de búsqueda por ubicación"
  git commit -m "feat(dashboard): implementar gráfico de métricas de usuario"
  ```

- **`fix:`** - Corrección de bugs

  ```bash
  git commit -m "fix: corregir validación de email en registro"
  git commit -m "fix(auth): resolver problema de sesión expirada"
  ```

- **`hotfix:`** - Corrección urgente

  ```bash
  git commit -m "hotfix: corregir vulnerabilidad de seguridad crítica"
  git commit -m "hotfix(payment): resolver error en procesamiento de pagos"
  ```

- **`design:`** - Cambios de diseño/UI

  ```bash
  git commit -m "design: mejorar responsive del header en móviles"
  git commit -m "design(landing): actualizar animaciones del hero section"
  ```

- **`refactor:`** - Refactorización sin cambiar funcionalidad

  ```bash
  git commit -m "refactor: reorganizar estructura de componentes"
  git commit -m "refactor(auth): modularizar servicio de autenticación"
  ```

- **`docs:`** - Cambios en documentación

  ```bash
  git commit -m "docs: actualizar guía de instalación"
  git commit -m "docs(api): agregar documentación de endpoints"
  ```

- **`test:`** - Agregar o modificar tests

  ```bash
  git commit -m "test: agregar tests unitarios para componente Button"
  git commit -m "test(auth): agregar tests de integración para login"
  ```

- **`chore:`** - Tareas de mantenimiento

  ```bash
  git commit -m "chore: actualizar dependencias a última versión"
  git commit -m "chore(ci): configurar pipeline de CI/CD"
  ```

- **`perf:`** - Mejoras de rendimiento

  ```bash
  git commit -m "perf: optimizar carga de imágenes con next/image"
  git commit -m "perf(dashboard): reducir tiempo de carga de métricas"
  ```

- **`style:`** - Cambios de formato (espacios, comas, etc.)

  ```bash
  git commit -m "style: corregir formato según Biome"
  ```

- **`ci:`** - Cambios en CI/CD

  ```bash
  git commit -m "ci: agregar test de build en GitHub Actions"
  ```

#### Alcance (Opcional)

El alcance indica qué parte del código se ve afectada:

```bash
feat(auth): agregar autenticación con Google
fix(dashboard): corregir cálculo de métricas
design(landing): mejorar hero section
refactor(components): reorganizar estructura
```

#### Ejemplos de Commits Completos

✅ **Buenos commits:**

```bash
feat(search): agregar filtro por rango salarial

Implementa filtro avanzado que permite a los usuarios buscar
empleos por rango salarial mínimo y máximo.

Closes #123

---

fix(auth): corregir redirección después de login

El usuario ahora es redirigido correctamente al dashboard después
de iniciar sesión, en lugar de quedarse en la página de login.

Fixes #456

---

design(landing): mejorar responsive del hero en móviles

- Ajustar tamaño de fuente para pantallas pequeñas
- Optimizar espaciado de elementos
- Mejorar contraste de texto sobre fondo degradado

---

refactor(components): extraer lógica de animación a hook personalizado

Crea useScrollAnimation hook para reutilizar lógica de animaciones
basadas en scroll en múltiples componentes.

BREAKING CHANGE: Los componentes ahora requieren pasar ref al hook
```

❌ **Commits a evitar:**

```bash
git commit -m "cambios"                    # Muy vago
git commit -m "fix bug"                    # Sin contexto
git commit -m "WIP"                        # Work in progress
git commit -m "asdf"                       # Sin sentido
git commit -m "actualizar cosas"          # No descriptivo
```

#### Reglas Importantes

1. **Usa el modo imperativo** ("agregar" no "agregué" o "agregando")
2. **Sé específico** en la descripción
3. **Mantén el mensaje corto** en la primera línea (máximo 72 caracteres)
4. **Usa el cuerpo** para explicar el "qué" y "por qué", no el "cómo"
5. **Menciona issues** relacionados con `Closes #123` o `Fixes #456`
6. **Marca breaking changes** con `BREAKING CHANGE:` en el footer

### 🔄 Proceso de Pull Request

1. **Crear la rama** siguiendo la convención de nombres
2. **Hacer commits** siguiendo la convención de commits
3. **Push de la rama** al repositorio remoto
4. **Crear Pull Request** con:
   - Título descriptivo
   - Descripción detallada de los cambios
   - Screenshots (si aplica para cambios de UI)
   - Referencias a issues relacionados
5. **Esperar revisión** y responder a comentarios
6. **Merge** después de aprobación

### 📝 Checklist antes de hacer PR

- [ ] El código sigue las convenciones del proyecto
- [ ] Los commits siguen la convención establecida
- [ ] El código está formateado (`bun format`)
- [ ] No hay errores de lint (`bun lint`)
- [ ] Los tipos de TypeScript están correctos (`bun typecheck`)
- [ ] La funcionalidad funciona correctamente
- [ ] Se probó en diferentes navegadores/dispositivos (si aplica)
- [ ] La documentación está actualizada (si aplica)

## Licencia

UNLICENSED - Uso privado.
