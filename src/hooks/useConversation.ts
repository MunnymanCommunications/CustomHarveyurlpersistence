import { useContext } from 'react';
import { GeminiLiveContext, GeminiLiveContextType } from '../contexts/GeminiLiveContext.tsx';
import { PrivateServerContext, PrivateServerContextType } from '../contexts/PrivateServerContext.tsx';

/**
 * A unified hook that works with both GeminiLive and PrivateServer contexts.
 * Tries to use whichever context is available in the current provider tree.
 */
export const useConversation = (): GeminiLiveContextType | PrivateServerContextType => {
  const geminiContext = useContext(GeminiLiveContext);
  const privateContext = useContext(PrivateServerContext);

  // Return whichever context is available
  if (privateContext) {
    return privateContext;
  }

  if (geminiContext) {
    return geminiContext;
  }

  throw new Error('useConversation must be used within a GeminiLiveProvider or PrivateServerProvider');
};
