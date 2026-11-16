# Navigation, authentication and layout corrections

ReportED changes are on hold at the user's request. No ReportED page, submission service, report router, tracking page, or reporting layout was modified. The existing public `/report` path remains reachable through the shared navigation.

## Diagnosis

- Navbar variants hardcoded Dashboard visibility and Login/User controls instead of using verified authentication state. Landing retained its public variant after logo navigation.
- Landing's Get Started always opened the old login form modal. Global and Messages components still rendered that form.
- The old mobile hook reparented React-owned DOM into a manually created overlay, bypassing React and making navigation/cleanup unreliable. Its `isOpen` state was never updated.
- Authentication profile failures were swallowed, allowing login to resolve before a usable verified profile existed. API renewal rejection did not notify the context. Pending profile updates could race logout.
- Theme preview `background` values incorrectly included `; border: ...` inside the gradient string. Browsers reject that CSS value; previews lost their intended gradients/borders.
- Contact form was nested within Emergency Support. Landing's section below the four cards was a duplicate profile summary with browser/mock statistics.

## Implementation and files

- `frontend/components/shared/Navbar.jsx`: shared session-aware Dashboard/Login/Profile rendering; ordered Services menu; Profile menu with My Profile, Dashboard, Settings, Logout; keyboard arrows/Home/End/Escape, focus return and outside-click dismissal. Logo remains a Next Link to `/`. Shared navbar changes apply on existing pages without altering reporting content.
- `frontend/components/shared/Navbar.module.css`: scoped dropdown positioning, current theme variables and mobile overlay rules. Existing header/logo sizes, padding and scroll behavior remain unchanged; no animations added.
- `frontend/hooks/useMobileMenu.js`: React state, resize/escape cleanup and scroll locking replace manual DOM moves. Mobile navbar uses a React portal with the existing overlay appearance.
- `frontend/lib/routeProtection.jsx`: public-route exceptions retain anonymous reporting; protected navigation saves its requested destination and opens only Login Required. Existing Dashboard `ProtectedRoute` remains in force.
- `frontend/components/shared/GlobalModals.jsx`: removes Login form/state, retains Settings and Login Required, preserves the saved destination when opening `/login`, and uses Next routing for global actions.
- `frontend/components/shared/LoginModal.jsx`: removed. `frontend/components/shared/index.js`: removes its export.
- `frontend/context/AuthContext.tsx`: derives logged-in state from the API-verified profile; restores from cookie when needed; fails login if profile verification fails; prevents pending profile work from undoing logout; hides authenticated navigation immediately on logout.
- `frontend/lib/authFetch.js`: API rejection of renewal clears the invalid credential and informs the provider; temporary network/server errors do not prove logout.
- `frontend/app/login/page.jsx`: client-side post-login navigation with a validated local return path.
- `frontend/app/page.jsx`: Get Started targets `/dashboard` through protected navigation; retains hero/four service cards; removes the duplicate profile summary and its exclusive handlers.
- `frontend/app/about/page.jsx`, `frontend/app/forgot-password/page.jsx`, `frontend/app/message/page.jsx`: remove stale login-modal state/entry points; Messages no longer renders a login form modal.
- `frontend/app/services/page.jsx`: uses shared protected navigation and keeps public anonymous reporting accessible.
- `frontend/app/contacts/page.jsx`: moves the unchanged contact form into its own existing-style first card, keeps emergency information in the second card, and renews API credentials through the shared client when submitting.
- `frontend/components/shared/SettingsModal.jsx`: corrects separate JSX background/border properties for all six original theme gradients; retains selected indicator; removes Gender control and stops sending gender in theme-only updates.
- `frontend/app/profile/page.jsx`, `frontend/app/profile/canonical.module.css`: preserve optional gender editing in the standalone profile editor, including clearing it, using existing compact field styling. No schema/field deletion.
- `frontend/lib/particles.js`: keeps the particle engine; removes unused legacy DOM login/settings/profile listeners. Unreferenced static copies `frontend/lib/login.js`, `frontend/lib/login-fixed.js`, `frontend/lib/profile.js`, `frontend/lib/user-menu.js` are removed so they cannot reintroduce browser-flag authentication or login forms. Original references in `base` are untouched.
- `frontend/tests/service-pages.test.cjs`: replaces the obsolete login-modal expectation with authentication/navigation/layout/theme regression checks.
- `backend/tests/test_dashboard_flow.py`: adds a local unauthenticated dashboard API check; this file is ignored by the current repository ignore rules. No backend production code or migrations changed.

## Verification

- Frontend production build passed.
- `npx.cmd tsc --noEmit` passed; JSX is checked separately by build/render tests.
- 32 frontend tests passed, including authenticated/guest/loading navbar states, exact Services order, anonymous reporting path, protected destinations, keyboard actions, Profile menu, Get Started return path, contact ordering, six valid theme previews, theme-only requests, rejected credentials, and immediate logout state.
- 43 backend tests passed, including a 401 for anonymous Dashboard API access. Local API fixtures and mocks are used; hosted Supabase configuration is not changed. SMTP is disabled for the final backend regression run so tests do not send emails.
- `git diff --check` passed. ReportED files have no diff for this task.

No real browser automation or visual desktop/mobile review was available. Dropdown CSS, portal behavior and keyboard/focus code are implemented; component tests cover relevant handlers, but browser focus/layout, actual OAuth, cross-tab behavior and hosted end-to-end flows are not claimed as verified. Existing React 18/Next deprecation remains outside this task.
