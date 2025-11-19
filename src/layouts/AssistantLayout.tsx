import { useState, useEffect, useCallback, useRef } from 'react';
import { getSupabase } from '../lib/supabaseClient.ts';
import type { Assistant, HistoryEntry, MemoryItem, Reminder } from '../types.ts';
import { useLocalStorage } from '../hooks/useLocalStorage.ts';
import { GoogleGenAI, Chat, Type, FunctionDeclaration } from '@google/genai';

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

            // Tool declarations for text chat
            const addReminderTool: FunctionDeclaration = {
                name: 'addReminder',
                description: 'Creates a reminder for the user. Use this when the user asks you to remind them of something, set a reminder, or mentions they need to do something later. You can set reminders with or without a specific date.',
                parameters: {
                    type: Type.OBJECT,
                    properties: {
                        content: {
                            type: Type.STRING,
                            description: 'The content of the reminder (what the user wants to be reminded about).'
                        },
                        dueDate: {
                            type: Type.STRING,
                            description: 'Optional: The date and time when the reminder should trigger (in ISO format, e.g., "2024-01-15T14:30:00"). Leave empty for reminders without a specific time.'
                        }
                    },
                    required: ['content']
                }
            };

            const completeReminderTool: FunctionDeclaration = {
                name: 'completeReminder',
                description: 'Marks a reminder as completed. Use this when the user confirms they have completed a task you reminded them about, or when they explicitly say they finished something that was in their reminders.',
                parameters: {
                    type: Type.OBJECT,
                    properties: {
                        content: {
                            type: Type.STRING,
                            description: 'The content of the reminder to mark as complete. This should match the exact content of an existing reminder.'
                        }
                    },
                    required: ['content']
                }
            };

            const chatInstance = aiRef.current.chats.create({
                model: 'gemini-flash-latest',
                config: {
                    systemInstruction: textChatSystemInstruction,
                    maxOutputTokens: 2048,
                    tools: [{
                        functionDeclarations: [addReminderTool, completeReminderTool]
                    }]
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

            // Fetch ALL reminders for this assistant (both active and completed)
            const { data: reminderData, error: reminderError} = await supabase
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

        const { error } = await getSupabase()
            .from('reminders')
            .update({ is_completed: true, completed_at: new Date().toISOString() })
            .eq('id', id);

        if (error) {
            console.error(error);
            setReminders(original);
        } else {
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

    const handleCompleteReminderByContent = async (content: string) => {
        if (previewMode || !assistant) return;
        // Find the reminder by content (case-insensitive partial match)
        const reminder = reminders.find(r =>
            r.content.toLowerCase().includes(content.toLowerCase()) ||
            content.toLowerCase().includes(r.content.toLowerCase())
        );

        if (!reminder) {
            console.log("No matching reminder found for content:", content);
            return;
        }

        // Use the existing handleCompleteReminder function
        await handleCompleteReminder(reminder.id);
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

            // Check for function calls in response
            if (response.functionCalls && response.functionCalls.length > 0) {
                const functionCall = response.functionCalls[0];
                let functionResult = '';

                if (functionCall.name === 'addReminder') {
                    try {
                        const content = functionCall.args?.content;
                        const dueDate = typeof functionCall.args?.dueDate === 'string' ? functionCall.args.dueDate : null;
                        if (typeof content === 'string') {
                            await handleAddReminder(content, dueDate);
                            functionResult = 'Successfully created reminder.';
                        } else {
                            functionResult = 'Failed to create reminder, content was not provided.';
                        }
                    } catch (e) {
                        console.error('Failed to create reminder:', e);
                        functionResult = 'Failed to create reminder.';
                    }
                } else if (functionCall.name === 'completeReminder') {
                    try {
                        const content = functionCall.args?.content;
                        if (typeof content === 'string') {
                            // Find the reminder by content and complete it
                            const reminderToComplete = reminders.find(r => r.content === content && !r.is_completed);
                            if (reminderToComplete) {
                                await handleCompleteReminder(reminderToComplete.id);
                                functionResult = 'Successfully marked reminder as complete.';
                            } else {
                                functionResult = 'Could not find a matching reminder to complete.';
                            }
                        } else {
                            functionResult = 'Failed to complete reminder, content was not provided.';
                        }
                    } catch (e) {
                        console.error('Failed to complete reminder:', e);
                        functionResult = 'Failed to complete reminder.';
                    }
                }

                // Send the function execution result back as a system message for the model to respond to
                const finalResponse = await chat.sendMessage({
                    message: `[System: Function "${functionCall.name}" executed. Result: ${functionResult}]`
                });

                const modelMessage: ChatMessage = { role: 'model', text: finalResponse.text ?? '' };
                setChatMessages(prev => [...prev, modelMessage]);
            } else {
                // No function calls, just display the text response
                const modelMessage: ChatMessage = { role: 'model', text: response.text ?? '' };
                setChatMessages(prev => [...prev, modelMessage]);
            }
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

    // Filter reminders to show only relevant ones
    const getActiveReminders = () => {
        if (previewMode || !reminders.length) return [];

        const threeDaysFromNow = new Date();
        threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

        return reminders.filter(reminder => {
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
        }).join('\n')}\n\nWhen appropriate in the conversation, naturally remind the user about these items. Ask if they've completed them yet. If they confirm completion, acknowledge it warmly.`
        : '';

    const systemInstruction = `You are an AI assistant named ${assistant.name}.\nYour personality traits are: ${(assistant.personality || []).join(', ')}.\nYour attitude is: ${assistant.attitude || 'Practical'}.\nYour core instruction is: ${assistant.prompt || 'Be a helpful assistant.'}\n\nCurrent date and time: ${dateTimeString}\n\nYou have access to a tool called 'webSearch' which can find current, real-time information. You MUST use this tool when the user asks about recent events, news, or any topic that requires up-to-date information (e.g., "what's the latest news?", "search for...", "how is the weather today?"). For all other questions, including general knowledge, creative tasks, and persona-based responses, rely on your internal knowledge.\n\nBased on this persona, engage in a conversation with the user.\n\n${reminderContext ? reminderContext + '\n\n' : ''}Key information about the user to remember and draw upon (long-term memory):\n${memoryContext}\n\nRecent conversation history (for context):\n${historyContext}`;

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