
import React, { useCallback } from 'react';
import { useGeminiLive } from '../hooks/useGeminiLive.ts';
import type { Assistant, HistoryEntry } from '../types.ts';

import { AssistantAvatar } from '../components/AssistantAvatar.tsx';
import { ConversationControls } from '../components/ConversationControls.tsx';
import { TranscriptionDisplay } from '../components/TranscriptionDisplay.tsx';

interface ConversationPageProps {
  settings: Assistant;
  memory: string[];
  setMemory: (newMemory: string[]) => Promise<void>;
  addHistoryEntry: (entry: HistoryEntry) => void;
}

export default function ConversationPage({ 
    settings, 
    memory, 
    setMemory,
    addHistoryEntry,
}: ConversationPageProps) {

  const systemInstruction = `
      The current date and time is ${new Date().toLocaleString()}.
      Your name is ${settings.name}.
      Your personality traits are: ${settings.personality.join(', ')}.
      Your attitude is: ${settings.attitude}.
      You have the following information in your knowledge base: ${settings.knowledgeBase}.
      The user has provided these memories for you to reference: ${memory.join('; ')}.
      ${settings.prompt}
    `.trim().replace(/\s+/g, ' ');

  const handleSaveToMemory = useCallback(async (info: string) => {
    if (!memory.includes(info)) {
      const newMemory = [...memory, info];
      await setMemory(newMemory);
    }
  }, [memory, setMemory]);

  const handleTurnComplete = useCallback((userTranscript: string, assistantTranscript: string) => {
      if (userTranscript.trim() || assistantTranscript.trim()) {
        addHistoryEntry({
          user: userTranscript,
          assistant: assistantTranscript,
          timestamp: new Date().toISOString(),
        });
      }
  }, [addHistoryEntry]);

  const { 
    sessionStatus, 
    startSession, 
    stopSession, 
    isSpeaking, 
    userTranscript, 
    assistantTranscript, 
    error 
  } = useGeminiLive({
    voice: settings.voice,
    systemInstruction,
    onSaveToMemory: handleSaveToMemory,
    onTurnComplete: handleTurnComplete,
  });

  const handleMainClick = useCallback(() => {
    if (sessionStatus === 'IDLE' || sessionStatus === 'ERROR') {
      startSession();
    }
  }, [sessionStatus, startSession]);

  return (
    <div className="w-full h-full mx-auto flex flex-col items-center justify-center text-center">
      <main 
        onClick={handleMainClick}
        className={`flex flex-col items-center justify-center flex-grow w-full transition-colors ${
          (sessionStatus === 'IDLE' || sessionStatus === 'ERROR') ? 'cursor-pointer' : ''
        }`}
      >
        <AssistantAvatar 
          avatarUrl={settings.avatar}
          isSpeaking={isSpeaking}
          sessionStatus={sessionStatus}
        />
        <TranscriptionDisplay 
          userTranscript={userTranscript}
          assistantTranscript={assistantTranscript}
          isSpeaking={isSpeaking}
        />
      </main>

      <footer className="w-full flex flex-col items-center justify-center gap-4 pb-4">
        {error && <p className="text-red-500 bg-red-100 px-4 py-2 rounded-md">{error}</p>}
        <ConversationControls 
          onStart={startSession}
          onStop={stopSession}
          status={sessionStatus}
        />
      </footer>
    </div>
  );
}
