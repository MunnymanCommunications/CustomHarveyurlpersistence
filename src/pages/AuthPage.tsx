import React from 'react';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { getSupabase } from '../lib/supabaseClient';

export default function AuthPage() {
  const supabase = getSupabase();

  return (
    <div className="min-h-screen flex items-center justify-center bg-base-light p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
            <h1 className="text-5xl font-bold text-text-primary">Welcome</h1>
            <p className="text-xl text-text-secondary mt-2">Sign in to create your AI Assistant</p>
        </div>
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
