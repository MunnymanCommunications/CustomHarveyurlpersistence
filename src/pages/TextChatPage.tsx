import React, { useState, useRef, useEffect } from 'react';
import type { Assistant } from '../types.ts';
import { Icon } from '../components/Icon.tsx';
import { MarkdownText } from '../components/MarkdownText.tsx';
import { DEFAULT_AVATAR_URL } from '../constants.ts';

// Define a simple message type for the chat
interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

interface TextChatPageProps {
  assistant: Assistant;
  messages: ChatMessage[];
  onSendMessage: (message: string) => Promise<void>;
  isSending: boolean;
  onToggleVoice: () => void;
}

export default function TextChatPage({ assistant, messages, onSendMessage, isSending, onToggleVoice }: TextChatPageProps) {
  const [inputText, setInputText] = useState('');
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputText.trim() && !isSending) {
      onSendMessage(inputText);
      setInputText('');
    }
  };

  const handleCopy = async (text: string, index: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };

  return (
    <div className="flex flex-col h-full w-full max-w-4xl mx-auto px-4 pt-20 relative">
      {/* Voice Mode Button - Top Right */}
      <button
        onClick={onToggleVoice}
        className="absolute top-8 right-8 bg-gradient-to-r from-brand-secondary-glow to-brand-tertiary-glow text-on-brand rounded-full shadow-lg hover:shadow-2xl hover:scale-110 transition-all duration-300 z-20 overflow-hidden"
        aria-label="Switch to voice mode"
      >
        <img
          src={assistant.avatar || DEFAULT_AVATAR_URL}
          alt="Switch to voice mode"
          className="w-14 h-14 object-cover"
        />
      </button>

      <div className="flex-grow overflow-y-auto pr-4 space-y-4 chat-container">
        {messages.map((msg, index) => (
          <div key={index} className={`flex items-start gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'model' && (
              <img src={assistant.avatar || DEFAULT_AVATAR_URL} alt="assistant" className="w-8 h-8 rounded-full flex-shrink-0 mt-1" />
            )}
            <div className="flex flex-col gap-2 max-w-[75%]">
              <div className={`chat-bubble ${msg.role === 'user' ? 'chat-bubble-user' : 'chat-bubble-assistant'} relative group`}>
                <MarkdownText text={msg.text} className="text-text-primary dark:text-dark-text-primary" />
                <button
                  onClick={() => handleCopy(msg.text, index)}
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-base-medium dark:bg-dark-base-medium hover:bg-base-dark dark:hover:bg-dark-base-dark p-1.5 rounded"
                  aria-label="Copy message"
                  title={copiedIndex === index ? "Copied!" : "Copy"}
                >
                  {copiedIndex === index ? (
                    <svg className="w-4 h-4 text-brand-secondary-glow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          </div>
        ))}
        {isSending && messages.length > 0 && messages[messages.length - 1]?.role === 'user' && (
          <div className="flex items-end gap-3 justify-start">
             <img src={assistant.avatar || DEFAULT_AVATAR_URL} alt="assistant" className="w-8 h-8 rounded-full self-start flex-shrink-0" />
             <div className="chat-bubble chat-bubble-assistant">
                <div className="typing-indicator">
                    <span></span>
                    <span></span>
                    <span></span>
                </div>
             </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit} className="flex-shrink-0 py-4">
        <div className="flex items-center gap-2 glassmorphic rounded-full p-2 border border-transparent focus-within:border-brand-secondary-glow transition-colors">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Type your message..."
            className="flex-grow bg-transparent focus:outline-none px-4 text-text-primary dark:text-dark-text-primary"
          />
          <button
            type="submit"
            disabled={!inputText.trim() || isSending}
            className="bg-gradient-to-r from-brand-secondary-glow to-brand-tertiary-glow text-on-brand rounded-full p-3 transition-transform transform hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Send message"
          >
            <Icon name="chevronRight" className="w-6 h-6" />
          </button>
        </div>
      </form>
    </div>
  );
}