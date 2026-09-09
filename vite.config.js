import { defineConfig } from 'vite';
import laravel from 'laravel-vite-plugin';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
    resolve: {
        alias: {
            '@': path.resolve(__dirname, 'resources/js'),
        },
    },
    plugins: [
        laravel({
            input: ['resources/css/app.css', 'resources/js/app.jsx'],
            refresh: true,
        }),
        react(),
    ],
    build: {
        chunkSizeWarningLimit: 900,
        rollupOptions: {
            output: {
                manualChunks(id) {
                    const normalizedId = id.replace(/\\/g, '/');

                    if (
                        normalizedId.includes('@react-three/drei') ||
                        normalizedId.includes('three-stdlib') ||
                        normalizedId.includes('troika-three-text') ||
                        normalizedId.includes('troika-three-utils')
                    ) {
                        return 'react-three-drei';
                    }
                    if (normalizedId.includes('/three/examples/')) {
                        return 'three-examples';
                    }
                    if (
                        normalizedId.includes('@react-three/fiber') ||
                        normalizedId.includes('/three/') ||
                        normalizedId.includes('its-fine') ||
                        normalizedId.includes('suspend-react')
                    ) {
                        return 'react-three-core';
                    }
                    if (
                        normalizedId.includes('node_modules/recharts') ||
                        normalizedId.includes('node_modules/victory-vendor') ||
                        normalizedId.includes('node_modules/d3-') ||
                        normalizedId.includes('node_modules/@reduxjs/toolkit') ||
                        normalizedId.includes('node_modules/react-redux') ||
                        normalizedId.includes('node_modules/reselect')
                    ) {
                        return 'vendor-recharts';
                    }
                    if (normalizedId.includes('node_modules/framer-motion')) {
                        return 'vendor-framer-motion';
                    }
                    if (normalizedId.includes('node_modules/@xenova/transformers')) {
                        return 'vendor-transformers';
                    }
                    if (normalizedId.includes('node_modules/lucide-react')) {
                        return 'vendor-lucide';
                    }
                    if (
                        normalizedId.includes('node_modules/react/') ||
                        normalizedId.includes('node_modules/react-dom/') ||
                        normalizedId.includes('node_modules/use-sync-external-store/') ||
                        normalizedId.includes('node_modules/scheduler/') ||
                        normalizedId.includes('vite/preload-helper')
                    ) {
                        return 'vendor-react';
                    }
                    if (normalizedId.includes('node_modules/@inertiajs')) {
                        return 'vendor-inertia';
                    }
                    if (normalizedId.includes('node_modules/@headlessui')) {
                        return 'vendor-headlessui';
                    }
                    if (normalizedId.includes('node_modules/@sentry')) {
                        return 'vendor-sentry';
                    }
                    if (normalizedId.includes('node_modules/@vladmandic/face-api')) {
                        return 'vendor-face-api';
                    }
                    if (normalizedId.includes('node_modules/leaflet')) {
                        return 'vendor-leaflet';
                    }
                    if (normalizedId.includes('node_modules/axios')) {
                        return 'vendor-axios';
                    }
                    if (normalizedId.includes('node_modules/laravel-echo') || normalizedId.includes('node_modules/pusher-js')) {
                        return 'vendor-echo';
                    }
                    if (normalizedId.includes('node_modules/emoji-picker-react')) {
                        return 'vendor-emoji';
                    }
                    if (normalizedId.includes('node_modules/@gradio')) {
                        return 'vendor-gradio';
                    }
                },
            },
        },
    },
});
