# Gemini CLI Project Rules

> **Zero Fluff:** Provide direct, concise answers. Eliminate all flowery language, AI clichés, and robotic pleasantries. Keep comments professional, technical, and focused on the "why".

## 1. Architecture & Scalability
- **System Design:** Prioritize high cohesion and loose coupling suitable for integrated platforms.
- **Naming:** Use strict functional/semantic naming. No redundant suffixes (e.g., use `inventory` not `inventory_module`).
- **Structure (Backend):** Maintain logical separation of concerns (routes, controllers, services, models). Encapsulate complex business logic in dedicated `App\Services` or `App\Actions`, keeping Controllers strictly as slim request/response orchestrators.
- **Structure (Frontend):** Enforce strict modular componentization. Avoid large monolithic files (e.g., pages exceeding 500 lines). Decompose dashboard views and large page templates into granular, focused UI and state components inside `resources/js/Components/` and `resources/js/Pages/` grouped by feature/domain for maximum maintainability and testing scope.
- **Componentization (Reusability):** Decompose structural UI elements (e.g., Sidebars, Headers, Modules) into unified, global reusable components inside `resources/js/Components/` or `resources/js/Layouts/`. Never bundle these layout concerns directly in page templates; maintain them as single, independent files so they can be reused and edited separately.
- **Feature Encapsulation (Structural Reorganization):** Restructure directories strictly by functional domain under `resources/js/Components/` and `resources/js/Pages/` (e.g., `resources/js/Components/Admin/Catalog/`, `resources/js/Components/Admin/Payroll/`). Avoid leaving feature orchestrators (e.g., `CatalogManager.jsx`) sitting loose at domain roots. Enforce clean, decoupled type and utility imports using strict absolute aliases (e.g., `@/types/admin`, `@/lib/cookies`) to simplify directory navigation as the system scales.

## 2. Security & Authentication
- **Access Control:** Implement robust RBAC from day one.
- **Data Protection:** Sanitize inputs (prevent SQLi, XSS, CSRF). Never expose sensitive keys.

## 3. UI/UX Design (Anti- "AI Slop")
- **Aesthetic:** Clean, minimalist design. No decorative clutter.
- **Visuals:** Prioritize whitespace, visual hierarchy, and clear typography. Default to refined, earthy palettes.
- **No Emojis:** Do not use decorative or inline emojis in the system (e.g. in headers, UI labels, sidebars, buttons, notifications) unless explicitly stated or requested by the user. Prefer clean SVG/React icon packages (such as Phosphor/Lucide).
- **Anti- "AI Slop" Visuals:** Never use multi-color gradient border accents or gradient top stripes on card interfaces or modals (e.g., horizontal lines transitioning through yellow, green, and brown). They look like generic, automated AI template styles ("AI slop") and detract from a premium, custom-built feel.
- **Components:** Modular, reusable. Ensure clear focus, hover, and error states.
- **Mobile-First:** Prioritize responsive layouts. All UI must be optimized for mobile touch-points first, then scaled for desktop.
- **Balanced Proportions:** Avoid oversized typography or elements that feel overwhelming ("slapping the user"). Maintain a sophisticated balance between whitespace and content.

## 4. Code Quality & Best Practices
- **Clean Code:** DRY and SOLID. Single responsibility functions.
- **Fail-Fast:** Implement defensive programming via guard clauses and early returns. Validate pre-conditions immediately and exit functions early to eliminate deep nesting and high cognitive load.
- **Error Handling:** Global error handling. Log appropriately, return sanitized responses.
- **Typing:** Enforce strict typing. Avoid `any`.

## 5. Performance Optimization
- **Database:** Optimize queries, use indexing, avoid N+1.
- **Caching:** Cache frequently accessed, rarely changing data.

## 6. Database & Data Integrity
- **Migrations:** All DB changes must use version-controlled migrations. Never suggest manual schema changes.
- **NEVER DESTROY DATA:** `migrate:fresh`, `migrate:reset`, and `db:wipe` are PERMANENTLY BANNED. Always use additive migrations (`php artisan make:migration`) to modify schemas. No exceptions.
- **Transactions:** Wrap multi-step processes in ACID transactions.
- **Soft Deletes:** Default to soft deletes for critical entities for audit trails.

## 7. Edge Systems & Hardware Integration
- **Resilience:** Design for offline tolerance with local sync queues.
- **Peripherals:** Handle hardware asynchronously to prevent UI blocking. Include error recovery.

## 8. DevOps & Environment Strategy
- **Containerization:** Assume containerized deployment. Keep applications stateless.
- **Environment:** Validate env vars at startup. Fail fast if missing.

## 9. Strict AI Output Directives
- **No Lazy Placeholders:** Never use `// Your logic here`. Provide complete implementations.
- **Trade-offs:** Briefly state pros/cons of major architectural decisions before coding.
- **Diffs:** Provide clear file paths and diffs for modifications rather than full file rewrites.
- **Task Focus:** Focus strictly on the assigned task. Do not make random, unrelated, or unnecessary changes to the codebase unless they are absolutely required to complete the specified task.