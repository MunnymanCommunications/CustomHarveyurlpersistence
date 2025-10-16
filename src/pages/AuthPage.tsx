import { getSupabase } from '../lib/supabaseClient.ts';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { useTheme } from '../contexts/ThemeContext.tsx';

export default function AuthPage() {
    const supabase = getSupabase();
    const { theme } = useTheme();

    return (
        <div className="min-h-screen flex items-center justify-center bg-base-light dark:bg-dark-base-light p-4">
            <div className="w-full max-w-md">
                <header className="text-center mb-8">
                    <h1 className="text-4xl font-bold text-text-primary dark:text-dark-text-primary">Welcome Back</h1>
                    <p className="text-text-secondary dark:text-dark-text-secondary mt-2">Sign in to access your AI assistants.</p>
                </header>
                <div className="glassmorphic p-8 rounded-2xl shadow-xl">
                     <Auth
                        supabaseClient={supabase}
                        appearance={{ theme: ThemeSupa }}
                        providers={['google', 'github']}
                        theme={theme}
                     />
                </div>
            </div>
        </div>
    );
}