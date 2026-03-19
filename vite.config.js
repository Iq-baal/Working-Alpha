import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
export default defineConfig({
    plugins: [
        react(),
        nodePolyfills({
            include: ['buffer', 'process', 'stream', 'events', 'util', 'crypto', 'http', 'https'],
            globals: {
                Buffer: true,
                global: true,
                process: true,
            },
        }),
    ],
    define: {
        'process.env': {},
    },
    build: {
        target: 'esnext',
        rollupOptions: {
            output: {
                manualChunks: {
                    solana: ['@solana/web3.js', '@solana/spl-token'],
                    vendor: ['react', 'react-dom', 'framer-motion'],
                },
            },
        },
    },
    resolve: {
        alias: {
            crypto: 'crypto-browserify',
            stream: 'stream-browserify',
            http: 'stream-http',
            https: 'https-browserify',
            'end-of-stream': 'end-of-stream',
        },
    },
});
