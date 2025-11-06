// FIX: Removed the reference to "vite/client" to prevent type definition conflicts
// and resolve the "file not found" error. The project uses Vite's `define`
// feature to handle environment variables via `process.env`.

// FIX: To avoid "Cannot redeclare block-scoped variable 'process'" and "Subsequent
// variable declarations must have the same type" errors, this file is converted
// to a module that augments the existing global `NodeJS.ProcessEnv` interface.
// This adds type definitions for the environment variables defined in vite.config.ts
// without conflicting with the `process` type provided by @types/node.
declare global {
  namespace NodeJS {
    interface ProcessEnv {
      API_KEY: string;
      SUPABASE_URL: string;
      SUPABASE_ANON_KEY: string;
    }
  }
}

export {};
