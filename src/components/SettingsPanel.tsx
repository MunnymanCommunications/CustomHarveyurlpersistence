import React from 'react';
import type { Assistant, PersonalityTrait } from '../types.ts';
import { AvatarUploader } from './AvatarUploader.tsx';
import { SelectionButton } from './SelectionButton.tsx';
import {
  PERSONALITY_TRAITS,
  ATTITUDE_OPTIONS,
  VOICE_SETTINGS,
} from '../constants.ts';

interface SettingsPanelProps {
  settings: Partial<Assistant & { knowledge_base?: string }>;
  onSettingsChange: (newSettings: Partial<Assistant & { knowledge_base?: string }>) => void;
  onAvatarFileChange?: (file: File) => void;
  disabled: boolean;
  showKnowledgeBase?: boolean;
}

const ToggleSwitch: React.FC<{
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}> = ({ label, checked, onChange, disabled }) => (
  <label className="flex items-center cursor-pointer">
    <div className="relative">
      <input type="checkbox" className="sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} disabled={disabled} />
      <div className={`block w-14 h-8 rounded-full transition ${checked ? 'bg-brand-secondary-glow' : 'bg-base-medium dark:bg-dark-base-light'}`}></div>
      <div className={`dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition transform ${checked ? 'translate-x-6' : ''}`}></div>
    </div>
    <div className="ml-3 text-text-primary dark:text-dark-text-primary font-medium">{label}</div>
  </label>
);

export const SettingsPanel: React.FC<SettingsPanelProps> = ({
  settings,
  onSettingsChange,
  onAvatarFileChange,
  disabled,
  showKnowledgeBase = false,
}) => {
  const handlePersonalityToggle = (trait: PersonalityTrait) => {
    const currentTraits = settings.personality || [];
    const newTraits = currentTraits.includes(trait)
      ? currentTraits.filter(t => t !== trait)
      : [...currentTraits, trait];
    onSettingsChange({ personality: newTraits });
  };

  return (
    <div className="space-y-8">
      {/* Basic Info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
        <div className="md:col-span-1">
          <h3 className="text-lg font-semibold text-text-primary dark:text-dark-text-primary">Avatar & Name</h3>
          <p className="text-sm text-text-secondary dark:text-dark-text-secondary mt-1">
            Give your assistant a visual identity and a name.
          </p>
        </div>
        <div className="md:col-span-2 flex flex-col md:flex-row items-center gap-6">
          <AvatarUploader
            avatarUrl={settings.avatar || ''}
            onAvatarChange={file => onAvatarFileChange?.(file)}
            disabled={disabled || !onAvatarFileChange}
          />
          <div className="w-full">
             <label htmlFor="assistant-name" className="block text-sm font-medium text-text-primary dark:text-dark-text-primary mb-1">Assistant Name</label>
             <input
              id="assistant-name"
              type="text"
              value={settings.name || ''}
              onChange={e => onSettingsChange({ name: e.target.value })}
              className="w-full p-2 border border-border-color rounded-md bg-white/70 focus:ring-2 focus:ring-brand-secondary-glow focus:border-transparent transition dark:bg-dark-base-light dark:border-dark-border-color dark:text-dark-text-primary"
              placeholder="e.g., Harvey"
              disabled={disabled}
              required
            />
          </div>
        </div>
      </div>
      
      {/* Appearance */}
      <div>
        <h3 className="text-lg font-semibold text-text-primary dark:text-dark-text-primary">Appearance</h3>
        <p className="text-sm text-text-secondary dark:text-dark-text-secondary mt-1">
          Customize the look of your assistant's avatar.
        </p>
        <div className="mt-4">
          <label htmlFor="orb-hue" className="block text-sm font-medium text-text-primary dark:text-dark-text-primary mb-2">
            Orb Color
          </label>
          <div className="flex items-center gap-4">
            <input
              id="orb-hue"
              type="range"
              min="0"
              max="360"
              value={settings.orb_hue || 0}
              onChange={e => onSettingsChange({ orb_hue: parseFloat(e.target.value) })}
              className="w-full h-2 rounded-lg appearance-none cursor-pointer hue-slider"
              disabled={disabled}
            />
            <div className="w-10 h-10 rounded-full border border-border-color dark:border-dark-border-color" style={{ backgroundColor: `hsl(${settings.orb_hue || 0}, 80%, 60%)` }}></div>
          </div>
        </div>
      </div>

      {/* Personality */}
      <div>
        <h3 className="text-lg font-semibold text-text-primary dark:text-dark-text-primary">Personality Traits</h3>
        <p className="text-sm text-text-secondary dark:text-dark-text-secondary mt-1">
          Select multiple traits that define how your assistant behaves.
        </p>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2 mt-4">
          {PERSONALITY_TRAITS.map(trait => (
            <SelectionButton
              key={trait}
              onClick={() => handlePersonalityToggle(trait)}
              isActive={(settings.personality || []).includes(trait)}
              disabled={disabled}
              size="sm"
            >
              {trait}
            </SelectionButton>
          ))}
        </div>
      </div>

      {/* Attitude */}
      <div>
        <h3 className="text-lg font-semibold text-text-primary dark:text-dark-text-primary">Attitude</h3>
        <p className="text-sm text-text-secondary dark:text-dark-text-secondary mt-1">
          Choose one primary attitude for your assistant's communication style.
        </p>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 mt-4">
          {ATTITUDE_OPTIONS.map(attitude => (
            <SelectionButton
              key={attitude}
              onClick={() => onSettingsChange({ attitude: attitude })}
              isActive={settings.attitude === attitude}
              disabled={disabled}
              size="md"
            >
              {attitude}
            </SelectionButton>
          ))}
        </div>
      </div>

      {/* Voice */}
       <div>
        <h3 className="text-lg font-semibold text-text-primary dark:text-dark-text-primary">Voice</h3>
        <p className="text-sm text-text-secondary dark:text-dark-text-secondary mt-1">
          Select the voice your assistant will use to speak.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mt-4">
          {VOICE_SETTINGS.map(voice => (
            <SelectionButton
              key={voice.value}
              onClick={() => onSettingsChange({ voice: voice.value })}
              isActive={settings.voice === voice.value}
              disabled={disabled}
              size="md"
            >
              {voice.name}
            </SelectionButton>
          ))}
        </div>
      </div>

      {/* Knowledge & Prompt */}
      <div className={`grid grid-cols-1 ${showKnowledgeBase ? 'md:grid-cols-2' : ''} gap-6`}>
        {showKnowledgeBase && (
          <div>
            <h3 className="text-lg font-semibold text-text-primary dark:text-dark-text-primary">Knowledge Base</h3>
            <p className="text-sm text-text-secondary dark:text-dark-text-secondary mt-1">
              Provide initial facts for the assistant to draw upon (optional). Each line will become a separate memory.
            </p>
            <textarea
              value={settings.knowledge_base || ''}
              onChange={e => onSettingsChange({ knowledge_base: e.target.value })}
              className="w-full p-2 border border-border-color rounded-md bg-white/70 focus:ring-2 focus:ring-brand-secondary-glow focus:border-transparent transition mt-2 dark:bg-dark-base-light dark:border-dark-border-color dark:text-dark-text-primary"
              rows={5}
              placeholder="e.g., The user's name is Alex.&#10;Alex is a software engineer..."
              disabled={disabled}
            />
          </div>
        )}
        <div>
          <h3 className="text-lg font-semibold text-text-primary dark:text-dark-text-primary">System Prompt</h3>
          <p className="text-sm text-text-secondary dark:text-dark-text-secondary mt-1">
            The core instruction that guides all assistant responses.
          </p>
          <textarea
            value={settings.prompt || ''}
            onChange={e => onSettingsChange({ prompt: e.target.value })}
            className="w-full p-2 border border-border-color rounded-md bg-white/70 focus:ring-2 focus:ring-brand-secondary-glow focus:border-transparent transition mt-2 dark:bg-dark-base-light dark:border-dark-border-color dark:text-dark-text-primary"
            rows={5}
            placeholder="You are a helpful assistant."
            disabled={disabled}
          />
        </div>
      </div>
      
      {/* Community Sharing */}
      <div className="pt-8 mt-8 border-t border-border-color/50 dark:border-dark-border-color/50">
          <h3 className="text-lg font-semibold text-text-primary dark:text-dark-text-primary">Community Sharing</h3>
          <p className="text-sm text-text-secondary dark:text-dark-text-secondary mt-1">
            Publish this assistant to the community to allow other users to discover and chat with it.
          </p>
          <div className="mt-4 space-y-4">
            <ToggleSwitch
                label="Publish to Community"
                checked={!!settings.is_public}
                onChange={(checked) => onSettingsChange({ is_public: checked })}
                disabled={disabled}
            />
            {settings.is_public && (
                <div className="space-y-4 pl-4 border-l-2 border-brand-secondary-glow/30">
                     <div>
                        <label htmlFor="author-name" className="block text-sm font-medium text-text-primary dark:text-dark-text-primary mb-1">Author Name (optional)</label>
                        <input
                            id="author-name"
                            type="text"
                            value={settings.author_name || ''}
                            onChange={e => onSettingsChange({ author_name: e.target.value })}
                            className="w-full max-w-sm p-2 border border-border-color rounded-md bg-white/70 focus:ring-2 focus:ring-brand-secondary-glow focus:border-transparent transition dark:bg-dark-base-light dark:border-dark-border-color dark:text-dark-text-primary"
                            placeholder="Your name or alias"
                            disabled={disabled}
                        />
                     </div>
                     <div>
                        <label htmlFor="description" className="block text-sm font-medium text-text-primary dark:text-dark-text-primary mb-1">Description (optional)</label>
                         <textarea
                            id="description"
                            value={settings.description || ''}
                            onChange={e => onSettingsChange({ description: e.target.value })}
                            className="w-full p-2 border border-border-color rounded-md bg-white/70 focus:ring-2 focus:ring-brand-secondary-glow focus:border-transparent transition mt-1 dark:bg-dark-base-light dark:border-dark-border-color dark:text-dark-text-primary"
                            rows={3}
                            placeholder="What makes this assistant special?"
                            disabled={disabled}
                         />
                     </div>
                </div>
            )}
          </div>
      </div>

    </div>
  );
};