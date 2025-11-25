import React, { useState } from 'react';
import { Icon } from '../components/Icon.tsx';
import type { Reminder } from '../types.ts';

interface RemindersPageProps {
  reminders: Reminder[];
  onAdd: (content: string, dueDate: string | null) => Promise<void>;
  onComplete: (id: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export default function RemindersPage({ reminders, onAdd, onComplete, onDelete }: RemindersPageProps) {
  const [newReminderContent, setNewReminderContent] = useState('');
  const [newReminderDate, setNewReminderDate] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);
  const [completingId, setCompletingId] = useState<string | null>(null);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReminderContent.trim()) return;

    setIsSaving(true);
    const dueDate = newReminderDate ? new Date(newReminderDate).toISOString() : null;
    await onAdd(newReminderContent, dueDate);
    setNewReminderContent('');
    setNewReminderDate('');
    setIsSaving(false);
  };

  const handleComplete = async (id: string) => {
    setCompletingId(id);
    try {
      await onComplete(id);
    } finally {
      setCompletingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this reminder?')) {
      await onDelete(id);
    }
  };

  const activeReminders = reminders.filter(r => !r.is_completed);
  const completedReminders = reminders.filter(r => r.is_completed);
  const displayedReminders = showCompleted ? completedReminders : activeReminders;

  // Debug logging
  console.log('Reminders debug:', {
    total: reminders.length,
    active: activeReminders.length,
    completed: completedReminders.length,
    showCompleted,
    displayed: displayedReminders.length
  });

  const formatDueDate = (dateString: string | null) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return <span className="text-danger">Overdue</span>;
    if (diffDays === 0) return <span className="text-warning">Today</span>;
    if (diffDays === 1) return <span className="text-warning">Tomorrow</span>;
    if (diffDays <= 3) return <span className="text-warning">{diffDays} days</span>;

    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="flex flex-col h-full p-6 overflow-y-auto">
      <div className="max-w-3xl mx-auto w-full">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-text-primary dark:text-dark-text-primary">
            Reminders
          </h1>
          <div className="flex gap-2">
            <button
              onClick={() => setShowCompleted(false)}
              className={`px-4 py-2 rounded-lg transition-colors ${
                !showCompleted
                  ? 'bg-brand-secondary-glow text-on-brand'
                  : 'bg-base-medium dark:bg-dark-base-medium text-text-secondary dark:text-dark-text-secondary'
              }`}
            >
              Active ({activeReminders.length})
            </button>
            <button
              onClick={() => setShowCompleted(true)}
              className={`px-4 py-2 rounded-lg transition-colors ${
                showCompleted
                  ? 'bg-brand-secondary-glow text-on-brand'
                  : 'bg-base-medium dark:bg-dark-base-medium text-text-secondary dark:text-dark-text-secondary'
              }`}
            >
              Completed ({completedReminders.length})
            </button>
          </div>
        </div>

        {/* Add New Reminder Form */}
        {!showCompleted && (
          <form onSubmit={handleAdd} className="mb-6">
            <div className="glassmorphic rounded-xl p-4 border border-transparent focus-within:border-brand-secondary-glow transition-colors">
              <textarea
                value={newReminderContent}
                onChange={(e) => setNewReminderContent(e.target.value)}
                placeholder="What would you like to be reminded about?"
                className="w-full bg-transparent focus:outline-none resize-none text-text-primary dark:text-dark-text-primary mb-3"
                rows={2}
              />
              <div className="flex items-center gap-3">
                <div className="flex-1 flex items-center gap-2">
                  <Icon name="history" className="w-5 h-5 text-text-secondary dark:text-dark-text-secondary" />
                  <input
                    type="date"
                    value={newReminderDate}
                    onChange={(e) => setNewReminderDate(e.target.value)}
                    className="flex-1 bg-transparent focus:outline-none text-text-secondary dark:text-dark-text-secondary"
                  />
                </div>
                <button
                  type="submit"
                  disabled={!newReminderContent.trim() || isSaving}
                  className="bg-gradient-to-r from-brand-secondary-glow to-brand-tertiary-glow text-on-brand px-6 py-2 rounded-lg transition-transform transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSaving ? 'Adding...' : 'Add Reminder'}
                </button>
              </div>
            </div>
          </form>
        )}

        {/* Reminders List */}
        <div className="space-y-3">
          {displayedReminders.length === 0 ? (
            <div className="text-center py-12 text-text-secondary dark:text-dark-text-secondary">
              <Icon name="sparkles" className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p>
                {showCompleted
                  ? 'No completed reminders yet'
                  : 'No active reminders. Add one above to get started!'}
              </p>
            </div>
          ) : (
            displayedReminders.map((reminder) => (
              <div
                key={reminder.id}
                className={`glassmorphic rounded-xl p-4 border transition-all ${
                  reminder.is_completed
                    ? 'border-success/30 opacity-70'
                    : 'border-transparent hover:border-brand-secondary-glow/30'
                }`}
              >
                <div className="flex items-start gap-3">
                  {!reminder.is_completed && (
                    <button
                      onClick={() => handleComplete(reminder.id)}
                      disabled={completingId === reminder.id}
                      className="mt-0.5 flex-shrink-0 w-6 h-6 rounded-full border-2 border-text-secondary dark:border-dark-text-secondary hover:border-brand-secondary-glow hover:bg-brand-secondary-glow/20 transition-all flex items-center justify-center group disabled:opacity-50"
                      aria-label="Mark as complete"
                      title="Click to mark as complete"
                    >
                      {completingId === reminder.id ? (
                        <div className="w-3 h-3 border-2 border-brand-secondary-glow border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Icon name="check" className="w-3 h-3 text-transparent group-hover:text-brand-secondary-glow transition-colors" />
                      )}
                    </button>
                  )}
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-text-primary dark:text-dark-text-primary ${
                        reminder.is_completed ? 'line-through opacity-70' : ''
                      }`}
                    >
                      {reminder.content}
                    </p>
                    {reminder.due_date && (
                      <p className="text-sm text-text-secondary dark:text-dark-text-secondary mt-1">
                        {formatDueDate(reminder.due_date)}
                      </p>
                    )}
                    {reminder.completed_at && (
                      <p className="text-sm text-success mt-1">
                        Completed {new Date(reminder.completed_at).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => handleDelete(reminder.id)}
                    className="flex-shrink-0 p-2 hover:bg-base-medium dark:hover:bg-dark-base-medium rounded-lg transition-colors"
                    aria-label="Delete reminder"
                  >
                    <Icon name="trash" className="w-5 h-5 text-danger" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
