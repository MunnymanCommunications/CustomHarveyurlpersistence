import React, { useState } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function AuthPage() {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [message, setMessage] = useState('');

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    const { error } = isSignUp
      ? await supabase.auth.signUp({ email, password })
      : await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setMessage(error.message);
    } else {
      if(isSignUp) {
        setMessage('Success! Check your email for the verification link.');
      }
      // Login is handled by the onAuthStateChange listener in App.tsx
    }
    setLoading(false);
  };

  return (
     <div className="flex flex-col items-center justify-center min-h-screen text-center w-full p-4">
      <div className="max-w-md w-full glassmorphic p-8 rounded-2xl">
        <h1 className="text-4xl font-bold text-text-primary mb-2">
          {isSignUp ? 'Create an Account' : 'Welcome Back'}
        </h1>
        <p className="text-text-secondary mb-8">
          {isSignUp ? 'Sign up to create and save your assistants.' : 'Sign in to access your dashboard.'}
        </p>
        <form onSubmit={handleAuth} className="space-y-4">
          <input
            className="settings-input"
            type="email"
            placeholder="Your email"
            value={email}
            required
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            className="settings-input"
            type="password"
            placeholder="Your password"
            value={password}
            required
            onChange={(e) => setPassword(e.target.value)}
          />
           {message && <p className="text-sm text-center text-red-500">{message}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-brand-secondary-glow to-brand-tertiary-glow text-on-brand font-bold py-3 px-6 rounded-full flex items-center justify-center transition-all duration-300 shadow-lg transform hover:scale-105 disabled:opacity-50"
          >
            {loading ? 'Loading...' : isSignUp ? 'Sign Up' : 'Sign In'}
          </button>
        </form>
        <button
          onClick={() => setIsSignUp(!isSignUp)}
          className="text-sm text-brand-secondary-glow hover:underline mt-6"
        >
          {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
        </button>
      </div>
    </div>
  );
}
