# VoiceED Developer Documentation

> **Version:** 1.0  
> **Last Updated:** 2026
---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Project Architecture](#project-architecture)
3. [Folder Structure](#folder-structure)
4. [Naming Conventions](#naming-conventions)
5. [Component Organization](#component-organization)
6. [Shared vs Page-Specific Components](#shared-vs-page-specific-components)
7. [How to Add a New Page](#how-to-add-a-new-page)
8. [How to Add a New Component](#how-to-add-a-new-component)
9. [How to Add API Routes](#how-to-add-api-routes)
10. [Future Database Integration](#future-database-integration)
11. [Frontend-Backend Communication](#frontend-backend-communication)
12. [State Management Philosophy](#state-management-philosophy)
13. [Asset Organization](#asset-organization)
14. [Best Practices](#best-practices)
15. [Architectural Decisions](#architectural-decisions)

---

## Project Overview

**VoiceED** is a student-driven platform that empowers learners to be heard, supported, and inspired. It provides four core services:

| Service | Route | Description |
|---------|-------|-------------|
| **ReportED** | `/report-ed` | Anonymous safety reporting system |
| **WellnessED** | `/wellness-ed` | Mental health, stress management, motivation |
| **InspireED** | `/inspire-ed` | Motivational stories, achievements, quotes |
| **ShareED** | `/share-ed` | Collaborative learning materials sharing |

**Tech Stack:**

| Layer | Technology |
|-------|------------|
| Frontend Framework | Next.js 14 (App Router) |
| Language | TypeScript + React 18 |
| Styling | Existing CSS (preserved from original HTML) |
| State Management | React hooks (`useState`, `useContext`, custom hooks) |
| API Client | Custom typed `ApiClient` class |
| Backend | FastAPI (Python 3.11+) |
| Database | PostgreSQL + SQLAlchemy 2.0 (async) |
| Auth | JWT (access + refresh tokens) + Firebase Admin SDK ready |
| Validation | Pydantic v2 |
| Migrations | Alembic |

---

## Project Architecture

```
VoiceED/
├── frontend/                 # Next.js 14 Application
│   ├── app/                  # App Router pages (19 routes)
│   ├── components/           # React components
│   │   └── shared/           # Reusable UI primitives (11 components)
│   ├── hooks/                # Custom React hooks (5 hooks)
│   ├── services/             # API service layer (7 services + types)
│   ├── types/                # Shared TypeScript interfaces
│   ├── styles/               # Original CSS (5 files + globals.css)
│   ├── lib/                  # Original JS (preserved for reference)
│   ├── utils/                # Pure utility functions
│   └── public/               # Static assets (22 images)
├── backend/                  # FastAPI Application
│   └── app/                  # Canonical package
│       ├── config/           # Pydantic Settings
│       ├── database/         # Async SQLAlchemy + sessions
│       ├── models/           # SQLAlchemy ORM models
│       ├── schemas/          # Pydantic request/response models
│       ├── routes/           # API endpoints (controllers)
│       ├── services/         # Business logic layer
│       ├── middleware/       # Custom ASGI middleware
│       ├── main.py           # FastAPI app factory
│       └── config.py         # Settings
├── BACKEND_STRUCTURE.md      # Backend documentation
└── DEVELOPER_DOCS.md         # This file
```

### High-Level Data Flow

```
┌─────────────┐     HTTP/REST      ┌─────────────┐     SQLAlchemy      ┌─────────────┐
│  Browser    │ ◄────────────────► │  FastAPI    │ ◄─────────────────► │ PostgreSQL  │
│  (Next.js)  │   JSON + JWT       │  (Python)   │    Async ORM        │  Database   │
└─────────────┘                    └─────────────┘                     └─────────────┘
       │                                   │
       │ React hooks                       │ Pydantic validation
       ▼                                   ▼
┌─────────────┐                    ┌─────────────┐
│ useAuth     │                    │ Pydantic    │
│ useApi      │                    │ schemas     │
│ useNotifications           │ Business logic services
└─────────────┘                    └─────────────┘
```

---

## Folder Structure

### Frontend (`frontend/`)

```
frontend/
├── app/                          # Next.js App Router (file-based routing)
│   ├── layout.tsx                # Root layout + global providers
│   ├── page.tsx                  # Home page (/)
│   ├── about/page.tsx            # About page (/about)
│   ├── services/page.tsx         # Services page (/services)
│   ├── contacts/page.tsx         # Contact page (/contacts)
│   ├── dashboard/page.tsx        # Dashboard (/dashboard)
│   ├── report-ed/page.tsx        # ReportED (/report-ed)
│   ├── wellness-ed/page.tsx      # WellnessED (/wellness-ed)
│   ├── inspire-ed/page.tsx       # InspireED (/inspire-ed)
│   ├── share-ed/page.tsx         # ShareED (/share-ed)
│   ├── breathing/page.tsx        # Breathing exercise
│   ├── daily-goals/page.tsx      # Daily goals tracker
│   ├── focus-timer/page.tsx      # Pomodoro timer
│   ├── forgot-password/page.tsx  # Password recovery
│   ├── meditation/page.tsx       # Meditation timer
│   ├── message/page.tsx          # Messages
│   ├── mood-tracker/page.tsx     # Mood tracker
│   ├── profile/page.tsx          # User profile
│   ├── register/page.tsx         # Registration
│   └── wellness-journal/page.tsx # Wellness journal
│
├── components/
│   └── shared/                   # Reusable UI primitives (11 components)
│       ├── Navbar.jsx            # Responsive navigation
│       ├── Footer.jsx            # Site footer
│       ├── SettingsModal.jsx     # Theme/settings modal
│       ├── LoginModal.jsx        # Login form modal
│       ├── UserMenuModal.jsx     # User dropdown menu
│       ├── Button.jsx            # Polymorphic button
│       ├── Card.jsx              # Flexible card component
│       ├── Modal.jsx             # Base modal wrapper
│       ├── SectionTitle.jsx      # Section headings
│       ├── Hero.jsx              # Hero sections
│       ├── ServiceCard.jsx       # Service feature cards
│       ├── WellnessActivityCard.jsx # Wellness activity cards
│       └── index.js              # Barrel export
│
├── hooks/                        # Custom React hooks (5 hooks)
│   ├── useParticles.ts           # Particle animation background
│   ├── useMobileMenu.ts          # Mobile navigation logic
│   ├── useSettings.ts            # Theme persistence
│   ├── useAuth.ts                # Auth state + login/register/logout
│   ├── useNotifications.ts       # Toast notifications
│   └── index.ts                  # Barrel export
│
├── services/                     # API service layer
│   ├── api.ts                    # Core HTTP client + useApi hook
│   ├── auth.ts                   # Auth endpoints
│   ├── reports.ts                # ReportED endpoints
│   ├── wellness.ts               # WellnessED endpoints
│   ├── inspire.ts                # InspireED endpoints
│   ├── share.ts                  # ShareED endpoints
│   ├── users.ts                  # User profile endpoints
│   ├── index.ts                  # Barrel export
│   └── types.ts                  # (or use types/ folder)
│
├── types/                        # Shared TypeScript interfaces
│   └── index.ts                  # All domain types + component prop types
│
├── styles/                       # Original CSS (preserved exactly)
│   ├── globals.css               # Imports all CSS in dependency order
│   ├── style.css                 # Base styles
│   ├── index-style.css           # Landing page styles
│   ├── dashboard.css             # Dashboard styles
│   ├── profile.css               # Profile styles
│   └── user-menu.css             # User menu styles
│
├── lib/                          # Original JavaScript (preserved for reference)
│   ├── particles.js              # Particle animation (migrated to useParticles)
│   ├── mobile-menu.js            # Mobile menu (migrated to useMobileMenu)
│   ├── login.js                  # Login logic (migrated to useAuth)
│   ├── login-fixed.js            # Login fixes
│   ├── dashboard.js              # Dashboard logic
│   ├── profile.js                # Profile logic
│   ├── register.js               # Registration logic
│   ├── user-menu.js              # User menu logic
│   └── forgot-password.js        # Password recovery logic
│
├── utils/                        # Pure utility functions
│   └── index.ts                  # cn(), formatDate, validation, etc.
│
├── public/                       # Static assets (served at root)
│   ├── bg.png, bg1-5.png         # Background images
│   ├── erwin.jpg, hann.jpg.jpg, hontiveros.png
│   ├── jason.png, jez.jpg, jiggen.jpg, joshua.jpeg
│   ├── logo for blue/green/orange/pink/red/violet.png
│   └── pfp.jpg
│
├── package.json
├── tsconfig.json
├── next.config.js
└── .gitignore
```

### Backend (`backend/app/`)

```
backend/
├── app/                          # Canonical package
│   ├── config/                   # Configuration
│   │   └── __init__.py           # Re-exports settings
│   ├── database/                 # DB connection
│   │   └── __init__.py           # Async engine, session, Base
│   ├── models/                   # SQLAlchemy ORM models
│   │   └── __init__.py           # User, Report, JournalEntry, WellnessTip,
│   │                              # InspireStory, InspireQuote, SharedMaterial
│   ├── schemas/                  # Pydantic models
│   │   └── __init__.py           # All enums, input/output models
│   ├── routes/                   # API endpoints
│   │   ├── __init__.py           # Aggregated router
│   │   ├── auth.py               # /auth/login, register, logout, etc.
│   │   ├── users.py              # /users/me, /users/{id}
│   │   ├── reports.py            # /reports CRUD (ReportED)
│   │   ├── wellness.py           # /wellness tips, journal (WellnessED)
│   │   ├── inspire.py            # /inspire stories, quotes (InspireED)
│   │   └── share.py              # /share materials CRUD (ShareED)
│   ├── services/                 # Business logic
│   │   └── __init__.py           # AuthService, UserService, ReportService,
│   │                              # WellnessService, InspireService, ShareService,
│   │                              # EmailService, FileStorageService
│   ├── middleware/               # Custom ASGI middleware
│   │   └── __init__.py           # RequestLogging, SecurityHeaders
│   ├── config/                   # Config package
│   │   └── __init__.py           # Re-exports settings
│   ├── main.py                   # FastAPI app factory
│   └── config.py                 # Settings (DB, auth, CORS, Firebase, email)
│
├── pyproject.toml                # Poetry dependencies
├── .env.example                  # Environment template
├── .gitignore
└── BACKEND_STRUCTURE.md          # Backend documentation
```

---

## Naming Conventions

### Files & Directories

| Type | Convention | Example |
|------|------------|---------|
| Directories | kebab-case | `components/shared/`, `app/report-ed/` |
| React Components | PascalCase | `Navbar.jsx`, `ServiceCard.jsx` |
| Hooks | camelCase + `use` prefix | `useAuth.ts`, `useMobileMenu.ts` |
| Utilities | camelCase | `formatDate.ts`, `cn.ts` |
| Services | camelCase + `Service` suffix | `authService`, `reportsService` |
| Types | PascalCase | `User`, `CreateReportData`, `ReportCardProps` |
| Enums | PascalCase + singular | `ReportStatus`, `UserRole` |
| Constants | UPPER_SNAKE_CASE | `API_BASE_URL`, `MAX_FILE_SIZE` |

### Code

| Element | Convention |
|---------|------------|
| Variables/Functions | camelCase |
| Classes/Interfaces/Types | PascalCase |
| Enums | PascalCase (values: UPPER_SNAKE_CASE) |
| Private members | `_prefix` |
| React Props | PascalCase interface + `Props` suffix |
| Event Handlers | `handle` + Action (e.g., `handleLoginClick`) |
| Boolean Props | `is`, `has`, `should`, `can` prefix |

### CSS Classes (Preserved from Original)

| Pattern | Example |
|---------|---------|
| Block | `.header`, `.footer`, `.card` |
| Element | `.header__logo`, `.card__icon` |
| Modifier | `.btn--primary`, `.card--active` |
| State | `.is-active`, `.is-loading` |
| Utility | `.text-center`, `.d-flex` |

---

## Component Organization

### Component Hierarchy

```
Page (app/*/page.tsx)
├── Layout Components
│   ├── Navbar (shared)
│   └── Footer (shared)
├── Page-Specific Components (if needed)
│   └── components/{page-name}/
└── Shared UI Primitives (components/shared/)
    ├── Navbar, Footer
    ├── Modal, SettingsModal, LoginModal, UserMenuModal
    ├── Button, Card, Modal
    ├── SectionTitle, Hero
    ├── ServiceCard, WellnessActivityCard
```

### When to Create a New Component

| Scenario | Action |
|----------|--------|
| Used in 2+ pages | Create in `components/shared/` |
| Page-specific, complex logic | Create in `components/{page-name}/` |
| Simple, one-time use | Keep inline in page |
| Reusable UI pattern | Create in `components/shared/` |

### Component Structure Template

```tsx
// components/shared/NewComponent.tsx
'use client';

import { useState } from 'react';

interface NewComponentProps {
  /** Description of prop */
  title: string;
  onAction?: () => void;
  variant?: 'primary' | 'secondary';
  className?: string;
}

export function NewComponent({ 
  title, 
  onAction, 
  variant = 'primary', 
  className = '' 
}: NewComponentProps) {
  return (
    <div className={`new-component new-component--${variant} ${className}`}>
      <h3>{title}</h3>
      {onAction && (
        <button onClick={onAction} className="btn btn--primary">
          Action
        </button>
      )}
    </div>
  );
}

export default NewComponent;
```

---

## Shared vs Page-Specific Components

### Shared Components (`components/shared/`)

**Criteria for inclusion:**
- Used in 2+ pages
- Generic UI primitive (Button, Card, Modal, Input)
- No business logic
- Highly configurable via props

**Current Shared Components:**

| Component | Purpose | Key Props |
|-----------|---------|-----------|
| `Navbar` | Responsive navigation | `currentPage`, `variant`, `onUserMenuClick`, `onSettingsClick`, `onLoginClick` |
| `Footer` | Site footer | None (static) |
| `SettingsModal` | Theme selector | `isOpen`, `onClose` |
| `LoginModal` | Login form | `isOpen`, `onClose`, `onSwitchToRegister`, `onSwitchToForgotPassword` |
| `UserMenuModal` | User dropdown | `isOpen`, `onClose`, `onProfileClick`, `onLogoutClick`, `username`, `email` |
| `Button` | Polymorphic button | `variant`, `size`, `isLoading`, `children` |
| `Card` | Flexible card | `variant`, `icon`, `title`, `description`, `onClick`, `href` |
| `Modal` | Base modal wrapper | `isOpen`, `onClose`, `title`, `children`, `size` |
| `SectionTitle` | Section headings | `title`, `subtitle`, `align`, `icon` |
| `Hero` | Hero sections | `title`, `subtitle`, `description`, `ctaText`, `ctaHref`, `ctaOnClick` |
| `ServiceCard` | Service feature cards | `icon`, `title`, `description`, `features`, `href` |
| `WellnessActivityCard` | Wellness activities | `icon`, `title`, `description`, `buttonText`, `href` |

### Page-Specific Components (`components/{page-name}/`)

**When to use:**
- Complex logic only relevant to one page
- Components that compose shared primitives with page-specific data
- Not needed elsewhere

**Example Structure:**
```
components/
├── shared/
└── dashboard/
    ├── QuickActionsCard.tsx
    ├── ProgressChart.tsx
    ├── ActivityFeed.tsx
    └── SidebarWidgets.tsx
```

---

## How to Add a New Page

### 1. Create Route Directory

```bash
mkdir -p frontend/app/new-page-name
```

### 2. Create Page Component

```tsx
// frontend/app/new-page-name/page.tsx
'use client';

import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { Navbar, Footer, SettingsModal, LoginModal, UserMenuModal } from '@/components/shared';

export default function NewPage() {
  const pathname = usePathname();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const handleLoginClick = () => {
    // Check auth status
    const currentUser = typeof window !== 'undefined' 
      ? JSON.parse(localStorage.getItem('shielded_current_user') || 'null') 
      : null;
    if (currentUser) {
      setUserMenuOpen(true);
    } else {
      setLoginOpen(true);
    }
  };

  const handleSettingsClick = () => {
    setSettingsOpen(true);
  };

  return (
    <>
      <Navbar 
        currentPage={pathname} 
        variant="public"  // or "dashboard" | "wellness"
        onLoginClick={handleLoginClick}
        onSettingsClick={handleSettingsClick}
      />
      
      <main className="main-content">
        <div className="container">
          {/* Page content here */}
        </div>
      </main>

      <Footer />

      {/* Modals */}
      <SettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <LoginModal
        isOpen={loginOpen}
        onClose={() => setLoginOpen(false)}
        onSwitchToRegister={() => router.push('/register')}
        onSwitchToForgotPassword={() => router.push('/forgot-password')}
      />
      <UserMenuModal
        isOpen={userMenuOpen}
        onClose={() => setUserMenuOpen(false)}
        onProfileClick={() => router.push('/profile')}
        onLogoutClick={() => {
          localStorage.removeItem('shielded_current_user');
        }}
      />
    </>
  );
}
```

### 3. Add Navigation Link

Update `components/shared/Navbar.jsx` to include the new route in the appropriate variant's `navLinks` array.

### 4. Add Page-Specific Styles (if needed)

CSS is global via `globals.css`. Add new styles to the appropriate existing CSS file or create a new one imported in `globals.css`.

---

## How to Add a New Component

### 1. Determine Location

```
Used in 2+ pages? → components/shared/
Page-specific?     → components/{page-name}/
```

### 2. Create Component File

```tsx
// components/shared/MyComponent.tsx
'use client';

import { useState } from 'react';

interface MyComponentProps {
  title: string;
  onAction?: () => void;
  variant?: 'primary' | 'secondary';
  className?: string;
}

export function MyComponent({ 
  title, 
  onAction, 
  variant = 'primary', 
  className = '' 
}: MyComponentProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = async () => {
    if (!onAction) return;
    setIsLoading(true);
    try {
      await onAction();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`my-component my-component--${variant} ${className}`}>
      <h3 className="my-component__title">{title}</h3>
      {onAction && (
        <button 
          className={`btn btn--${variant} ${isLoading ? 'btn--loading' : ''}`}
          onClick={handleClick}
          disabled={isLoading}
        >
          {isLoading ? 'Loading...' : 'Action'}
        </button>
      )}
    </div>
  );
}

export default MyComponent;
```

### 3. Export from Barrel

```js
// components/shared/index.js
export { MyComponent } from './MyComponent';
```

### 4. Add Styles

Add to appropriate CSS file (e.g., `style.css`):

```css
.my-component {
  padding: 1.5rem;
  border-radius: 8px;
  background: var(--card-background);
}

.my-component--primary {
  border-left: 4px solid var(--accent-cyan);
}

.my-component--secondary {
  border-left: 4px solid var(--accent-blue);
}

.my-component__title {
  margin: 0 0 1rem;
  font-size: 1.25rem;
}
```

---

## How to Add API Routes

### Backend (FastAPI)

### 1. Define Schemas

```python
# backend/app/schemas/__init__.py
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class NewFeatureBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = None

class NewFeatureCreate(NewFeatureBase):
    pass

class NewFeatureUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = None

class NewFeatureResponse(NewFeatureBase):
    id: str
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
```

### 2. Create Route File

```python
# backend/app/routes/new_feature.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.schemas import NewFeatureCreate, NewFeatureUpdate, NewFeatureResponse

router = APIRouter()

@router.post("/", response_model=NewFeatureResponse)
async def create_new_feature(
    data: NewFeatureCreate,
    db: AsyncSession = Depends(get_db)
):
    # TODO: Implement with service
    raise HTTPException(status_code=501, detail="Not implemented")

@router.get("/", response_model=list[NewFeatureResponse])
async def list_new_features(
    page: int = 1,
    limit: int = 20,
    db: AsyncSession = Depends(get_db)
):
    # TODO: Implement with service
    raise HTTPException(status_code=501, detail="Not implemented")

@router.get("/{feature_id}", response_model=NewFeatureResponse)
async def get_new_feature(
    feature_id: str,
    db: AsyncSession = Depends(get_db)
):
    # TODO: Implement with service
    raise HTTPException(status_code=501, detail="Not implemented")

@router.put("/{feature_id}", response_model=NewFeatureResponse)
async def update_new_feature(
    feature_id: str,
    data: NewFeatureUpdate,
    db: AsyncSession = Depends(get_db)
):
    # TODO: Implement with service
    raise HTTPException(status_code=501, detail="Not implemented")

@router.delete("/{feature_id}")
async def delete_new_feature(
    feature_id: str,
    db: AsyncSession = Depends(get_db)
):
    # TODO: Implement with service
    raise HTTPException(status_code=501, detail="Not implemented")
```

### 3. Register Route

```python
# backend/app/routes/__init__.py
from app.routes import auth, users, reports, wellness, inspire, share, new_feature

api_router = APIRouter()
# ... existing routers ...
api_router.include_router(new_feature.router, prefix="/new-feature", tags=["new-feature"])
```

### Frontend (Service + Types)

### 1. Add Types

```typescript
// frontend/types/index.ts
export interface NewFeature {
  id: string;
  name: string;
  description?: string;
  created_at: string;
  updated_at?: string;
}

export interface CreateNewFeatureData {
  name: string;
  description?: string;
}

export interface UpdateNewFeatureData {
  name?: string;
  description?: string;
}
```

### 2. Create Service

```typescript
// frontend/services/newFeature.ts
import { NewFeature, CreateNewFeatureData, UpdateNewFeatureData } from '@/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('access_token');
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }
  const response = await fetch(`${API_BASE_URL}${endpoint}`, { ...options, headers });
  if (!response.ok) throw new Error((await response.json().catch(() => ({}))).detail || `HTTP ${response.status}`);
  return response.json();
}

export const newFeatureService = {
  async create(data: CreateNewFeatureData): Promise<NewFeature> {
    return request<NewFeature>('/new-feature', { method: 'POST', body: JSON.stringify(data) });
  },
  async list(page = 1, limit = 20): Promise<NewFeature[]> {
    return request(`/new-feature?page=${page}&limit=${limit}`);
  },
  async get(id: string): Promise<NewFeature> {
    return request(`/new-feature/${id}`);
  },
  async update(id: string, data: UpdateNewFeatureData): Promise<NewFeature> {
    return request(`/new-feature/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  },
  async delete(id: string): Promise<void> {
    return request(`/new-feature/${id}`, { method: 'DELETE' });
  },
};
```

### 3. Export from Barrel

```typescript
// frontend/services/index.ts
export { newFeatureService } from './newFeature';
export type { NewFeature, CreateNewFeatureData, UpdateNewFeatureData } from '@/types';
```

### 4. Use in Component

```tsx
import { newFeatureService } from '@/services';
import { NewFeature } from '@/types';

const features = await newFeatureService.list();
```

---

## Future Database Integration

### Current State

- **Frontend:** Uses `localStorage`/`sessionStorage` for auth and mock data
- **Backend:** Complete schema defined in SQLAlchemy models, placeholder routes
- **Integration:** Not yet connected

### Integration Steps

#### 1. Configure Environment

```bash
# backend/.env
DATABASE_URL=postgresql+asyncpg://user:pass@localhost:5432/voiceed
SECRET_KEY=your-secure-random-key
FIREBASE_CREDENTIALS_PATH=./firebase-credentials.json
BACKEND_CORS_ORIGINS=["http://localhost:3000"]
```

#### 2. Run Migrations

```bash
cd backend
poetry run alembic init alembic
poetry run alembic revision --autogenerate -m "Initial schema"
poetry run alembic upgrade head
```

#### 3. Replace localStorage with API Calls

**Current (Frontend - `useAuth.ts`):**
```typescript
const savedUser = localStorage.getItem('shielded_current_user');
```

**Future (Frontend - `useAuth.ts`):**
```typescript
const { currentUser, isLoggedIn, login, logout } = useAuth();

// login() calls authService.login() → POST /auth/login → sets HttpOnly cookie
// logout() calls authService.logout() → POST /auth/logout → clears cookie
```

#### 4. Implement Services

Each service in `backend/app/services/__init__.py` needs implementation:

```python
class AuthService:
    def hash_password(self, password: str) -> str:
        return pwd_context.hash(password)
    
    def verify_password(self, plain: str, hashed: str) -> bool:
        return pwd_context.verify(plain, hashed)
    
    def create_access_token(self, data: dict) -> str:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        return jwt.encode({**data, "exp": expire}, SECRET_KEY, algorithm=ALGORITHM)
```

#### 5. Connect Routes to Services

```python
# backend/app/routes/auth.py
from app.services import auth_service
from app.schemas import LoginRequest, RegisterRequest, Token

@router.post("/login", response_model=Token)
async def login(credentials: LoginRequest, db: AsyncSession = Depends(get_db)):
    user = await user_service.authenticate(credentials.username, credentials.password)
    if not user:
        raise HTTPException(401, "Invalid credentials")
    access_token = auth_service.create_access_token({"sub": user.username})
    refresh_token = auth_service.create_refresh_token({"sub": user.username})
    # Set HttpOnly cookies
    response.set_cookie("access_token", access_token, httponly=True, secure=True)
    response.set_cookie("refresh_token", refresh_token, httponly=True, secure=True)
    return {"access_token": access_token, "token_type": "bearer"}
```

#### 6. Update Frontend API Client

```typescript
// frontend/services/api.ts
async login(username: string, password: string) {
  const response = await this.request<{ access_token: string }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
    credentials: 'include', // Important for HttpOnly cookies
  });
  // Token stored in HttpOnly cookie automatically
  return response;
}
```

---

## Frontend-Backend Communication

### Authentication Flow

```
┌─────────────┐                           ┌─────────────┐
│   Frontend  │                           │   Backend   │
│  (Next.js)  │                           │  (FastAPI)  │
└──────┬──────┘                           └──────┬──────┘
       │                                         │
       │ POST /auth/login                        │
       │ { username, password }                  │
       ├────────────────────────────────────────►│
       │                                         │ Validate credentials
       │                                         │ Create JWT tokens
       │                                         │ Set HttpOnly cookies
       │                                         │
       │ ◄───────────────────────────────────────┤
       │ 200 OK + Set-Cookie: access_token=...   │
       │             Set-Cookie: refresh_token=..│
       │                                         │
       │ Subsequent requests:                    │
       │ Cookie sent automatically               │
       ├────────────────────────────────────────►│
       │                                         │ Validate JWT
       │                                         │ Return user data
       │ ◄───────────────────────────────────────┤
       │ 200 OK { user }                         │
```

### API Client Pattern

```typescript
// frontend/services/api.ts
class ApiClient {
  private baseUrl: string;
  
  async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      credentials: 'include', // Critical for HttpOnly cookies
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.detail || `HTTP ${response.status}`);
    }
    return response.json();
  }
}
```

### Error Handling

```typescript
try {
  const user = await apiClient.getCurrentUser();
} catch (error) {
  if (error instanceof Error) {
    if (error.message.includes('401')) {
      // Token expired, try refresh
      await apiClient.refreshToken();
      // Retry original request
    }
  }
  notifications.show(error.message, 'error');
}
```

---

## State Management Philosophy

### Principles

1. **No Global State Library** — Use React's built-in primitives (`useState`, `useContext`, `useReducer`)
2. **Colocate State** — Keep state as close to where it's used as possible
3. **Server State ≠ Client State** — Use `useAuth` for auth, `useApi` for data fetching
4. **URL as State** — Use Next.js router for navigation state (filters, pagination)

### State Categories

| Category | Examples | Management |
|----------|----------|------------|
| **UI State** | Modal open/closed, loading spinners | `useState` in component |
| **Form State** | Input values, validation errors | `useForm` hook |
| **Auth State** | Current user, login status | `useAuth` hook (context) |
| **Notifications** | Toast messages | `useNotifications` hook (context) |
| **Theme** | Color preference | `useSettings` hook (localStorage) |
| **Server Data** | Reports, stories, materials | `useApi` + service calls |

### Auth Context Pattern

```tsx
// hooks/useAuth.ts
interface AuthContextValue {
  currentUser: User | null;
  isLoggedIn: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  
  // ... implementation
  
  return (
    <AuthContext.Provider value={{ currentUser, isLoggedIn: !!currentUser, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
```

---

## Asset Organization

### Public Assets (`frontend/public/`)

| Asset Type | Location | Access |
|------------|----------|--------|
| Images | `public/` | `/bg.png`, `/logo for blue.png` |
| Fonts | `public/fonts/` | `/fonts/custom.woff2` |
| Videos | `public/videos/` | `/videos/demo.mp4` |
| Favicon | `public/favicon.ico` | `/favicon.ico` |
| Manifest | `public/manifest.json` | `/manifest.json` |

### CSS Organization

```
frontend/styles/
├── globals.css          # Entry point, imports all CSS
├── style.css            # Base/reset styles
├── index-style.css      # Landing page specific
├── dashboard.css        # Dashboard specific
├── profile.css          # Profile page specific
└── user-menu.css        # User menu/modal specific
```

**Import Order in `globals.css`:**
```css
@import './style.css';           /* Base variables, reset */
@import './index-style.css';     /* Landing page */
@import './dashboard.css';       /* Dashboard */
@import './profile.css';         /* Profile */
@import './user-menu.css';       /* Modals, menus */
```

### Image References

- **In CSS:** `url('/bg.png')` — absolute from public root
- **In JSX:** `<img src="/logo for blue.png" />` — absolute from public root
- **Never use:** Relative paths like `../public/image.png`

---

## Best Practices

### Code Quality

| Practice | Description |
|----------|-------------|
| **Type Everything** | All props, state, API responses typed |
| **No `any`** | Use `unknown` or proper types |
| **Barrel Exports** | Use `index.ts` for clean imports |
| **Client Components** | Mark with `'use client'` only when needed |
| **Server Components** | Default for pages; use `'use client'` only for interactivity |

### Performance

| Practice | Implementation |
|----------|----------------|
| **Code Splitting** | Next.js automatic per route |
| **Image Optimization** | Use Next.js `<Image>` when adding new images |
| **Lazy Loading** | `next/dynamic` for heavy components |
| **Memoization** | `React.memo`, `useMemo`, `useCallback` where needed |

### Accessibility

| Requirement | Implementation |
|-------------|----------------|
| **Semantic HTML** | `<header>`, `<main>`, `<footer>`, `<nav>`, `<section>` |
| **ARIA Labels** | `aria-label`, `aria-expanded`, `aria-controls` |
| **Focus Management** | Visible focus styles, trap focus in modals |
| **Color Contrast** | WCAG AA minimum (preserved in original CSS) |
| **Keyboard Navigation** | All interactive elements reachable |

### Security

| Concern | Mitigation |
|---------|------------|
| **XSS** | React auto-escapes; never use `dangerouslySetInnerHTML` |
| **CSRF** | SameSite cookies + HttpOnly JWT cookies |
| **CORS** | Configured in `settings.BACKEND_CORS_ORIGINS` |
| **Input Validation** | Pydantic schemas on backend; client-side validation |
| **Auth** | HttpOnly cookies, short-lived access tokens, refresh rotation |

### Git Workflow

```bash
# Feature branch
git checkout -b feature/new-page

# Commit with conventional messages
git commit -m "feat: add new-page with Navbar integration"

# PR template
## Changes
- Added new-page route
- Integrated with Navbar and Footer
- Added modals for auth/settings

## Testing
- Verified responsive design
- Verified modal interactions
- Verified auth flow
```

---

## Architectural Decisions

### 1. Next.js App Router over Pages Router

**Decision:** Use App Router (Next.js 13+) with Server Components by default.

**Rationale:**
- React 18 features (Suspense, streaming)
- Nested layouts without layout shift
- Reduced client bundle size
- Better SEO and initial load performance

**Trade-off:** Learning curve for `'use client'` boundary.

---

### 2. Preserve Existing CSS (No Tailwind/CSS Modules)

**Decision:** Keep original CSS files exactly as-is, imported via `globals.css`.

**Rationale:**
- Zero visual regression risk
- Original design preserved perfectly
- No rewrite effort
- Team can incrementally adopt CSS Modules later if needed

**Trade-off:** No scoping; global namespace. Mitigated by BEM-like naming in original CSS.

---

### 3. Custom Hooks over State Libraries

**Decision:** Use `useState`, `useContext`, custom hooks instead of Redux/Zustand.

**Rationale:**
- Zero dependencies
- React 18 context is performant
- State colocated with usage
- Easier for new developers to understand

**Trade-off:** No devtools time-travel debugging. Acceptable for this project size.

---

### 4. HttpOnly Cookies for Auth (Planned)

**Decision:** JWT tokens stored in HttpOnly cookies, not localStorage.

**Rationale:**
- XSS protection (JavaScript cannot access tokens)
- Automatic cookie handling
- Secure by default (Secure, SameSite)

**Implementation:** Backend sets cookies on login; frontend uses `credentials: 'include'`.

---

### 4. Service Layer Separation (Backend)

**Decision:** Routes → Services → Models → Database

**Rationale:**
- Routes handle HTTP only (validation, status codes)
- Services contain business logic (testable without FastAPI)
- Models define DB schema only
- Schemas define API contracts only

**Benefit:** Services reusable by CLI, background jobs, GraphQL resolvers.

---

### 5. Type-Safe API Contracts

**Decision:** Shared TypeScript interfaces in `frontend/types/` matching Pydantic schemas.

**Rationale:**
- Single source of truth for data shapes
- Compile-time detection of breaking changes
- Autocomplete in IDEs

**Workflow:** Backend defines Pydantic → Frontend mirrors in TypeScript → Both validated at compile time.

---

### 6. Component-Driven Development

**Decision:** Build pages by composing shared primitives.

**Rationale:**
- Consistency across pages
- Easier maintenance (fix once, apply everywhere)
- Design system foundation
- Faster page creation

---

### 7. Preserve Original JS as Reference

**Decision:** Keep original `lib/*.js` files unchanged.

**Rationale:**
- Reference for complex logic migration (particles, mobile menu)
- Historical record
- Can be deleted after full migration verified

---

### 8. Environment-Based Configuration

**Decision:** All config via `.env` + Pydantic Settings (backend) / `process.env` (frontend).

**Rationale:**
- No secrets in code
- Different configs per environment (dev/staging/prod)
- Type-safe validation at startup

---

## Quick Reference Commands

### Frontend

```bash
cd frontend
npm install              # Install dependencies
npm run dev              # Dev server (localhost:3000)
npm run build            # Production build
npm run lint             # ESLint
npm run type-check       # TypeScript check
```

### Backend

```bash
cd backend
poetry install           # Install dependencies
poetry run uvicorn app.main:app --reload  # Dev server (localhost:8000)
poetry run pytest        # Run tests
poetry run black .       # Format
poetry run ruff check --fix .  # Lint
poetry run mypy app/     # Type check
poetry run alembic revision --autogenerate -m "msg"  # Create migration
poetry run alembic upgrade head  # Apply migrations
```

---

## Support

For questions about this documentation or the codebase:

1. Check `BACKEND_STRUCTURE.md` for backend details
2. Review `DEVELOPER_DOCS.md` (this file) for frontend patterns
3. Examine existing components in `components/shared/`
4. Check `frontend/types/index.ts` for type definitions
5. Look at `frontend/services/` for API integration patterns

---

*This documentation is a living document. Update it as the project evolves.*