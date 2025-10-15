import { useGeminiLive } from '../hooks/useGeminiLive.ts';
import type { Assistant, HistoryEntry } from '../types.ts';
import { AssistantAvatar } from '../components/AssistantAvatar.tsx';
import { ConversationControls } from '../components/ConversationControls.tsx';
import { TranscriptionDisplay } from '../components/TranscriptionDisplay.tsx';
import { MemoryBank } from '../components/MemoryBank.tsx';
import { Icon } from '../components/Icon.tsx';

interface ConversationPageProps {
  assistant: Assistant;
  memory: string[];
  onSaveToMemory: (info: string) => Promise<void>;
  onTurnComplete: (entry: HistoryEntry) => void;
  onNavigateToMemory: () => void;
}

export default function ConversationPage({ 
  assistant, 
  memory, 
  onSaveToMemory,
  onTurnComplete,
  onNavigateToMemory 
}: ConversationPageProps) {

  const handleTurnComplete = (userTranscript: string, assistantTranscript: string) => {
    if(userTranscript.trim() || assistantTranscript.trim()) {
        onTurnComplete({
            user: userTranscript,
            assistant: assistantTranscript,
            timestamp: new Date().toISOString()
        });
    }
  };

  const {
    sessionStatus,
    startSession,
    stopSession,
    isSpeaking,
    userTranscript,
    assistantTranscript,
    error
  } = useGeminiLive({
    voice: assistant.voice,
    systemInstruction: `${assistant.prompt}\n\nKey information about the user to remember: ${memory.join(', ')}`,
    onSaveToMemory: onSaveToMemory,
    onTurnComplete: handleTurnComplete,
  });

  return (
    <div className="flex flex-col items-center justify-between h-full p-4 text-center w-full">
        {/* Memory Bank - Top Left */}
        <div className="absolute top-4 left-4 z-10">
            <MemoryBank memory={memory} onEdit={onNavigateToMemory} />
        </div>
        
        {/* Main Content */}
        <div className="flex-grow flex flex-col justify-center items-center w-full">
            <AssistantAvatar avatarUrl={assistant.avatar} isSpeaking={isSpeaking} status={sessionStatus} />

            <div className="w-full max-w-2xl mt-8">
                <TranscriptionDisplay userTranscript={userTranscript} assistantTranscript={assistantTranscript} />
            </div>
        </div>

        {/* Controls - Bottom */}
        <div className="flex-shrink-0 w-full pb-4">
            {error && (
                <div className="flex items-center justify-center bg-red-100 text-red-700 p-3 rounded-lg max-w-md mx-auto mb-4">
                    <Icon name="error" className="w-5 h-5 mr-2" />
                    <p className="text-sm">{error}</p>
                </div>
            )}
            <ConversationControls onStart={startSession} onStop={stopSession} status={sessionStatus} />
        </div>
    </div>
  );
}