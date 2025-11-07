import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// The list of dependencies to be loaded from the import map instead of being bundled.
// This list MUST exactly match the keys in the index.html importmap.
const externalPackages = [
  'react',
  'react-dom',
  'react-dom/client',
  '@supabase/supabase-js',
  '@google/genai',
  'ogl',
  '@supabase/auth-ui-react',
  '@supabase/auth-ui-shared',
];

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // This section correctly maps your VITE_ prefixed env variables
  // to process.env for use in your client-side code.
  define: {
    'process.env.API_KEY': JSON.stringify(process.env.VITE_API_KEY),
    'process.env.SUPABASE_URL': JSON.stringify(process.env.VITE_SUPABASE_URL),
    'process.env.SUPABASE_ANON_KEY': JSON.stringify(process.env.VITE_SUPABASE_ANON_KEY),
  },
  // Exclude packages from Vite's dependency pre-bundling in development.
  // This forces the dev server to rely on the browser's import map.
  optimizeDeps: {
    exclude: externalPackages,
  },
  build: {
    // Tell Rollup (Vite's bundler) not to bundle these packages for production.
    rollupOptions: {
      external: externalPackages,
    },
  },
})
