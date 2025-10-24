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
  settings: Partial<Assistant>;
  onSettingsChange: (newSettings: Partial<Assistant>) => void;
  onAvatarFileChange?: (file: File) => void;
  disabled: boolean;
  showKnowledgeBase?: boolean;
}

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
          <h3 className="text-lg font-semibold text-text-primary dark:text-dark-text-primary">Identity</h3>
          <p className="text-sm text-text-secondary dark:text-dark-text-secondary mt-1">
            Give your assistant a visual identity, name, and purpose.
          </p>
        </div>
        <div className="md:col-span-2 flex flex-col gap-6">
          <div className="flex flex-col md:flex-row items-center gap-6">
            <AvatarUploader
              avatarUrl={settings.avatar || ''}
              onAvatarChange={file => onAvatarFileChange?.(file)}
              disabled={disabled || !onAvatarFileChange}
            />
            <div className="w-full grid grid-cols-1 gap-4">
              <div>
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
               <div>
                <label htmlFor="author-name" className="block text-sm font-medium text-text-primary dark:text-dark-text-primary mb-1">Author Name</label>
                <input
                  id="author-name"
                  type="text"
                  value={settings.author_name || ''}
                  onChange={e => onSettingsChange({ author_name: e.target.value })}
                  className="w-full p-2 border border-border-color rounded-md bg-white/70 focus:ring-2 focus:ring-brand-secondary-glow focus:border-transparent transition dark:bg-dark-base-light dark:border-dark-border-color dark:text-dark-text-primary"
                  placeholder="Your name or alias"
                  disabled={disabled}
                />
              </div>
            </div>
          </div>
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-text-primary dark:text-dark-text-primary mb-1">Description</label>
            <textarea
              id="description"
              value={settings.description || ''}
              onChange={e => onSettingsChange({ description: e.target.value })}
              className="w-full p-2 border border-border-color rounded-md bg-white/70 focus:ring-2 focus:ring-brand-secondary-glow focus:border-transparent transition dark:bg-dark-base-light dark:border-dark-border-color dark:text-dark-text-primary"
              rows={3}
              placeholder="e.g., An expert in classical music, ready to answer any question."
              disabled={disabled}
            />
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

      {/* Appearance */}
       <div>
        <h3 className="text-lg font-semibold text-text-primary dark:text-dark-text-primary">Appearance</h3>
        <p className="text-sm text-text-secondary dark:text-dark-text-secondary mt-1">
          Select the voice and orb color for your assistant.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
            <div>
                 <label className="block text-sm font-medium text-text-primary dark:text-dark-text-primary mb-2">Voice</label>
                 <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
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
            <div>
                <label className="block text-sm font-medium text-text-primary dark:text-dark-text-primary mb-2">Avatar Orb Color</label>
                <div className="flex items-center gap-4 mt-2">
                    <input
                        type="range"
                        min="0"
                        max="360"
                        value={settings.orb_hue || 0}
                        onChange={e => onSettingsChange({ orb_hue: parseInt(e.target.value, 10) })}
                        className="w-full h-2 bg-base-medium rounded-lg appearance-none cursor-pointer dark:bg-dark-border-color"
                        disabled={disabled}
                        style={{
                            background: `linear-gradient(to right, hsl(0, 70%, 60%), hsl(60, 70%, 60%), hsl(120, 70%, 60%), hsl(180, 70%, 60%), hsl(240, 70%, 60%), hsl(300, 70%, 60%), hsl(360, 70%, 60%))`
                        }}
                    />
                    <div className="w-10 h-10 rounded-full border border-border-color dark:border-dark-border-color" style={{ backgroundColor: `hsl(${settings.orb_hue || 0}, 70%, 60%)` }}></div>
                </div>
            </div>
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
    </div>
  );
};