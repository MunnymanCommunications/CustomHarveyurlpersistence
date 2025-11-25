import { useGeminiLive } from '../hooks/useGeminiLive.ts';
import type { Assistant } from '../types.ts';
import { TranscriptionDisplay } from '../components/TranscriptionDisplay.tsx';
import { MemoryBank } from '../components/MemoryBank.tsx';
import { Icon } from '../components/Icon.tsx';
import { WebResults } from '../components/WebResults.tsx';

interface ConversationPageProps {
  assistant: Assistant;
  memory: string[];
  onNavigateToMemory: () => void;
  groundingSources: any[];
  onToggleChat: () => void;
}

export default function ConversationPage({
  assistant,
  memory,
  onNavigateToMemory,
  groundingSources,
  onToggleChat
}: ConversationPageProps) {
  const {
    sessionStatus,
    startSession,
    userTranscript,
    assistantTranscript,
    error,
    isSearchingWeb,
    reminderNotification
  } = useGeminiLive();

  const isIdle = sessionStatus === 'IDLE' || sessionStatus === 'ERROR';

  return (
    <div className="flex flex-col items-center justify-center h-full p-4 text-center w-full select-none"
    >
        {/* Memory Bank - Top Left */}
        <div className="absolute top-4 left-4 z-10">
            <MemoryBank memory={memory} onEdit={onNavigateToMemory} />
        </div>
        
        {/* Main Content */}
        <div className="w-full flex flex-col justify-center items-center h-full">
            {/* The Avatar is now in AssistantLayout, this space is a placeholder for positioning */}
            <div className="w-48 h-48 md:w-64 md:h-64 mx-auto" />

            <div className="w-full max-w-2xl mt-8">
                <TranscriptionDisplay userTranscript={userTranscript} assistantTranscript={assistantTranscript} />
                <WebResults sources={groundingSources} />

                {/* Web Search Indicator */}
                {isSearchingWeb && (
                    <div className="mt-4 flex items-center justify-center gap-2 px-4 py-3 rounded-xl glassmorphic border border-brand-secondary-glow/30 animate-pulse">
                        <div className="w-4 h-4 border-2 border-brand-secondary-glow border-t-transparent rounded-full animate-spin" />
                        <p className="text-brand-secondary-glow font-medium">Searching the web...</p>
                    </div>
                )}

                {/* Reminder Notification */}
                {reminderNotification && (
                    <div className="mt-4 animate-[fadeIn_0.3s_ease-in-out]">
                        <div className="px-4 py-3 rounded-full glassmorphic border border-transparent bg-gradient-to-r from-brand-secondary-glow/20 via-brand-tertiary-glow/20 to-brand-secondary-glow/20 backdrop-blur-xl shadow-lg">
                            <div className="flex items-center justify-center gap-2">
                                <Icon
                                    name={reminderNotification.type === 'created' ? 'plus' : 'check'}
                                    className="w-4 h-4 text-brand-secondary-glow"
                                />
                                <p className="text-text-primary dark:text-dark-text-primary font-medium text-sm">
                                    {reminderNotification.type === 'created'
                                        ? `Reminder created: "${reminderNotification.content}"`
                                        : `Reminder completed: "${reminderNotification.content}"`
                                    }
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {isIdle && (
                    <button onClick={startSession} className="mt-4 text-text-secondary dark:text-dark-text-secondary animate-pulse">
                        Tap {assistant.name} to start the conversation
                    </button>
                )}
                {error && (
                    <div className="flex items-center justify-center bg-red-100 text-red-700 p-3 rounded-lg max-w-md mx-auto mt-4">
                        <Icon name="error" className="w-5 h-5 mr-2" />
                        <p className="text-sm">{error}</p>
                    </div>
                )}
            </div>

            {/* Chat Button - Bottom Right */}
            <button
                onClick={onToggleChat}
                className="absolute bottom-8 right-8 bg-gradient-to-r from-brand-secondary-glow to-brand-tertiary-glow text-on-brand p-4 rounded-full shadow-lg hover:shadow-2xl hover:scale-110 transition-all duration-300 z-20"
                aria-label="Switch to text chat"
            >
                <Icon name="chat" className="w-6 h-6" />
            </button>
        </div>
    </div>
  );
}