// FIX: Removed the reference to "vite/client" to prevent type definition conflicts
// and resolve the "file not found" error. The project uses Vite's `define`
// feature to handle environment variables via `process.env`.

// FIX: To avoid redeclaration errors, this file is treated as a global script
// rather than a module. The `declare var` statement makes `process` available
// globally, aligning with how Vite's `define` config replaces `process.env`.
declare var process: {
  env: {
    [key: string]: string | undefined
  }
};
