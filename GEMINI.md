# LikhangKamay Engineering & Design Rules

> **Zero Fluff:** Provide concise, direct answers and code diffs. Eliminate flowery language. Never use lazy placeholders (`// Your logic here`).

## 1. System Architecture & Code Quality
- **Backend Separation:** Controllers are strictly slim orchestrators (<50 lines/method). Delegate all database queries, aggregations, and business logic to dedicated `App\Services` or `App\Actions`.
- **Requests & Audits:** Mandate Form Requests (`App\Http\Requests`) for write/update validation. Ban manual activity logging arrays in controllers; use model observers or background jobs.
- **Frontend Modularity & Inertia SPA:** Enforce modular componentization (<500 lines/file) grouped by domain under `resources/js/Components/` and `Pages/`. Use absolute aliases (`@/types`, `@/lib`). Use `<Link>` and `router.visit()` (never raw `window.location.href` for internal routes). Enforce `preserveScroll: true` on modal/sheet form submissions to prevent disorienting jumps.
- **Code Standards, Testing & Scope:** DRY, SOLID, defensive guard clauses with early returns. Artisan workshops and delivery addresses are strictly Cavite-only (`\App\Support\CaviteAddress::class`). Ensure Inertia `useForm` keys match backend request/Eloquent columns with `onError` handlers. Pest/PHPUnit test coverage for backend services/actions; Vitest for frontend components.
- **Anti-Over-Engineering & YAGNI:** Solve the exact problem requested without speculative abstractions. Never create premature design patterns, repository layers, generic wrapper interfaces, or unused parameters for theoretical future needs. Rely on native Laravel and React primitives first. Keep diffs surgical and proportional—never turn a 5-line bugfix into a multi-file architectural refactor.
- **Security & Anti-IDOR Scoping:** Never query models with raw `Model::findOrFail($id)` in authenticated routes without scoping to the active user/tenant (`$request->user()->...`) or enforcing a Laravel Policy (`$this->authorize(...)`). Prevent unauthorized cross-user data manipulation.
- **Idempotency & Resilient UI:** Disable state-changing submit buttons while `form.processing` is true to prevent duplicate submissions. Wrap critical multi-table mutations in `DB::transaction()`. Implement `onError` fallbacks on images, avatars, and 3D canvases to styled placeholder SVGs to ban broken image icons. Wrap external API calls (Nominatim, Lalamove, Paymongo) in short timeouts (3-5s) with safe fallback values.
- **Strict Verification & Zero Broken References:** Never report `npm run build` or tests as passing without strictly executing and validating terminal outputs. Strictly verify all React imports, variable declarations, and state hooks (`useState`) to prevent `ReferenceError` runtime crashes. Run `eslint` or targeted AST checks on modified JS/JSX files alongside `npm run build` and `php artisan test`.

## 2. Production-First Database, Serverless & Parity Primacy
- **Production is Ground Truth:** The production environment (Vercel Serverless + Neon PostgreSQL + Cloud Storage) is the ultimate source of truth. Local (Laragon, MySQL, SQLite) is merely an auxiliary dev sandbox. Never declare a feature or bugfix "ready" or "100% defense ready" solely based on local tests passing—always evaluate and design against production constraints.
- **NEVER DESTROY DATA & Additive Migrations:** `migrate:fresh`, `migrate:reset`, and `db:wipe` are PERMANENTLY BANNED. Migrations must be purely additive using standard ANSI types (no vendor-locked column modifiers). Check existence with `Schema::hasColumn()` and always provide atomic `down()` methods.
- **PostgreSQL Strict Typing Standard:** All Eloquent queries, models, scopes, and migrations must be written PostgreSQL-first:
  - Ban implicit boolean coercion: integer `1`/`0` is strictly illegal for PostgreSQL booleans (`SQLSTATE[42804]`). Always use boolean literals (`true`/`false`) or cast columns with `\App\Casts\PostgresCompatibleBoolean::class`.
  - In JSON queries (`data->key`), always cast keys to strings for cross-DB compatibility.
  - Comply with PostgreSQL `GROUP BY` column completeness in analytical rollups.
- **Defensive Production Fallbacks:** Production data contains soft-deleted users, vacated workshops, and uninitialized settings. Critical consumer flows (Checkout, Cart, Browse, Orders) must employ defensive fallback guards:
  - Use `->withTrashed()` on necessary user/seller lookups so deactivated accounts do not break purchase flows or order histories.
  - Use null-safe operators (`?->`) and `rescue()`/`try-catch` fallbacks with safe defaults (e.g., fallback pickup schedule if none configured).
- **Data Safety & Config Caching:** Default to soft deletes for critical entities. Never call `env()` directly outside `config/` files; always access settings via `config('service.key')` to prevent silent null returns under `php artisan config:cache`.
- **Performance & N+1:** Eager-load relations (`with()`, `loadMissing()`). Ban queries inside loops. Index all filtered/foreign columns. Cache frequent data with Laravel `Cache`.
- **Serverless & Uploads:** Offload external APIs (Resend, Lalamove) to background queues (`QUEUE_CONNECTION=database`). Never put sub-daily crons in `vercel.json` (use external webhooks). Keep containers warm with 5m ping to `/ping`. Use presigned direct-to-storage PUT uploads for files >4.5MB (Vercel payload limit). Assume zero persistent local filesystem in production.

## 3. UI/UX, Anti-AI Slop & Plain Language
- **Aesthetic & Mobile-First:** Clean, minimalist, responsive mobile-first. Strictly use pre-configured Tailwind earthy tokens (`clay`, `stone`). No arbitrary CSS values. Enforce min 44×44px touch targets. Account for mobile virtual keyboards and safe areas (`safe-area-inset-bottom`) in modals and sheets.
- **Anti- "AI Slop":** Never use multi-color gradient border accents or gradient top stripes on cards/modals. Zero decorative emojis (use Lucide/Phosphor SVGs).
- **Minimal Copy & No Redundant Labels:** Omit filler subheadings and obvious micro-captions under self-explanatory inputs (e.g. never add *"Enter your shop name"* under *"Shop Name"*).
- **Plain-Language Standard:** Ban developer/engineering jargon across all user-facing UI:
  - *"Store Location / Store Distance"* (not *"Geofence"*).
  - *"Quick Face Photo / Face Check"* (not *"Biometric 3D Liveness Calibration"*).
  - *"Email Security Code"* (not *"OTP Code Fallback"*).
  - *"Product Recipe / Materials Needed"* (not *"Bill of Materials / BOM"*).
  - *"Ready-to-Sell / Crafted with Materials"* (not *"Resell / Manufactured"*).
  - *"Sales Summary"* (not *"Rollup Analytics"*).
  - *"Order Dispute Resolution"* (not *"Arbitration Ruling Panel"*).
  - *"Clocked Out (Off Duty)"* / *"Shift in Progress"* (not *"Offline • Verification Pending"*).
- **Actionable Permission Guidance:** Never display raw JavaScript exception names (`NotAllowedError`). Provide clear browser address bar lock-icon instructions.

## 4. Technology Stack & Integrations
- **Core:** Laravel, Inertia.js React, Tailwind CSS, Vite.
- **Databases:** Local MySQL (Laragon :3306), Production PostgreSQL/MySQL.
- **Real-Time:** Supabase (`@supabase/supabase-js`, `@supabase/ssr`) with automatic Inertia polling fallback. WebSockets are strictly visual UI accelerators; critical transaction states (orders, payments, shifts) must resolve via backend HTTP responses first.
- **APIs:** Paymongo (payments), Lalamove (courier booking), Nominatim (maps), Resend (transactional mail), Laravel Socialite (Google & Facebook OAuth), Sentry (error logging).

## 5. Workflow Directives
- **Trade-offs & Diffs:** Briefly state pros/cons of major architectural decisions before coding. Provide targeted diffs.
- **Knowledge Graph Cadence:** Batch `graphify update` and Obsidian exports to every 5 prompts or when explicitly requested.
- **Remote Mode Protocol (`/remote-y`, `/remote-n`):**
  - When `/remote-y` is active (mobile/remote), automatically capture and embed real high-resolution screenshots covering all pictures and states of the changes (complete end-to-end flow) from the running local instance after compiling changes. Never hallucinate visual descriptions.
  - When `/remote-n` is active (laptop/desktop workstation), skip headless screenshots and deliver fast, concise diffs for direct local testing. State persists until toggled.
- **Production Pre-Flight Audit:** Before reporting any fix or feature as complete, audit it against 4 strict production checkpoints:
  1. *Database Typing:* Does this rely on MySQL/SQLite silent type coercion (booleans, group by, JSON)? Must use strict PostgreSQL-compatible booleans/syntax.
  2. *Filesystem & State:* Does this attempt local disk writes or depend on stateful server memory? Must use cloud storage / ephemeral-safe code.
  3. *Missing/Deactivated Data:* Does this crash if a user, schedule, or related model is missing or soft-deleted? Must use `->withTrashed()`, null-safety (`?->`), and defensive fallbacks.
  4. *Serverless Limits:* Does this respect Vercel's 4.5MB payload and 15s execution timeout?
- **Fast Diagnostic Escalation:** If an issue cannot be confirmed with 100% certainty or is not resolved within 1-2 attempts (especially on production or third-party integrations), immediately halt speculation and ask the user for the exact server runtime logs, browser console errors, or network payloads needed to pinpoint it directly.