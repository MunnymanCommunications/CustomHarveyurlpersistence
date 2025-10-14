import React, { useState } from 'react';
import { Icon } from '../components/Icon';

interface MemoryPageProps {
  memory: string[];
  setMemory: (memory: string[]) => void;
}

export default function MemoryPage({ memory, setMemory }: MemoryPageProps) {
  const [newItem, setNewItem] = useState('');

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (newItem.trim() && !memory.includes(newItem.trim())) {
      setMemory([...memory, newItem.trim()]);
      setNewItem('');
    }
  };

  const handleRemoveItem = (itemToRemove: string) => {
    setMemory(memory.filter(item => item !== itemToRemove));
  };

  return (
    <div className="glassmorphic rounded-2xl shadow-2xl p-4 sm:p-8 max-w-4xl mx-auto w-full h-full flex flex-col">
      <header className="flex-shrink-0 mb-6">
        <h1 className="text-3xl font-bold text-text-primary flex items-center">
          <Icon name="brain" className="w-8 h-8 mr-3" />
          Memory Bank
        </h1>
        <p className="text-text-secondary mt-2">
          This is the long-term memory for your assistant. Add or remove facts it should always remember.
        </p>
      </header>

      <div className="flex-grow space-y-4 mb-6 overflow-y-auto pr-2">
        {memory.length === 0 ? (
          <p className="text-text-secondary text-center py-8">Memory is empty.</p>
        ) : (
          <ul className="space-y-2">
            {memory.map((item, index) => (
              <li
                key={index}
                className="flex items-center justify-between p-3 bg-white/60 rounded-lg border border-border-color group"
              >
                <span className="text-text-primary">{item}</span>
                <button
                  onClick={() => handleRemoveItem(item)}
                  className="p-1 rounded-full text-text-tertiary opacity-0 group-hover:opacity-100 hover:bg-danger/20 hover:text-danger transition-opacity"
                  aria-label={`Remove "${item}"`}
                >
                  <Icon name="trash" className="w-5 h-5" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <footer className="flex-shrink-0">
        <form onSubmit={handleAddItem} className="flex gap-4">
          <input
            type="text"
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
            placeholder="Add a new fact to memory..."
            className="flex-grow p-3 border border-border-color rounded-full bg-white/70 focus:ring-2 focus:ring-brand-secondary-glow focus:border-transparent transition"
          />
          <button
            type="submit"
            className="bg-gradient-to-r from-brand-secondary-glow to-brand-tertiary-glow text-on-brand font-bold p-3 rounded-full flex items-center justify-center transition-all duration-300 shadow-lg transform hover:scale-105 disabled:opacity-50"
            disabled={!newItem.trim()}
          >
            <Icon name="plus" className="w-6 h-6" />
          </button>
        </form>
      </footer>
    </div>
  );
}
