<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## VoiceED navigation and content disclosure

- Open record details and reviews on dedicated pages using navigation links.
- Use modals for short previews, editors, and confirmation actions.
- Do not append or expand detail panels inside the current page when a button is clicked.
- Use links for navigating between content views. Filters and pagination may update the existing results list.
- Match cards to the managed aspect: content metrics on Content Dashboard, report metrics and assignment oversight on Reports Dashboard, and account metrics on User Management. Show the signed-in administrator's assigned workload on Reports Dashboard.
- Group administrative destinations in the navbar's Dashboard menu: User Dashboard, Content Dashboard, Reports Dashboard, and User Management for superadministrators. Keep the profile menu focused on personal account actions.
- Place list-dashboard Refresh controls with their filters, using the reports dashboard's shared filter bar and action spacing.
