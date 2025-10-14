import React, { useMemo } from 'react';
import type { Assistant, HistoryEntry } from '../types.ts';
import { useGeminiLive } from '../hooks/useGeminiLive.ts';
import { AssistantAvatar } from '../components/AssistantAvatar.tsx';
import { TranscriptionDisplay } from '../components/TranscriptionDisplay.tsx';
import { ConversationControls } from '../components/ConversationControls.tsx';
import { MemoryBank } from '../components/MemoryBank.tsx';

interface ConversationPageProps {
  settings: Assistant;
  memory: string[];
  setMemory: (newMemory: string[]) => Promise<void>;
  addHistoryEntry: (entry: HistoryEntry) => void;
  onNavigateToMemory: () => void;
}

export default function ConversationPage({ settings, memory, setMemory, addHistoryEntry, onNavigateToMemory }: ConversationPageProps) {
  const systemInstruction = useMemo(() => {
    let instruction = `Your name is ${settings.name}.`;
    instruction += `\nYour personality is: ${settings.personality.join(', ')}.`;
    instruction += `\nYour attitude is: ${settings.attitude}.`;
    // FIX: Corrected property access from `knowledgeBase` to `knowledge_base` to match the Assistant type.
    instruction += `\nThis is your knowledge base, treat it as your own long-term memory about the user and the world:\n${settings.knowledge_base}`;
    if(memory.length > 0) {
        instruction += `\nThis is information you have saved about the user in this session, act as if you know it:\n- ${memory.join('\n- ')}`;
    }
    instruction += `\nThis is a custom prompt you must follow: ${settings.prompt}`;
    return instruction;
  }, [settings, memory]);

  const handleSaveToMemory = async (info: string) => {
    if (!memory.includes(info)) {
      await setMemory([...memory, info]);
    }
  };

  const handleTurnComplete = (userTranscript: string, assistantTranscript: string) => {
    if (userTranscript.trim() || assistantTranscript.trim()) {
      addHistoryEntry({
        user: userTranscript,
        assistant: assistantTranscript,
        timestamp: new Date().toISOString(),
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
    error,
  } = useGeminiLive({
    voice: settings.voice,
    systemInstruction,
    onSaveToMemory: handleSaveToMemory,
    onTurnComplete: handleTurnComplete,
  });

  return (
    <div className="h-full flex flex-col justify-between items-center text-center p-4">
        <div className="absolute top-4 right-4 z-10">
            <MemoryBank memory={memory} onEdit={onNavigateToMemory} />
        </div>
        
        <div className="flex-grow flex flex-col items-center justify-center w-full">
            <AssistantAvatar 
                avatarUrl={settings.avatar} 
                isSpeaking={isSpeaking}
                status={sessionStatus}
            />
            <TranscriptionDisplay
                userTranscript={userTranscript}
                assistantTranscript={assistantTranscript}
            />
        </div>

        <div className="w-full max-w-md">
            {error && <p className="text-danger mb-4">Error: {error}</p>}
            <ConversationControls
                onStart={startSession}
                onStop={stopSession}
                status={sessionStatus}
            />
        </div>
    </div>
  );
}