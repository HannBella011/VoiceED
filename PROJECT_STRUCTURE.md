# VoiceED - Next.js Migration Project Structure

This document explains the purpose of every major directory in the VoiceED project after migration to Next.js (frontend) and FastAPI (backend).

---

## Project Root

```
VoiceED/
├── frontend/          # Next.js 14 App Router application
├── backend/           # FastAPI Python backend
├── src/               # Original HTML/CSS/JS source (preserved for reference)
└── public/            # Original static assets (preserved for reference)
```

---

## Frontend (`frontend/`)

Next.js 14 application using the App Router, React 18, TypeScript, and existing CSS.

### `frontend/app/`

**Next.js App Router pages and layouts.**

- `layout.tsx` - Root layout with global metadata, font imports, and global styles
- `page.tsx` - Home page (placeholder during migration)
- Future: Route groups for `(auth)`, `(dashboard)`, `(public)` layouts
- Future: Dynamic routes like `reports/[id]`, `wellness/journal/[id]`

**Why:** App Router provides file-based routing, React Server Components, streaming, and nested layouts without a separate router library.

---

### `frontend/components/`

**Reusable React components.**

#### `frontend/components/shared/`

**Generic, reusable UI primitives used across features.**

- `Button`, `Input`, `Card`, `Modal`, `Navbar`, `Footer`
- Form components, typography, layout primitives
- No business logic, purely presentational

**Why:** Single source of truth for UI consistency. Changes propagate everywhere. Easy to test in isolation.

---

#### `frontend/components/features/` (future)

**Feature-specific components composed from shared primitives.**

- `ReportForm`, `WellnessTipCard`, `InspireStoryList`, `ShareMaterialUploader`
- `DashboardStats`, `UserProfileCard`, `ReportStatusBadge`
- Contain business logic, data fetching, or feature-specific state

**Why:** Separates generic UI from feature logic. Enables code splitting by feature. Clear ownership boundaries.

---

### `frontend/hooks/`

**Custom React hooks for reusable stateful logic.**

- `useLocalStorage` - Persist state to localStorage
- `useDebounce` - Debounce values (search inputs)
- `useMediaQuery` - Responsive breakpoints in JS
- `useWindowSize` - Viewport dimensions
- `useAuth` - Authentication state management
- `useForm` - Form state, validation, submission

**Why:** Extracts complex state logic from components. Reusable across features. Testable in isolation.

---

### `frontend/lib/`

**Client-side utilities and third-party integrations.**

- Migrated from `src/js/`: `particles.js`, `mobile-menu.js`, `dashboard.js`, `login.js`, `login-fixed.js`, `forgot-password.js`, `profile.js`, `register.js`, `user-menu.js`
- Utility functions that don't fit in `hooks/` or `utils/`
- Third-party library wrappers (e.g., chart libraries, animation libs)

**Why:** "lib" convention for code that's not quite a component, not quite a hook. Keeps `utils/` pure.

---

### `frontend/services/`

**API communication layer.**

- `api.ts` - Typed API client with methods for every backend endpoint
- `useApi` hook for React integration
- Handles authentication tokens, error normalization, request/response typing

**Why:** Centralizes all backend communication. Single place to change API URLs, add interceptors, handle auth. Type-safe contract with backend schemas.

---

### `frontend/styles/`

**Global and component-scoped styles.**

- `globals.css` - Imports all existing CSS in dependency order, adds CSS reset
- `style.css` - Base styles (original)
- `index-style.css` - Landing page styles (original)
- `dashboard.css` - Dashboard styles (original)
- `profile.css` - Profile styles (original)
- `user-menu.css` - User menu styles (original)
- Future: CSS Modules for component-scoped styles (`Component.module.css`)

**Why:** Preserves all existing CSS exactly as-is during migration. No rewriting. CSS Modules can be adopted incrementally for new components.

---

### `frontend/utils/`

**Pure utility functions (no React dependencies).**

- `cn()` - Class name utility (clsx-like)
- `formatDate()`, `formatRelativeTime()` - Date formatting
- `truncate()`, `slugify()`, `capitalize()`, `titleCase()` - String manipulation
- `isValidEmail()`, `isStrongPassword()` - Validation
- `getApiUrl()` - Environment-aware URL construction
- `getErrorMessage()` - Error normalization
- `groupBy()`, `uniqueBy()` - Array manipulation

**Why:** Framework-agnostic utilities. Usable in components, hooks, services, or backend (if shared). Zero dependencies, easily testable.

---

### `frontend/public/`

**Static assets served directly.**

- Copied from root `public/`: all images (bg.png, logos, founder photos, fellow photos)
- `favicon.ico`, `robots.txt`, `manifest.json` (future)
- No processing, direct URL access at `/filename.png`

**Why:** Next.js serves `public/` at root. Images referenced as `/logo for blue.png` in CSS/JS work without path changes.

---

---

## Backend (`backend/`)

FastAPI application with async SQLAlchemy, Pydantic v2, JWT auth, PostgreSQL-ready.

### `backend/app/`

**Core application package.**

- `main.py` - FastAPI app factory, middleware, router inclusion
- `config.py` - Pydantic Settings management (`.env` support)

**Why:** Single entry point. Configuration separated from app logic. Environment-based config for dev/staging/prod.

---

### `backend/app/routes/`

**API route definitions (controllers).**

- `__init__.py` - Router aggregation with prefixes and tags
- `auth.py` - `/auth/login`, `/auth/register`, `/auth/logout`, `/auth/forgot-password`, `/auth/reset-password`
- `users.py` - `/users/me`, `/users/{id}`
- `reports.py` - `/reports` CRUD (ReportED feature)
- `wellness.py` - `/wellness/tips`, `/wellness/resources`, `/wellness/journal` (WellnessED feature)
- `inspire.py` - `/inspire/stories`, `/inspire/quotes` (InspireED feature)
- `share.py` - `/share/materials` CRUD (ShareED feature)

**Why:** One file per domain. RESTful conventions. OpenAPI tags for documentation. Easy to add versioning (`/api/v2`).

---

### `backend/app/schemas/`

**Pydantic models for request/response validation and serialization.**

- Auth: `Token`, `LoginRequest`, `RegisterRequest`
- Users: `UserBase`, `UserCreate`, `UserUpdate`, `UserResponse`
- Reports: `ReportBase`, `ReportCreate`, `ReportUpdate`, `ReportResponse`, enums (`ReportStatus`, `ReportCategory`)
- Wellness: `WellnessTip*`, `JournalEntry*`
- Inspire: `InspireStory*`, `InspireQuote*`
- Share: `SharedMaterial*`

**Why:** Single source of truth for API contracts. Automatic validation, serialization, OpenAPI docs. Shared with frontend via code generation (future).

---

### `backend/app/middleware/`

**Custom ASGI middleware.**

- `RequestLoggingMiddleware` - Logs method, path, status, latency
- `SecurityHeadersMiddleware` - Adds CSP, X-Frame-Options, etc.

**Why:** Cross-cutting concerns. Applied globally in `main.py`. Keeps routes clean.

---

### `backend/app/services/`

**Business logic layer (service classes).**

- `AuthService` - Password hashing, JWT creation/validation
- `UserService` - User CRUD, lookup
- `ReportService` - Report workflow, status transitions
- `WellnessService` - Tips, resources, journal
- `InspireService` - Stories, quotes, moderation
- `ShareService` - Materials, uploads, downloads
- `EmailService` - Notifications, verification
- `FileStorageService` - Abstraction over local/S3/Firebase storage

**Why:** Separates business logic from HTTP concerns. Routes become thin. Services are unit-testable without FastAPI. Reusable by background jobs, CLI, GraphQL resolvers.

---

### `backend/database/`

**Database layer.**

- `__init__.py` - Async SQLAlchemy engine, session maker, `Base` class, `get_db()` dependency, `init_db()`
- Future: `models/` - SQLAlchemy ORM models
- Future: `migrations/` - Alembic migration scripts

**Why:** Centralized DB configuration. Async for performance. Session dependency injectable into routes/services. Alembic for version-controlled schema changes.

---

### `backend/schemas/` (duplicate - remove or consolidate)

**Note:** Currently exists at both `backend/app/schemas/` and `backend/schemas/`. Recommend using `backend/app/schemas/` as canonical and removing the duplicate.

---

### `backend/services/` (duplicate - remove or consolidate)

**Note:** Currently exists at both `backend/app/services/` and `backend/services/`. Recommend using `backend/app/services/` as canonical and removing the duplicate.

---

### `backend/middleware/` (duplicate - remove or consolidate)

**Note:** Currently exists at both `backend/app/middleware/` and `backend/middleware/`. Recommend using `backend/app/middleware/` as canonical and removing the duplicate.

---

### `backend/routes/` (duplicate - remove or consolidate)

**Note:** Currently exists at both `backend/app/routes/` and `backend/routes/`. Recommend using `backend/app/routes/` as canonical and removing the duplicate.

---

### `backend/database/` (canonical)

This is the correct location for database configuration.

---

---

## Migration Notes

### What Was Preserved

- **All 22 images** → `frontend/public/`
- **All 5 CSS files** → `frontend/styles/`
- **All 9 JS files** → `frontend/lib/`
- **All 19 HTML files** → `src/html/` (reference only)

### What Was NOT Done

- No HTML → JSX conversion yet
- No CSS rewriting or CSS Modules adoption
- No component implementations
- No actual database models
- No authentication implementation
- No API logic beyond placeholders

### Next Steps (Phase 2)

1. Install dependencies: `cd frontend && npm install` / `cd backend && poetry install`
2. Create page routes in `frontend/app/` matching original HTML pages
3. Convert HTML to React components (page-by-page)
4. Replace inline scripts with React hooks/components
5. Implement backend models and connect to PostgreSQL
6. Implement auth flow (JWT + HttpOnly cookies)
7. Wire frontend API client to real backend endpoints

---

## Development Commands

```bash
# Frontend
cd frontend
npm run dev      # Start dev server on :3000
npm run build    # Production build
npm run lint     # ESLint

# Backend
cd backend
poetry install
poetry run uvicorn app.main:app --reload  # Start on :8000
poetry run pytest                         # Tests
poetry run alembic upgrade head           # Migrations
```

---

## Environment Variables

### Frontend (`frontend/.env.local`)

```
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
```

### Backend (`backend/.env`)

Copy from `.env.example` and fill in:

```
DATABASE_URL=postgresql+asyncpg://user:pass@localhost:5432/voiceed
SECRET_KEY=your-secret-key
BACKEND_CORS_ORIGINS=["http://localhost:3000"]
```