import '../css/app.css';
import './bootstrap';
import { ToastProvider } from '@/Components/ToastContext';

import { createInertiaApp } from '@inertiajs/react';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import { createRoot } from 'react-dom/client';
import ErrorBoundary from '@/Components/ErrorBoundary';
import { AnimatePresence } from 'framer-motion';

import * as Sentry from "@sentry/react";

const appName = import.meta.env.VITE_APP_NAME || 'Laravel';

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN_PUBLIC,
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration(),
  ],
  // Performance Monitoring
  tracesSampleRate: 1.0, 
  // Session Replay
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
});

createInertiaApp({
    title: (title) => `${title} - ${appName}`,
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
