import React, { useState } from 'react';
import { Icon } from '../components/Icon';

interface MemoryPageProps {
  memory: string[];
  setMemory: (newMemory: string[]) => Promise<void>;
}

export default function MemoryPage({ memory, setMemory }: MemoryPageProps) {
  const [localMemory, setLocalMemory] = useState<string[]>(memory);
  const [isSaving, setIsSaving] = useState(false);

  const handleMemoryChange = (index: number, value: string) => {
    const newMemory = [...localMemory];
    newMemory[index] = value;
    setLocalMemory(newMemory);
  };

  const deleteMemory = (index: number) => {
    const newMemory = localMemory.filter((_, i) => i !== index);
    setLocalMemory(newMemory);
  };

  const addMemory = () => {
    setLocalMemory(prev => [...prev, '']);
  }

  const handleSaveChanges = async () => {
    setIsSaving(true);
    await setMemory(localMemory.filter(item => item.trim() !== '')); // Remove empty memories on save
    setIsSaving(false);
  };

  return (
    <div className="glassmorphic rounded-2xl shadow-2xl p-4 sm:p-8 max-w-4xl mx-auto w-full h-full flex flex-col">
      <header className="flex-shrink-0 flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-text-primary flex items-center">
          <Icon name="brain" className="w-8 h-8 mr-3" />
          Memory Bank
        </h1>
      </header>
      
      <div className="flex-grow space-y-4 mb-6 overflow-y-auto pr-2">
        {localMemory.map((item, index) => (
          <div key={index} className="flex items-center gap-3">
            <input
              type="text"
              value={item}
              onChange={(e) => handleMemoryChange(index, e.target.value)}
              className="flex-grow settings-input"
              placeholder="Enter a memory..."
            />
            <button
              onClick={() => deleteMemory(index)}
              className="p-2 bg-danger/80 hover:bg-danger rounded-full text-on-brand transition-colors"
              aria-label="Delete memory"
            >
              <Icon name="trash" className="w-5 h-5" />
            </button>
          </div>
        ))}
         <button onClick={addMemory} className="w-full text-left flex items-center gap-2 p-2 rounded-md text-brand-secondary-glow hover:bg-black/5 transition-colors">
            <Icon name="plus" className="w-5 h-5" />
            Add New Memory
        </button>
      </div>

      <footer className="flex-shrink-0 flex justify-end">
        <button
          onClick={handleSaveChanges}
          disabled={isSaving}
          className="bg-gradient-to-r from-brand-secondary-glow to-brand-tertiary-glow text-on-brand font-bold py-2 px-6 rounded-full flex items-center transition-all duration-300 shadow-lg transform hover:scale-105 disabled:opacity-50"
        >
          {isSaving ? 'Saving...' : 'Save Changes'}
        </button>
      </footer>
    </div>
  );
}