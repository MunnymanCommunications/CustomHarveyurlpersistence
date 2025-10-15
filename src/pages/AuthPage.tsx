import React from 'react';
import { getSupabase } from '../lib/supabaseClient.ts';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';

export default function AuthPage() {
    const supabase = getSupabase();

    return (
        <div className="min-h-screen flex items-center justify-center bg-base-light p-4">
            <div className="w-full max-w-md">
                <header className="text-center mb-8">
                    <h1 className="text-4xl font-bold text-text-primary">Welcome Back</h1>
                    <p className="text-text-secondary mt-2">Sign in to access your AI assistants.</p>
                </header>
                <div className="glassmorphic p-8 rounded-2xl shadow-xl">
                     <Auth
                        supabaseClient={supabase}
                        appearance={{ theme: ThemeSupa }}
                        providers={['google', 'github']}
                        theme="light"
                     />
                </div>
            </div>
        </div>
    );
}
