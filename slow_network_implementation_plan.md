# Slow-Network Performance Roadmap & Implementation Plan

> **LikhangKamay Platform Performance Directives**  
> Tailored for Philippine cellular conditions (3G/4G, metered data, high jitter, and mobile latency).

---

## Roadmap Overview & Status Matrix

| Batch | Scope | Key Focus Area | Status | Verification Suite |
| :--- | :--- | :--- | :--- | :--- |
| **Batch 1** | Adaptive Polling & Lazy Loading | `useRealtime` backoff (5s–18s), courier polling tab-sleep, tap-to-load 3D guards, `loading="lazy"` on secondary imagery | **COMPLETED** | Automated regression & unit tests |
| **Batch 2** | Biometric Caching & Auth Fallbacks | Client-side `@vladmandic/face-api` model IndexedDB/Cache storage, 5s OTP fallback bypass for staff attendance | **COMPLETED** | Staff auth regression suite |
| **Batch 3** | Column Projection & Density Guard | Eloquent API `select()` projection pruning, mobile pagination density guards (12 vs 24 items), database index rollups | **COMPLETED** | PHPUnit database typing suite |
| **Batch 4** | Transport Retries & Prefetch Guards | Axios 12s timeout ceiling, idempotent GET exponential jitter retries, safe mutating verb guard, conditional link prefetch | **COMPLETED** | `ClientTransportTest.mjs` |
| **Batch 5** | Offline Shell & 3D Compression | Lightweight Service Worker static cache, Inertia/CSRF bypass guards, Draco mesh decoders, KTX2 Basis texture transcoders | **COMPLETED** | `ServiceWorkerShellTest.mjs`, `ThreeDCompressionTest.mjs` |

---

## Detailed Batch 5 Specification: Offline Shell & 3D Compression Pipeline

### 1. Proposal E.1: Lightweight Static Asset Shell Service Worker
- **File**: `public/sw.js`
- **Registration**: `resources/js/app.jsx` (production-gated via `import.meta.env.PROD`, non-blocking post-load)
- **Edge Routing**: `vercel.json` (`/sw.js` mapped to `/public/sw.js` with `max-age=0, must-revalidate` and `Service-Worker-Allowed: /`)
- **Strategy**:
  - **Cache-First**: Applied to immutable hashed bundles (`/build/assets/*`), local Draco decoder binaries (`/draco/*`), static branding and icons (`/images/*`, `/favicon.ico`), and demo models (`/models/*`).
  - **Pre-cached Shell**: Installs `/images/placeholder.svg`, `/images/no-image.png`, `/favicon.ico`, and WebAssembly Draco decoders on install with `skipWaiting()`.
  - **Offline Image Fallback**: Automatically serves `/images/placeholder.svg` whenever an image request drops or encounters connection errors offline.
  - **Strict Dynamic Bypass**: Navigations (`mode === 'navigate'`), Inertia requests (`X-Inertia: true`), and dynamic backend routes (`/api/*`, `/webhooks/*`, `/sanctum/*`, `/broadcasting/*`, `/auth/*`, `/login`, `/logout`, `/register`, `/ping`) bypass worker cache completely to prevent CSRF token desynchronization or stale HTML sessions.
  - **Cache Hygiene**: Automatically cleans older cache keys on `activate` and immediately claims clients (`clients.claim()`).

### 2. Proposal B.3: Draco / KTX2 Compressed Asset Pipeline for 3D Viewer
- **Files**:
  - `resources/js/Components/ThreeD/threeLoaders.js` (modular Draco and KTX2 loader singletons & config)
  - `resources/js/Components/ThreeD/GLTFModel.jsx` (integrates decoders into R3F `useGLTF`)
  - `resources/js/Components/ThreeD/ProductViewer3D.jsx` (viewer wrapper with `preloadProduct3D`)
  - `public/draco/gltf/` (`draco_decoder.wasm`, `draco_decoder_gltf.wasm`, `draco_decoder.js`, `draco_wasm_wrapper.js`)
  - `vercel.json` (`/draco/(.*)` mapped with 1-year immutable caching)
- **Features**:
  - **Draco Mesh Decompression**: 60–80% geometry size reduction via Google Draco WebAssembly decoders hosted on-origin at `/draco/gltf/` with Google CDN fallback and `getSharedDRACOLoader` singleton.
  - **KTX2 Basis Texture Transcoding**: Universal GPU compressed texture transcoding (ASTC, ETC2, DXT, BPTC, PVRTC) via `KTX2Loader` with WebGL renderer capability detection (`detectSupport(gl)`).
  - **Singleton Worker Safety**: Thread pool reuse across multiple 3D cards and lightbox modals prevents tab memory exhaustion on low-memory mobile devices.
  - **Defensive Error Boundaries**: Wrapped in `ThreeDModelBoundary` and `ThreeDModelUnavailable` with interactive retry buttons.

---

## Deterministic Verification Record

- **Service Worker Shell Tests**: `node tests/Unit/ServiceWorkerShellTest.mjs` (All assertions passed)
- **3D Compression Tests**: `node tests/Unit/ThreeDCompressionTest.mjs` (All assertions passed, verifying bare GLTFLoader without manual pre-configuration)
- **Client Transport Tests**: `node tests/Unit/ClientTransportTest.mjs` (All 7 assertions passed)
- **React Reference Integrity**: `npm run test:refs` (594 files verified with zero broken imports or hooks)
- **Vite Production Bundle**: `npm run build` (Completed cleanly in 31.85s)
- **Full Backend Test Suite**: `php artisan test` (940 passed, 6,195 assertions in 96.24s)
