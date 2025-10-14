import React, { useState } from 'react';
import { Icon } from '../components/Icon.tsx';

interface MemoryPageProps {
  memory: string[];
  setMemory: React.Dispatch<React.SetStateAction<string[]>>;
}

export default function MemoryPage({ memory, setMemory }: MemoryPageProps) {
  const [newItem, setNewItem] = useState('');

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (newItem.trim() && !memory.includes(newItem.trim())) {
      setMemory(prev => [newItem.trim(), ...prev]);
      setNewItem('');
    }
  };

  const handleRemoveItem = (itemToRemove: string) => {
    setMemory(prev => prev.filter(item => item !== itemToRemove));
  };

  return (
    <div className="glassmorphic rounded-2xl shadow-2xl p-4 sm:p-8 max-w-4xl mx-auto w-full h-full flex flex-col">
      <header className="flex-shrink-0 mb-6">
        <h1 className="text-3xl font-bold text-text-primary flex items-center">
          <Icon name="brain" className="w-8 h-8 mr-3" />
          Memory Bank
        </h1>
        <p className="text-text-secondary mt-1">
          Provide key facts and information for your assistant to remember during conversations.
        </p>
      </header>

      {/* Add new memory item form */}
      <form onSubmit={handleAddItem} className="flex-shrink-0 flex items-center gap-3 mb-6">
        <input
          type="text"
          value={newItem}
          onChange={e => setNewItem(e.target.value)}
          placeholder="Add a new fact (e.g., My favorite color is blue)"
          className="flex-grow p-3 border border-border-color rounded-full bg-white/70 focus:ring-2 focus:ring-brand-secondary-glow focus:border-transparent transition"
        />
        <button
          type="submit"
          className="bg-gradient-to-r from-brand-secondary-glow to-brand-tertiary-glow text-on-brand font-bold p-3 rounded-full flex items-center justify-center transition-transform duration-300 transform hover:scale-105"
          aria-label="Add memory item"
        >
          <Icon name="plus" className="w-6 h-6" />
        </button>
      </form>

      {/* Memory list */}
      <div className="flex-grow space-y-3 overflow-y-auto pr-2">
        {memory.length === 0 ? (
          <p className="text-text-secondary text-center py-8">The memory bank is empty.</p>
        ) : (
          memory.map((item, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-white/60 rounded-lg border border-border-color animate-fade-in">
              <p className="text-text-primary">{item}</p>
              <button onClick={() => handleRemoveItem(item)} className="text-danger hover:text-danger-hover p-1 rounded-full" aria-label={`Remove "${item}"`}>
                <Icon name="trash" className="w-5 h-5" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
