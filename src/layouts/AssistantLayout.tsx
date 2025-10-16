import { useState, useEffect, useCallback } from 'react';
import { getSupabase } from '../lib/supabaseClient.ts';
import type { Assistant, HistoryEntry, MemoryItem } from '../types.ts';
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
    const [memories, setMemories] = useState<MemoryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [currentPage, setCurrentPage] = useState<Page>('conversation');
    
    const [history, setHistory] = useLocalStorage<HistoryEntry[]>(`assistant_history_${assistantId}`, []);

    const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
    const [isNavCollapsed, setIsNavCollapsed] = useLocalStorage('is_nav_collapsed', false);

    const fetchAssistantData = useCallback(async () => {
        const supabase = getSupabase();
        const { data: assistantData, error: assistantError } = await supabase
            .from('assistants')
            .select('*')
            .eq('id', assistantId)
            .single();

        if (assistantError) {
            console.error("Error fetching assistant:", assistantError);
            throw new Error("Could not load assistant data.");
        }
        
        setAssistant(assistantData as Assistant);

        const { data: memoryData, error: memoryError } = await supabase
            .from('memory_items')
            .select('*')
            .eq('assistant_id', assistantId)
            .order('created_at', { ascending: true });
        
        if (memoryError) {
            console.error("Error fetching memories:", memoryError);
            throw new Error("Could not load assistant memories.");
        }

        setMemories(memoryData as MemoryItem[]);

    }, [assistantId]);


    useEffect(() => {
        setLoading(true);
        fetchAssistantData()
            .catch(e => setError(e.message))
            .finally(() => setLoading(false));
    }, [assistantId, fetchAssistantData]);


    const handleSaveToMemory = async (info: string) => {
        if (!assistant) return;
        if (memories.some(mem => mem.content === info)) return; // Avoid duplicates

        const supabase = getSupabase();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: newMemory, error: insertError } = await supabase
            .from('memory_items')
            .insert({
                assistant_id: assistant.id,
                user_id: user.id,
                content: info
            })
            .select()
            .single();

        if (insertError) {
            console.error("Error saving to memory:", insertError);
        } else if (newMemory) {
            setMemories(prev => [...prev, newMemory as MemoryItem]);
        }
    };

    const handleTurnComplete = (entry: HistoryEntry) => {
        setHistory(prev => [entry, ...prev]);
    };
    
    const handleClearHistory = () => {
        setHistory([]);
    }

    const handleAddMemory = async (content: string) => {
        await handleSaveToMemory(content);
    };

    const handleUpdateMemory = async (id: number, content: string) => {
        const originalMemories = [...memories];
        // Optimistic update
        setMemories(prev => prev.map(m => m.id === id ? { ...m, content } : m));
        
        const supabase = getSupabase();
        const { error } = await supabase
            .from('memory_items')
            .update({ content })
            .eq('id', id);
        
        if (error) {
            console.error("Error updating memory:", error);
            setMemories(originalMemories); // Revert on error
        }
    };

    const handleDeleteMemory = async (id: number) => {
        const originalMemories = [...memories];
        // Optimistic update
        setMemories(prev => prev.filter(m => m.id !== id));

        const supabase = getSupabase();
        const { error } = await supabase
            .from('memory_items')
            .delete()
            .eq('id', id);
        
        if (error) {
            console.error("Error deleting memory:", error);
            setMemories(originalMemories); // Revert on error
        }
    };
    
    const handleSettingsChange = async (newSettings: Partial<Assistant>) => {
        if (!assistant) return;
        
        const settingsToUpdate = { ...newSettings };
        
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
                    memory={memories.map(m => m.content)} 
                    history={history}
                    onSaveToMemory={handleSaveToMemory}
                    onTurnComplete={handleTurnComplete}
                    onNavigateToMemory={() => setCurrentPage('memory')}
                />;
            case 'memory':
                return <MemoryPage 
                    memories={memories}
                    onAdd={handleAddMemory}
                    onUpdate={handleUpdateMemory}
                    onDelete={handleDeleteMemory}
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
                <h1 className="text-2xl font-bold text-text-primary dark:text-dark-text-primary">{error || "Assistant not found."}</h1>
                <a href="#/" className="mt-4 text-brand-secondary-glow hover:underline">Go to Dashboard</a>
            </div>
        );
    }

    return (
        <div className="flex h-screen bg-base-light dark:bg-dark-base-light overflow-hidden">
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
                    className="md:hidden absolute top-4 left-4 z-50 p-2 bg-white/70 rounded-full shadow-md dark:bg-dark-base-medium/70"
                    onClick={() => setIsMobileNavOpen(true)}
                >
                    <Icon name="settings" className="w-6 h-6 text-text-primary dark:text-dark-text-primary"/>
                </button>
                {renderPage()}
            </main>
        </div>
    );
}