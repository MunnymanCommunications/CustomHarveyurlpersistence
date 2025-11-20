import { useState, useEffect } from 'react';
import { getSupabase, SUPABASE_CONFIG_ERROR } from './lib/supabaseClient.ts';
import type { Session } from '@supabase/supabase-js';
import { Icon } from './components/Icon.tsx';
import { SubscriptionProvider } from './contexts/SubscriptionContext.tsx';
import AppContent from './AppContent.tsx';

const ConfigurationErrorScreen = ({ message }: { message: string }) => (
    <div className="flex flex-col items-center justify-center h-screen text-center p-4 bg-base-light dark:bg-dark-base-light">
        <Icon name="error" className="w-16 h-16 text-danger mb-4" />
        <h1 className="text-2xl font-bold text-text-primary dark:text-dark-text-primary">Configuration Error</h1>
        <p className="text-text-secondary dark:text-dark-text-secondary mt-2 max-w-lg">
            The application cannot start because it's missing essential environment variables.
        </p>
        <div className="mt-4 text-left bg-base-medium dark:bg-dark-base-medium p-4 rounded-lg max-w-lg w-full font-mono text-sm text-danger">
            <strong>Error:</strong> {message}
        </div>
        <p className="text-text-secondary dark:text-dark-text-secondary mt-4 max-w-lg">
            Please ensure you have set the <strong>VITE_SUPABASE_URL</strong> and <strong>VITE_SUPABASE_ANON_KEY</strong> variables in your deployment environment (e.g., Coolify, Vercel, Netlify).
        </p>
    </div>
);


export default function App() {
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);

    // Immediately check for configuration errors. If found, render the error screen and stop.
    if (SUPABASE_CONFIG_ERROR) {
        return <ConfigurationErrorScreen message={SUPABASE_CONFIG_ERROR} />;
    }

    useEffect(() => {
        const supabase = getSupabase();
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setLoading(false);
        }).catch(err => {
            console.error("Error getting session:", err);
            setLoading(false);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            if (_event === 'SIGNED_OUT') {
                window.location.hash = '#/auth';
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <img src="/favicon.svg" alt="Loading..." className="w-24 h-24 animate-pulse" />
            </div>
        );
    }

    return (
        <SubscriptionProvider session={session}>
            <AppContent session={session} />
        </SubscriptionProvider>
    );
}