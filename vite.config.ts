import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: 'index.html',
    },
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