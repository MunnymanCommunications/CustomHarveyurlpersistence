import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseInstance: SupabaseClient | null = null;

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

// Export an error message if the environment variables are not set.
// This allows the main App component to check for this error and display a friendly message
// instead of the whole app crashing with a white screen.
export let SUPABASE_CONFIG_ERROR: string | null = null;

if (!supabaseUrl || supabaseUrl === 'undefined' || !supabaseAnonKey || supabaseAnonKey === 'undefined') {
    SUPABASE_CONFIG_ERROR = "Supabase URL or Anon Key is missing. Check your environment variables.";
}

export const getSupabase = (): SupabaseClient => {
    // If there was a config error on startup, prevent any part of the app from
    // trying to use Supabase and throw a clear error for developers.
    if (SUPABASE_CONFIG_ERROR) {
        throw new Error(SUPABASE_CONFIG_ERROR);
    }
    
    if (supabaseInstance) {
        return supabaseInstance;
    }
    // We can be sure supabaseUrl and supabaseAnonKey are defined here because of the check above.
    supabaseInstance = createClient(supabaseUrl!, supabaseAnonKey!);
    return supabaseInstance;
};