import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'EliteCardPro AI Assistant',
        short_name: 'EliteCardPro',
        start_url: '/',
        display: 'standalone',
        background_color: '#111827',
        theme_color: '#111827',
        icons: [
          {
            src: '/favicon.svg',
            sizes: '192x192 512x512',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        sourcemap: true,
        cleanupOutdatedCaches: true
      }
    }),
  ],
  base: '/',
  build: {
    sourcemap: true,
    chunkSizeWarningLimit: 2000,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
        }
      }
    }
  },
  server: {
    port: 3000,
    host: true,
    fs: {
      strict: false
    }
  },
  // FIX: Define environment variables to be replaced at build time.
  // This makes them available on `process.env` in client-side code,
  // resolving TypeScript errors with `import.meta.env` and aligning
  // with Gemini API guidelines.
  define: {
    'process.env.API_KEY': JSON.stringify(process.env.VITE_API_KEY),
    'process.env.SUPABASE_URL': JSON.stringify(process.env.VITE_SUPABASE_URL),
    'process.env.SUPABASE_ANON_KEY': JSON.stringify(process.env.VITE_SUPABASE_ANON_KEY),
  },
})
