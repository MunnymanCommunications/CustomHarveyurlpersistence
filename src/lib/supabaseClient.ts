import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseInstance: SupabaseClient | null = null;

// FIX: Use process.env, which is populated by Vite's `define` config, to avoid typing issues with import.meta.env.
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

// FIX: Added a check for the literal string 'undefined' which can occur if env vars are not set at build time.
if (!supabaseUrl || supabaseUrl === 'undefined' || !supabaseAnonKey || supabaseAnonKey === 'undefined') {
    const errorContainer = document.getElementById('root');
    if (errorContainer) {
        errorContainer.innerHTML = `
            <div style="padding: 2rem; text-align: center; font-family: sans-serif; color: #333;">
                <h1 style="color: #c00;">Configuration Error</h1>
                <p>Supabase environment variables (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY) are missing.</p>
                <p>Please ensure they are set in your deployment environment and prefixed with 'VITE_'.</p>
            </div>
        `;
    }
    throw new Error("Supabase URL or Anon Key is missing. Check your environment variables.");
}

export const getSupabase = (): SupabaseClient => {
    if (supabaseInstance) {
        return supabaseInstance;
    }
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey);
    return supabaseInstance;
};