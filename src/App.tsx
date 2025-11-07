import { useState, useEffect, useRef } from 'react';
import { getSupabase, SUPABASE_CONFIG_ERROR } from './lib/supabaseClient.ts';
import type { Session } from '@supabase/supabase-js';
import type { Profile } from './types.ts';
import { MEMORY_VAULT_DEFAULTS } from './constants.ts';
import { Icon } from './components/Icon.tsx';

import AuthPage from './pages/AuthPage.tsx';
import DashboardPage from './pages/DashboardPage.tsx';
import SettingsPage from './pages/SettingsPage.tsx';
import AssistantLayout from './layouts/AssistantLayout.tsx';
import PublicAssistantLayout from './layouts/PublicAssistantLayout.tsx';
import AdminPage from './pages/AdminPage.tsx';
import UpgradePage from './pages/UpgradePage.tsx';

const parseHash = () => {
    const hash = window.location.hash;
    if (!hash || hash === '#/') return { path: 'dashboard' };
    if (hash === '#/auth') return { path: 'auth' };
    if (hash === '#/admin') return { path: 'admin' };
    if (hash === '#/assistant/new') return { path: 'new_assistant' };
    if (hash === '#/upgrade') return { path: 'upgrade' };

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
    
    return { path: 'dashboard' };
};

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
    const [profile, setProfile] = useState<Profile | null>(null);
    const [route, setRoute] = useState(parseHash());
    const [loading, setLoading] = useState(true);
    const [vaultCheckComplete, setVaultCheckComplete] = useState(false);
    const hasRedirectedToMain = useRef(false);

    // Immediately check for configuration errors. If found, render the error screen and stop.
    if (SUPABASE_CONFIG_ERROR) {
        return <ConfigurationErrorScreen message={SUPABASE_CONFIG_ERROR} />;
    }

    // Handle PWA redirect for public assistants (Safari strips hash from start_url)
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const pwaId = urlParams.get('pwa_id');

        if (pwaId) {
            // Look up the stored URL for this assistant
            const storedUrl = localStorage.getItem(`pwa_public_assistant_${pwaId}`);
            if (storedUrl) {
                // Redirect to the stored assistant URL
                window.location.href = storedUrl;
            } else {
                // Fallback: construct the URL manually
                window.location.hash = `#/public/${pwaId}`;
            }
        }
    }, []);

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
            // Only redirect to dashboard if user just signed in from the auth page
            const currentRoute = parseHash();
            if (_event === 'SIGNED_IN' && currentRoute.path === 'auth') {
                window.location.hash = '#/';
            }
            if (_event === 'SIGNED_OUT') {
                window.location.hash = '#/auth';
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    useEffect(() => {
        if (session && !vaultCheckComplete) {
            const supabase = getSupabase();
            const fetchProfileAndCreateVault = async () => {
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
                        }
                    }
                }
                // Mark the check as complete to prevent re-runs
                setVaultCheckComplete(true);
            };
            fetchProfileAndCreateVault();
        } else if (!session) {
            // Reset profile and vault check on logout
            setProfile(null);
            setVaultCheckComplete(false);
        }
    }, [session, vaultCheckComplete]);

    useEffect(() => {
        const handleHashChange = () => setRoute(parseHash());
        window.addEventListener('hashchange', handleHashChange);
        return () => window.removeEventListener('hashchange', handleHashChange);
    }, []);

    // Check for main assistant and redirect if on dashboard (only on initial load)
    useEffect(() => {
        if (session && route.path === 'dashboard' && !loading && !hasRedirectedToMain.current) {
            const mainAssistantId = localStorage.getItem('mainAssistantId');
            if (mainAssistantId) {
                hasRedirectedToMain.current = true;
                window.location.hash = `#/assistant/${mainAssistantId}`;
            }
        }
    }, [session, route.path, loading]);

    const handleAssistantCreated = (assistantId: string) => {
        window.location.hash = `#/assistant/${assistantId}`;
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen bg-base-light dark:bg-dark-base-light">
                <img src="/favicon.svg" alt="Loading..." className="w-32 h-32 animate-blink" />
            </div>
        );
    }
    
    if (route.path === 'public_assistant') {
        return <PublicAssistantLayout assistantId={route.id!} />;
    }

    if (route.path === 'upgrade') {
        return <UpgradePage />;
    }

    if (!session) {
        // Reroute to auth page if no session, unless it's a public assistant
        if (route.path !== 'auth') {
            window.location.hash = '#/auth';
        }
        return <AuthPage />;
    }

    // If session exists and user is on auth page, redirect to dashboard
    if (route.path === 'auth') {
        window.location.hash = '#/';
        return <DashboardPage />;
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