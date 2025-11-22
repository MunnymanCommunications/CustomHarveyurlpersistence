/// <reference types="vite/client" />

// This file augments the Vite ImportMeta interface to add type definitions
// for the environment variables defined in .env files.

interface ImportMetaEnv {
  readonly VITE_API_KEY: string;
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// Legacy support for process.env (for compatibility)
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
