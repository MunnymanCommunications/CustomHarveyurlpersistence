import React, { useState, useEffect } from 'react';
import { getSupabase } from '../lib/supabaseClient';
import type { Assistant, HistoryEntry } from '../types';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { Navigation } from '../components/Navigation';
import ConversationPage from '../pages/ConversationPage';
import MemoryPage from '../pages/MemoryPage';
import HistoryPage from '../pages/HistoryPage';
import SettingsDashboardPage from '../pages/SettingsDashboardPage';
import { Icon } from '../components/Icon';

interface AssistantLayoutProps {
  assistantId: string;
}

type Page = 'conversation' | 'memory' | 'history' | 'settings';

export default function AssistantLayout({ assistantId }: AssistantLayoutProps) {
  const [settings, setSettings] = useState<Assistant | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<Page>('conversation');
  const [isSaving, setIsSaving] = useState(false);
  
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [isNavCollapsed, setIsNavCollapsed] = useLocalStorage('navCollapsed', false);

  const [memory, setMemory] = useLocalStorage<string[]>(`assistant_memory_${assistantId}`, []);
  const [history, setHistory] = useLocalStorage<HistoryEntry[]>(`assistant_history_${assistantId}`, []);

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
        setError(`Could not load assistant. ${error.message}`);
      } else if (data) {
        setSettings(data as Assistant);
      } else {
        setError('Assistant not found.');
      }
      setLoading(false);
    };

    if (assistantId) {
        fetchAssistant();
    }
  }, [assistantId]);

  const handleSettingsChange = (newPartialSettings: Partial<Assistant>) => {
    setSettings(prev => (prev ? { ...prev, ...newPartialSettings } : null));
  };

  const handleSaveSettings = async () => {
      if (!settings) return;
      setIsSaving(true);
      const supabase = getSupabase();
      const { name, avatar, personality, attitude, voice, knowledge_base, prompt } = settings;
      const { error } = await supabase
          .from('assistants')
          .update({ name, avatar, personality, attitude, voice, knowledge_base, prompt })
          .eq('id', assistantId);

      if (error) {
          console.error('Error updating assistant:', error);
          alert(`Error saving settings: ${error.message}`);
      }
      setIsSaving(false);
  };

  const setMemoryPersistent = async (newMemory: string[]) => {
    setMemory(newMemory);
    return Promise.resolve();
  };
  
  const addHistoryEntry = (entry: HistoryEntry) => {
    setHistory(prev => [entry, ...prev]);
  };
  
  const clearHistory = () => {
    setHistory([]);
  };

  const renderCurrentPage = () => {
    if (!settings) return null;

    switch (currentPage) {
      case 'conversation':
        return <ConversationPage 
                    settings={settings} 
                    memory={memory} 
                    setMemory={setMemoryPersistent} 
                    addHistoryEntry={addHistoryEntry}
                    onNavigateToMemory={() => setCurrentPage('memory')}
                />;
      case 'memory':
        return <MemoryPage 
                    memory={memory} 
                    setMemory={setMemoryPersistent}
                />;
      case 'history':
        return <HistoryPage history={history} onClear={clearHistory} />;
      case 'settings':
        return <SettingsDashboardPage 
                    settings={settings} 
                    onSettingsChange={handleSettingsChange}
                />;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Icon name="loader" className="w-12 h-12 animate-spin text-brand-secondary-glow" />
      </div>
    );
  }

  if (error || !settings) {
    return (
      <div className="flex flex-col items-center justify-center h-screen text-center p-4">
        <Icon name="error" className="w-16 h-16 text-danger mb-4" />
        <h1 className="text-2xl font-bold text-text-primary">Something went wrong</h1>
        <p className="text-text-secondary mt-2">{error || 'Could not load the assistant.'}</p>
        <a href="#/" className="mt-6 bg-brand-secondary-glow text-on-brand font-bold py-2 px-4 rounded-full">
          Back to Dashboard
        </a>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-base-light overflow-hidden">
      <Navigation
        currentPage={currentPage}
        onNavigate={setCurrentPage}
        assistantName={settings.name}
        assistantAvatar={settings.avatar}
        isMobileOpen={isMobileNavOpen}
        onMobileClose={() => setIsMobileNavOpen(false)}
        isCollapsed={isNavCollapsed}
        onToggleCollapse={() => setIsNavCollapsed(prev => !prev)}
      />
      <main className="flex-grow flex flex-col relative w-full overflow-hidden">
        <button onClick={() => setIsMobileNavOpen(true)} className="md:hidden absolute top-4 left-4 z-20 p-2 bg-white/70 backdrop-blur-sm rounded-full shadow-md">
            <Icon name="dashboard" className="w-6 h-6 text-text-primary"/>
        </button>
        <div className="flex-grow p-4 md:p-8 overflow-y-auto w-full">
            {renderCurrentPage()}
        </div>
        {currentPage === 'settings' && (
            <footer className="flex-shrink-0 p-4 bg-white/80 backdrop-blur-sm border-t border-border-color flex justify-end items-center">
                <button 
                    onClick={handleSaveSettings}
                    disabled={isSaving}
                    className="bg-gradient-to-r from-brand-secondary-glow to-brand-tertiary-glow text-on-brand font-bold py-2 px-6 rounded-full flex items-center transition-all duration-300 shadow-lg transform hover:scale-105 disabled:opacity-50"
                >
                    {isSaving ? (
                        <>
                          <Icon name="loader" className="w-5 h-5 mr-2 animate-spin" />
                          Saving...
                        </>
                    ) : 'Save Changes'}
                </button>
            </footer>
        )}
      </main>
    </div>
  );
}
