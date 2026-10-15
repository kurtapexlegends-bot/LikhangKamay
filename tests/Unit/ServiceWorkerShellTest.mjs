import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

console.log('[LikhangKamay] Running Batch 5 Service Worker Shell & Safety Guard Verification Suite...');

const rootDir = process.cwd();
const swPath = path.join(rootDir, 'public', 'sw.js');
const appJsxPath = path.join(rootDir, 'resources', 'js', 'app.jsx');
const vercelJsonPath = path.join(rootDir, 'vercel.json');

// 1. Verify public/sw.js exists and is readable
assert.ok(fs.existsSync(swPath), 'public/sw.js must exist');
const swContent = fs.readFileSync(swPath, 'utf8');

// 2. Verify Service Worker Lifecycle Events
assert.match(swContent, /addEventListener\(['"]install['"]/, 'sw.js must handle install event');
assert.match(swContent, /addEventListener\(['"]activate['"]/, 'sw.js must handle activate event');
assert.match(swContent, /addEventListener\(['"]fetch['"]/, 'sw.js must handle fetch event');
assert.match(swContent, /skipWaiting\(\)/, 'sw.js must call skipWaiting() on install');
assert.match(swContent, /clients\.claim\(\)/, 'sw.js must call clients.claim() on activate');
console.log('  ✓ Service Worker lifecycle handlers (install, activate, fetch, claim) verified');

// 3. Verify Pre-cached Shell Assets
assert.match(swContent, /\/images\/placeholder\.svg/, 'sw.js must pre-cache placeholder.svg');
assert.match(swContent, /\/draco\/gltf\/draco_decoder\.wasm/, 'sw.js must pre-cache draco_decoder.wasm');
assert.match(swContent, /\/draco\/gltf\/draco_decoder_gltf\.wasm/, 'sw.js must pre-cache draco_decoder_gltf.wasm');
console.log('  ✓ Pre-cached static fallback assets and Draco decoders verified');

// 4. Verify Critical Safety Guards (Origin, Inertia, Auth, CSRF, Dynamic APIs)
assert.match(swContent, /request\.method !== 'GET'/, 'sw.js must ignore non-GET mutating requests');
assert.match(swContent, /url\.origin !== self\.location\.origin/, 'sw.js must only intercept same-origin static assets');
assert.match(swContent, /isNavigation = request\.mode === 'navigate'/, 'sw.js must identify HTML navigation');
assert.match(swContent, /x-inertia/, 'sw.js must check for X-Inertia header to protect dynamic props');
assert.match(swContent, /\/api\//, 'sw.js must bypass /api/ routes');
assert.match(swContent, /\/webhooks\//, 'sw.js must bypass /webhooks/ routes');
assert.match(swContent, /\/login/, 'sw.js must bypass /login route');
assert.match(swContent, /\/logout/, 'sw.js must bypass /logout route');
console.log('  ✓ Critical safety guards (same-origin, Inertia bypass, CSRF/session protection, API exclusion) verified');

// 5. Verify Cache-First for Immutable Assets
assert.match(swContent, /\/build\/assets\//, 'sw.js must target hashed /build/assets/ with cache-first strategy');
assert.match(swContent, /\/draco\//, 'sw.js must target /draco/ static decoders');
assert.match(swContent, /\/images\/placeholder\.svg/, 'sw.js must fallback to placeholder.svg on failed image fetches');
assert.match(swContent, /Response\(svgFallback/, 'sw.js must provide resilient inline SVG fallback if placeholder is missing');
console.log('  ✓ Cache-First static asset routing and offline image fallback verified');

// 6. Verify Service Worker Registration in resources/js/app.jsx
assert.ok(fs.existsSync(appJsxPath), 'resources/js/app.jsx must exist');
const appJsxContent = fs.readFileSync(appJsxPath, 'utf8');
assert.match(appJsxContent, /serviceWorker['"] in navigator/, 'app.jsx must guard SW registration by navigator check');
assert.match(appJsxContent, /register\(['"]\/sw\.js['"]/, 'app.jsx must register /sw.js');
assert.match(appJsxContent, /import\.meta\.env\.PROD/, 'app.jsx must guard SW registration to production environment');
assert.match(appJsxContent, /document\.readyState === 'complete'/, 'app.jsx must handle late script execution when readyState is complete');
console.log('  ✓ app.jsx production-guarded registration verified');

// 7. Verify vercel.json routing
assert.ok(fs.existsSync(vercelJsonPath), 'vercel.json must exist');
const vercelContent = fs.readFileSync(vercelJsonPath, 'utf8');
const vercelConfig = JSON.parse(vercelContent);
const routes = vercelConfig.routes || [];

const swRoute = routes.find((r) => r.src === '/sw.js');
assert.ok(swRoute, 'vercel.json must contain a dedicated route for /sw.js');
assert.equal(swRoute.dest, '/public/sw.js');
assert.match(swRoute.headers['cache-control'], /must-revalidate|no-cache|max-age=0/, 'sw.js route must not be cached aggressively by CDN');

const dracoRoute = routes.find((r) => r.src === '/draco/(.*)');
assert.ok(dracoRoute, 'vercel.json must contain a dedicated route for /draco/(.*)');
assert.equal(dracoRoute.dest, '/public/draco/$1');
assert.match(dracoRoute.headers['cache-control'], /immutable/, 'draco decoders must have immutable cache header');
console.log('  ✓ vercel.json /sw.js and /draco/(.*) edge routes verified');

console.log('\n[PASS] ALL BATCH 5 SERVICE WORKER TESTS PASSED DETERMINISTICALLY!\n');
