import React, { useState, useEffect, useCallback } from 'react';
import { getSupabase } from '../lib/supabaseClient.ts';
import type { Assistant, HistoryEntry } from '../types.ts';
import { useLocalStorage } from '../hooks/useLocalStorage.ts';
import { Navigation } from '../components/Navigation.tsx';
import ConversationPage from '../pages/ConversationPage.tsx';
import MemoryPage from '../pages/MemoryPage.tsx';
import HistoryPage from '../pages/HistoryPage.tsx';
import SettingsDashboardPage from '../pages/SettingsDashboardPage.tsx';
import { Icon } from '../components/Icon.tsx';

interface AssistantLayoutProps {
  assistantId: string;
}

type Page = 'conversation' | 'memory' | 'history' | 'settings';

export default function AssistantLayout({ assistantId }: AssistantLayoutProps) {
  const [assistant, setAssistant] = useState<Assistant | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<Page>('conversation');
  
  const [memory, setMemory] = useLocalStorage<string[]>(`assistant-memory-${assistantId}`, []);
  const [history, setHistory] = useLocalStorage<HistoryEntry[]>(`assistant-history-${assistantId}`, []);

  const [isNavMobileOpen, setIsNavMobileOpen] = useState(false);
  const [isNavCollapsed, setIsNavCollapsed] = useLocalStorage('nav-collapsed', false);

  useEffect(() => {
    const fetchAssistant = async () => {
      setLoading(true);
      setError(null);
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('assistants')
        .select('*')
        .eq('id', assistantId)
        .single();

      if (error) {
        console.error('Error fetching assistant:', error);
        setError('Could not load assistant data.');
      } else {
        setAssistant(data as Assistant);
      }
      setLoading(false);
    };

    fetchAssistant();
  }, [assistantId]);

  const handleSaveToMemory = useCallback(async (info: string) => {
    setMemory(prev => [...prev, info]);
  }, [setMemory]);

  const handleTurnComplete = useCallback((entry: HistoryEntry) => {
    setHistory(prev => [...prev, entry]);
  }, [setHistory]);

  const handleClearHistory = useCallback(() => {
    setHistory([]);
  }, [setHistory]);

  const handleSetMemory = useCallback(async (newMemory: string[]) => {
    setMemory(newMemory);
  }, [setMemory]);

  const handleSettingsChange = async (newSettings: Partial<Assistant>) => {
    if (!assistant) return;
    const updatedAssistant = { ...assistant, ...newSettings };
    setAssistant(updatedAssistant);
    const supabase = getSupabase();
    const { error } = await supabase
      .from('assistants')
      .update(newSettings)
      .eq('id', assistant.id);
    if (error) {
      console.error("Failed to update settings:", error);
      // Optionally revert state or show an error message
      setError("Failed to save settings.");
    }
  };

  const renderPage = () => {
    if (!assistant) return null;
    switch (currentPage) {
      case 'memory':
        return <MemoryPage memory={memory} setMemory={handleSetMemory} />;
      case 'history':
        return <HistoryPage history={history} onClear={handleClearHistory} />;
      case 'settings':
        return <SettingsDashboardPage settings={assistant} onSettingsChange={handleSettingsChange} />;
      case 'conversation':
      default:
        return (
          <ConversationPage
            assistant={assistant}
            memory={memory}
            onSaveToMemory={handleSaveToMemory}
            onTurnComplete={handleTurnComplete}
            onNavigateToMemory={() => setCurrentPage('memory')}
          />
        );
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Icon name="loader" className="w-12 h-12 animate-spin text-brand-secondary-glow" />
      </div>
    );
  }

  if (error || !assistant) {
    return (
      <div className="flex flex-col items-center justify-center h-screen text-center">
        <Icon name="error" className="w-12 h-12 text-danger mb-4" />
        <h2 className="text-2xl font-bold text-text-primary">Loading Failed</h2>
        <p className="text-text-secondary">{error || 'Assistant not found.'}</p>
        <a href="#/" className="mt-4 text-brand-secondary-glow hover:underline">
          Go to Dashboard
        </a>
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
        isMobileOpen={isNavMobileOpen}
        onMobileClose={() => setIsNavMobileOpen(false)}
        isCollapsed={isNavCollapsed}
        onToggleCollapse={() => setIsNavCollapsed(prev => !prev)}
      />
      <main className="flex-1 flex flex-col relative">
         <button 
            className="md:hidden absolute top-4 left-4 z-20 p-2 bg-white/50 rounded-full"
            onClick={() => setIsNavMobileOpen(true)}
          >
            <Icon name={'dashboard'} className="w-6 h-6 text-text-primary"/>
        </button>
        <div className="flex-1 h-full">
            {renderPage()}
        </div>
      </main>
    </div>
  );
}
