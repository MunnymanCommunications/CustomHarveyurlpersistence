import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseInstance: SupabaseClient | null = null;

// FIX: Use process.env to access environment variables, as import.meta.env is not available in this environment.
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    const errorContainer = document.getElementById('root');
    if (errorContainer) {
        errorContainer.innerHTML = `
            <div style="padding: 2rem; text-align: center; font-family: sans-serif; color: #333;">
                <h1 style="color: #c00;">Configuration Error</h1>
                <p>Supabase environment variables (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY) are missing.</p>
                <p>Please ensure they are set in your deployment environment or a local .env file.</p>
            </div>
        `;
    }
    throw new Error("Supabase URL or Anon Key is missing. Check your .env file or deployment variables.");
}

export const getSupabase = (): SupabaseClient => {
    if (supabaseInstance) {
        return supabaseInstance;
    }
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey);
    return supabaseInstance;
};