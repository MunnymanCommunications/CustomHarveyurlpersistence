import { useState, useEffect } from 'react';
import { getSupabase } from './lib/supabaseClient.ts';
import type { Session } from '@supabase/supabase-js';
import type { Profile } from './types.ts';
import { logEvent } from './lib/logger.ts';
import { MEMORY_VAULT_DEFAULTS } from './constants.ts';

import AuthPage from './pages/AuthPage.tsx';
import DashboardPage from './pages/DashboardPage.tsx';
import SettingsPage from './pages/SettingsPage.tsx';
import AssistantLayout from './layouts/AssistantLayout.tsx';
import PublicAssistantLayout from './layouts/PublicAssistantLayout.tsx';
import AdminPage from './pages/AdminPage.tsx';
import { Icon } from './components/Icon.tsx';

const parseHash = () => {
    const hash = window.location.hash;
    if (!hash || hash === '#/') return { path: 'dashboard' };
    if (hash === '#/auth') return { path: 'auth' };
    if (hash === '#/admin') return { path: 'admin' };
    if (hash === '#/assistant/new') return { path: 'new_assistant' };

    // Use a more specific regex for UUIDs to ensure correct matching
    const publicMatch = hash.match(/^#\/public\/([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})$/);
    if (publicMatch && publicMatch[1]) {
        return { path: 'public_assistant', id: publicMatch[1] };
    }

    const previewMatch = hash.match(/^#\/assistant\/preview\/(.+)$/);
    if (previewMatch && previewMatch[1]) {
        return { path: 'assistant', id: previewMatch[1], preview: true };
    }
    
    const assistantMatch = hash.match(/^#\/assistant\/(.+)$/);
    if (assistantMatch && assistantMatch[1]) {
        return { path: 'assistant', id: assistantMatch[1], preview: false };
    }
    
    if (hash !== '#/') {
      window.location.hash = '#/';
    }
    return { path: 'dashboard' };
};

export default function App() {
    const [session, setSession] = useState<Session | null>(null);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [route, setRoute] = useState(parseHash());
    const [loading, setLoading] = useState(true);

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
            if (_event === 'SIGNED_IN') {
                window.location.hash = '#/';
                logEvent('USER_SIGNED_IN');
            }
            if (_event === 'SIGNED_OUT') {
                window.location.hash = '#/auth';
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    useEffect(() => {
        if (session) {
            const supabase = getSupabase();
            const fetchProfile = async () => {
                const { data, error } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', session.user.id)
                    .single();
                
                if (error) {
                    console.error('Error fetching profile:', error);
                } else {
                    setProfile(data as Profile);
                    
                    // Check for and create Memory Vault if it doesn't exist
                    const { data: vault, error: vaultError } = await supabase
                        .from('assistants')
                        .select('id')
                        .eq('user_id', session.user.id)
                        .eq('name', MEMORY_VAULT_DEFAULTS.name)
                        .limit(1);

                    if (vaultError) {
                        console.error("Error checking for Memory Vault:", vaultError);
                    } else if (vault.length === 0) {
                        const { error: createError } = await supabase
                            .from('assistants')
                            .insert({
                                ...MEMORY_VAULT_DEFAULTS,
                                user_id: session.user.id,
                                author_name: data.username || 'System',
                            });
                        if (createError) {
                            console.error("Failed to create Memory Vault:", createError);
                        } else {
                            logEvent('MEMORY_VAULT_CREATED');
                        }
                    }
                }
            };
            fetchProfile();
        } else {
            setProfile(null);
        }
    }, [session]);

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
    
    if (route.path === 'public_assistant') {
        return <PublicAssistantLayout assistantId={route.id!} />;
    }

    if (!session) {
        return <AuthPage />;
    }

    switch (route.path) {
        case 'new_assistant':
            return <SettingsPage onComplete={handleAssistantCreated} />;
        case 'assistant':
            return <AssistantLayout assistantId={route.id!} previewMode={!!route.preview} />;
        case 'admin':
            return profile?.role === 'admin' ? <AdminPage /> : <DashboardPage />;
        case 'dashboard':
        default:
            return <DashboardPage />;
    }
}