import React, { useState } from 'react';
import { getSupabase } from '../lib/supabaseClient.ts';
import { Icon } from '../components/Icon.tsx';

export default function AuthPage() {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setError('');
    const supabase = getSupabase();
    const { error: signInError } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: window.location.origin,
      },
    });

    if (signInError) {
      setError(signInError.message);
    } else {
      setMessage('Check your email for the login link!');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-base-light p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
            <h1 className="text-5xl font-bold text-text-primary">Welcome</h1>
            <p className="text-xl text-text-secondary mt-2">Sign in to manage your AI Assistants</p>
        </div>
        
        <div className="glassmorphic p-8 rounded-2xl shadow-2xl">
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-text-primary">
                Email address
              </label>
              <div className="mt-1">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full p-3 border border-border-color rounded-md bg-white/70 focus:ring-2 focus:ring-brand-secondary-glow focus:border-transparent transition"
                  placeholder="you@example.com"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-full shadow-sm text-sm font-medium text-on-brand bg-gradient-to-r from-brand-secondary-glow to-brand-tertiary-glow hover:scale-105 transform transition-transform duration-300 disabled:opacity-50"
              >
                {loading ? <Icon name="loader" className="w-5 h-5 animate-spin" /> : 'Send Magic Link'}
              </button>
            </div>
          </form>

          {message && <p className="mt-4 text-center text-green-600">{message}</p>}
          {error && <p className="mt-4 text-center text-red-600">{error}</p>}
        </div>
        <p className="mt-8 text-center text-xs text-text-tertiary">
            <a
              href="https://harveyio.com"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-brand-secondary-glow hover:underline"
            >
              Harvey iO
            </a>
            {' '}
            - AI Assistant Platform
        </p>
      </div>
    </div>
  );
}
