import { createClient } from '@supabase/supabase-js';

// These should be replaced with your actual Supabase URL and Anon Key.
// It's recommended to use environment variables for this.
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
    // A more user-friendly error message for the developer
    const errorContainer = document.getElementById('root');
    if (errorContainer) {
        errorContainer.innerHTML = `
            <div style="padding: 2rem; text-align: center; font-family: sans-serif;">
                <h1 style="color: #c00;">Configuration Error</h1>
                <p>Supabase URL and Anon Key must be provided.</p>
                <p>Please create a <code>.env</code> file in your project root with the following variables:</p>
                <pre style="background-color: #f0f0f0; padding: 1rem; border-radius: 8px; text-align: left; display: inline-block;">
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
                </pre>
            </div>
        `;
    }
    throw new Error("Supabase URL and Anon Key must be provided in environment variables.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
