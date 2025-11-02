/// <reference types="vite/client" />

// FIX: Wrap `process` declaration in `declare global` to avoid redeclaration errors.
// This ensures that the type declaration merges with the global scope instead of
// creating a new variable in the file's scope, which resolves conflicts with
// other global type definitions (e.g., from @types/node).
declare global {
  var process: {
    env: {
      [key: string]: string | undefined
    }
  };
}

// FIX: Add `export {}` to ensure this file is treated as a module, which is
// required for global augmentations. This resolves the error about augmentations
// needing to be in a module.
export {};
