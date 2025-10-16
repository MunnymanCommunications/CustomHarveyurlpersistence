import { useState, useEffect } from 'react';
import { SettingsPanel } from '../components/SettingsPanel.tsx';
import type { Assistant } from '../types.ts';
import { Icon } from '../components/Icon.tsx';

interface SettingsDashboardPageProps {
  settings: Assistant;
  onSettingsChange: (newSettings: Partial<Assistant>, avatarFile: File | null) => void | Promise<void>;
}

export default function SettingsDashboardPage({ settings, onSettingsChange }: SettingsDashboardPageProps) {
  const [localSettings, setLocalSettings] = useState<Assistant>(settings);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    // When the upstream settings change (e.g., after a save), reset the local form state.
    setLocalSettings(settings);
    setHasChanges(false);
    setAvatarFile(null);
  }, [settings]);

  const handleLocalSettingsChange = (newSettings: Partial<Assistant>) => {
    setLocalSettings(prev => ({ ...prev, ...newSettings }));
    if (!hasChanges) {
      setHasChanges(true);
    }
  };

  const handleAvatarFileChange = (file: File) => {
    setAvatarFile(file);
    if (!hasChanges) {
        setHasChanges(true);
    }
  };

  const handleSaveChanges = async () => {
    setIsSaving(true);
    await onSettingsChange(localSettings, avatarFile);
    setIsSaving(false);
    setHasChanges(false);
    setAvatarFile(null);
  };
  
  const handleResetChanges = () => {
    setLocalSettings(settings);
    setHasChanges(false);
    setAvatarFile(null);
  };

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
        <SettingsPanel 
            settings={localSettings} 
            onSettingsChange={handleLocalSettingsChange}
            onAvatarFileChange={handleAvatarFileChange}
            disabled={isSaving} 
            showKnowledgeBase={true}
        />
      </div>

      {hasChanges && (
        <footer className="flex-shrink-0 pt-6 mt-6 border-t border-border-color/50 dark:border-dark-border-color/50 flex justify-end items-center gap-4">
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
              className="bg-gradient-to-r from-brand-secondary-glow to-brand-tertiy-glow text-on-brand font-bold py-2 px-6 rounded-full flex items-center transition-all duration-300 shadow-lg disabled:opacity-50"
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