import React, { useState, useEffect } from 'react';
import { getSupabase } from '../lib/supabaseClient';
import type { Assistant, HistoryEntry } from '../types';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { Icon } from '../components/Icon';
import { Navigation } from '../components/Navigation';
import ConversationPage from '../pages/ConversationPage';
import MemoryPage from '../pages/MemoryPage';
import HistoryPage from '../pages/HistoryPage';
import SettingsDashboardPage from '../pages/SettingsDashboardPage';

interface AssistantLayoutProps {
  assistantId: string;
}

type Page = 'conversation' | 'memory' | 'history' | 'settings';

export default function AssistantLayout({ assistantId }: AssistantLayoutProps) {
  const [assistant, setAssistant] = useState<Assistant | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<Page>('conversation');
  
  // Per-assistant local storage for memory and history
  const [memory, setMemory] = useLocalStorage<string[]>(`memory_${assistantId}`, []);
  const [history, setHistory] = useLocalStorage<HistoryEntry[]>(`history_${assistantId}`, []);
  
  const [isNavMobileOpen, setNavMobileOpen] = useState(false);
  const [isNavCollapsed, setNavCollapsed] = useLocalStorage('nav_collapsed', false);

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
        setError('Could not load assistant data. It might not exist or you may not have access.');
      } else {
        setAssistant(data as Assistant);
      }
      setLoading(false);
    };

    fetchAssistant();
  }, [assistantId]);

  const handleSaveToMemory = async (info: string) => {
    if (!memory.includes(info)) {
      setMemory(prev => [...prev, info]);
    }
  };
  
  const handleAddTurnToHistory = (entry: HistoryEntry) => {
    setHistory(prev => [entry, ...prev]);
  };
  
  const handleClearHistory = () => {
    setHistory([]);
  };

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
        // Optionally revert state
        setError("Failed to save settings.");
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
      <div className="flex flex-col items-center justify-center h-screen text-center p-4">
        <Icon name="error" className="w-16 h-16 text-danger mb-4" />
        <h1 className="text-2xl font-bold text-text-primary">Assistant Not Found</h1>
        <p className="text-text-secondary mt-2">{error || 'The requested assistant could not be found.'}</p>
        <a href="#/" className="mt-6 bg-brand-secondary-glow text-on-brand font-bold py-2 px-4 rounded-full">
          Back to Dashboard
        </a>
      </div>
    );
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'conversation':
        return <ConversationPage 
                    assistant={assistant} 
                    memory={memory}
                    onSaveToMemory={handleSaveToMemory}
                    onTurnComplete={handleAddTurnToHistory}
                    onNavigateToMemory={() => setCurrentPage('memory')}
                />;
      case 'memory':
        return <MemoryPage memory={memory} setMemory={setMemory} />;
      case 'history':
        return <HistoryPage history={history} onClear={handleClearHistory} />;
      case 'settings':
        return <SettingsDashboardPage settings={assistant} onSettingsChange={handleSettingsChange} />;
      default:
        return null;
    }
  };

  return (
    <div className="flex h-screen bg-base-light overflow-hidden">
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
      
      <main className="flex-1 flex flex-col p-4 md:p-6 transition-all duration-300 relative">
        {/* Mobile Nav Toggle */}
        <button onClick={() => setNavMobileOpen(true)} className="md:hidden absolute top-4 left-4 z-30 p-2 bg-white/50 rounded-full">
            <Icon name="dashboard" className="w-6 h-6"/>
        </button>
        {renderPage()}
      </main>
    </div>
  );
}
