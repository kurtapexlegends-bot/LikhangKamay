# Gemini CLI Project Rules

> **Zero Fluff:** Provide direct, concise answers. Eliminate all flowery language, AI clichés, and robotic pleasantries. Keep comments professional, technical, and focused on the "why".

## 1. Architecture & Scalability
- **System Design:** Prioritize high cohesion and loose coupling suitable for integrated platforms.
- **Naming:** Use strict functional/semantic naming. No redundant suffixes (e.g., use `inventory` not `inventory_module`).
- **Structure:** Maintain logical separation of concerns (routes, controllers, services).

## 2. Security & Authentication
- **Access Control:** Implement robust RBAC from day one.
- **Data Protection:** Sanitize inputs (prevent SQLi, XSS, CSRF). Never expose sensitive keys.

## 3. UI/UX Design (Anti- "AI Slop")
- **Aesthetic:** Clean, minimalist design. No decorative clutter.
- **Visuals:** Prioritize whitespace, visual hierarchy, and clear typography. Default to refined, earthy palettes.
- **Components:** Modular, reusable. Ensure clear focus, hover, and error states.

## 4. Code Quality & Best Practices
- **Clean Code:** DRY and SOLID. Single responsibility functions.
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