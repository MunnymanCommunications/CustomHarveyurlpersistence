import { useContext } from 'react';
import { GeminiLiveContext, GeminiLiveContextType } from '../contexts/GeminiLiveContext.tsx';

export const useGeminiLive = (): GeminiLiveContextType => {
  const context = useContext(GeminiLiveContext);
  if (context === undefined) {
    throw new Error('useGeminiLive must be used within a GeminiLiveProvider');
  }
  return context;
};
