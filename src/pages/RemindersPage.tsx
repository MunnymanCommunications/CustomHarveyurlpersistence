import React, { useState } from 'react';
import { Icon } from '../components/Icon.tsx';
import type { Reminder, ReminderStatus } from '../types.ts';

interface RemindersPageProps {
  reminders: Reminder[];
  onAdd: (title: string, description: string, dueDate: string, reminderTime?: string) => Promise<void>;
  onUpdate: (id: string, updates: Partial<Reminder>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onComplete: (id: string) => Promise<void>;
}

export default function RemindersPage({ reminders, onAdd, onUpdate, onDelete, onComplete }: RemindersPageProps) {
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newDueDate, setNewDueDate] = useState('');
  const [newReminderTime, setNewReminderTime] = useState('');
  const [editingReminderId, setEditingReminderId] = useState<string | null>(null);
  const [editingData, setEditingData] = useState({
    title: '',
    description: '',
    due_date: '',
    reminder_time: '',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [filterStatus, setFilterStatus] = useState<ReminderStatus | 'all'>('all');
  const [showForm, setShowForm] = useState(false);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newDueDate) return;

    setIsSaving(true);
    try {
      await onAdd(newTitle, newDescription, newDueDate, newReminderTime || undefined);
      setNewTitle('');
      setNewDescription('');
      setNewDueDate('');
      setNewReminderTime('');
      setShowForm(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditStart = (reminder: Reminder) => {
    setEditingReminderId(reminder.id);
    setEditingData({
      title: reminder.title,
      description: reminder.description || '',
      due_date: reminder.due_date.split('T')[0],
      reminder_time: reminder.reminder_time?.split('T')[1]?.substring(0, 5) || '',
    });
  };

  const handleEditCancel = () => {
    setEditingReminderId(null);
    setEditingData({
      title: '',
      description: '',
      due_date: '',
      reminder_time: '',
    });
  };

  const handleUpdate = async () => {
    if (editingReminderId === null || !editingData.title.trim()) return;

    setIsSaving(true);
    try {
      const updates: Partial<Reminder> = {
        title: editingData.title,
        description: editingData.description,
        due_date: editingData.due_date,
      };

      if (editingData.reminder_time) {
        updates.reminder_time = `${editingData.due_date}T${editingData.reminder_time}:00Z`;
      }

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

  const formatDateTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const isPastDue = (dueDate: string, status: ReminderStatus) => {
    return status === 'pending' && new Date(dueDate) < new Date();
  };

  const filteredReminders = reminders.filter(r =>
    filterStatus === 'all' || r.status === filterStatus
  ).sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());

  return (
    <div className="glassmorphic rounded-2xl shadow-2xl p-4 sm:p-8 max-w-4xl mx-auto w-full h-full flex flex-col">
      <header className="flex-shrink-0 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-text-primary dark:text-dark-text-primary flex items-center">
              <Icon name="clock" className="w-8 h-8 mr-3" />
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
              Title *
            </label>
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="What do you need to remember?"
              className="w-full p-2 border border-border-color rounded-md bg-white/70 focus:ring-2 focus:ring-brand-secondary-glow focus:border-transparent transition dark:bg-dark-base-light dark:border-dark-border-color dark:text-dark-text-primary"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary dark:text-dark-text-primary mb-1">
              Description
            </label>
            <textarea
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              placeholder="Add more details..."
              rows={2}
              className="w-full p-2 border border-border-color rounded-md bg-white/70 focus:ring-2 focus:ring-brand-secondary-glow focus:border-transparent transition dark:bg-dark-base-light dark:border-dark-border-color dark:text-dark-text-primary"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-text-primary dark:text-dark-text-primary mb-1">
                Due Date *
              </label>
              <input
                type="date"
                value={newDueDate}
                onChange={(e) => setNewDueDate(e.target.value)}
                className="w-full p-2 border border-border-color rounded-md bg-white/70 focus:ring-2 focus:ring-brand-secondary-glow focus:border-transparent transition dark:bg-dark-base-light dark:border-dark-border-color dark:text-dark-text-primary"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text-primary dark:text-dark-text-primary mb-1">
                Reminder Time
              </label>
              <input
                type="time"
                value={newReminderTime}
                onChange={(e) => setNewReminderTime(e.target.value)}
                className="w-full p-2 border border-border-color rounded-md bg-white/70 focus:ring-2 focus:ring-brand-secondary-glow focus:border-transparent transition dark:bg-dark-base-light dark:border-dark-border-color dark:text-dark-text-primary"
              />
            </div>
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
              disabled={isSaving || !newTitle.trim() || !newDueDate}
              className="bg-gradient-to-r from-brand-secondary-glow to-brand-tertiary-glow text-on-brand font-bold py-2 px-4 rounded-full flex items-center transition-all duration-300 shadow-lg disabled:opacity-50"
            >
              <Icon name="plus" className="w-5 h-5 mr-1" />
              Add Reminder
            </button>
          </div>
        </form>
      )}

      <div className="flex-shrink-0 mb-4 flex gap-2">
        {(['all', 'pending', 'completed', 'cancelled'] as const).map((status) => (
          <button
            key={status}
            onClick={() => setFilterStatus(status)}
            className={`px-3 py-1 rounded-full text-sm font-medium transition ${
              filterStatus === status
                ? 'bg-brand-secondary-glow text-on-brand'
                : 'bg-white/60 dark:bg-dark-base-light/60 text-text-secondary dark:text-dark-text-secondary hover:bg-white/80 dark:hover:bg-dark-base-light/80'
            }`}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </button>
        ))}
      </div>

      <div className="flex-grow space-y-2 overflow-y-auto pr-2">
        {filteredReminders.length === 0 ? (
          <p className="text-text-secondary dark:text-dark-text-secondary text-center py-8">
            No {filterStatus !== 'all' ? filterStatus : ''} reminders yet. {filterStatus === 'all' || filterStatus === 'pending' ? 'Add one to get started!' : ''}
          </p>
        ) : (
          filteredReminders.map((reminder) => (
            <div
              key={reminder.id}
              className={`p-4 rounded-lg border transition-all ${
                editingReminderId === reminder.id
                  ? 'bg-white dark:bg-dark-base-light border-brand-secondary-glow'
                  : isPastDue(reminder.due_date, reminder.status)
                  ? 'bg-red-50/80 dark:bg-red-900/20 border-red-300 dark:border-red-700'
                  : reminder.status === 'completed'
                  ? 'bg-green-50/80 dark:bg-green-900/20 border-green-300 dark:border-green-700'
                  : 'bg-white/60 dark:bg-dark-base-light/60 border-border-color dark:border-dark-border-color'
              }`}
            >
              {editingReminderId === reminder.id ? (
                <div className="space-y-3">
                  <input
                    type="text"
                    value={editingData.title}
                    onChange={(e) => setEditingData({ ...editingData, title: e.target.value })}
                    className="w-full p-2 border border-brand-secondary-glow rounded-md bg-white dark:bg-dark-base-medium dark:text-dark-text-primary"
                  />
                  <textarea
                    value={editingData.description}
                    onChange={(e) => setEditingData({ ...editingData, description: e.target.value })}
                    placeholder="Description..."
                    rows={2}
                    className="w-full p-2 border border-brand-secondary-glow rounded-md bg-white dark:bg-dark-base-medium dark:text-dark-text-primary"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="date"
                      value={editingData.due_date}
                      onChange={(e) => setEditingData({ ...editingData, due_date: e.target.value })}
                      className="p-2 border border-brand-secondary-glow rounded-md bg-white dark:bg-dark-base-medium dark:text-dark-text-primary"
                    />
                    <input
                      type="time"
                      value={editingData.reminder_time}
                      onChange={(e) => setEditingData({ ...editingData, reminder_time: e.target.value })}
                      className="p-2 border border-brand-secondary-glow rounded-md bg-white dark:bg-dark-base-medium dark:text-dark-text-primary"
                    />
                  </div>
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
                      <h3 className={`font-semibold text-lg ${
                        reminder.status === 'completed'
                          ? 'line-through text-text-secondary dark:text-dark-text-secondary'
                          : 'text-text-primary dark:text-dark-text-primary'
                      }`}>
                        {reminder.title}
                      </h3>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        reminder.status === 'pending'
                          ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200'
                          : reminder.status === 'completed'
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200'
                      }`}>
                        {reminder.status}
                      </span>
                    </div>

                    {reminder.description && (
                      <p className="text-text-secondary dark:text-dark-text-secondary mt-1 text-sm">
                        {reminder.description}
                      </p>
                    )}

                    <div className="flex items-center gap-4 mt-2 text-xs text-text-secondary dark:text-dark-text-secondary">
                      <span className="flex items-center gap-1">
                        <Icon name="calendar" className="w-3 h-3" />
                        {formatDateTime(reminder.due_date)}
                      </span>
                      {isPastDue(reminder.due_date, reminder.status) && (
                        <span className="text-red-600 dark:text-red-400 font-medium">
                          Overdue
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex-shrink-0 flex items-center gap-2">
                    {reminder.status === 'pending' && (
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
