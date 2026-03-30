import { defineConfig } from 'vite';
import laravel from 'laravel-vite-plugin';
import react from '@vitejs/plugin-react';

export default defineConfig({
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

                    if (
                        id.includes('@react-three/fiber') ||
                        id.includes('/three/') ||
                        id.includes('\\three\\')
                    ) {
                        return 'react-three-core';
                    }
                },
            },
        },
    },
});
