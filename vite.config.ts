import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// These are the client-side dependencies from your import map.
// We will tell Vite to not bundle them.
const externalPackages = [
  'react',
  'react-dom',
  'react-dom/client',
  '@google/genai',
  '@supabase/supabase-js',
  '@supabase/auth-ui-react',
  '@supabase/auth-ui-shared',
  'ogl'
];

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // Exclude these packages from Vite's dependency pre-bundling during development.
  optimizeDeps: {
    exclude: externalPackages
  },
  build: {
    rollupOptions: {
      input: 'index.html',
      // Treat these packages as external during the production build.
      external: externalPackages
    },
  },
  // This section correctly maps your VITE_ prefixed env variables
  // to process.env for use in your client-side code. No changes needed here.
  define: {
    'process.env.API_KEY': JSON.stringify(process.env.VITE_API_KEY),
    'process.env.SUPABASE_URL': JSON.stringify(process.env.VITE_SUPABASE_URL),
    'process.env.SUPABASE_ANON_KEY': JSON.stringify(process.env.VITE_SUPABASE_ANON_KEY),
  },
})
