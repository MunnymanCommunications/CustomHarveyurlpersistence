import { useState, useEffect } from 'react';
import { getSupabase } from './lib/supabaseClient.ts';
import type { Session } from '@supabase/supabase-js';
import type { Profile } from './types.ts';
import { MEMORY_VAULT_DEFAULTS, HARVEY_DEFAULTS } from './constants.ts';
import { useSubscription } from './contexts/SubscriptionContext.tsx';
import CelebrationModal from './components/CelebrationModal.tsx';

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

    // Check for voice shortcut (deep link for iOS Shortcuts)
    if (hash.match(/^#\/voice\/([0-9a-fA-F-]+)$/)) {
        const match = hash.match(/^#\/voice\/([0-9a-fA-F-]+)$/);
        if (match && match[1]) {
            return { path: 'voice_shortcut', id: match[1] };
        }
    }

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

interface AppContentProps {
    session: Session | null;
}

export default function AppContent({ session }: AppContentProps) {
    const [profile, setProfile] = useState<Profile | null>(null);
    const [route, setRoute] = useState(parseHash());
    const [vaultCheckComplete, setVaultCheckComplete] = useState(false);
    const [harveyId, setHarveyId] = useState<string | null>(null);

    const {
        shouldShowFirstMemoryCongrats,
        shouldShowUpgradePrompt,
        markFirstMemoryCongrats,
        markUpgradePromptShown,
    } = useSubscription();

    const [showCongrats, setShowCongrats] = useState(false);
    const [showUpgrade, setShowUpgrade] = useState(false);

    // Show congratulations modal when appropriate
    useEffect(() => {
        if (shouldShowFirstMemoryCongrats && !showCongrats) {
            setShowCongrats(true);
        }
    }, [shouldShowFirstMemoryCongrats]);

    // Show upgrade prompt when appropriate
    useEffect(() => {
        if (shouldShowUpgradePrompt && !showUpgrade) {
            setShowUpgrade(true);
        }
    }, [shouldShowUpgradePrompt]);

    useEffect(() => {
        if (session && !vaultCheckComplete) {
            const supabase = getSupabase();
            const fetchProfileAndCreateDefaults = async () => {
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

                    // Check for and create Harvey if it doesn't exist
                    const { data: harvey, error: harveyError } = await supabase
                        .from('assistants')
                        .select('id')
                        .eq('user_id', session.user.id)
                        .eq('name', HARVEY_DEFAULTS.name)
                        .limit(1);

                    if (harveyError) {
                        console.error("Error checking for Harvey:", harveyError);
                    } else if (harvey.length === 0) {
                        const { data: newHarvey, error: createError } = await supabase
                            .from('assistants')
                            .insert({
                                ...HARVEY_DEFAULTS,
                                user_id: session.user.id,
                                author_name: data.username || 'User',
                            })
                            .select('id')
                            .single();

                        if (createError) {
                            console.error("Failed to create Harvey:", createError);
                        } else if (newHarvey) {
                            setHarveyId(newHarvey.id);
                        }
                    } else if (harvey.length > 0) {
                        setHarveyId(harvey[0].id);
                    }
                }

                setVaultCheckComplete(true);
            };
            fetchProfileAndCreateDefaults();
        } else if (!session) {
            setProfile(null);
            setVaultCheckComplete(false);
            setHarveyId(null);
        }
    }, [session, vaultCheckComplete]);

    useEffect(() => {
        const handleHashChange = () => setRoute(parseHash());
        window.addEventListener('hashchange', handleHashChange);
        return () => window.removeEventListener('hashchange', handleHashChange);
    }, []);

    const handleAssistantCreated = (assistantId: string) => {
        window.location.hash = `#/assistant/${assistantId}`;
    };

    const handleCongratsClose = () => {
        setShowCongrats(false);
        markFirstMemoryCongrats();
    };

    const handleUpgradeClose = () => {
        setShowUpgrade(false);
        markUpgradePromptShown();
    };

    if (route.path === 'public_assistant') {
        return <PublicAssistantLayout assistantId={route.id!} />;
    }

    if (route.path === 'upgrade') {
        return (
            <>
                <UpgradePage />
                <CelebrationModal
                    isOpen={showCongrats}
                    onClose={handleCongratsClose}
                    title="🎉 Congratulations!"
                    message="You just added your first memory! Your AI assistant will now remember this information for future conversations."
                    type="success"
                />
                <CelebrationModal
                    isOpen={showUpgrade}
                    onClose={handleUpgradeClose}
                    title="You've hit the limit!"
                    message="You've reached the maximum of 5 memories on the free plan. Upgrade to Pro for unlimited memories and assistants!"
                    type="upgrade"
                />
            </>
        );
    }

    // Voice shortcut route - redirects directly to Harvey in voice mode
    if (route.path === 'voice_shortcut' && harveyId) {
        // Redirect to Harvey with auto-start parameter
        window.location.hash = `#/assistant/${route.id || harveyId}?autostart=true`;
        return null;
    }

    if (!session) {
        if (route.path !== 'auth') {
            window.location.hash = '#/auth';
        }
        return <AuthPage />;
    }

    if (route.path === 'auth') {
        window.location.hash = '#/';
        return <DashboardPage />;
    }

    switch (route.path) {
        case 'new_assistant':
            return (
                <>
                    <SettingsPage onComplete={handleAssistantCreated} />
                    <CelebrationModal
                        isOpen={showCongrats}
                        onClose={handleCongratsClose}
                        title="🎉 Congratulations!"
                        message="You just added your first memory! Your AI assistant will now remember this information for future conversations."
                        type="success"
                    />
                    <CelebrationModal
                        isOpen={showUpgrade}
                        onClose={handleUpgradeClose}
                        title="You've hit the limit!"
                        message="You've reached the maximum of 5 memories on the free plan. Upgrade to Pro for unlimited memories and assistants!"
                        type="upgrade"
                    />
                </>
            );
        case 'assistant':
            return (
                <>
                    <AssistantLayout assistantId={route.id!} previewMode={!!route.preview} />
                    <CelebrationModal
                        isOpen={showCongrats}
                        onClose={handleCongratsClose}
                        title="🎉 Congratulations!"
                        message="You just added your first memory! Your AI assistant will now remember this information for future conversations."
                        type="success"
                    />
                    <CelebrationModal
                        isOpen={showUpgrade}
                        onClose={handleUpgradeClose}
                        title="You've hit the limit!"
                        message="You've reached the maximum of 5 memories on the free plan. Upgrade to Pro for unlimited memories and assistants!"
                        type="upgrade"
                    />
                </>
            );
        case 'admin':
            return (
                <>
                    {profile?.role === 'admin' ? <AdminPage /> : <DashboardPage />}
                    <CelebrationModal
                        isOpen={showCongrats}
                        onClose={handleCongratsClose}
                        title="🎉 Congratulations!"
                        message="You just added your first memory! Your AI assistant will now remember this information for future conversations."
                        type="success"
                    />
                    <CelebrationModal
                        isOpen={showUpgrade}
                        onClose={handleUpgradeClose}
                        title="You've hit the limit!"
                        message="You've reached the maximum of 5 memories on the free plan. Upgrade to Pro for unlimited memories and assistants!"
                        type="upgrade"
                    />
                </>
            );
        case 'dashboard':
        default:
            return (
                <>
                    <DashboardPage />
                    <CelebrationModal
                        isOpen={showCongrats}
                        onClose={handleCongratsClose}
                        title="🎉 Congratulations!"
                        message="You just added your first memory! Your AI assistant will now remember this information for future conversations."
                        type="success"
                    />
                    <CelebrationModal
                        isOpen={showUpgrade}
                        onClose={handleUpgradeClose}
                        title="You've hit the limit!"
                        message="You've reached the maximum of 5 memories on the free plan. Upgrade to Pro for unlimited memories and assistants!"
                        type="upgrade"
                    />
                </>
            );
    }
}
