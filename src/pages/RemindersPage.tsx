import React, { useState } from 'react';
import { Icon } from '../components/Icon.tsx';
import type { Reminder } from '../types.ts';

interface RemindersPageProps {
  reminders: Reminder[];
  onAdd: (content: string, dueDate: string | null) => Promise<void>;
  onUpdate: (id: string, updates: Partial<Reminder>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onComplete: (id: string) => Promise<void>;
}

export default function RemindersPage({ reminders, onAdd, onUpdate, onDelete, onComplete }: RemindersPageProps) {
  const [newContent, setNewContent] = useState('');
  const [newDueDate, setNewDueDate] = useState('');
  const [editingReminderId, setEditingReminderId] = useState<string | null>(null);
  const [editingData, setEditingData] = useState({
    content: '',
    due_date: '',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [filterCompleted, setFilterCompleted] = useState<'all' | 'active' | 'completed'>('all');
  const [showForm, setShowForm] = useState(false);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContent.trim()) return;

    setIsSaving(true);
    try {
      await onAdd(newContent, newDueDate || null);
      setNewContent('');
      setNewDueDate('');
      setShowForm(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditStart = (reminder: Reminder) => {
    setEditingReminderId(reminder.id);
    setEditingData({
      content: reminder.content,
      due_date: reminder.due_date ? reminder.due_date.split('T')[0] : '',
    });
  };

  const handleEditCancel = () => {
    setEditingReminderId(null);
    setEditingData({
      content: '',
      due_date: '',
    });
  };

  const handleUpdate = async () => {
    if (editingReminderId === null || !editingData.content.trim()) return;

    setIsSaving(true);
    try {
      const updates: Partial<Reminder> = {
        content: editingData.content,
        due_date: editingData.due_date || null,
      };

      await onUpdate(editingReminderId, updates);
      handleEditCancel();
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this reminder?')) {
      await onDelete(id);
    }
  };

  const handleComplete = async (id: string) => {
    await onComplete(id);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'No due date';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const isPastDue = (dueDate: string | null, isCompleted: boolean) => {
    if (!dueDate || isCompleted) return false;
    return new Date(dueDate) < new Date();
  };

  const filteredReminders = reminders
    .filter(r => {
      if (filterCompleted === 'active') return !r.is_completed;
      if (filterCompleted === 'completed') return r.is_completed;
      return true;
    })
    .sort((a, b) => {
      // Sort by completion status first, then by due date
      if (a.is_completed !== b.is_completed) {
        return a.is_completed ? 1 : -1;
      }
      if (!a.due_date) return 1;
      if (!b.due_date) return -1;
      return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
    });

  return (
    <div className="glassmorphic rounded-2xl shadow-2xl p-4 sm:p-8 max-w-4xl mx-auto w-full h-full flex flex-col">
      <header className="flex-shrink-0 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-text-primary dark:text-dark-text-primary flex items-center">
              <Icon name="sparkles" className="w-8 h-8 mr-3" />
              Reminders
            </h1>
            <p className="text-text-secondary dark:text-dark-text-secondary mt-2">
              Manage your reminders and never miss an important task.
            </p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-gradient-to-r from-brand-secondary-glow to-brand-tertiary-glow text-on-brand font-bold py-2 px-4 rounded-full flex items-center transition-all duration-300 shadow-lg"
          >
            <Icon name={showForm ? "x" : "plus"} className="w-5 h-5 mr-1" />
            {showForm ? 'Cancel' : 'New'}
          </button>
        </div>
      </header>

      {showForm && (
        <form onSubmit={handleAdd} className="flex-shrink-0 mb-6 p-4 bg-white/60 dark:bg-dark-base-light/60 rounded-lg border border-border-color dark:border-dark-border-color space-y-3">
          <div>
            <label className="block text-sm font-medium text-text-primary dark:text-dark-text-primary mb-1">
              Reminder *
            </label>
            <textarea
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              placeholder="What do you need to remember?"
              rows={3}
              className="w-full p-2 border border-border-color rounded-md bg-white/70 focus:ring-2 focus:ring-brand-secondary-glow focus:border-transparent transition dark:bg-dark-base-light dark:border-dark-border-color dark:text-dark-text-primary"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary dark:text-dark-text-primary mb-1">
              Due Date (Optional)
            </label>
            <input
              type="date"
              value={newDueDate}
              onChange={(e) => setNewDueDate(e.target.value)}
              className="w-full p-2 border border-border-color rounded-md bg-white/70 focus:ring-2 focus:ring-brand-secondary-glow focus:border-transparent transition dark:bg-dark-base-light dark:border-dark-border-color dark:text-dark-text-primary"
            />
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2 text-text-secondary dark:text-dark-text-secondary hover:text-text-primary dark:hover:text-dark-text-primary transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving || !newContent.trim()}
              className="bg-gradient-to-r from-brand-secondary-glow to-brand-tertiary-glow text-on-brand font-bold py-2 px-4 rounded-full flex items-center transition-all duration-300 shadow-lg disabled:opacity-50"
            >
              <Icon name="plus" className="w-5 h-5 mr-1" />
              Add Reminder
            </button>
          </div>
        </form>
      )}

      <div className="flex-shrink-0 mb-4 flex gap-2">
        {(['all', 'active', 'completed'] as const).map((filter) => (
          <button
            key={filter}
            onClick={() => setFilterCompleted(filter)}
            className={`px-3 py-1 rounded-full text-sm font-medium transition ${
              filterCompleted === filter
                ? 'bg-brand-secondary-glow text-on-brand'
                : 'bg-white/60 dark:bg-dark-base-light/60 text-text-secondary dark:text-dark-text-secondary hover:bg-white/80 dark:hover:bg-dark-base-light/80'
            }`}
          >
            {filter.charAt(0).toUpperCase() + filter.slice(1)}
          </button>
        ))}
      </div>

      <div className="flex-grow space-y-2 overflow-y-auto pr-2">
        {filteredReminders.length === 0 ? (
          <p className="text-text-secondary dark:text-dark-text-secondary text-center py-8">
            No {filterCompleted !== 'all' ? filterCompleted : ''} reminders yet. {filterCompleted === 'all' || filterCompleted === 'active' ? 'Add one to get started!' : ''}
          </p>
        ) : (
          filteredReminders.map((reminder) => (
            <div
              key={reminder.id}
              className={`p-4 rounded-lg border transition-all ${
                editingReminderId === reminder.id
                  ? 'bg-white dark:bg-dark-base-light border-brand-secondary-glow'
                  : isPastDue(reminder.due_date, reminder.is_completed)
                  ? 'bg-red-50/80 dark:bg-red-900/20 border-red-300 dark:border-red-700'
                  : reminder.is_completed
                  ? 'bg-green-50/80 dark:bg-green-900/20 border-green-300 dark:border-green-700'
                  : 'bg-white/60 dark:bg-dark-base-light/60 border-border-color dark:border-dark-border-color'
              }`}
            >
              {editingReminderId === reminder.id ? (
                <div className="space-y-3">
                  <textarea
                    value={editingData.content}
                    onChange={(e) => setEditingData({ ...editingData, content: e.target.value })}
                    rows={3}
                    className="w-full p-2 border border-brand-secondary-glow rounded-md bg-white dark:bg-dark-base-medium dark:text-dark-text-primary"
                  />
                  <input
                    type="date"
                    value={editingData.due_date}
                    onChange={(e) => setEditingData({ ...editingData, due_date: e.target.value })}
                    className="w-full p-2 border border-brand-secondary-glow rounded-md bg-white dark:bg-dark-base-medium dark:text-dark-text-primary"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={handleEditCancel}
                      className="text-text-secondary hover:text-text-primary dark:text-dark-text-secondary dark:hover:text-dark-text-primary"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleUpdate}
                      disabled={isSaving}
                      className="text-green-600 hover:text-green-800 disabled:opacity-50 font-medium"
                    >
                      Save
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-3">
                  <div className="flex-grow">
                    <div className="flex items-start justify-between">
                      <p className={`font-medium ${
                        reminder.is_completed
                          ? 'line-through text-text-secondary dark:text-dark-text-secondary'
                          : 'text-text-primary dark:text-dark-text-primary'
                      }`}>
                        {reminder.content}
                      </p>
                      <span className={`text-xs px-2 py-1 rounded-full ml-2 ${
                        !reminder.is_completed
                          ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200'
                          : 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200'
                      }`}>
                        {reminder.is_completed ? 'Completed' : 'Active'}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 mt-2 text-xs text-text-secondary dark:text-dark-text-secondary">
                      <span className="flex items-center gap-1">
                        <Icon name="calendar" className="w-3 h-3" />
                        {formatDate(reminder.due_date)}
                      </span>
                      {isPastDue(reminder.due_date, reminder.is_completed) && (
                        <span className="text-red-600 dark:text-red-400 font-medium">
                          Overdue
                        </span>
                      )}
                      {reminder.completed_at && (
                        <span className="text-green-600 dark:text-green-400">
                          Completed: {formatDate(reminder.completed_at)}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex-shrink-0 flex items-center gap-2">
                    {!reminder.is_completed && (
                      <button
                        onClick={() => handleComplete(reminder.id)}
                        className="text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300"
                        title="Complete"
                      >
                        <Icon name="check" className="w-5 h-5" />
                      </button>
                    )}
                    <button
                      onClick={() => handleEditStart(reminder)}
                      className="text-brand-secondary-glow hover:underline text-sm"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(reminder.id)}
                      className="text-danger hover:text-danger-hover"
                    >
                      <Icon name="trash" className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
