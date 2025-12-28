import React, { ReactNode, useMemo } from 'react';
import { GeminiLiveProvider, GeminiLiveContext, GeminiLiveContextType } from './GeminiLiveContext.tsx';
import { PrivateServerProvider, PrivateServerContext } from './PrivateServerContext.tsx';
import type { VoiceOption, MCPServerSettings } from '../types.ts';

// Storage key for AI provider preference
const AI_PROVIDER_KEY = 'ai_provider_preference';
const PRIVATE_SERVER_URL_KEY = 'private_server_url';
const PRIVATE_SERVER_API_KEY = 'private_server_api_key';

export type AIProvider = 'google' | 'private';

export interface AIConversationContextType extends GeminiLiveContextType {
  // Inherits all methods from GeminiLiveContextType
}

interface AIConversationProviderProps {
  children: ReactNode;
  voice: VoiceOption;
  systemInstruction: string;
  assistantId: string;
  onSaveToMemory: (info: string) => Promise<void>;
  onTurnComplete: (userTranscript: string, assistantTranscript: string) => void;
  onAddReminder: (content: string, dueDate: string | null) => Promise<void>;
  onCompleteReminder: (reminderContent: string) => Promise<boolean>;
  mcpServerSettings?: MCPServerSettings | null;
}

// Helper functions for managing AI provider preference
export const getAIProvider = (): AIProvider => {
  const stored = localStorage.getItem(AI_PROVIDER_KEY);
  return (stored === 'private' || stored === 'google') ? stored : 'google';
};

export const setAIProvider = (provider: AIProvider): void => {
  localStorage.setItem(AI_PROVIDER_KEY, provider);
  // Trigger a custom event so components can react to changes
  window.dispatchEvent(new CustomEvent('ai-provider-changed', { detail: provider }));
};

export const getPrivateServerUrl = (): string => {
  return localStorage.getItem(PRIVATE_SERVER_URL_KEY) || 'ws://localhost:8765/ws/audio';
};

export const setPrivateServerUrl = (url: string): void => {
  localStorage.setItem(PRIVATE_SERVER_URL_KEY, url);
};

export const getPrivateServerApiKey = (): string => {
  return localStorage.getItem(PRIVATE_SERVER_API_KEY) || 'MB8w2x1hGPRBVhZdnRvqJuBxnADUQjFc7GsqXEnJJ8w';
};

export const setPrivateServerApiKey = (apiKey: string): void => {
  localStorage.setItem(PRIVATE_SERVER_API_KEY, apiKey);
};

/**
 * AIConversationProvider - Wrapper that switches between Google Gemini and Private Server
 * based on user preference stored in localStorage
 */
export const AIConversationProvider: React.FC<AIConversationProviderProps> = ({
  children,
  voice,
  systemInstruction,
  assistantId,
  onSaveToMemory,
  onTurnComplete,
  onAddReminder,
  onCompleteReminder,
  mcpServerSettings,
}) => {
  const provider = getAIProvider();
  const privateServerUrl = getPrivateServerUrl();
  const privateServerApiKey = getPrivateServerApiKey();

  // Memoize to prevent unnecessary re-renders
  const providerComponent = useMemo(() => {
    if (provider === 'private') {
      return (
        <PrivateServerProvider
          systemInstruction={systemInstruction}
          assistantId={assistantId}
          onSaveToMemory={onSaveToMemory}
          onTurnComplete={onTurnComplete}
          onAddReminder={onAddReminder}
          onCompleteReminder={onCompleteReminder}
          serverUrl={privateServerUrl}
          apiKey={privateServerApiKey}
        >
          {children}
        </PrivateServerProvider>
      );
    } else {
      return (
        <GeminiLiveProvider
          voice={voice}
          systemInstruction={systemInstruction}
          assistantId={assistantId}
          onSaveToMemory={onSaveToMemory}
          onTurnComplete={onTurnComplete}
          onAddReminder={onAddReminder}
          onCompleteReminder={onCompleteReminder}
          mcpServerSettings={mcpServerSettings}
        >
          {children}
        </GeminiLiveProvider>
      );
    }
  }, [
    provider,
    voice,
    systemInstruction,
    assistantId,
    onSaveToMemory,
    onTurnComplete,
    onAddReminder,
    onCompleteReminder,
    mcpServerSettings,
    privateServerUrl,
    privateServerApiKey,
    children,
  ]);

  return providerComponent;
};

/**
 * Hook to access the AI conversation context
 * Works with both Google and Private Server providers
 */
export const useAIConversation = (): AIConversationContextType => {
  const provider = getAIProvider();

  // Try to get the context from the active provider
  const geminiContext = React.useContext(GeminiLiveContext);
  const privateContext = React.useContext(PrivateServerContext);

  const context = provider === 'private' ? privateContext : geminiContext;

  if (!context) {
    throw new Error('useAIConversation must be used within an AIConversationProvider');
  }

  return context;
};
