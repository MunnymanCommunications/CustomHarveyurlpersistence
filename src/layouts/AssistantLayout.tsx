import React, { useState, useEffect, useCallback } from 'react';
import { getSupabase } from '../lib/supabaseClient.ts';
import type { Assistant, HistoryEntry } from '../types.ts';
import { useLocalStorage } from '../hooks/useLocalStorage.ts';

import ConversationPage from '../pages/ConversationPage.tsx';
import MemoryPage from '../pages/MemoryPage.tsx';
import HistoryPage from '../pages/HistoryPage.tsx';
import SettingsDashboardPage from '../pages/SettingsDashboardPage.tsx';
import { Navigation } from '../components/Navigation.tsx';
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

  // State management using useLocalStorage to persist across sessions
  const [memory, setMemory] = useLocalStorage<string[]>(`memory_${assistantId}`, []);
  const [history, setHistory] = useLocalStorage<HistoryEntry[]>(`history_${assistantId}`, []);

  const [isNavMobileOpen, setNavMobileOpen] = useState(false);
  const [isNavCollapsed, setNavCollapsed] = useLocalStorage('nav_collapsed', false);

  useEffect(() => {
    const fetchAssistant = async () => {
      setLoading(true);
      setError(null);
      const supabase = getSupabase();
      const { data, error: fetchError } = await supabase
        .from('assistants')
        .select('*')
        .eq('id', assistantId)
        .single();
      
      if (fetchError) {
        console.error("Error fetching assistant:", fetchError);
        setError("Could not load assistant data.");
      } else {
        setAssistant(data as Assistant);
      }
      setLoading(false);
    };

    fetchAssistant();
  }, [assistantId]);

  const handleSaveToMemory = useCallback(async (info: string) => {
    if (!memory.includes(info)) {
      setMemory(prev => [...prev, info]);
    }
  }, [memory, setMemory]);
  
  const handleTurnComplete = useCallback((entry: HistoryEntry) => {
    setHistory(prev => [entry, ...prev]);
  }, [setHistory]);

  const handleClearHistory = useCallback(() => {
    setHistory([]);
  }, [setHistory]);

  const handleSettingsChange = async (newSettings: Partial<Assistant>) => {
    if (!assistant) return;
    const updatedAssistant = { ...assistant, ...newSettings };
    setAssistant(updatedAssistant);

    const supabase = getSupabase();
    const { error: updateError } = await supabase
        .from('assistants')
        .update(newSettings)
        .eq('id', assistant.id);
    
    if (updateError) {
        console.error("Error updating settings:", updateError);
        // Optionally revert state or show an error message
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
          <Icon name="error" className="w-12 h-12 text-danger mb-4"/>
          <h2 className="text-2xl font-bold text-text-primary">Error</h2>
          <p className="text-text-secondary">{error || "Assistant not found."}</p>
          <a href="#/" className="mt-4 text-brand-secondary-glow hover:underline">Go to Dashboard</a>
      </div>
    );
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'memory':
        return <MemoryPage memory={memory} setMemory={setMemory} />;
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
    <div className="h-screen w-screen flex overflow-hidden bg-base-light font-sans">
      <Navigation
        currentPage={currentPage}
        onNavigate={setCurrentPage}
        assistantName={assistant.name}
        assistantAvatar={assistant.avatar}
        isMobileOpen={isNavMobileOpen}
        onMobileClose={() => setNavMobileOpen(false)}
        isCollapsed={isNavCollapsed}
        onToggleCollapse={() => setNavCollapsed(prev => !prev)}
      />
      <main className="flex-1 flex flex-col relative p-4 transition-all duration-300">
         <button onClick={() => setNavMobileOpen(true)} className="md:hidden absolute top-4 left-4 z-20 p-2 bg-white/70 rounded-full shadow-md">
            <Icon name="dashboard" className="w-6 h-6"/>
        </button>
        {renderPage()}
      </main>
    </div>
  );
}
