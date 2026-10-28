# VoiceED Backend - Project Structure Documentation

This document explains the purpose of every major directory in the VoiceED backend.

## Project Root

```
backend/
├── app/                    # Main application package
├── database/               # Database configuration (legacy location)
├── middleware/             # Custom middleware (legacy location)
├── routes/                 # API routes (legacy location)
├── schemas/                # Pydantic schemas (legacy location)
├── services/               # Business logic services (legacy location)
├── .env.example            # Environment variable template
├── .gitignore              # Git ignore rules
└── pyproject.toml          # Poetry dependencies
```

---

## `app/` - Main Application Package (Canonical)

This is the **primary package** for the FastAPI application. All new code should go here.

### `app/config/`
**Purpose:** Configuration management
- `settings` object via Pydantic Settings
- Environment variable loading from `.env`
- Centralized config for: database, auth, CORS, email, Firebase, uploads
- **Why:** Single source of truth for all configuration. Type-safe, validated, environment-aware.

### `app/database/`
**Purpose:** Database connection and session management
- Async SQLAlchemy engine creation
- Session maker and dependency (`get_db()`)
- Base class for models
- `init_db()` for table creation
- **Why:** Centralized DB config. Async for performance. Session dependency injectable into routes/services.

### `app/models/`
**Purpose:** SQLAlchemy ORM models (database tables)
- `User`, `Report`, `JournalEntry`, `WellnessTip`, `InspireStory`, `InspireQuote`, `SharedMaterial`
- Enums: `UserRole`, `ReportStatus`, `ReportCategory`, `Gender`
- Relationships and indexes defined
- **Why:** Single source of truth for DB schema. Enables type-safe queries and migrations.

### `app/schemas/`
**Purpose:** Pydantic models for request/response validation
- Input models: `CreateReportData`, `LoginCredentials`, `RegisterData`, etc.
- Output models: `ReportResponse`, `UserResponse`, `WellnessTipResponse`, etc.
- Enums matching DB enums
- **Why:** Automatic validation, serialization, OpenAPI docs generation. Separates API contracts from DB models.

### `app/routes/`
**Purpose:** API endpoint definitions (controllers)
- One file per domain: `auth.py`, `users.py`, `reports.py`, `wellness.py`, `inspire.py`, `share.py`
- `__init__.py` aggregates all routers with prefixes and tags
- Thin layer: validation → service call → response
- **Why:** RESTful conventions. Easy to add versioning. OpenAPI tags for docs.

### `app/services/`
**Purpose:** Business logic layer
- Service classes: `AuthService`, `UserService`, `ReportService`, `WellnessService`, `InspireService`, `ShareService`, `EmailService`, `FileStorageService`
- Singleton instances at module level
- **Why:** Separates business logic from HTTP concerns. Routes become thin. Services unit-testable without FastAPI. Reusable by background jobs, CLI, GraphQL resolvers.

### `app/middleware/`
**Purpose:** Custom ASGI middleware
- `RequestLoggingMiddleware`: logs method, path, status, latency
- `SecurityHeadersMiddleware`: adds CSP, X-Frame-Options, etc.
- **Why:** Cross-cutting concerns. Applied globally in `main.py`. Keeps routes clean.

### `app/main.py`
**Purpose:** FastAPI application factory
- Creates `FastAPI` instance with metadata
- Adds CORS middleware
- Includes aggregated router with `API_V1_PREFIX`
- Health check and root endpoints
- **Why:** Single entry point. Configuration separated. Easy to test and extend.

---

## Legacy Directories (To Be Consolidated)

These exist at the root level but mirror `app/` structure. **Recommendation:** Use `app/` as canonical and remove these.

| Legacy Path | Canonical Path | Status |
|-------------|----------------|--------|
| `database/` | `app/database/` | Deprecated |
| `middleware/` | `app/middleware/` | Deprecated |
| `routes/` | `app/routes/` | Deprecated |
| `schemas/` | `app/schemas/` | Deprecated |
| `services/` | `app/services/` | Deprecated |

---

## Supporting Files

### `pyproject.toml`
Poetry configuration with all dependencies:
- **Core:** fastapi, uvicorn, pydantic, sqlalchemy, alembic, asyncpg
- **Auth:** python-jose, passlib[bcrypt], firebase-admin
- **Dev:** pytest, black, ruff, mypy, pre-commit

### `.env.example`
Template for environment variables:
```
DATABASE_URL=postgresql+asyncpg://user:pass@localhost:5432/voiceed
SECRET_KEY=your-secret-key
FIREBASE_CREDENTIALS_PATH=./firebase-credentials.json
BACKEND_CORS_ORIGINS=["http://localhost:3000"]
```

### `.gitignore`
Excludes: `__pycache__`, `.venv`, `.env`, `*.db`, `.pytest_cache`, `.mypy_cache`, `*.log`

---

## Architecture Principles

1. **Separation of Concerns:** Routes → Services → Models → Database
2. **Dependency Injection:** `get_db()` session injected into services/routes
3. **Type Safety:** Pydantic schemas + SQLAlchemy models + Python type hints
4. **Async First:** All DB operations async via SQLAlchemy 2.0
5. **Single Source of Truth:** Config in `app/config.py`, DB schema in `app/models/`, API contracts in `app/schemas/`
6. **Testability:** Services don't depend on FastAPI; easily unit-tested
6. **Extensibility:** Add new domains by creating route + service + model + schema

---

## Development Commands

```bash
# Install dependencies
cd backend && poetry install

# Run dev server
poetry run uvicorn app.main:app --reload

# Run tests
poetry run pytest

# Format code
poetry run black .
poetry run ruff check --fix .

# Type check
poetry run mypy app/

# Database migrations
poetry run alembic revision --autogenerate -m "description"
poetry run alembic upgrade head
```

---

## Future Integrations

| Feature | Location | Notes |
|---------|----------|-------|
| PostgreSQL | `app/database/`, `app/models/` | Async SQLAlchemy + Alembic |
| Firebase Auth | `app/services/auth_service.py` | `firebase-admin` SDK |
| Email | `app/services/email_service.py` | SMTP or SendGrid |
| File Storage | `app/services/file_storage_service.py` | Local/S3/Firebase abstraction |
| Background Jobs | New `app/tasks/` or Celery | For async processing |
| WebSockets | New `app/websockets/` | Real-time features |