import React, { useState, useEffect, useCallback, useRef } from 'react';
import { getSupabase } from '../lib/supabaseClient.ts';
import type { Assistant, HistoryEntry, MemoryItem, Reminder } from '../types.ts';
import { useLocalStorage } from '../hooks/useLocalStorage.ts';
import { GoogleGenAI, Chat } from '@google/genai';

import { Navigation } from '../components/Navigation.tsx';
import { Icon } from '../components/Icon.tsx';
import { CommunityAssistantHeader } from '../components/CommunityAssistantHeader.tsx';
import { AssistantAvatar } from '../components/AssistantAvatar.tsx';

import ConversationPage from '../pages/ConversationPage.tsx';
import MemoryPage from '../pages/MemoryPage.tsx';
import HistoryPage from '../pages/HistoryPage.tsx';
import SettingsDashboardPage from '../pages/SettingsDashboardPage.tsx';
import TextChatPage from '../pages/TextChatPage.tsx';
import RemindersPage from '../pages/RemindersPage.tsx';
import { GeminiLiveProvider } from '../contexts/GeminiLiveContext.tsx';
import { useGeminiLive } from '../hooks/useGeminiLive.ts';

type Page = 'conversation' | 'memory' | 'history' | 'settings' | 'reminders';
type ConversationMode = 'voice' | 'chat';
interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

interface AssistantLayoutContentProps {
  assistant: Assistant;
  memories: MemoryItem[];
  history: HistoryEntry[];
  reminders: Reminder[];
  currentPage: Page;
  isMobileNavOpen: boolean;
  isNavCollapsed: boolean;
  previewMode: boolean;
  isCloning: boolean;
  conversationMode: ConversationMode;
  chatMessages: ChatMessage[];
  isSendingMessage: boolean;
  setCurrentPage: (page: Page) => void;
  setIsMobileNavOpen: (isOpen: boolean) => void;
  setIsNavCollapsed: (isCollapsed: (prev: boolean) => boolean) => void;
  handleAddMemory: (content: string) => Promise<void>;
  handleUpdateMemory: (id: number, content: string) => Promise<void>;
  handleDeleteMemory: (id: number) => Promise<void>;
  handleAddReminder: (content: string, dueDate: string | null) => Promise<void>;
  handleUpdateReminder: (id: string, updates: Partial<Reminder>) => Promise<void>;
  handleDeleteReminder: (id: string) => Promise<void>;
  handleCompleteReminder: (id: string) => Promise<void>;
  handleClearHistory: () => void;
  handleSettingsChange: (newSettings: Assistant) => Promise<void>;
  handleCloneAssistant: () => Promise<void>;
  handleSwipeToChat: () => void;
  handleSwipeToVoice: () => void;
  handleSendMessage: (message: string) => Promise<void>;
}

const AssistantLayoutContent = ({
  assistant,
  memories,
  history,
  reminders,
  currentPage,
  isMobileNavOpen,
  isNavCollapsed,
  previewMode,
  isCloning,
  conversationMode,
  chatMessages,
  isSendingMessage,
  setCurrentPage,
  setIsMobileNavOpen,
  setIsNavCollapsed,
  handleAddMemory,
  handleUpdateMemory,
  handleDeleteMemory,
  handleAddReminder,
  handleUpdateReminder,
  handleDeleteReminder,
  handleCompleteReminder,
  handleClearHistory,
  handleSettingsChange,
  handleCloneAssistant,
  handleSwipeToChat,
  handleSwipeToVoice,
  handleSendMessage,
}: AssistantLayoutContentProps) => {
  const { sessionStatus, stopSession, startSession, isSpeaking, groundingSources } = useGeminiLive();

  const handleAvatarClick = () => {
    if (conversationMode === 'chat') {
      handleSwipeToVoice();
      return;
    }
    if (sessionStatus === 'IDLE' || sessionStatus === 'ERROR') {
      startSession();
    } else {
      stopSession();
    }
  };
  
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const minSwipeDistance = 50; 

  const onTouchStartHandler = (e: React.TouchEvent) => {
      setTouchEnd(null);
      setTouchStart(e.targetTouches[0].clientX);
  };
  const onTouchMoveHandler = (e: React.TouchEvent) => setTouchEnd(e.targetTouches[0].clientX);
  const onTouchEndHandler = () => {
      if (!touchStart || !touchEnd) return;
      const distance = touchStart - touchEnd;
      const isRightSwipe = distance < -minSwipeDistance;
      if (isRightSwipe) {
          handleSwipeToVoice();
      }
      setTouchStart(null);
      setTouchEnd(null);
  };

  const renderPage = () => {
    if (!assistant) return null;
    if (currentPage !== 'conversation') {
      switch (currentPage) {
        case 'memory':
          return previewMode ? null : <MemoryPage memories={memories} onAdd={handleAddMemory} onUpdate={handleUpdateMemory} onDelete={handleDeleteMemory} />;
        case 'history':
          return previewMode ? null : <HistoryPage history={history} onClear={handleClearHistory} />;
        case 'reminders':
          return previewMode ? null : <RemindersPage reminders={reminders} onAdd={handleAddReminder} onUpdate={handleUpdateReminder} onDelete={handleDeleteReminder} onComplete={handleCompleteReminder} />;
        case 'settings':
          return <SettingsDashboardPage settings={assistant} onSettingsChange={handleSettingsChange} previewMode={previewMode} />;
        default:
          return null;
      }
    }
    
    // Conversation View with Swiping
    return (
      <div className="w-full h-full relative">
        <div className={`flex w-[200%] h-full transition-transform duration-500 ease-in-out ${conversationMode === 'chat' ? '-translate-x-1/2' : ''}`}>
          <div className="w-1/2 h-full">
            <ConversationPage 
              assistant={assistant} 
              memory={previewMode ? [] : memories.map(m => m.content)} 
              onNavigateToMemory={() => !previewMode && setCurrentPage('memory')}
              groundingSources={groundingSources}
              onSwipe={handleSwipeToChat}
            />
          </div>
          <div 
            className="w-1/2 h-full"
            onTouchStart={onTouchStartHandler}
            onTouchMove={onTouchMoveHandler}
            onTouchEnd={onTouchEndHandler}
          >
            <TextChatPage
              assistant={assistant}
              messages={chatMessages}
              onSendMessage={handleSendMessage}
              isSending={isSendingMessage}
            />
          </div>
        </div>
      </div>
    );
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
        
        <main className="flex-1 flex flex-col p-0 md:p-0 transition-all duration-300 relative">
            {previewMode && <CommunityAssistantHeader assistantName={assistant.name} onClone={handleCloneAssistant} isCloning={isCloning} />}
            <button 
                className="md:hidden absolute top-4 left-4 z-50 p-2 bg-white/70 rounded-full shadow-md dark:bg-dark-base-medium/70"
                onClick={() => setIsMobileNavOpen(true)}
            >
                <Icon name="settings" className="w-6 h-6 text-text-primary dark:text-dark-text-primary"/>
            </button>

            {/* Animated Avatar - Placed in main layout for smooth transitions */}
             <div className={`absolute z-30 transition-all duration-500 ease-in-out
                ${conversationMode === 'voice' 
                    ? 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-[calc(50%-2rem)]' 
                    : 'top-4 left-4'
                }`}>
                <div className={`transition-transform duration-500 ease-in-out ${conversationMode === 'chat' ? 'scale-50 origin-top-left' : 'scale-100'}`}>
                     <AssistantAvatar 
                        avatarUrl={assistant.avatar} 
                        isSpeaking={isSpeaking} 
                        status={sessionStatus} 
                        onClick={handleAvatarClick}
                        orbHue={assistant.orb_hue}
                    />
                </div>
            </div>

            {renderPage()}
        </main>
    </div>
  );
};

interface AssistantLayoutProps {
  assistantId: string;
  previewMode: boolean;
}

export default function AssistantLayout({ assistantId, previewMode }: AssistantLayoutProps) {
    const [assistant, setAssistant] = useState<Assistant | null>(null);
    const [memories, setMemories] = useState<MemoryItem[]>([]);
    const [reminders, setReminders] = useState<Reminder[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [currentPage, setCurrentPage] = useState<Page>('conversation');
    const [isCloning, setIsCloning] = useState(false);

    const [history, setHistory] = useLocalStorage<HistoryEntry[]>(`assistant_history_${assistantId}`, []);

    const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
    const [isNavCollapsed, setIsNavCollapsed] = useLocalStorage('is_nav_collapsed', false);

    const aiRef = useRef<GoogleGenAI | null>(null);

    const [conversationMode, setConversationMode] = useState<ConversationMode>('voice');
    const [chat, setChat] = useState<Chat | null>(null);
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
    const [isSendingMessage, setIsSendingMessage] = useState(false);

    useEffect(() => {
        if (previewMode) {
            setCurrentPage('conversation');
        }
    }, [previewMode]);

    useEffect(() => {
        const apiKey = import.meta.env.VITE_API_KEY;
        if (apiKey && apiKey !== 'undefined') {
            const ai = new GoogleGenAI({ apiKey });
            aiRef.current = ai;
        }
    }, []);
    
    useEffect(() => {
        if (assistant && aiRef.current) {
            const textChatSystemInstruction = `You are an AI assistant named ${assistant.name || 'Assistant'}. Your personality traits are: ${(assistant.personality || []).join(', ')}. Your attitude is: ${assistant.attitude || 'Practical'}. Your core instruction is: ${assistant.prompt || 'Be a helpful assistant.'} Based on this persona, engage in a text-based conversation with the user. Keep responses concise and conversational.`;
            const chatInstance = aiRef.current.chats.create({
                model: 'gemini-flash-latest',
                config: { systemInstruction: textChatSystemInstruction }
            });
            setChat(chatInstance);
        }
    }, [assistant]);


    const fetchAssistantData = useCallback(async () => {
        const supabase = getSupabase();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user && !previewMode) throw new Error("User not authenticated.");

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

        if (!previewMode && user) {
            let memoryQuery = supabase
                .from('memory_items')
                .select('*')
                .order('created_at', { ascending: true });

            if (assistantData.name === 'Memory Vault') {
                memoryQuery = memoryQuery.eq('user_id', user.id);
            } else {
                memoryQuery = memoryQuery.eq('assistant_id', assistantId);
            }

            const { data: memoryData, error: memoryError } = await memoryQuery;

            if (memoryError) {
                console.error("Error fetching memories:", memoryError);
                throw new Error("Could not load assistant memories.");
            }
            setMemories(memoryData as MemoryItem[]);

            // Fetch reminders
            const { data: reminderData, error: reminderError } = await supabase
                .from('reminders')
                .select('*')
                .eq('user_id', user.id)
                .order('due_date', { ascending: true });

            if (reminderError) {
                console.error("Error fetching reminders:", reminderError);
            } else {
                setReminders(reminderData as Reminder[]);
            }
        } else {
            setMemories([]);
            setReminders([]);
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
        const assistant_id = assistant.name === 'Memory Vault' ? assistant.id : assistant.id;
        const { data: newMemory, error: insertError } = await supabase
            .from('memory_items')
            .insert({ assistant_id, user_id: user.id, content: info })
            .select()
            .single();
        if (insertError) console.error("Error saving to memory:", insertError);
        else if (newMemory) setMemories(prev => [...prev, newMemory as MemoryItem]);
    };

    const handleTurnComplete = useCallback((userTranscript: string, assistantTranscript: string) => {
        if(!previewMode && (userTranscript.trim() || assistantTranscript.trim())) {
            setHistory(prev => [{ user: userTranscript, assistant: assistantTranscript, timestamp: new Date().toISOString() }, ...prev]);
        }
    }, [setHistory, previewMode]);

    const handleVoiceCreateReminder = async (content: string, dueDate: string | null) => {
        await handleAddReminder(content, dueDate);
    };

    const handleVoiceListReminders = async (): Promise<string> => {
        const activeReminders = reminders.filter(r => !r.is_completed);
        if (activeReminders.length === 0) {
            return "You don't have any active reminders.";
        }
        const reminderList = activeReminders.map((r, i) => {
            const dueDateStr = r.due_date ? ` due on ${new Date(r.due_date).toLocaleDateString()}` : '';
            return `${i + 1}. ${r.content}${dueDateStr}`;
        }).join('\n');
        return `You have ${activeReminders.length} active reminder${activeReminders.length > 1 ? 's' : ''}:\n${reminderList}`;
    };

    const handleVoiceCompleteReminder = async (reminderId: string) => {
        await handleCompleteReminder(reminderId);
    };

    const handleClearHistory = () => {
        if (!previewMode) {
            setHistory([]);
        }
    };
    const handleAddMemory = async (content: string) => {
        if (!previewMode) {
            await handleSaveToMemory(content);
        }
    };

    const handleUpdateMemory = async (id: number, content: string) => {
        if (previewMode) return;
        const original = [...memories];
        setMemories(p => p.map(m => m.id === id ? { ...m, content } : m));
        const { error } = await getSupabase().from('memory_items').update({ content }).eq('id', id);
        if (error) { console.error(error); setMemories(original); }
    };

    const handleDeleteMemory = async (id: number) => {
        if (previewMode) return;
        const original = [...memories];
        setMemories(p => p.filter(m => m.id !== id));
        const { error } = await getSupabase().from('memory_items').delete().eq('id', id);
        if (error) { console.error(error); setMemories(original); }
    };

    const handleAddReminder = async (content: string, dueDate: string | null) => {
        if (previewMode) return;
        const supabase = getSupabase();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data: newReminder, error: insertError } = await supabase
            .from('reminders')
            .insert({
                user_id: user.id,
                assistant_id: assistantId,
                content,
                due_date: dueDate,
                is_completed: false
            })
            .select()
            .single();
        if (insertError) console.error("Error adding reminder:", insertError);
        else if (newReminder) setReminders(prev => [...prev, newReminder as Reminder]);
    };

    const handleUpdateReminder = async (id: string, updates: Partial<Reminder>) => {
        if (previewMode) return;
        const original = [...reminders];
        setReminders(p => p.map(r => r.id === id ? { ...r, ...updates } : r));
        const { error } = await getSupabase().from('reminders').update(updates).eq('id', id);
        if (error) { console.error(error); setReminders(original); }
    };

    const handleDeleteReminder = async (id: string) => {
        if (previewMode) return;
        const original = [...reminders];
        setReminders(p => p.filter(r => r.id !== id));
        const { error } = await getSupabase().from('reminders').delete().eq('id', id);
        if (error) { console.error(error); setReminders(original); }
    };

    const handleCompleteReminder = async (id: string) => {
        if (previewMode) return;
        await handleUpdateReminder(id, {
            is_completed: true,
            completed_at: new Date().toISOString()
        });
    };

    const handleSettingsChange = async (newSettings: Assistant) => {
        if (previewMode || !assistant) return;
        const { name, avatar, personality, attitude, voice, prompt, is_public, is_embeddable, description, author_name, orb_hue } = newSettings;
        const { data, error } = await getSupabase()
            .from('assistants')
            .update({ name, avatar, personality, attitude, voice, prompt, is_public, is_embeddable, description, author_name, orb_hue, updated_at: new Date().toISOString() })
            .eq('id', assistant.id).select().single();
        if (error) throw error;
        else setAssistant(data as Assistant);
    };

    const handleCloneAssistant = async () => {
        if (!assistant) return;
        const supabase = getSupabase();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { window.location.hash = '#/auth'; return; }
        setIsCloning(true);
        const { name, avatar, personality, attitude, voice, prompt } = assistant;
        const { data, error: cloneError } = await supabase.from('assistants')
            .insert({ user_id: user.id, name, avatar, personality, attitude, voice, prompt, is_public: false, original_assistant_id: assistant.id })
            .select().single();
        setIsCloning(false);
        if (cloneError) { setError('Could not add assistant.'); console.error(cloneError); } 
        else if (data) { window.location.hash = `#/assistant/${data.id}`; }
    };
    
    const handleSendMessage = async (message: string) => {
        if (!chat) return;
        setIsSendingMessage(true);
        const userMessage: ChatMessage = { role: 'user', text: message };
        setChatMessages(prev => [...prev, userMessage]);
        try {
            const response = await chat.sendMessage({ message });
            const modelMessage: ChatMessage = { role: 'model', text: response.text ?? '' };
            setChatMessages(prev => [...prev, modelMessage]);
        } catch (e) {
            console.error("Error sending text message:", e);
            setChatMessages(prev => [...prev, { role: 'model', text: "Sorry, I encountered an error." }]);
        } finally {
            setIsSendingMessage(false);
        }
    };

    if (loading) { return <div className="flex items-center justify-center h-screen"><Icon name="loader" className="w-12 h-12 animate-spin text-brand-secondary-glow"/></div>; }
    if (error || !assistant) { return <div className="flex flex-col items-center justify-center h-screen text-center"><Icon name="error" className="w-16 h-16 text-danger mb-4" /><h1 className="text-2xl font-bold">{error || "Assistant not found."}</h1><a href="#/" className="mt-4 text-brand-secondary-glow hover:underline">Go to Dashboard</a></div>; }

    const recentHistory = history.slice(0, 3).reverse();
    const historyContext = !previewMode && recentHistory.length ? recentHistory.map(e => `User: "${e.user}"\nAssistant: "${e.assistant}"`).join('\n\n') : "No recent conversation history.";
    const memoryContext = !previewMode && memories.length ? memories.map(m => m.content).join('\n') : "No information is stored in long-term memory.";
    const reminderContext = !previewMode && reminders.length ? reminders.filter(r => !r.is_completed).map(r => `- ${r.content}${r.due_date ? ` (Due: ${new Date(r.due_date).toLocaleDateString()})` : ''}`).join('\n') : "No active reminders.";

    const systemInstruction = `You are an AI assistant named ${assistant.name}.\nYour personality traits are: ${(assistant.personality || []).join(', ')}.\nYour attitude is: ${assistant.attitude || 'Practical'}.\nYour core instruction is: ${assistant.prompt || 'Be a helpful assistant.'}\n\nYou have access to the following tools:\n- 'webSearch': Find current, real-time information. MUST use when user asks about recent events, news, or up-to-date topics.\n- 'saveToMemory': Save information the user explicitly asks to remember.\n- 'createReminder': Create a new reminder for the user when they ask to be reminded about something.\n- 'listReminders': List all active reminders when the user asks what reminders they have.\n- 'completeReminder': Mark a reminder as complete when the user says they finished a task.\n\nBased on this persona, engage in a conversation with the user.\n\nKey information about the user to remember and draw upon (long-term memory):\n${memoryContext}\n\nActive reminders:\n${reminderContext}\n\nRecent conversation history (for context):\n${historyContext}`;

    return (
        <GeminiLiveProvider
            assistantId={assistant.id}
            voice={assistant.voice || 'Zephyr'}
            systemInstruction={systemInstruction}
            onSaveToMemory={handleSaveToMemory}
            onTurnComplete={handleTurnComplete}
            onCreateReminder={handleVoiceCreateReminder}
            onListReminders={handleVoiceListReminders}
            onCompleteReminder={handleVoiceCompleteReminder}
        >
            <AssistantLayoutContent
                assistant={assistant} memories={memories} history={history} reminders={reminders} currentPage={currentPage} isMobileNavOpen={isMobileNavOpen}
                isNavCollapsed={isNavCollapsed} previewMode={previewMode} isCloning={isCloning} conversationMode={conversationMode}
                chatMessages={chatMessages} isSendingMessage={isSendingMessage} setCurrentPage={setCurrentPage} setIsMobileNavOpen={setIsMobileNavOpen}
                setIsNavCollapsed={setIsNavCollapsed} handleAddMemory={handleAddMemory} handleUpdateMemory={handleUpdateMemory}
                handleDeleteMemory={handleDeleteMemory} handleAddReminder={handleAddReminder} handleUpdateReminder={handleUpdateReminder}
                handleDeleteReminder={handleDeleteReminder} handleCompleteReminder={handleCompleteReminder} handleClearHistory={handleClearHistory} handleSettingsChange={handleSettingsChange}
                handleCloneAssistant={handleCloneAssistant}
                handleSwipeToChat={() => { setCurrentPage('conversation'); setConversationMode('chat'); }}
                handleSwipeToVoice={() => setConversationMode('voice')}
                handleSendMessage={handleSendMessage}
            />
        </GeminiLiveProvider>
    );
}