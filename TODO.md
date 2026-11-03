# VoiceED Restoration TODO

## Issues to Fix

1. [ ] Convert all .tsx files to .jsx and remove TypeScript syntax
2. [ ] Fix CSS - Remove two-state navbar behavior (header--scrolled)
3. [ ] Fix mobile menu to match base implementation (modal wrapper approach)
4. [ ] Fix navbar clickability issues
5. [ ] Update Navbar component to match base behavior
6. [ ] Remove useNavbarScroll hook and related shifting behavior
5. [ ] Fix mobile menu to use modal wrapper like base
6. [ ] Verify all components match base design

## Files to Convert from .tsx to .jsx
- frontend/app/page.tsx -> .jsx
- frontend/app/layout.tsx -> .jsx
- frontend/app/*/page.tsx -> .jsx (all pages)
- frontend/components/shared/*.tsx -> .jsx
- frontend/components/features/**/*.tsx -> .jsx
- frontend/hooks/*.ts -> .js (remove TypeScript syntax)
- frontend/lib/*.ts -> .js
- frontend/context/*.tsx -> .jsx
- frontend/services/*.ts -> .js
- frontend/utils/*.ts -> .js
- frontend/types/*.ts -> .js (or remove if not needed)

## CSS Changes Needed
- Remove .header--scrolled class and all related styles
- Remove body.navbar-scrolled class
- Remove transitions related to navbar shifting
- Fix mobile menu to use modal wrapper approach
- Ensure navbar stays fixed at top (no shifting)
- Restore original navbar styles from base/style.css

## Navbar Behavior to Restore
- Navbar should be fixed at top (position: fixed, top: 0)
- No shifting/animations on scroll
- Mobile menu uses modal wrapper approach
- All nav links should be clickable
- Settings and Login buttons should work
