import { useGeminiLive } from '../hooks/useGeminiLive.ts';
import type { Assistant } from '../types.ts';
import { AssistantAvatar } from '../components/AssistantAvatar.tsx';
import { TranscriptionDisplay } from '../components/TranscriptionDisplay.tsx';
import { MemoryBank } from '../components/MemoryBank.tsx';
import { Icon } from '../components/Icon.tsx';
import { WebResults } from '../components/WebResults.tsx';

interface ConversationPageProps {
  assistant: Assistant;
  memory: string[];
  onNavigateToMemory: () => void;
  groundingChunks: any[];
}

export default function ConversationPage({ 
  assistant, 
  memory, 
  onNavigateToMemory,
  groundingChunks
}: ConversationPageProps) {
  const {
    sessionStatus,
    startSession,
    stopSession,
    isSpeaking,
    userTranscript,
    assistantTranscript,
    error
  } = useGeminiLive();

  const handleAvatarClick = () => {
    if (sessionStatus === 'IDLE' || sessionStatus === 'ERROR') {
      startSession();
    } else {
      // This handles both 'ACTIVE' and 'CONNECTING' states to allow cancellation
      stopSession();
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-full p-4 text-center w-full">
        {/* Memory Bank - Top Left */}
        <div className="absolute top-4 left-4 z-10">
            <MemoryBank memory={memory} onEdit={onNavigateToMemory} />
        </div>
        
        {/* Main Content */}
        <div className="w-full flex flex-col justify-center items-center">
            <AssistantAvatar 
              avatarUrl={assistant.avatar} 
              isSpeaking={isSpeaking} 
              status={sessionStatus} 
              onClick={handleAvatarClick}
            />

            <div className="w-full max-w-2xl mt-8">
                <TranscriptionDisplay userTranscript={userTranscript} assistantTranscript={assistantTranscript} />
                <WebResults results={groundingChunks} />
                {error && (
                    <div className="flex items-center justify-center bg-red-100 text-red-700 p-3 rounded-lg max-w-md mx-auto mt-4">
                        <Icon name="error" className="w-5 h-5 mr-2" />
                        <p className="text-sm">{error}</p>
                    </div>
                )}
            </div>
        </div>
    </div>
  );
}