# Gemini CLI Project Rules

> **Zero Fluff:** Provide direct, concise answers. Eliminate all flowery language, AI clichés, and robotic pleasantries. Keep comments professional, technical, and focused on the "why".

## 1. Architecture & Scalability
- **System Design:** Prioritize high cohesion and loose coupling suitable for integrated platforms.
- **Naming:** Use strict functional/semantic naming. No redundant suffixes (e.g., use `inventory` not `inventory_module`).
- **Structure (Backend):** Maintain logical separation of concerns (routes, controllers, services, models). Encapsulate complex business logic in dedicated `App\Services` or `App\Actions`, keeping Controllers strictly as slim request/response orchestrators. Ban inline database calculations, aggregation queries, and raw metric gathering inside controllers; delegate these to dedicated service layers.
- **Form Requests:** Mandate the use of dedicated Form Requests (under `App\Http\Requests`) for complex write, update, or multi-field validation logic instead of inline controller validation.
- **Audit & Activity Logging:** Ban manual, verbose activity logging arrays (e.g. `SellerActivityLog::recordEvent`) inside controller methods. Decouple audit trails by using Eloquent model observers, event listeners, or background jobs.
- **Structure (Frontend):** Enforce strict modular componentization. Avoid large monolithic files (e.g., pages exceeding 500 lines). Decompose dashboard views and large page templates into granular, focused UI and state components inside `resources/js/Components/` and `resources/js/Pages/` grouped by feature/domain for maximum maintainability and testing scope.
- **Form Orchestration:** For complex settings dashboards or large wizard interfaces, avoid using a single monolithic `useForm` hook containing all settings variables. Split the form hooks and state logic into localized child components for isolation.
- **Componentization (Reusability):** Decompose structural UI elements (e.g., Sidebars, Headers, Modules) into unified, global reusable components inside `resources/js/Components/` or `resources/js/Layouts/`. Never bundle these layout concerns directly in page templates; maintain them as single, independent files so they can be reused and edited separately.
- **Feature Encapsulation (Structural Reorganization):** Restructure directories strictly by functional domain under `resources/js/Components/` and `resources/js/Pages/` (e.g., `resources/js/Components/Admin/Catalog/`, `resources/js/Components/Admin/Payroll/`). Avoid leaving feature orchestrators (e.g., `CatalogManager.jsx`) sitting loose at domain roots. Enforce clean, decoupled type and utility imports using strict absolute aliases (e.g., `@/types/admin`, `@/lib/cookies`) to simplify directory navigation as the system scales.

## 2. Security & Authentication
- **Access Control:** Mandate authorization via Laravel Policies and Gates (`Gate::authorize`). Forbid raw, inline role checks (e.g. `$user->role === 'admin'`) inside controller actions or routes.
- **Data Protection:** Sanitize rich text inputs using the project's custom `RichTextSanitizer` class. Never expose sensitive keys, credentials, or API secret tokens.

## 3. UI/UX Design (Anti- "AI Slop")
- **Aesthetic:** Clean, minimalist design. No decorative clutter.
- **Visuals:** Prioritize whitespace, visual hierarchy, and clear typography. Default to refined, earthy palettes.
- **No Emojis:** Do not use decorative or inline emojis in the system (e.g. in headers, UI labels, sidebars, buttons, notifications) unless explicitly stated or requested by the user. Prefer clean SVG/React icon packages (such as Phosphor/Lucide).
- **Anti- "AI Slop" Visuals:** Never use multi-color gradient border accents or gradient top stripes on card interfaces or modals (e.g., horizontal lines transitioning through yellow, green, and brown). They look like generic, automated AI template styles ("AI slop") and detract from a premium, custom-built feel.
- **Design Tokens:** Strictly use pre-configured Tailwind theme colors (e.g., `clay`, `stone`) and spacing values. Avoid arbitrary tailwind values (e.g., `bg-[#f3f4f6]`) and inline styles to maintain theme consistency.
- **Components:** Modular, reusable. Ensure clear focus, hover, and error states.
- **Mobile-First:** Prioritize responsive layouts. All UI must be optimized for mobile touch-points first, then scaled for desktop.
- **Balanced Proportions:** Avoid oversized typography or elements that feel overwhelming ("slapping the user"). Maintain a sophisticated balance between whitespace and content.

## 4. Code Quality & Best Practices
- **Clean Code:** DRY and SOLID. Single responsibility functions. Restrict any single controller method or React handler function to under 50 lines; extract complex logic block chunks to helper services or utility modules.
- **Fail-Fast:** Implement defensive programming via guard clauses and early returns. Validate pre-conditions immediately and exit functions early to eliminate deep nesting and high cognitive load.
- **State & Inertia.js:** Optimize state management by using local component state for UI concerns, and Inertia's partial reloads (`only` or `lazy` props) for backend-driven data to minimize payload sizes on dashboard updates.
- **Testing Standard:** Enforce backend test coverage using Pest/PHPUnit for new service or action classes, and Vitest for complex frontend components.
- **Error Handling:** Global error handling. Log appropriately, return sanitized responses.
- **Typing:** Enforce strict typing. Avoid `any`.

## 5. Performance Optimization
- **Database:** Prevent N+1 query issues by requiring relationship eager-loading (`with()` or `loadMissing()`). Explicitly ban executing database queries inside loop blocks (`foreach`, `map`, etc.). Write migrations to index any database columns used in `where()` filters or joins.
- **Caching:** Cache frequently accessed, rarely changing data using Laravel's Cache facade with descriptive tags and keys.

## 6. Database & Data Integrity
- **Migrations:** All DB changes must use version-controlled migrations. Never suggest manual schema changes.
- **NEVER DESTROY DATA:** `migrate:fresh`, `migrate:reset`, and `db:wipe` are PERMANENTLY BANNED. Always use additive migrations (`php artisan make:migration`) to modify schemas. No exceptions.
- **Transactions:** Wrap multi-step database writes in closure-based transactions (`DB::transaction(fn() => ...)`) to guarantee auto-rollback on exception. Avoid manual `beginTransaction`/`commit`/`rollback` loops which risk resource leaks.
- **Soft Deletes:** Default to soft deletes for critical entities for audit trails.

## 7. DevOps & Environment Strategy
- **Webhost:** The application is hosted on Vercel. Ensure configurations, builds, and routing structures are compatible with Vercel deployment requirements (e.g., `vercel.json` configurations).
- **Containerization:** Assume containerized or serverless deployment. Keep applications stateless.
- **Environment:** Validate env vars at startup. Fail fast if missing.

## 8. Strict AI Output Directives
- **No Lazy Placeholders:** Never use `// Your logic here`. Provide complete implementations.
- **Trade-offs:** Briefly state pros/cons of major architectural decisions before coding.
- **Diffs:** Provide clear file paths and diffs for modifications rather than full file rewrites.
- **Task Focus:** Focus strictly on the assigned task. Do not make random, unrelated, or unnecessary changes to the codebase unless they are absolutely required to complete the specified task.

## 9. Technology Stack & Integrations
- **Core Frameworks:** Laravel (PHP backend) and React (SPAs built using Inertia.js).
- **Asset Compilation:** Vite (build system) and Tailwind CSS (styling design tokens).
- **Databases:**
  - **Local:** MySQL (served via Laragon on Port 3306).
  - **Production:** MySQL or PostgreSQL (built-in driver configurations).
- **Real-Time Updates:** Supabase (Real-time JS client `@supabase/supabase-js` and `@supabase/ssr` packages). Utilized for live chat, instant notifications, order updates, and admin dashboard triggers. Falls back to active Inertia polling when credentials are missing.
- **Testing:** Pest/PHPUnit (backend feature testing) and Vitest (frontend component testing).
- **DevOps/Hosting:** Vercel (serves stateless frontend and API routes).
- **Third-Party API Integrations:**
  - **Payment Processing:** Paymongo API (handles checkouts and e-wallet payments).
  - **Logistics & Deliveries:** Lalamove API (handles automated courier booking and delivery quotes).
  - **Location Services:** Nominatim (OpenStreetMap) API.
  - **Transactional Mail:** Resend API.
  - **Social Authentication:** Laravel Socialite (configured for Google and Facebook OAuth login).
  - **Error Monitoring:** Sentry (Laravel logging and tracing).

## 10. Performance & Infrastructure Rules
- **Database Indexing:** Always add database indexes (`$table->index(...)`) to columns frequently used in `where()` filters or status checks (e.g., `banned_at`, `status`, `sponsorship` flags) to prevent slow scans as the catalog scales.
- **N+1 Query Prevention:** Eager-load relations (`with()` or `loadMissing()`) for all model lists to reduce remote query network latency round-trips in production.
- **Vercel Hobby Plan Crons:** Hobby plans restrict cron schedules to run at most once per day. Never specify sub-daily or minute crons in `vercel.json`; use free external pingers (like `cron-job.org`) targeting secure webhooks (e.g. `/webhooks/cron/queue`) instead.
- **Serverless Cold-Start Prevention:** Expose a database-free, session-free `/ping` route and ping it every 5 minutes using UptimeRobot to keep serverless containers warm.
- **Asynchronous Mail & Tasks:** Offload slow network requests (like Resend mails or Lalamove bookings) to database queues (`QUEUE_CONNECTION=database`) to prevent blocking the main HTTP request thread.
- **Direct-to-Storage Uploads:** Vercel has a hard 4.5MB request payload limit. For heavy assets (like GLB 3D models), generate presigned URLs and upload files directly from the browser to your storage bucket (Supabase/S3) using PUT requests.