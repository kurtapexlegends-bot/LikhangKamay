# LikhangKamay Documentation Index

Welcome to the LikhangKamay Second Brain vault. This documentation map is designed to provide immediate architectural, structural, and procedural context for developers and agentic AI systems.

## Main Navigation Maps

*   **[[domain-entities|Core Domain Entities & Rules]]**: Detailed schema and business rules governing models like Users, Products, Orders, and Payroll.
*   **[[routing-topography|Routing & Access Control]]**: Route layouts, middleware topology, and role-based permissions.
*   **[[integrations-webhooks|External Integrations & Webhooks]]**: Operational flows and webhooks for PayMongo and Lalamove.
*   **[[ui-design-tokens|UI/UX & Design Tokens]]**: Artisan theme standards, color palettes, spacing, and guidelines to avoid automated design elements.
*   **[[erp-procurement|ERP: Procurement & Inventory]]**: Stock restocks, raw supplies, recipes, and maker-checker rules.
*   **[[erp-hr-attendance|ERP: HR & Attendance]]**: Shifts, clock-in states, idle timeouts, and payroll calculations.
*   **[[crm-messaging|CRM: Messaging & Templates]]**: Customer chat templates, team channels, typing indicators, and threaded replies.
*   **[[subscriptions-sponsorships|Subscriptions & Sponsorships]]**: Elite/Standard tier limits, PayMongo upgrades, and product retention rules.
*   **[[moderation-disputes|Moderation & Disputes]]**: Flags, dispute states, and buyer review disputes.
*   **[[logistics-fulfillment|Logistics & Fulfillment]]**: Delivery metadata, Lalamove tracking, address formats, and delivery event timeline rollups.
*   **[[system-auditing-analytics|System Auditing, Compliance & Analytics]]**: Activity logging, staff access audits, compliance agreements, capital adjustments, review moderation, and daily analytics snapshot rollups.
*   **[[scheduled-jobs|Background Commands & Scheduler]]**: Cron-scheduled operations, payment resolutions, order timeouts, and automated reminders.

## System Rules & Guidelines

*   **[[GEMINI.md|Core CLI Rules]]**: Strict architectural, coding, security, and migration standards.
*   **[[agent.md|AI Assistant Rules]]**: Specific technical code boundaries and local requirements.

## Core Code References

*   **Config Files**: [composer.json](file:///c:/laragon/www/LikhangKamay/composer.json) | [package.json](file:///c:/laragon/www/LikhangKamay/package.json) | [vite.config.js](file:///c:/laragon/www/LikhangKamay/vite.config.js)
*   **Main Entrypoints**: [web.php](file:///c:/laragon/www/LikhangKamay/routes/web.php) | [auth.php](file:///c:/laragon/www/LikhangKamay/routes/auth.php)
*   **Application Boot**: [app.php](file:///c:/laragon/www/LikhangKamay/bootstrap/app.php)
