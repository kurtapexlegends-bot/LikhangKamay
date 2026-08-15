# Likhang Kamay

Integrated Clayworks ERP Management Platform & 3D E-Commerce Marketplace

Likhang Kamay is an enterprise resource planning (ERP) platform and specialized e-commerce marketplace engineered for pottery studios and claywork artisans. It replaces fragmented paper-based processes with an integrated system covering inventory control, procurement, financial ledgers, HR and shift attendance, courier logistics, and real-time customer and team communications.

To resolve the physical inspection challenge of purchasing handmade ceramics online, Likhang Kamay embeds an interactive WebGL 3D viewer that enables buyers to inspect clay textures, glazes, dimensions, and craftsmanship details prior to checkout.

---

## Key Modules & Capabilities

### 1. Interactive WebGL 3D Inspection Engine
*   **360-Degree Mesh Evaluation:** Real-time orbit, pan, and zoom controls for handcrafted ceramic pieces.
*   **Asset Support:** High-fidelity `.glb` and `.gltf` asset parsing rendered via Three.js, `@react-three/fiber`, and `@react-three/drei`.
*   **3D Asset Management:** Seller-side model validation, bundle uploads, and asset linking per product variant.

### 2. Artisan ERP & Business Operations
*   **Human Resources & Time Tracking:** Shift schedule orchestration with chronometer logs, automatic break handling, and idle session suspension.
*   **Automated Payroll:** Time-card calculations mapped to hourly wage rates, deducting material usage or advances and syncing directly with the financial ledger.
*   **Procurement & Recipe Restocking:** Recipe-to-supply mapping. Low-stock supply thresholds generate multi-stage requisition lists with maker-checker approval controls.
*   **Financial & Margin Analytics:** Real-time revenue, expense breakdown, and material drain dashboards built with Recharts.

### 3. Commerce, Payments & Logistics
*   **Payment Processing:** PayMongo API integration supporting Card, GCash, Maya, and e-wallets with HMAC SHA-256 webhook signature verification.
*   **Logistics Automation:** Lalamove API integration calculating precise coordinate-based shipping rates with automatic driver dispatch and delivery lifecycle tracking.
*   **Inventory Synchronization:** Multi-state stock reservation lifecycle (Available, Reserved, Shipped) with automated scheduled background jobs to expire abandoned carts.

### 4. Collaboration, CRM & Real-Time Messaging
*   **Team Messaging:** Internal communication hub featuring role-scoped channels, direct messaging, threaded replies, `@mentions`, and reactions.
*   **Customer Negotiation Chat:** Real-time buyer-to-artisan chat backed by Supabase Real-Time / Laravel Reverb with auto-reply message templates and typing indicators.
*   **Verified Reviews:** Transaction-authenticated product ratings, text reviews, and photo attachments with admin moderation workflows.

### 5. Multi-Tier Subscriptions & Monetization
*   **Plan Quota Enforcement:** Tiered capabilities across Free, Standard, and Elite plans (product limits, staff seat allocations, sponsorship requests, and report exports).
*   **Automated PayMongo Subscriptions:** Recurring billing, checkout sessions, and grace-period management upon downgrade or cancellation.

### 6. Email Studio & Universal Global Search
*   **Dynamic Email Studio:** Visual template editor with variable hydration tags and broadcast dispatching via Resend.
*   **Multi-Tenant Global Search:** Keyboard-navigable command palette (`>`) querying products, orders, inventory, staff, and disputes scoped strictly by tenant permissions.

---

## Security & Authentication Architecture

*   **Role-Based Access Control (RBAC):** Strict isolation across four tenant boundaries: `super_admin`, `artisan` (owner), `staff`, and `buyer`.
*   **Single Device Session Enforcement:** Active session ID verification (`EnforceSingleDeviceSession`) invalidating concurrent logins to protect against multi-device takeover.
*   **OAuth Integration:** Socialite-powered Google and Facebook authentication with automatic email verification and session synchronization.
*   **Data Protection & Rate Limiting:** Form Request validation, XSS sanitization, database transaction closures, and route throttling configured for search, login, and administrative exports.

---

## Technology Stack

### Backend
*   **Framework:** Laravel 12 (PHP 8.2+)
*   **Database:** MySQL / PostgreSQL (served via Laragon locally)
*   **Real-Time / WebSockets:** Supabase Real-Time & Laravel Reverb / Echo
*   **Transactional Email:** Resend PHP
*   **Document Generation:** Barryvdh DomPDF & PHPWord
*   **Monitoring & Tracing:** Sentry Laravel SDK

### Frontend
*   **Framework:** React 18 with Inertia.js SPA architecture
*   **Build Tool:** Vite 7
*   **Styling:** Tailwind CSS with standardized design tokens (`clay`, `stone`, `rose`)
*   **3D Rendering:** Three.js, `@react-three/fiber`, `@react-three/drei`
*   **Motion & Charts:** Framer Motion, Recharts, Lucide Icons

---

## Development Setup

### Prerequisites
*   PHP 8.2 or higher
*   Composer
*   Node.js (v18+) & npm
*   MySQL or PostgreSQL
*   PayMongo & Lalamove developer sandbox credentials

### Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/kurtapexlegends-bot/LikhangKamay.git
   cd LikhangKamay
   ```

2. Initialize dependencies, environment variables, database migrations, and front-end builds:
   ```bash
   npm run setup
   ```

3. Start the local development server (web server, queue worker, scheduler, and Vite):
   ```bash
   npm run dev
   ```

---

## Testing & Quality Assurance

The codebase enforces automated test coverage across authentication, ERP business logic, logistics, subscriptions, and security boundaries.

Run the test suite:
```bash
php artisan test
```

**Current Test Metrics:**
*   **Tests:** 490 passed
*   **Assertions:** 3,281 passing
*   **Code Standard:** Laravel Pint (PHP) & ESLint (React/JS)
