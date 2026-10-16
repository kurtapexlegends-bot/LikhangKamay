import '../css/app.css';
import './bootstrap';
import { ToastProvider } from '@/Components/ToastContext';

import { createInertiaApp, router } from '@inertiajs/react';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import { createRoot } from 'react-dom/client';
import ErrorBoundary from '@/Components/ErrorBoundary';
import { AnimatePresence } from 'framer-motion';
import { scrollToFirstError } from '@/lib/formHelpers';

import NetworkStatusBanner from '@/Components/Common/NetworkStatusBanner';

// Global listener to automatically smooth-scroll to first invalid input on validation failures
router.on('error', (event) => {
    const errors = event?.detail?.errors || event?.errors || null;
    scrollToFirstError(errors);
});

// Auto-recovery from expired CSRF tokens (419) and graceful rate limit warning (429)
router.on('invalid', (event) => {
    const status = event?.detail?.response?.status;
    if (status === 419) {
        event.preventDefault();
        window.location.reload();
    } else if (status === 429) {
        event.preventDefault();
        const retryAfter = event?.detail?.response?.headers?.['retry-after'] || 60;
        window.dispatchEvent(
            new CustomEvent('app-toast', {
                detail: {
                    type: 'warning',
                    message: `Too many requests. Please wait ${retryAfter} seconds before trying again.`,
                },
            })
        );
    }
});

// Auto-recover from Vite deployment skew (stale dynamic chunk 404s after new Vercel deployments)
if (typeof window !== 'undefined') {
    window.addEventListener('vite:preloadError', (event) => {
        event.preventDefault();
        window.location.reload();
    });
}

// Mobile background wake-up session refresh
if (typeof document !== 'undefined') {
    let lastActiveTime = Date.now();
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            const idleMinutes = (Date.now() - lastActiveTime) / 60000;
            if (idleMinutes > 20) {
                if (window.axios) {
                    window.axios.get('/ping').catch(() => {});
                }
            }
            lastActiveTime = Date.now();
        } else {
            lastActiveTime = Date.now();
        }
    });
}

import * as Sentry from "@sentry/react";

const appName = import.meta.env.VITE_APP_NAME || 'LikhangKamay';

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN_PUBLIC,
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration(),
  ],
  ignoreErrors: [
    "Cannot read properties of undefined (reading 'startTime')",
    "Cannot read properties of undefined (reading 'M_ID')",
    /Cannot read properties of undefined \(reading ['"]M_ID['"]\)/,
    "reportAllChanges",
  ],
  // Performance Monitoring
  tracesSampleRate: import.meta.env.PROD ? 0.1 : 1.0,
  // Session Replay
  replaysSessionSampleRate: import.meta.env.PROD ? 0.05 : 0.1,
  replaysOnErrorSampleRate: 1.0,
});

// Suppress unhandled rejections from injected browser extension scripts (e.g. 200.js wallet probes)
if (typeof window !== 'undefined') {
    window.addEventListener('unhandledrejection', (event) => {
        const msg = event?.reason?.message || '';
        if (typeof msg === 'string' && msg.includes('M_ID')) {
            event.preventDefault();
        }
    });
}

createInertiaApp({
    title: (title) => {
        if (!title) return appName;
        return title.includes(appName) ? title : `${title} - ${appName}`;
    },
    resolve: (name) =>
        resolvePageComponent(
            `./Pages/${name}.jsx`,
            import.meta.glob('./Pages/**/*.jsx'),
        ),
    setup({ el, App, props }) {
        const root = createRoot(el);

        root.render(
            <ErrorBoundary>
                <ToastProvider>
                    <NetworkStatusBanner />
                    <AnimatePresence mode="wait" initial={false}>
                        <App {...props} />
                    </AnimatePresence>
                </ToastProvider>
            </ErrorBoundary>
        );
    },
    progress: {
        color: '#a65638',
        showSpinner: false,
    },
});

// Register Lightweight Static Shell Service Worker in production
if (typeof window !== 'undefined' && 'serviceWorker' in navigator && (import.meta.env.PROD || (typeof process !== 'undefined' && process?.env?.NODE_ENV === 'production'))) {
    const registerSW = () => {
        navigator.serviceWorker
            .register('/sw.js', { scope: '/' })
            .then((registration) => {
                setInterval(() => {
                    registration.update().catch(() => {});
                }, 60 * 60 * 1000);
            })
            .catch((err) => {
                console.debug('[SW] Service worker registration skipped:', err);
            });
    };

    if (document.readyState === 'complete') {
        registerSW();
    } else {
        window.addEventListener('load', registerSW);
    }
}
