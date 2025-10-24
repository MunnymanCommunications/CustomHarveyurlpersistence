import React, { useState, useEffect } from 'react';
import { getSupabase } from '../lib/supabaseClient.ts';
import type { User } from '@supabase/supabase-js';
import { SettingsPanel } from '../components/SettingsPanel.tsx';
import type { Assistant } from '../types.ts';
import { Icon } from '../components/Icon.tsx';

interface SettingsDashboardPageProps {
  settings: Assistant;
  onSettingsChange: (newSettings: Assistant) => Promise<void>;
  previewMode: boolean;
}

export default function SettingsDashboardPage({ settings, onSettingsChange, previewMode }: SettingsDashboardPageProps) {
  const [localSettings, setLocalSettings] = useState<Assistant>(settings);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = getSupabase();
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user));
  }, []);
  
  useEffect(() => {
    setLocalSettings(settings);
    setHasChanges(false);
  }, [settings]);

  const handleLocalSettingsChange = (newSettings: Partial<Assistant>) => {
    setLocalSettings(prev => ({ ...prev, ...newSettings }));
    if (!hasChanges) setHasChanges(true);
  };
  
  const handleTogglePublic = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleLocalSettingsChange({ is_public: e.target.checked });
  };

  const handleSaveChanges = async () => {
    setIsSaving(true);
    setSaveError(null);
    try {
      await onSettingsChange(localSettings);
      setHasChanges(false);
    } catch (error: any) {
      setSaveError(error.message || 'Failed to save changes. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleResetChanges = () => {
    setLocalSettings(settings);
    setHasChanges(false);
  };
  
  const isOriginalCreator = user?.id === settings.user_id && !settings.original_assistant_id;

  if (previewMode) {
    return (
        <div className="w-full max-w-4xl mx-auto glassmorphic p-4 sm:p-8 h-full flex flex-col items-center justify-center text-center">
            <Icon name="settings" className="w-16 h-16 text-text-secondary dark:text-dark-text-secondary mb-4" />
            <h1 className="text-2xl font-bold text-text-primary dark:text-dark-text-primary">Settings unavailable in preview mode</h1>
            <p className="text-text-secondary dark:text-dark-text-secondary mt-2">Add this assistant to your dashboard to view and edit its settings.</p>
        </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto glassmorphic p-4 sm:p-8 h-full flex flex-col">
      <header className="flex-shrink-0 mb-8">
          <h1 className="text-3xl font-bold text-text-primary dark:text-dark-text-primary flex items-center">
              <Icon name="settings" className="w-8 h-8 mr-4" />
              Settings
          </h1>
          <p className="text-text-secondary dark:text-dark-text-secondary mt-2">Adjust your AI assistant's personality, knowledge, and voice.</p>
      </header>
      
      <div className="flex-grow overflow-y-auto pr-2">
        <SettingsPanel settings={localSettings} onSettingsChange={handleLocalSettingsChange} disabled={isSaving} />
        
        {isOriginalCreator && (
            <div className="mt-8 pt-6 border-t border-border-color/50 dark:border-dark-border-color/50">
                <h3 className="text-lg font-semibold text-text-primary dark:text-dark-text-primary">Publish to Community</h3>
                <p className="text-sm text-text-secondary dark:text-dark-text-secondary mt-1">
                    Make this assistant publicly available for other users to preview and add to their own dashboard. Your memories will remain private.
                </p>
                <label className="mt-4 inline-flex items-center cursor-pointer">
                    <input type="checkbox" checked={!!localSettings.is_public} onChange={handleTogglePublic} className="sr-only peer" />
                    <div className="relative w-11 h-6 bg-base-medium peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-brand-secondary-glow/50 rounded-full peer dark:bg-dark-border-color peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-brand-secondary-glow"></div>
                    <span className="ms-3 text-sm font-medium text-text-primary dark:text-dark-text-primary">
                        {localSettings.is_public ? 'Published to Community' : 'Make Public'}
                    </span>
                </label>
            </div>
        )}
      </div>

      {hasChanges && (
        <footer className="flex-shrink-0 pt-6 mt-6 border-t border-border-color/50 dark:border-dark-border-color/50 flex justify-end items-center gap-4">
            {saveError && <p className="text-sm text-danger mr-auto">{saveError}</p>}
            <button
              onClick={handleResetChanges}
              disabled={isSaving}
              className="bg-base-light hover:bg-base-medium text-text-primary font-bold py-2 px-6 rounded-full transition-all duration-300 disabled:opacity-50 dark:bg-dark-base-medium dark:hover:bg-dark-border-color dark:text-dark-text-primary"
            >
              Discard
            </button>
            <button
              onClick={handleSaveChanges}
              disabled={isSaving}
              className="bg-gradient-to-r from-brand-secondary-glow to-brand-tertiary-glow text-on-brand font-bold py-2 px-6 rounded-full flex items-center transition-all duration-300 shadow-lg disabled:opacity-50"
            >
              {isSaving ? (
                  <>
                      <Icon name="loader" className="w-5 h-5 mr-2 animate-spin" />
                      Saving...
                  </>
              ) : 'Save Changes'}
            </button>
        </footer>
      )}
    </div>
  );
}