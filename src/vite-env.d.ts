// FIX: Removed the reference to "vite/client" to prevent type definition conflicts
// and resolve the "file not found" error. The project uses Vite's `define`
// feature to handle environment variables via `process.env`.

// FIX: To avoid "Cannot redeclare block-scoped variable 'process'" errors,
// this file is converted to a module by adding `export {}`. The `declare global`
// block is used to augment the global scope safely, preventing conflicts with
// other declarations of `process` (e.g., from @types/node).
declare global {
  var process: {
    env: {
      [key: string]: string | undefined;
    };
  };
}

export {};
