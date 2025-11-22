import { useState, useEffect, useCallback, useRef } from 'react';
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
  handleClearHistory: () => void;
  handleSettingsChange: (newSettings: Assistant) => Promise<void>;
  handleCloneAssistant: () => Promise<void>;
  handleSwipeToChat: () => void;
  handleSwipeToVoice: () => void;
  handleSendMessage: (message: string) => Promise<void>;
  handleAddReminder: (content: string, dueDate: string | null) => Promise<void>;
  handleCompleteReminder: (id: string) => Promise<void>;
  handleDeleteReminder: (id: string) => Promise<void>;
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
  handleClearHistory,
  handleSettingsChange,
  handleCloneAssistant,
  handleSwipeToChat,
  handleSwipeToVoice,
  handleSendMessage,
  handleAddReminder,
  handleCompleteReminder,
  handleDeleteReminder,
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
  

  const renderPage = () => {
    if (!assistant) return null;
    if (currentPage !== 'conversation') {
      switch (currentPage) {
        case 'memory':
          return previewMode ? null : <MemoryPage memories={memories} onAdd={handleAddMemory} onUpdate={handleUpdateMemory} onDelete={handleDeleteMemory} />;
        case 'history':
          return previewMode ? null : <HistoryPage history={history} onClear={handleClearHistory} />;
        case 'reminders':
          return previewMode ? null : <RemindersPage reminders={reminders} onAdd={handleAddReminder} onComplete={handleCompleteReminder} onDelete={handleDeleteReminder} />;
        case 'settings':
          return <SettingsDashboardPage settings={assistant} onSettingsChange={handleSettingsChange} previewMode={previewMode} />;
        default:
          return null;
      }
    }
    
    // Conversation View - Toggle between voice and chat
    return conversationMode === 'voice' ? (
      <ConversationPage
        assistant={assistant}
        memory={previewMode ? [] : memories.map(m => m.content)}
        onNavigateToMemory={() => !previewMode && setCurrentPage('memory')}
        groundingSources={groundingSources}
        onToggleChat={handleSwipeToChat}
      />
    ) : (
      <TextChatPage
        assistant={assistant}
        messages={chatMessages}
        onSendMessage={handleSendMessage}
        isSending={isSendingMessage}
        onToggleVoice={handleSwipeToVoice}
      />
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

            {/* Avatar - Shown in voice mode (centered and elevated) or mini in other pages (top right) */}
            {conversationMode === 'voice' && currentPage === 'conversation' && (
                <div className="absolute z-30 top-1/2 left-1/2 -translate-x-1/2 -translate-y-[calc(50%+8rem)]">
                    <AssistantAvatar
                        avatarUrl={assistant.avatar}
                        isSpeaking={isSpeaking}
                        status={sessionStatus}
                        onClick={handleAvatarClick}
                        orbHue={assistant.orb_hue}
                    />
                </div>
            )}
            {/* Mini Avatar for non-conversation pages */}
            {currentPage !== 'conversation' && (
                <div className="absolute z-30 top-4 right-4">
                    <div className="scale-[0.35] origin-top-right">
                        <AssistantAvatar
                            avatarUrl={assistant.avatar}
                            isSpeaking={isSpeaking}
                            status={sessionStatus}
                            onClick={handleAvatarClick}
                            orbHue={assistant.orb_hue}
                        />
                    </div>
                </div>
            )}

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
    const [reminders, setReminders] = useState<Reminder[]>([]);

    useEffect(() => {
        if (previewMode) {
            setCurrentPage('conversation');
        }
    }, [previewMode]);

    useEffect(() => {
        const apiKey = process.env.API_KEY;
        if (apiKey && apiKey !== 'undefined') {
            const ai = new GoogleGenAI({ apiKey });
            aiRef.current = ai;
        }
    }, []);
    
    useEffect(() => {
        if (assistant && aiRef.current) {
            // Get current date and time for text chat
            const now = new Date();
            const dateTimeString = now.toLocaleString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
                timeZoneName: 'short'
            });

            const textChatSystemInstruction = `You are an AI assistant named ${assistant.name || 'Assistant'}. Your personality traits are: ${(assistant.personality || []).join(', ')}. Your attitude is: ${assistant.attitude || 'Practical'}. Your core instruction is: ${assistant.prompt || 'Be a helpful assistant.'} Current date and time: ${dateTimeString}. Based on this persona, engage in a text-based conversation with the user. Provide thoughtful, complete responses.`;
            const chatInstance = aiRef.current.chats.create({
                model: 'gemini-flash-latest',
                config: {
                    systemInstruction: textChatSystemInstruction,
                    maxOutputTokens: 2048
                }
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

            // Fetch ALL reminders for this assistant (both active and completed) so UI can show both tabs
            const { data: reminderData, error: reminderError } = await supabase
                .from('reminders')
                .select('*')
                .eq('assistant_id', assistantId)
                .order('is_completed', { ascending: true })
                .order('due_date', { ascending: true, nullsFirst: false });

            if (reminderError) {
                console.error("Error fetching reminders:", reminderError);
                // Don't throw, just set empty reminders
                setReminders([]);
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
        if (previewMode || !assistant) return;
        const supabase = getSupabase();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: newReminder, error: insertError } = await supabase
            .from('reminders')
            .insert({ assistant_id: assistant.id, user_id: user.id, content, due_date: dueDate })
            .select()
            .single();

        if (insertError) {
            console.error("Error creating reminder:", insertError);
        } else if (newReminder) {
            setReminders(prev => [...prev, newReminder as Reminder]);
        }
    };

    const handleCompleteReminder = async (id: string) => {
        if (previewMode) return;
        const original = [...reminders];
        setReminders(p => p.map(r => r.id === id ? { ...r, is_completed: true, completed_at: new Date().toISOString() } : r));

        const { data, error } = await getSupabase()
            .from('reminders')
            .update({ is_completed: true, completed_at: new Date().toISOString() })
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error("Failed to complete reminder:", error);
            alert(`Failed to mark reminder as complete: ${error.message}`);
            setReminders(original);
        } else {
            console.log("Reminder completed successfully:", data);
            // Refetch all reminders to update the list
            const supabase = getSupabase();
            const { data: reminderData } = await supabase
                .from('reminders')
                .select('*')
                .eq('assistant_id', assistant?.id)
                .order('is_completed', { ascending: true })
                .order('due_date', { ascending: true, nullsFirst: false });

            if (reminderData) {
                setReminders(reminderData as Reminder[]);
            }
        }
    };

    const handleDeleteReminder = async (id: string) => {
        if (previewMode) return;
        const original = [...reminders];
        setReminders(p => p.filter(r => r.id !== id));
        const { error } = await getSupabase().from('reminders').delete().eq('id', id);
        if (error) { console.error(error); setReminders(original); }
    };

    // Handler for completing reminders by content (fuzzy matching for assistant)
    const handleCompleteReminderByContent = async (reminderContent: string): Promise<boolean> => {
        if (previewMode || !assistant) return false;

        // Find a matching reminder (case-insensitive partial match)
        const contentLower = reminderContent.toLowerCase();
        const matchingReminder = reminders.find(r =>
            !r.is_completed &&
            (r.content.toLowerCase().includes(contentLower) ||
             contentLower.includes(r.content.toLowerCase()))
        );

        if (!matchingReminder) return false;

        await handleCompleteReminder(matchingReminder.id);
        return true;
    };

    const handleSettingsChange = async (newSettings: Assistant) => {
        if (previewMode || !assistant) return;
        const { name, avatar, personality, attitude, voice, prompt, is_public, is_embeddable, description, author_name, orb_hue, mcp_server_settings } = newSettings;
        const { data, error } = await getSupabase()
            .from('assistants')
            .update({ name, avatar, personality, attitude, voice, prompt, is_public, is_embeddable, description, author_name, orb_hue, mcp_server_settings, updated_at: new Date().toISOString() })
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

    if (loading) { return <div className="flex items-center justify-center h-screen bg-base-light dark:bg-dark-base-light"><img src="/favicon.svg" alt="Loading..." className="w-32 h-32 animate-blink" /></div>; }
    if (error || !assistant) { return <div className="flex flex-col items-center justify-center h-screen text-center"><Icon name="error" className="w-16 h-16 text-danger mb-4" /><h1 className="text-2xl font-bold">{error || "Assistant not found."}</h1><a href="#/" className="mt-4 text-brand-secondary-glow hover:underline">Go to Dashboard</a></div>; }

    const recentHistory = history.slice(0, 3).reverse();
    const historyContext = !previewMode && recentHistory.length ? recentHistory.map(e => `User: "${e.user}"\nAssistant: "${e.assistant}"`).join('\n\n') : "No recent conversation history.";
    const memoryContext = !previewMode && memories.length ? memories.map(m => m.content).join('\n') : "No information is stored in long-term memory.";

    // Get current date and time
    const now = new Date();
    const dateTimeString = now.toLocaleString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        timeZoneName: 'short'
    });

    // Filter reminders to show only relevant ones for the system instruction
    const getActiveReminders = () => {
        if (previewMode || !reminders.length) return [];

        const threeDaysFromNow = new Date();
        threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

        return reminders.filter(reminder => {
            // Filter out completed reminders
            if (reminder.is_completed) return false;
            if (!reminder.due_date) return true; // No date = always show
            const dueDate = new Date(reminder.due_date);
            return dueDate <= threeDaysFromNow; // Show if due within 3 days
        });
    };

    const activeReminders = getActiveReminders();
    const reminderContext = activeReminders.length
        ? `IMPORTANT - Active reminders to bring up naturally in conversation:\n${activeReminders.map(r => {
            const dueDateText = r.due_date
                ? ` (Due: ${new Date(r.due_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })})`
                : '';
            return `- ${r.content}${dueDateText}`;
        }).join('\n')}\n\nWhen appropriate in the conversation, naturally remind the user about these items. Ask if they've completed them yet. If they confirm completion, USE THE completeReminder TOOL to mark it as done.`
        : '';

    // Add reminder tool instructions to system instruction
    const reminderToolInstructions = `You have access to reminder tools:
- 'addReminder': Use this when the user asks you to remind them about something or set a reminder. Extract the content and due date from their request.
- 'completeReminder': Use this when the user indicates they have completed a task that was set as a reminder. Match the content as closely as possible to mark the correct reminder as done.`;

    const systemInstruction = `You are an AI assistant named ${assistant.name}.\nYour personality traits are: ${(assistant.personality || []).join(', ')}.\nYour attitude is: ${assistant.attitude || 'Practical'}.\nYour core instruction is: ${assistant.prompt || 'Be a helpful assistant.'}\n\nCurrent date and time: ${dateTimeString}\n\nYou have access to a tool called 'webSearch' which can find current, real-time information. You MUST use this tool when the user asks about recent events, news, or any topic that requires up-to-date information (e.g., "what's the latest news?", "search for...", "how is the weather today?"). IMPORTANT: Before using the webSearch tool, ALWAYS say "Let me search the web for that" or "Searching the web now" so the user knows you're looking something up. For all other questions, including general knowledge, creative tasks, and persona-based responses, rely on your internal knowledge.\n\n${reminderToolInstructions}\n\nBased on this persona, engage in a conversation with the user.\n\n${reminderContext ? reminderContext + '\n\n' : ''}Key information about the user to remember and draw upon (long-term memory):\n${memoryContext}\n\nRecent conversation history (for context):\n${historyContext}`;

    return (
        <GeminiLiveProvider
            assistantId={assistant.id}
            voice={assistant.voice || 'Zephyr'}
            systemInstruction={systemInstruction}
            onSaveToMemory={handleSaveToMemory}
            onTurnComplete={handleTurnComplete}
            onAddReminder={handleAddReminder}
            onCompleteReminder={handleCompleteReminderByContent}
            mcpServerSettings={assistant.mcp_server_settings}
        >
            <AssistantLayoutContent
                assistant={assistant} memories={memories} history={history} reminders={reminders} currentPage={currentPage} isMobileNavOpen={isMobileNavOpen}
                isNavCollapsed={isNavCollapsed} previewMode={previewMode} isCloning={isCloning} conversationMode={conversationMode}
                chatMessages={chatMessages} isSendingMessage={isSendingMessage} setCurrentPage={setCurrentPage} setIsMobileNavOpen={setIsMobileNavOpen}
                setIsNavCollapsed={setIsNavCollapsed} handleAddMemory={handleAddMemory} handleUpdateMemory={handleUpdateMemory}
                handleDeleteMemory={handleDeleteMemory} handleClearHistory={handleClearHistory} handleSettingsChange={handleSettingsChange}
                handleCloneAssistant={handleCloneAssistant}
                handleSwipeToChat={() => { setCurrentPage('conversation'); setConversationMode('chat'); }}
                handleSwipeToVoice={() => setConversationMode('voice')}
                handleSendMessage={handleSendMessage}
                handleAddReminder={handleAddReminder}
                handleCompleteReminder={handleCompleteReminder}
                handleDeleteReminder={handleDeleteReminder}
            />
        </GeminiLiveProvider>
    );
}