import React, { useState } from 'react';
import { Icon } from '../components/Icon.tsx';
import type { MemoryItem } from '../types.ts';

interface MemoryPageProps {
  memories: MemoryItem[];
  onAdd: (content: string) => Promise<void>;
  onUpdate: (id: number, content: string) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
}

export default function MemoryPage({ memories, onAdd, onUpdate, onDelete }: MemoryPageProps) {
  const [newMemoryContent, setNewMemoryContent] = useState('');
  const [editingMemoryId, setEditingMemoryId] = useState<number | null>(null);
  const [editingContent, setEditingContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemoryContent.trim()) return;

    setIsSaving(true);
    await onAdd(newMemoryContent);
    setNewMemoryContent('');
    setIsSaving(false);
  };

  const handleEditStart = (memory: MemoryItem) => {
    setEditingMemoryId(memory.id);
    setEditingContent(memory.content);
  };

  const handleEditCancel = () => {
    setEditingMemoryId(null);
    setEditingContent('');
  };

  const handleUpdate = async () => {
    if (editingMemoryId === null || !editingContent.trim()) return;
    setIsSaving(true);
    await onUpdate(editingMemoryId, editingContent);
    handleEditCancel();
    setIsSaving(false);
  };
  
  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this memory?')) {
        await onDelete(id);
    }
  }

  return (
    <div className="glassmorphic rounded-2xl shadow-2xl p-4 sm:p-8 max-w-4xl mx-auto w-full h-full flex flex-col">
      <header className="flex-shrink-0 mb-6">
        <h1 className="text-3xl font-bold text-text-primary dark:text-dark-text-primary flex items-center">
          <Icon name="brain" className="w-8 h-8 mr-3" />
          Memory Bank
        </h1>
        <p className="text-text-secondary dark:text-dark-text-secondary mt-2">
          This is the assistant's long-term memory. Add, edit, or remove information to shape its knowledge.
        </p>
      </header>
      
      <form onSubmit={handleAdd} className="flex-shrink-0 flex items-center gap-2 mb-6">
        <input
            type="text"
            value={newMemoryContent}
            onChange={(e) => setNewMemoryContent(e.target.value)}
            placeholder="Add a new memory..."
            className="flex-grow p-2 border border-border-color rounded-md bg-white/70 focus:ring-2 focus:ring-brand-secondary-glow focus:border-transparent transition dark:bg-dark-base-light dark:border-dark-border-color dark:text-dark-text-primary"
        />
        <button type="submit" disabled={isSaving || !newMemoryContent.trim()} className="bg-gradient-to-r from-brand-secondary-glow to-brand-tertiary-glow text-on-brand font-bold py-2 px-4 rounded-full flex items-center transition-all duration-300 shadow-lg disabled:opacity-50">
            <Icon name="plus" className="w-5 h-5 mr-1" /> Add
        </button>
      </form>
      
      <div className="flex-grow space-y-2 overflow-y-auto pr-2">
        {memories.length === 0 ? (
          <p className="text-text-secondary dark:text-dark-text-secondary text-center py-8">No memories yet. Add one above to get started.</p>
        ) : (
          memories.map((memory) => (
            <div key={memory.id} className="p-3 bg-white/60 rounded-lg border border-border-color flex items-center gap-2 dark:bg-dark-base-light/60 dark:border-dark-border-color">
              {editingMemoryId === memory.id ? (
                 <input
                    type="text"
                    value={editingContent}
                    onChange={(e) => setEditingContent(e.target.value)}
                    className="flex-grow p-1 border border-brand-secondary-glow rounded-md bg-white dark:bg-dark-base-medium dark:text-dark-text-primary"
                 />
              ) : (
                <p className="flex-grow text-text-secondary dark:text-dark-text-secondary">{memory.content}</p>
              )}
              
              <div className="flex-shrink-0 flex items-center gap-2">
                {editingMemoryId === memory.id ? (
                    <>
                        <button onClick={handleUpdate} disabled={isSaving} className="text-green-600 hover:text-green-800 disabled:opacity-50">Save</button>
                        <button onClick={handleEditCancel} className="text-text-secondary hover:text-text-primary dark:text-dark-text-secondary dark:hover:text-dark-text-primary">Cancel</button>
                    </>
                ) : (
                    <>
                        <button onClick={() => handleEditStart(memory)} className="text-brand-secondary-glow hover:underline text-sm">Edit</button>
                        <button onClick={() => handleDelete(memory.id)} className="text-danger hover:text-danger-hover">
                            <Icon name="trash" className="w-4 h-4" />
                        </button>
                    </>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}