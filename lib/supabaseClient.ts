import { createClient } from '@supabase/supabase-js';

// FIX: Cast window to `any` to access non-standard `process.env` properties injected at build time.
const supabaseUrl = (window as any).process.env.SUPABASE_URL!;
const supabaseAnonKey = (window as any).process.env.SUPABASE_ANON_KEY!;

// More robust check to help debug deployment issues.
if (!supabaseUrl || supabaseUrl.startsWith('%%') || !supabaseAnonKey || supabaseAnonKey.startsWith('%%')) {
    const errorContainer = document.getElementById('root');
    if (errorContainer) {
        errorContainer.innerHTML = `
            <div style="padding: 2rem; text-align: center; font-family: sans-serif; color: #333;">
                <h1 style="color: #c00;">Configuration Error</h1>
                <p>The application's environment variables are missing or were not replaced during the build process.</p>
                <p>This is usually due to a misconfiguration in the deployment service (e.g., Coolify, Vercel, Netlify).</p>
                <h3 style="margin-top: 2rem;">Troubleshooting Steps:</h3>
                <ol style="text-align: left; display: inline-block; padding-left: 2rem; list-style-position: inside;">
                    <li style="margin-bottom: 0.5rem;">Ensure <strong>SUPABASE_URL</strong>, <strong>SUPABASE_ANON_KEY</strong>, and <strong>API_KEY</strong> are set in your deployment service's environment variables.</li>
                    <li style="margin-bottom: 0.5rem;">Verify that the build command is correctly configured to replace placeholders in <code>index.html</code>.</li>
                    <li style="margin-bottom: 0.5rem;">Check your deployment build logs for any errors related to the build command (e.g., 'sed: command not found').</li>
                </ol>
            </div>
        `;
    }
    throw new Error("Supabase credentials were not properly injected during the build process. Check your deployment environment variables and build command.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);