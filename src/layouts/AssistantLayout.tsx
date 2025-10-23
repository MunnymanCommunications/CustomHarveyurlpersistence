import { useState, useEffect, useCallback, useRef } from 'react';
import { getSupabase } from '../lib/supabaseClient.ts';
import type { Assistant, HistoryEntry, MemoryItem } from '../types.ts';
import { useLocalStorage } from '../hooks/useLocalStorage.ts';
import { GoogleGenAI } from '@google/genai';

import { Navigation } from '../components/Navigation.tsx';
import { Icon } from '../components/Icon.tsx';
import { CommunityAssistantHeader } from '../components/CommunityAssistantHeader.tsx';

import ConversationPage from '../pages/ConversationPage.tsx';
import MemoryPage from '../pages/MemoryPage.tsx';
import HistoryPage from '../pages/HistoryPage.tsx';
import SettingsDashboardPage from '../pages/SettingsDashboardPage.tsx';
import { GeminiLiveProvider } from '../contexts/GeminiLiveContext.tsx';
import { useGeminiLive } from '../hooks/useGeminiLive.ts';

type Page = 'conversation' | 'memory' | 'history' | 'settings';

interface AssistantLayoutProps {
  assistantId: string;
  previewMode: boolean;
}

interface AssistantLayoutContentProps {
  assistant: Assistant;
  memories: MemoryItem[];
  history: HistoryEntry[];
  currentPage: Page;
  isMobileNavOpen: boolean;
  isNavCollapsed: boolean;
  previewMode: boolean;
  isCloning: boolean;
  setCurrentPage: (page: Page) => void;
  setIsMobileNavOpen: (isOpen: boolean) => void;
  setIsNavCollapsed: (isCollapsed: (prev: boolean) => boolean) => void;
  handleAddMemory: (content: string) => Promise<void>;
  handleUpdateMemory: (id: number, content: string) => Promise<void>;
  handleDeleteMemory: (id: number) => Promise<void>;
  handleClearHistory: () => void;
  handleSettingsChange: (newSettings: Partial<Assistant>) => Promise<void>;
  handleCloneAssistant: () => Promise<void>;
  groundingChunks: any[];
}

const AssistantLayoutContent = ({ 
  assistant, 
  memories, 
  history, 
  currentPage, 
  isMobileNavOpen, 
  isNavCollapsed,
  previewMode,
  isCloning,
  setCurrentPage,
  setIsMobileNavOpen,
  setIsNavCollapsed,
  handleAddMemory,
  handleUpdateMemory,
  handleDeleteMemory,
  handleClearHistory,
  handleSettingsChange,
  handleCloneAssistant,
  groundingChunks
}: AssistantLayoutContentProps) => {
  const { sessionStatus, stopSession } = useGeminiLive();

  const renderPage = () => {
    if (!assistant) return null;
    switch (currentPage) {
        case 'conversation':
            return <ConversationPage 
                assistant={assistant} 
                memory={previewMode ? [] : memories.map(m => m.content)} 
                onNavigateToMemory={() => !previewMode && setCurrentPage('memory')}
                groundingChunks={groundingChunks}
            />;
        case 'memory':
            return previewMode ? null : <MemoryPage 
                memories={memories}
                onAdd={handleAddMemory}
                onUpdate={handleUpdateMemory}
                onDelete={handleDeleteMemory}
            />;
        case 'history':
            return previewMode ? null : <HistoryPage history={history} onClear={handleClearHistory} />;
        case 'settings':
            return <SettingsDashboardPage settings={assistant} onSettingsChange={handleSettingsChange} previewMode={previewMode} />;
        default:
            return null;
    }
  };

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
            sessionStatus={sessionStatus}
            onStopSession={stopSession}
            previewMode={previewMode}
        />
        
        <main className="flex-1 flex flex-col p-4 md:p-6 transition-all duration-300 relative">
            {previewMode && <CommunityAssistantHeader assistantName={assistant.name} onClone={handleCloneAssistant} isCloning={isCloning} />}
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
};


export default function AssistantLayout({ assistantId, previewMode }: AssistantLayoutProps) {
    const [assistant, setAssistant] = useState<Assistant | null>(null);
    const [memories, setMemories] = useState<MemoryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [currentPage, setCurrentPage] = useState<Page>('conversation');
    const [isCloning, setIsCloning] = useState(false);
    
    const [history, setHistory] = useLocalStorage<HistoryEntry[]>(`assistant_history_${assistantId}`, []);

    const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
    const [isNavCollapsed, setIsNavCollapsed] = useLocalStorage('is_nav_collapsed', false);

    const [groundingChunks, setGroundingChunks] = useState<any[]>([]);
    const aiForSearchRef = useRef<GoogleGenAI | null>(null);

    useEffect(() => {
        if (previewMode) {
            setCurrentPage('conversation');
        }
    }, [previewMode]);

    useEffect(() => {
        const apiKey = process.env.API_KEY;
        if (apiKey && apiKey !== 'undefined') {
            aiForSearchRef.current = new GoogleGenAI({ apiKey });
        }
    }, []);

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

        // Only fetch memories if not in preview mode
        if (!previewMode) {
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
        } else {
            setMemories([]); // Ensure memories are empty in preview
        }

    }, [assistantId, previewMode]);


    useEffect(() => {
        setLoading(true);
        fetchAssistantData()
            .catch(e => setError(e.message))
            .finally(() => setLoading(false));
    }, [assistantId, fetchAssistantData]);


    const handleSaveToMemory = async (info: string) => {
        if (previewMode || !assistant) return;
        if (memories.some(mem => mem.content === info)) return;

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

    const fetchGrounding = useCallback(async (text: string) => {
        if (!aiForSearchRef.current || !text.trim()) {
            setGroundingChunks([]);
            return;
        }
        setGroundingChunks([]);

        try {
            const response = await aiForSearchRef.current.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: text,
                config: {
                    tools: [{ googleSearch: {} }],
                },
            });
            const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks?.filter(c => c.web);
            if (chunks && chunks.length > 0) {
                setGroundingChunks(chunks);
            }
        } catch (e) {
            console.error("Error fetching grounding:", e);
            setGroundingChunks([]);
        }
    }, []);

    const handleTurnComplete = useCallback((userTranscript: string, assistantTranscript: string) => {
        if(!previewMode && (userTranscript.trim() || assistantTranscript.trim())) {
            setHistory(prev => [{
                user: userTranscript,
                assistant: assistantTranscript,
                timestamp: new Date().toISOString()
            }, ...prev]);
        }
        if (userTranscript.trim()) {
            fetchGrounding(userTranscript);
        } else {
            setGroundingChunks([]);
        }
    }, [setHistory, fetchGrounding, previewMode]);
    
    const handleClearHistory = () => {
        if (previewMode) return;
        setHistory([]);
    }

    const handleAddMemory = async (content: string) => {
        if (previewMode) return;
        await handleSaveToMemory(content);
    };

    const handleUpdateMemory = async (id: number, content: string) => {
        if (previewMode) return;
        const originalMemories = [...memories];
        setMemories(prev => prev.map(m => m.id === id ? { ...m, content } : m));
        
        const supabase = getSupabase();
        const { error } = await supabase
            .from('memory_items')
            .update({ content })
            .eq('id', id);
        
        if (error) {
            console.error("Error updating memory:", error);
            setMemories(originalMemories);
        }
    };

    const handleDeleteMemory = async (id: number) => {
        if (previewMode) return;
        const originalMemories = [...memories];
        setMemories(prev => prev.filter(m => m.id !== id));

        const supabase = getSupabase();
        const { error } = await supabase
            .from('memory_items')
            .delete()
            .eq('id', id);
        
        if (error) {
            console.error("Error deleting memory:", error);
            setMemories(originalMemories);
        }
    };
    
    const handleSettingsChange = async (newSettings: Partial<Assistant>) => {
        if (previewMode || !assistant) return;
        
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

    const handleCloneAssistant = async () => {
        if (!assistant) return;
        const supabase = getSupabase();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            window.location.hash = '#/auth';
            return;
        }

        setIsCloning(true);
        const { name, avatar, personality, attitude, voice, prompt } = assistant;
        const { data: newAssistant, error: cloneError } = await supabase
            .from('assistants')
            .insert({
                user_id: user.id,
                name: name,
                avatar,
                personality,
                attitude,
                voice,
                prompt,
                is_public: false,
                original_assistant_id: assistant.id,
            })
            .select()
            .single();

        setIsCloning(false);

        if (cloneError) {
            setError('Could not add assistant to your dashboard. Please try again.');
            console.error('Error cloning assistant:', cloneError);
        } else {
            window.location.hash = `#/assistant/${newAssistant.id}`;
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

    const recentHistory = history.slice(0, 3).reverse();
    const historyContext = !previewMode && recentHistory.length > 0 
      ? recentHistory.map(entry => `User: "${entry.user}"\nAssistant: "${entry.assistant}"`).join('\n\n')
      : "No recent conversation history.";
  
    const memoryContext = !previewMode && memories.length > 0
      ? memories.map(m => m.content).join('\n')
      : "No information is stored in long-term memory.";
      
    const systemInstruction = `You are an AI assistant named ${assistant.name}.
  Your personality traits are: ${assistant.personality.join(', ')}.
  Your attitude is: ${assistant.attitude}.
  Your core instruction is: ${assistant.prompt}

  You have access to a Google Search tool to find real-time, up-to-date information. Use it for questions about recent events, current information, or topics you don't have information about. The web search results you find will be displayed to the user.
  
  Based on this persona, engage in a conversation with the user.
  
  Key information about the user to remember and draw upon (long-term memory):
  ${memoryContext}
  
  Recent conversation history (for context):
  ${historyContext}
  `;

    return (
        <GeminiLiveProvider
            voice={assistant.voice}
            systemInstruction={systemInstruction}
            onSaveToMemory={handleSaveToMemory}
            onTurnComplete={handleTurnComplete}
        >
            <AssistantLayoutContent
                assistant={assistant}
                memories={memories}
                history={history}
                currentPage={currentPage}
                isMobileNavOpen={isMobileNavOpen}
                isNavCollapsed={isNavCollapsed}
                previewMode={previewMode}
                isCloning={isCloning}
                setCurrentPage={setCurrentPage}
                setIsMobileNavOpen={setIsMobileNavOpen}
                setIsNavCollapsed={setIsNavCollapsed}
                handleAddMemory={handleAddMemory}
                handleUpdateMemory={handleUpdateMemory}
                handleDeleteMemory={handleDeleteMemory}
                handleClearHistory={handleClearHistory}
                handleSettingsChange={handleSettingsChange}
                handleCloneAssistant={handleCloneAssistant}
                groundingChunks={groundingChunks}
            />
        </GeminiLiveProvider>
    );
}