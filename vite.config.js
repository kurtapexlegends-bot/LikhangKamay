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
                    if (id.includes('@react-three/drei') || id.includes('three-stdlib')) {
                        return 'react-three-drei';
                    }
                    if (id.includes('/three/examples/') || id.includes('\\three\\examples\\')) {
                        return 'three-examples';
                    }
                    if (id.includes('@react-three/fiber') || id.includes('/three/') || id.includes('\\three\\')) {
                        return 'react-three-core';
                    }
                    if (id.includes('node_modules/recharts')) {
                        return 'vendor-recharts';
                    }
                    if (id.includes('node_modules/framer-motion')) {
                        return 'vendor-framer-motion';
                    }
                    if (id.includes('node_modules/@xenova/transformers')) {
                        return 'vendor-transformers';
                    }
                    if (id.includes('node_modules/@supabase')) {
                        return 'vendor-supabase';
                    }
                    if (id.includes('node_modules/lucide-react')) {
                        return 'vendor-lucide';
                    }
                    if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/')) {
                        return 'vendor-react';
                    }
                    if (id.includes('node_modules/@inertiajs')) {
                        return 'vendor-inertia';
                    }
                    if (id.includes('node_modules/@headlessui')) {
                        return 'vendor-headlessui';
                    }
                    if (id.includes('node_modules/@sentry')) {
                        return 'vendor-sentry';
                    }
                    if (id.includes('node_modules/emoji-picker-react')) {
                        return 'vendor-emoji';
                    }
                    if (id.includes('node_modules/@gradio')) {
                        return 'vendor-gradio';
                    }
                },
                experimentalMinChunkSize: 10000,
            },
        },
    },
});
