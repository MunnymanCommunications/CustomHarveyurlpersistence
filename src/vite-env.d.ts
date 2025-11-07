// This file augments the global NodeJS namespace to add type definitions
// for the environment variables defined in vite.config.ts. This prevents
// TypeScript errors like "Cannot find name 'process'" or redeclaration conflicts.

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      API_KEY: string;
      SUPABASE_URL: string;
      SUPABASE_ANON_KEY: string;
    }
  }
}

// This export statement makes the file a module, which is required for augmentation.
export {};
