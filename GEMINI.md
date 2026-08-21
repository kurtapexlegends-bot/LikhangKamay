# LikhangKamay Engineering & Design Rules

> **Zero Fluff:** Provide concise, direct answers and code diffs. Eliminate flowery language. Never use lazy placeholders (`// Your logic here`).

## 1. System Architecture & Code Quality
- **Backend Separation:** Controllers are strictly slim orchestrators (<50 lines/method). Delegate all database queries, aggregations, and business logic to dedicated `App\Services` or `App\Actions`.
- **Requests & Audits:** Mandate Form Requests (`App\Http\Requests`) for write/update validation. Ban manual activity logging arrays in controllers; use model observers or background jobs.
- **Frontend Modularity:** Enforce modular componentization (<500 lines/file) grouped by functional domain under `resources/js/Components/` and `Pages/`. Use absolute aliases (`@/types`, `@/lib`). Split complex forms into localized child components.
- **Security & Authorization:** Mandate Laravel Policies/Gates (`Gate::authorize`). Forbid inline role checks (`$user->role === 'admin'`). Strictly dual-gate subscription tier features on backend (aborts) and frontend (prop/UI omission). Sanitize rich text with `RichTextSanitizer`.
- **Code Standards & Testing:** DRY, SOLID, defensive guard clauses with early returns. Ensure Inertia `useForm` keys match backend request/Eloquent columns with `onError` handlers. Pest/PHPUnit test coverage for backend services/actions; Vitest for frontend components.

## 2. Database, DevOps & Parity
- **NEVER DESTROY DATA:** `migrate:fresh`, `migrate:reset`, and `db:wipe` are PERMANENTLY BANNED. Use additive version-controlled migrations only.
- **Dual-Environment Parity:** All code must run identically on Local (Laragon, MySQL) and Production (Vercel Serverless, PostgreSQL, Cloud Storage). In JSON queries (`data->key`), always cast keys to strings for cross-DB compatibility.
- **Database Safety & Integrity:** Wrap multi-table writes in `DB::transaction(fn() => ...)`. Default to soft deletes for critical entities.
- **Performance & N+1:** Eager-load relations (`with()`, `loadMissing()`). Ban queries inside loops. Index all filtered/foreign columns. Cache frequent data with Laravel `Cache`.
- **Serverless & Uploads:** Offload external APIs (Resend, Lalamove) to background queues (`QUEUE_CONNECTION=database`). Never put sub-daily crons in `vercel.json` (use external webhooks). Keep containers warm with 5m ping to `/ping`. Use presigned direct-to-storage PUT uploads for files >4.5MB (Vercel payload limit).

## 3. UI/UX, Anti-AI Slop & Plain Language
- **Aesthetic & Tokens:** Clean, minimalist, responsive mobile-first. Strictly use pre-configured Tailwind earthy tokens (`clay`, `stone`). No arbitrary CSS values.
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
- **Real-Time:** Supabase (`@supabase/supabase-js`, `@supabase/ssr`) with automatic Inertia polling fallback.
- **APIs:** Paymongo (payments), Lalamove (courier booking), Nominatim (maps), Resend (transactional mail), Laravel Socialite (Google & Facebook OAuth), Sentry (error logging).

## 5. Workflow Directives
- **Trade-offs & Diffs:** Briefly state pros/cons of major architectural decisions before coding. Provide targeted diffs.
- **Knowledge Graph Cadence:** Batch `graphify update` and Obsidian exports to every 5 prompts or when explicitly requested.
- **Fast Diagnostic Escalation:** If an issue cannot be confirmed with 100% certainty or is not resolved within 1-2 attempts (especially on production or third-party integrations), immediately halt speculation and ask the user for the exact server runtime logs, browser console errors, or network payloads needed to pinpoint it directly.