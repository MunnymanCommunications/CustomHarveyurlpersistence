import React, { useState, useRef, useEffect } from 'react';
import type { Assistant } from '../types.ts';
import { Icon } from '../components/Icon.tsx';
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
}

export default function TextChatPage({ assistant, messages, onSendMessage, isSending }: TextChatPageProps) {
  const [inputText, setInputText] = useState('');
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

  return (
    <div className="flex flex-col h-full w-full max-w-4xl mx-auto px-4 pt-20">
      <div className="flex-grow overflow-y-auto pr-4 space-y-4 chat-container">
        {messages.map((msg, index) => (
          <div key={index} className={`flex items-end gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'model' && (
              <img src={assistant.avatar || DEFAULT_AVATAR_URL} alt="assistant" className="w-8 h-8 rounded-full self-start flex-shrink-0" />
            )}
            <div className={`chat-bubble ${msg.role === 'user' ? 'chat-bubble-user' : 'chat-bubble-assistant'}`}>
              <p className="text-text-primary dark:text-dark-text-primary">{msg.text}</p>
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