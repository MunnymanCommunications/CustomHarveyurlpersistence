import React, { useState, useEffect, useCallback } from 'react';
import { getSupabase } from '../lib/supabaseClient.ts';
import type { Assistant, HistoryEntry } from '../types.ts';
import { Icon } from '../components/Icon.tsx';
import { Navigation } from '../components/Navigation.tsx';
import { useLocalStorage } from '../hooks/useLocalStorage.ts';

import ConversationPage from '../pages/ConversationPage.tsx';
import MemoryPage from '../pages/MemoryPage.tsx';
import HistoryPage from '../pages/HistoryPage.tsx';
import SettingsDashboardPage from '../pages/SettingsDashboardPage.tsx';

type Page = 'conversation' | 'memory' | 'history' | 'settings';

export default function AssistantLayout({ assistantId }: { assistantId: string }) {
  const [assistant, setAssistant] = useState<Assistant | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<Page>('conversation');
  
  const [memory, setMemory] = useLocalStorage<string[]>(`memory-${assistantId}`, []);
  const [history, setHistory] = useLocalStorage<HistoryEntry[]>(`history-${assistantId}`, []);

  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [isNavCollapsed, setIsNavCollapsed] = useLocalStorage('isNavCollapsed', false);

  useEffect(() => {
    const fetchAssistant = async () => {
      if (!assistantId) {
        setError("No assistant ID provided.");
        setLoading(false);
        return;
      }
      try {
        const supabase = getSupabase();
        const { data, error } = await supabase
          .from('assistants')
          .select('*')
          .eq('id', assistantId)
          .single();
        
        if (error) throw error;
        if (data) {
          setAssistant(data as Assistant);
        } else {
          setError("Assistant not found.");
        }
      } catch (e: any) {
        console.error("Error fetching assistant:", e);
        setError(e.message || "Failed to load assistant data.");
      } finally {
        setLoading(false);
      }
    };
    fetchAssistant();
  }, [assistantId]);

  const saveToMemory = useCallback(async (info: string) => {
    const newMemory = [...memory, info];
    setMemory(newMemory);
    // In a real app, you might also persist this to a database.
  }, [memory, setMemory]);

  const addHistoryEntry = useCallback((entry: HistoryEntry) => {
    setHistory(prev => [...prev, entry]);
  }, [setHistory]);

  const clearHistory = useCallback(() => {
    setHistory([]);
  }, [setHistory]);

  const updateAssistantSettings = useCallback(async (newSettings: Partial<Assistant>) => {
    if (!assistant) return;
    setLoading(true);
    try {
        const supabase = getSupabase();
        const { data, error } = await supabase
            .from('assistants')
            .update(newSettings)
            .eq('id', assistant.id)
            .select()
            .single();
        
        if (error) throw error;
        if (data) {
            setAssistant(data as Assistant);
        }
    } catch (e: any) {
        console.error("Error updating settings:", e);
        setError(e.message || "Failed to save settings.");
    } finally {
        setLoading(false);
    }
  }, [assistant]);


  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Icon name="loader" className="w-12 h-12 animate-spin text-brand-secondary-glow"/>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-screen text-center">
        <Icon name="error" className="w-16 h-16 text-danger mb-4"/>
        <h2 className="text-2xl font-bold text-text-primary">Oops! Something went wrong.</h2>
        <p className="text-text-secondary mt-2">{error}</p>
        <a href="#/" className="mt-6 bg-brand-secondary-glow text-on-brand font-bold py-2 px-4 rounded-full">Back to Dashboard</a>
      </div>
    );
  }

  if (!assistant) {
    return null; // or a 'not found' component
  }

  const renderCurrentPage = () => {
    switch(currentPage) {
      case 'conversation':
        return <ConversationPage 
                    assistant={assistant} 
                    memory={memory} 
                    onSaveToMemory={saveToMemory}
                    onTurnComplete={addHistoryEntry}
                    onNavigateToMemory={() => setCurrentPage('memory')}
                />;
      case 'memory':
        return <MemoryPage memory={memory} setMemory={async (m) => setMemory(m)} />;
      case 'history':
        return <HistoryPage history={history} onClear={clearHistory} />;
      case 'settings':
        return <SettingsDashboardPage settings={assistant} onSettingsChange={updateAssistantSettings} />;
      default:
        return null;
    }
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
      <main className={`flex-1 flex flex-col transition-all duration-300 ease-in-out ${isNavCollapsed ? 'md:ml-24' : 'md:ml-72'}`}>
        <div className="md:hidden p-2 flex justify-between items-center bg-white/50 backdrop-blur-sm border-b border-border-color">
            <a href="#/" className="flex items-center gap-2 text-text-secondary hover:text-text-primary">
                <Icon name="chevronLeft" className="w-5 h-5"/>
                <span>Dashboard</span>
            </a>
            <button onClick={() => setIsMobileNavOpen(true)} className="p-2">
                <Icon name="settings" className="w-6 h-6"/>
            </button>
        </div>
        <div className="flex-1 p-4 overflow-y-auto">
             {renderCurrentPage()}
        </div>
      </main>
    </div>
  );
}
