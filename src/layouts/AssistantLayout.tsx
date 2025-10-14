import React, { useState, useEffect } from 'react';
import { getSupabase } from '../lib/supabaseClient.ts';
import type { Assistant, HistoryEntry } from '../types.ts';
import { useLocalStorage } from '../hooks/useLocalStorage.ts';
import { Icon } from '../components/Icon.tsx';
import { Navigation } from '../components/Navigation.tsx';
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
  const [isMobileNavOpen, setMobileNavOpen] = useState(false);
  const [isNavCollapsed, setNavCollapsed] = useLocalStorage('navCollapsed', false);

  // Per-assistant memory and history
  const [memory, setMemory] = useLocalStorage<string[]>(`memory_${assistantId}`, []);
  const [history, setHistory] = useLocalStorage<HistoryEntry[]>(`history_${assistantId}`, []);

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
        setError('Could not load assistant data. Please try again.');
      } else {
        setAssistant(data as Assistant);
      }
      setLoading(false);
    };

    fetchAssistant();
  }, [assistantId]);

  const handleSaveToMemory = async (info: string) => {
    setMemory(prev => [...new Set([...prev, info])]); // Use Set to avoid duplicates
  };
  
  const handleUpdateMemory = async (newMemory: string[]) => {
    setMemory(newMemory);
  };
  
  const handleTurnComplete = (entry: HistoryEntry) => {
    setHistory(prev => [entry, ...prev]);
  };
  
  const handleClearHistory = () => {
    setHistory([]);
  };

  const handleSettingsChange = async (newSettings: Partial<Assistant>) => {
    if (!assistant) return;
    const updatedAssistant = { ...assistant, ...newSettings };
    setAssistant(updatedAssistant); // Optimistic update

    const supabase = getSupabase();
    const { error } = await supabase
        .from('assistants')
        .update(newSettings)
        .eq('id', assistant.id);
    
    if (error) {
        setError("Failed to save settings. Please try again.");
        // Revert optimistic update
        const { data } = await supabase.from('assistants').select('*').eq('id', assistant.id).single();
        if (data) setAssistant(data as Assistant);
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
        <Icon name="error" className="w-16 h-16 text-danger mb-4"/>
        <h2 className="text-2xl font-bold text-text-primary">Oops! Something went wrong.</h2>
        <p className="text-text-secondary mt-2">{error || "The requested assistant could not be found."}</p>
        <a href="#/" className="mt-6 bg-brand-secondary-glow text-on-brand font-bold py-2 px-4 rounded-full">Back to Dashboard</a>
      </div>
    );
  }
  
  const renderPage = () => {
    switch (currentPage) {
      case 'memory':
        return <MemoryPage memory={memory} setMemory={handleUpdateMemory} />;
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

  return (
    <div className="min-h-screen w-full flex bg-base-light">
      <Navigation
        currentPage={currentPage}
        onNavigate={setCurrentPage}
        assistantName={assistant.name}
        assistantAvatar={assistant.avatar}
        isMobileOpen={isMobileNavOpen}
        onMobileClose={() => setMobileNavOpen(false)}
        isCollapsed={isNavCollapsed}
        onToggleCollapse={() => setNavCollapsed(prev => !prev)}
      />
      <main className="flex-grow flex flex-col p-4 relative">
        {/* Mobile nav toggle */}
        <button onClick={() => setMobileNavOpen(true)} className="md:hidden absolute top-4 left-4 p-2 bg-white/50 rounded-full z-20">
          <Icon name="dashboard" className="w-6 h-6 text-text-primary"/>
        </button>
        <div className="w-full h-full flex-grow flex items-center justify-center">
             {renderPage()}
        </div>
      </main>
    </div>
  );
}
