import React, { useState, useCallback, useEffect } from 'react';
import { getSupabase } from '../lib/supabaseClient.ts';
import { useLocalStorage } from '../hooks/useLocalStorage.ts';

import SettingsDashboardPage from '../pages/SettingsDashboardPage.tsx';
import ConversationPage from '../pages/ConversationPage.tsx';
import MemoryPage from '../pages/MemoryPage.tsx';
import HistoryPage from '../pages/HistoryPage.tsx';
import { Navigation } from '../components/Navigation.tsx';
import { Icon } from '../components/Icon.tsx';
import type { Assistant, HistoryEntry } from '../types.ts';

type Page = 'conversation' | 'memory' | 'history' | 'settings';

interface AssistantLayoutProps {
  assistantId: string;
}

export default function AssistantLayout({ assistantId }: AssistantLayoutProps) {
    const [assistant, setAssistant] = useState<Assistant | null>(null);
    const [memory, setMemory] = useState<string[]>([]);
    const [history, setHistory] = useLocalStorage<HistoryEntry[]>(`gemini-live-history-${assistantId}`, []);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [currentPage, setCurrentPage] = useState<Page>('conversation');
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isNavCollapsed, setIsNavCollapsed] = useState(false);

    const fetchAssistantData = useCallback(async () => {
        const supabase = getSupabase();
        setLoading(true);
        setError(null);

        const { data: assistantData, error: assistantError } = await supabase
            .from('assistants')
            .select('*')
            .eq('id', assistantId)
            .single();

        if (assistantError || !assistantData) {
            console.error("Error fetching assistant", assistantError);
            setError("Could not load assistant data. It may not exist or you may not have permission to view it.");
            setLoading(false);
            return;
        }
        setAssistant(assistantData as Assistant);

        const { data: memoryData, error: memoryError } = await supabase
            .from('memory_items')
            .select('content')
            .eq('assistant_id', assistantId)
            .order('created_at', { ascending: true });

        if (memoryError) {
            console.error("Error fetching memory", memoryError);
        } else if (memoryData){
            setMemory(memoryData.map(item => item.content));
        }
        
        setLoading(false);
    }, [assistantId]);

    useEffect(() => {
        fetchAssistantData();
    }, [fetchAssistantData]);

    const handleSettingsChange = useCallback((value: React.SetStateAction<Assistant>) => {
        if (!assistant) return;
        
        const newSettings = value instanceof Function ? value(assistant) : value;
        setAssistant(newSettings); // Optimistic UI update

        // Debounce or save on blur in a real app, but for now we save immediately
        const save = async () => {
            const supabase = getSupabase();
            const { error } = await supabase
                .from('assistants')
                .update({ 
                    name: newSettings.name,
                    avatar: newSettings.avatar,
                    personality: newSettings.personality,
                    attitude: newSettings.attitude,
                    knowledgeBase: newSettings.knowledgeBase,
                    voice: newSettings.voice,
                    prompt: newSettings.prompt,
                    updated_at: new Date().toISOString() 
                })
                .eq('id', assistantId);
            if (error) {
                console.error("Error updating settings:", error);
                // TODO: Add error handling, maybe revert state
            }
        };
        save();
    }, [assistant, assistantId]);
    
    const handleSetMemory = async (newMemory: string[]) => {
        const supabase = getSupabase();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Easiest sync method: delete all and insert new
        const { error: deleteError } = await supabase
            .from('memory_items')
            .delete()
            .eq('assistant_id', assistantId);
        
        if (deleteError) {
            console.error("Error clearing memory:", deleteError);
            return;
        }

        if (newMemory.length > 0) {
            const memoryToInsert = newMemory.map(item => ({
                assistant_id: assistantId,
                user_id: user.id,
                content: item,
            }));
            const { error: insertError } = await supabase
                .from('memory_items')
                .insert(memoryToInsert);

            if (insertError) {
                console.error("Error saving memory:", insertError);
            }
        }
        setMemory(newMemory); // Update state after DB operations
    };

    const addHistoryEntry = useCallback((entry: HistoryEntry) => {
        setHistory(prev => [entry, ...prev]);
    }, [setHistory]);

    const clearHistory = useCallback(() => {
        setHistory([]);
    }, [setHistory]);

    const handleNavigate = (page: Page) => {
        setCurrentPage(page);
        setIsSidebarOpen(false);
    };

    if (loading) {
        return <div className="flex items-center justify-center h-screen"><Icon name="loader" className="w-12 h-12 animate-spin text-brand-secondary-glow"/></div>;
    }

    if (error || !assistant) {
        return (
            <div className="flex flex-col items-center justify-center h-screen text-center p-4">
                <p className="text-red-500 text-xl mb-4">{error}</p>
                <a href="#/" className="text-brand-secondary-glow hover:underline">Go to Dashboard</a>
            </div>
        );
    }
    
    const renderPage = () => {
        switch (currentPage) {
        case 'settings':
            return <SettingsDashboardPage settings={assistant} onSettingsChange={handleSettingsChange} />;
        case 'memory':
            return <MemoryPage memory={memory} setMemory={handleSetMemory} />;
        case 'history':
            return <HistoryPage history={history} onClear={clearHistory} />;
        case 'conversation':
        default:
            return (
            <ConversationPage
                settings={assistant}
                memory={memory}
                setMemory={handleSetMemory}
                addHistoryEntry={addHistoryEntry}
                onNavigateToMemory={() => handleNavigate('memory')}
            />
            );
        }
    };

    return (
        <div className="bg-base-lighter text-text-primary min-h-screen w-full flex font-sans relative overflow-hidden">
          <Navigation
            currentPage={currentPage}
            onNavigate={handleNavigate}
            assistantName={assistant.name}
            assistantAvatar={assistant.avatar}
            isMobileOpen={isSidebarOpen}
            onMobileClose={() => setIsSidebarOpen(false)}
            isCollapsed={isNavCollapsed}
            onToggleCollapse={() => setIsNavCollapsed(prev => !prev)}
          />
          <main className="flex-1 h-screen overflow-y-auto p-4 md:p-8 flex flex-col">
            <header className="md:hidden flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                     <img src={assistant.avatar} alt="Avatar" className="w-8 h-8 rounded-full"/>
                     <h1 className="font-bold text-lg">{assistant.name}</h1>
                </div>
                <button onClick={() => setIsSidebarOpen(true)} className="p-2">
                    <Icon name="settings" className="w-6 h-6"/>
                </button>
            </header>
            <div className="flex-1 flex flex-col">
                 {renderPage()}
            </div>
          </main>
        </div>
      );
}
