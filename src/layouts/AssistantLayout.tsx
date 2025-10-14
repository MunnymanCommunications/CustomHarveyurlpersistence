// FIX: Populating file with the AssistantLayout component.
import React, { useState, useEffect } from 'react';
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
  const [isNavMobileOpen, setNavMobileOpen] = useState(false);
  const [isNavCollapsed, setNavCollapsed] = useLocalStorage('navCollapsed', false);

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
        setError('Could not load the assistant. It might not exist or you may not have permission to view it.');
      } else {
        setAssistant(data as Assistant);
      }
      setLoading(false);
    };

    fetchAssistant();
  }, [assistantId]);

  const addHistoryEntry = (entry: HistoryEntry) => {
    setHistory(prev => [...prev, entry]);
  };
  
  const clearHistory = () => {
    setHistory([]);
  };
  
  const updateMemory = async (newMemory: string[]) => {
    setMemory(newMemory);
    // No-op for async compatibility with MemoryPage's props
    return Promise.resolve();
  };
  
  const handleSettingsChange = (newSettings: Assistant) => {
    setAssistant(newSettings);
    // Here you would typically save the updated settings to the database.
    const saveSettings = async () => {
        const supabase = getSupabase();
        const { error } = await supabase
            .from('assistants')
            .update(newSettings)
            .eq('id', newSettings.id);

        if (error) {
            console.error("Failed to save settings:", error);
            // Optionally, show an error to the user.
        }
    };
    saveSettings();
  };

  const renderPage = () => {
    if (!assistant) return null;

    switch (currentPage) {
      case 'conversation':
        return <ConversationPage settings={assistant} memory={memory} setMemory={updateMemory} addHistoryEntry={addHistoryEntry} onNavigateToMemory={() => setCurrentPage('memory')} />;
      case 'memory':
        return <MemoryPage memory={memory} setMemory={updateMemory} />;
      case 'history':
        return <HistoryPage history={history} onClear={clearHistory} />;
      case 'settings':
        return <SettingsDashboardPage settings={assistant} onSettingsChange={(updatedAssistant) => handleSettingsChange({ ...assistant, ...updatedAssistant })} />;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Icon name="loader" className="w-12 h-12 animate-spin text-brand-secondary-glow"/>
        <p className="ml-4 text-xl">Loading Assistant...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-screen text-center p-4">
        <Icon name="error" className="w-16 h-16 text-danger mb-4"/>
        <h1 className="text-2xl font-bold mb-2">An Error Occurred</h1>
        <p className="text-text-secondary mb-6">{error}</p>
        <a href="#/" className="bg-brand-secondary-glow text-on-brand font-bold py-2 px-6 rounded-full">
          Back to Dashboard
        </a>
      </div>
    );
  }
  
  if (!assistant) {
      return null; // Should be covered by error state
  }

  return (
    <div className="h-screen w-full flex bg-base-light overflow-hidden">
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
      <main className={`flex-grow transition-all duration-300 ease-in-out ${isNavCollapsed ? 'md:ml-24' : 'md:ml-72'}`}>
        <div className="h-full w-full p-2 sm:p-4">
          <button onClick={() => setNavMobileOpen(true)} className="md:hidden absolute top-4 left-4 p-2 bg-white/50 rounded-full z-10">
            <Icon name="dashboard" className="w-6 h-6"/>
          </a >
          {renderPage()}
        </div>
      </main>
    </div>
  );
}
