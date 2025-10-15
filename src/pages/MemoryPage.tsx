import React, { useState } from 'react';
import { Icon } from '../components/Icon.tsx';

interface MemoryPageProps {
  knowledgeBase: string;
  onSave: (newKnowledge: string) => Promise<void>;
}

export default function MemoryPage({ knowledgeBase, onSave }: MemoryPageProps) {
  const [currentKnowledge, setCurrentKnowledge] = useState(knowledgeBase);
  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    await onSave(currentKnowledge);
    setIsSaving(false);
    setIsDirty(false);
  };
  
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setCurrentKnowledge(e.target.value);
    setIsDirty(true);
  };

  return (
    <div className="glassmorphic rounded-2xl shadow-2xl p-4 sm:p-8 max-w-4xl mx-auto w-full h-full flex flex-col">
      <header className="flex-shrink-0 mb-6">
        <h1 className="text-3xl font-bold text-text-primary flex items-center">
          <Icon name="brain" className="w-8 h-8 mr-3" />
          Memory Bank
        </h1>
        <p className="text-text-secondary mt-2">
          This is the assistant's long-term memory. Add, edit, or remove information to shape its knowledge.
        </p>
      </header>
      
      <div className="flex-grow flex flex-col">
        <textarea
          value={currentKnowledge}
          onChange={handleChange}
          className="w-full h-full flex-grow p-4 border border-border-color rounded-md bg-white/70 focus:ring-2 focus:ring-brand-secondary-glow focus:border-transparent transition"
          placeholder="e.g., The user's name is Alex. Alex is a software engineer..."
          rows={15}
        />
      </div>

      <footer className="flex-shrink-0 flex justify-end items-center pt-6">
        <button
          onClick={handleSave}
          disabled={!isDirty || isSaving}
          className="bg-gradient-to-r from-brand-secondary-glow to-brand-tertiary-glow text-on-brand font-bold py-2 px-6 rounded-full flex items-center transition-all duration-300 shadow-lg transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSaving ? (
            <>
              <Icon name="loader" className="w-5 h-5 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            'Save Changes'
          )}
        </button>
      </footer>
    </div>
  );
}
