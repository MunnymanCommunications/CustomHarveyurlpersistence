import React, { useState, useEffect } from 'react';
import { getSupabase } from '../lib/supabaseClient.ts';
import type { Assistant, HistoryEntry } from '../types.ts';
import { useLocalStorage } from '../hooks/useLocalStorage.ts';

import { Navigation } from '../components/Navigation.tsx';
import { Icon } from '../components/Icon.tsx';

import ConversationPage from '../pages/ConversationPage.tsx';
import MemoryPage from '../pages/MemoryPage.tsx';
import HistoryPage from '../pages/HistoryPage.tsx';
import SettingsDashboardPage from '../pages/SettingsDashboardPage.tsx';

type Page = 'conversation' | 'memory' | 'history' | 'settings';

interface AssistantLayoutProps {
  assistantId: string;
}

export default function AssistantLayout({ assistantId }: AssistantLayoutProps) {
    const [assistant, setAssistant] = useState<Assistant | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [currentPage, setCurrentPage] = useState<Page>('conversation');
    
    const [history, setHistory] = useLocalStorage<HistoryEntry[]>(`assistant_history_${assistantId}`, []);

    const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
    const [isNavCollapsed, setIsNavCollapsed] = useLocalStorage('is_nav_collapsed', false);

    useEffect(() => {
        const fetchAssistant = async () => {
            const supabase = getSupabase();
            const { data, error } = await supabase
                .from('assistants')
                .select('*')
                .eq('id', assistantId)
                .single();

            if (error) {
                console.error("Error fetching assistant:", error);
                setError("Could not load assistant data.");
            } else {
                setAssistant(data as Assistant);
            }
            setLoading(false);
        };

        fetchAssistant();
    }, [assistantId]);

    const handleSaveToMemory = async (info: string) => {
        if (!assistant) return;
        const currentKnowledge = assistant.knowledge_base || '';
        if (currentKnowledge.includes(info)) return; // Avoid duplicates

        const newKnowledge = (currentKnowledge ? currentKnowledge + '\n' : '') + info;
        
        // Optimistic update
        setAssistant(prev => prev ? { ...prev, knowledge_base: newKnowledge } : null);

        const supabase = getSupabase();
        const { error: updateError } = await supabase
            .from('assistants')
            .update({ knowledge_base: newKnowledge })
            .eq('id', assistant.id);

        if (updateError) {
            console.error("Error saving to memory:", updateError);
            // Revert optimistic update on error
            setAssistant(prev => prev ? { ...prev, knowledge_base: currentKnowledge } : null);
        }
    };

    const handleTurnComplete = (entry: HistoryEntry) => {
        setHistory(prev => [entry, ...prev]);
    };
    
    const handleClearHistory = () => {
        setHistory([]);
    }

    const handleMemorySave = async (newKnowledge: string) => {
        if (!assistant) return;
        const supabase = getSupabase();
        const { data, error } = await supabase
            .from('assistants')
            .update({ knowledge_base: newKnowledge })
            .eq('id', assistant.id)
            .select()
            .single();

        if (error) {
            console.error("Error updating memory:", error);
            // Optionally show an error to the user
        } else {
            setAssistant(data as Assistant);
        }
    };
    
    const handleSettingsChange = async (newSettings: Partial<Assistant>) => {
        if (!assistant) return;
        
        // Ensure avatar is not part of this partial update unless it's a new URL string.
        // File objects should be handled separately where avatar uploads happen.
        const settingsToUpdate = { ...newSettings };
        delete (settingsToUpdate as any).avatarFile;


        const supabase = getSupabase();
        const { data, error } = await supabase
            .from('assistants')
            .update(settingsToUpdate)
            .eq('id', assistant.id)
            .select()
            .single();
        
        if (error) {
            console.error("Error updating settings:", error);
        } else {
            setAssistant(data as Assistant);
        }
    };

    const renderPage = () => {
        if (!assistant) return null;
        switch (currentPage) {
            case 'conversation':
                return <ConversationPage 
                    assistant={assistant} 
                    memory={assistant.knowledge_base.split('\n').filter(Boolean)} 
                    onSaveToMemory={handleSaveToMemory}
                    onTurnComplete={handleTurnComplete}
                    onNavigateToMemory={() => setCurrentPage('memory')}
                />;
            case 'memory':
                return <MemoryPage 
                    knowledgeBase={assistant.knowledge_base}
                    onSave={handleMemorySave}
                />;
            case 'history':
                return <HistoryPage history={history} onClear={handleClearHistory} />;
            case 'settings':
                return <SettingsDashboardPage settings={assistant} onSettingsChange={handleSettingsChange} />;
            default:
                return null;
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <Icon name="loader" className="w-12 h-12 animate-spin text-brand-secondary-glow"/>
            </div>
        );
    }

    if (error || !assistant) {
        return (
            <div className="flex flex-col items-center justify-center h-screen text-center">
                <Icon name="error" className="w-16 h-16 text-danger mb-4" />
                <h1 className="text-2xl font-bold text-text-primary">{error || "Assistant not found."}</h1>
                <a href="#/" className="mt-4 text-brand-secondary-glow hover:underline">Go to Dashboard</a>
            </div>
        );
    }

    return (
        <div className="flex h-screen bg-base-light overflow-hidden">
            <Navigation 
                currentPage={currentPage}
                onNavigate={setCurrentPage}
                assistantName={assistant.name}
                assistantAvatar={assistant.avatar}
                isMobileOpen={isMobileNavOpen}
                onMobileClose={() => setIsMobileNavOpen(false)}
                isCollapsed={isNavCollapsed}
                onToggleCollapse={() => setIsNavCollapsed(prev => !prev)}
            />
            
            <main className="flex-1 flex flex-col p-4 md:p-6 transition-all duration-300 relative">
                <button 
                    className="md:hidden absolute top-4 left-4 z-50 p-2 bg-white/70 rounded-full shadow-md"
                    onClick={() => setIsMobileNavOpen(true)}
                >
                    <Icon name="settings" className="w-6 h-6"/>
                </button>
                {renderPage()}
            </main>
        </div>
    );
}
