import React, { useState, useEffect } from 'react';
import { supabase } from './lib/supabaseClient';
import type { Session } from '@supabase/supabase-js';

import AuthPage from './pages/AuthPage';
import DashboardPage from './pages/DashboardPage';
import SettingsPage from './pages/SettingsPage';
import AssistantLayout from './layouts/AssistantLayout';
import { Icon } from './components/Icon';

const parseHash = () => {
    const hash = window.location.hash;
    if (!hash || hash === '#/') return { path: 'dashboard' };
    if (hash === '#/auth') return { path: 'auth' };
    if (hash === '#/assistant/new') return { path: 'new_assistant' };
    
    const assistantMatch = hash.match(/^#\/assistant\/(.+)$/);
    if (assistantMatch && assistantMatch[1]) {
        return { path: 'assistant', id: assistantMatch[1] };
    }
    
    // Redirect invalid hashes to dashboard
    if (hash !== '#/') {
      window.location.hash = '#/';
    }
    return { path: 'dashboard' };
};

export default function App() {
    const [session, setSession] = useState<Session | null>(null);
    const [route, setRoute] = useState(parseHash());
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setLoading(false);
        }).catch(err => {
            // Also stop loading on error, so the user isn't stuck.
            console.error("Error getting session:", err);
            setLoading(false);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            // If user logs in/out, redirect to appropriate page
            if (_event === 'SIGNED_IN') window.location.hash = '#/';
            if (_event === 'SIGNED_OUT') window.location.hash = '#/auth';
        });

        return () => subscription.unsubscribe();
    }, []);

    useEffect(() => {
        const handleHashChange = () => setRoute(parseHash());
        window.addEventListener('hashchange', handleHashChange);
        return () => window.removeEventListener('hashchange', handleHashChange);
    }, []);

    const handleAssistantCreated = (assistantId: string) => {
        window.location.hash = `#/assistant/${assistantId}`;
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <Icon name="loader" className="w-12 h-12 animate-spin text-brand-secondary-glow"/>
            </div>
        );
    }
    
    if (!session) {
        return <AuthPage />;
    }

    switch (route.path) {
        case 'new_assistant':
            return <SettingsPage onComplete={handleAssistantCreated} />;
        case 'assistant':
            return <AssistantLayout assistantId={route.id!} />;
        case 'dashboard':
        default:
            return <DashboardPage />;
    }
}