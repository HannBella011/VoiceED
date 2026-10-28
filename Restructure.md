You are a senior React and Next.js software engineer.

Your task is to structurally migrate an existing HTML/CSS website into a Next.js project.

This phase ONLY sets up the project architecture.

## Objectives

- Initialize the project using Next.js App Router.
- Create a scalable frontend/backend folder structure.
- Preserve all existing assets.
- Do NOT migrate any HTML yet.
- Do NOT rewrite CSS.
- Do NOT redesign anything.

## Frontend Stack

- Next.js (App Router)
- React JSX
- Existing CSS
- Minimal JavaScript

## Backend Stack

- Separate backend folder
- Future-ready for FastAPI
- PostgreSQL/Firebase-compatible architecture
- API-based communication

## Deliverables

Create the complete project structure.

Example:

frontend/
    app/
    components/
        shared/
    hooks/
    lib/
    public/
    services/
    styles/
    utils/

backend/
    app/
    routes/
    middleware/
    schemas/
    services/
    database/

Create placeholder files where appropriate.

Do not write component implementations yet.

## Documentation

Explain the purpose of every major directory and why it exists.

This phase focuses ONLY on translating HTML into JSX.

Objectives

- Convert every HTML file into JSX.
- Preserve the exact visual appearance.
- Preserve responsiveness.
- Preserve CSS classes.
- Preserve IDs.
- Preserve semantics.
- Preserve animations.

Rules

- Convert class → className.
- Convert HTML attributes to JSX equivalents.
- Keep CSS untouched unless JSX compatibility requires otherwise.
- Do not introduce new styling.
- Do not optimize yet.
- Do not split into reusable components yet.

Routing

Convert

index.html

↓

app/page.jsx

about.html

↓

app/about/page.jsx

etc.

The resulting pages should look identical to the original website.

This phase focuses ONLY on creating reusable JSX components.

Objectives

Analyze all pages.

Identify duplicated HTML.

Extract reusable components.

Component Organization

Shared components

components/shared/

Examples

Navbar

Footer

Button

Modal

Loader

Card

Banner

Hero

SectionTitle

Page-specific components

components/home/

components/about/

components/events/

components/contact/

Rules

Only create a shared component if it appears multiple times or is likely to be reused.

Do not over-componentize.

Avoid components exceeding 300 lines.

Replace duplicated HTML with reusable JSX components.

No visual changes.

This phase focuses ONLY on JavaScript.

Objectives

Translate existing JavaScript into React.

Replace

window.onload

with

useEffect()

Replace DOM queries where appropriate.

Replace

document.querySelector()

with

useRef()

Use state whenever possible.

Avoid direct DOM manipulation unless required for third-party libraries.

Preserve animations exactly.

Do not rewrite business logic.

Do not optimize animations.

Objectives

Organize project assets.

Move

images

fonts

icons

videos

into

public/

Keep existing CSS.

Split CSS only if it significantly improves organization.

Do not convert to Tailwind.

Do not convert to CSS Modules.

Do not change colors.

Do not change spacing.

Do not redesign.

Ensure imports are correct.

Objectives

Prepare the frontend for future backend integration.

Do NOT implement backend functionality.

Instead,

create scalable architecture.

Create

services/

Example

services/

api.js

auth.js

events.js

posts.js

gallery.js

Each service should expose placeholder functions.

Example

getEvents()

getPosts()

login()

logout()

uploadImage()

Components should be designed to eventually receive data via props rather than relying on hardcoded HTML.

Example

<EventCard event={event} />

Do not implement fetching yet.

Create only the backend structure.

Future-ready for

FastAPI

PostgreSQL

Firebase authentication if required.

Suggested structure

backend/

app/

routes/

services/

schemas/

models/

middleware/

database/

config/

Create placeholder files only.

Do not implement endpoints yet.

Document the purpose of every directory.

Create developer documentation.

Include

Project architecture

Folder structure

Naming conventions

Component organization

Shared vs page-specific components

How to add a new page

How to add a new component

How to add API routes

How future database integration should work

How frontend communicates with backend

State management philosophy

Asset organization

Best practices

Explain every major architectural decision.

This documentation should help a new developer understand and continue the project.

