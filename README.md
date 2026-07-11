# Likhang Kamay

> Integrated Clayworks Management Platform & 3D E-Commerce Marketplace

Likhang Kamay is an all-in-one ERP (Enterprise Resource Planning) system and e-commerce marketplace engineered specifically for traditional pottery studios and claywork artisans in Cavite, Philippines. The platform replaces paper-based workflows with unified digitizations of inventory, procurement, finance, human resources, logistics, and real-time client communications.

To bridge the sensory gap of online shopping, Likhang Kamay implements an interactive WebGL 3D viewer, allowing buyers to inspect clay textures, glazes, and physical shapes from any device.

---

## Key Features

### 1. Interactive WebGL 3D Viewer
*   **360-Degree Evaluation:** View, rotate, and zoom into ceramic pieces in real time.
*   **Asset Support:** Parsed and rendered high-fidelity `.glb` and `.gltf` assets using Three.js, `@react-three/fiber`, and `@react-three/drei`.
*   **Visual Trust:** Replicates physical volume, texture details, and dimensions to build buyer confidence.

### 2. Business Operations (ERP)
*   **Human Resources:** Shift schedule manager with chronometer logs and automatic session suspension to secure labor-time logs.
*   **Automated Payroll:** Attendance logs multiplied against wage rates, writing net payouts (minus commissions, materials, and shipping fees) straight to the ledger.
*   **Procurement & Restocking:** permanent material-recipe mapping. Depleted supply levels trigger multi-stage requisition lists requiring internal accountant approval before purchase release.
*   **Business Analytics:** Interactive margin, revenue, and material drain dashboards powered by Recharts.

### 3. Commerce & Logistics Gateway
*   **Secure Payment:** PayMongo API integration supporting GCash, Card, and e-wallets, backed by HMAC SHA-256 webhook signature verification.
*   **Logistics Automation:** Direct Lalamove API integration for real-time shipping costs based on precise seller/buyer coordinates. Webhooks track driver routing phases.
*   **Active Inventory Control:** Rigid item categorization (Available, Reserved, Shipped) that updates during checkouts, with automated background jobs to prune unpaid carts and restore stock.

### 4. Direct Messaging & Reviews
*   **WebSocket Chat:** Direct buyer-to-artisan negotiation chat window powered by Laravel Reverb/Echo.
*   **Verified Review System:** Confirmed transaction owners can post ratings, comments, and upload product inspection photos.

---

## Technology Stack

### Backend
*   **Framework:** Laravel 12 / PHP 8.2+
*   **WebSockets:** Laravel Reverb & Echo
*   **Email Engine:** Resend PHP
*   **Errors & Analytics:** Sentry Integration
*   **Exports:** Barryvdh DomPDF & PHPWord

### Frontend
*   **Core:** React 18, Vite 7, Inertia.js (Inertia React)
*   **Styling:** TailwindCSS 3 / 4, Framer Motion (Transitions & Micro-animations)
*   **Rendering:** Three.js, `@react-three/fiber`, `@react-three/drei`
*   **Charts:** Recharts

### Testing & Linting
*   **Testing Framework:** Pest / PHPUnit (405 tests, 2890 assertions)
*   **Coding Standards:** Laravel Pint (PHP) & ESLint (React/JS)

---

## Installation & Setup

### Prerequisites
*   PHP 8.2 or higher
*   Composer
*   Node.js (v18+) & npm
*   SQLite or MySQL Database
*   Lalamove & PayMongo API developer credentials

### Automated Installation
Initialize the environment configurations, dependencies, migrations, keys, and asset builds using the automated setup script:
```bash
npm run setup
```

### Running Locally
To launch the concurrent developer ecosystem (web server, queue listener, scheduler, logs, and Vite dev server) in one command:
```bash
npm run dev
```

### Running the Test Suite
Ensure the application integrity and check for route or transaction regressions:
```bash
composer test
```
*(Or execute `php artisan test` directly)*
