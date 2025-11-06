import React, { useState } from 'react';
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
  onSwipe: () => void;
}

export default function ConversationPage({ 
  assistant, 
  memory, 
  onNavigateToMemory,
  groundingSources,
  onSwipe
}: ConversationPageProps) {
  const {
    sessionStatus,
    startSession,
    userTranscript,
    assistantTranscript,
    error
  } = useGeminiLive();

  // Swipe detection logic
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  const minSwipeDistance = 50; 

  const onTouchStartHandler = (e: React.TouchEvent) => {
    setTouchEnd(null); // otherwise the swipe is fired even with usual touch events
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMoveHandler = (e: React.TouchEvent) => setTouchEnd(e.targetTouches[0].clientX);

  const onTouchEndHandler = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    
    if (isLeftSwipe) {
      onSwipe();
    }
    setTouchStart(null);
    setTouchEnd(null);
  };
  
  const isIdle = sessionStatus === 'IDLE' || sessionStatus === 'ERROR';

  return (
    <div 
        className="flex flex-col items-center justify-center h-full p-4 text-center w-full select-none"
        onTouchStart={onTouchStartHandler}
        onTouchMove={onTouchMoveHandler}
        onTouchEnd={onTouchEndHandler}
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

            <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex items-center gap-2 text-text-tertiary dark:text-dark-text-tertiary animate-swipe-hint pointer-events-none">
                <Icon name="chevronLeft" className="w-5 h-5" />
                <span className="text-sm font-medium">Swipe for Text Chat</span>
            </div>
        </div>
    </div>
  );
}