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
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({
  settings,
  onSettingsChange,
  onAvatarFileChange,
  disabled,
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
          <h3 className="text-lg font-semibold text-text-primary">Avatar & Name</h3>
          <p className="text-sm text-text-secondary mt-1">
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
             <label htmlFor="assistant-name" className="block text-sm font-medium text-text-primary mb-1">Assistant Name</label>
             <input
              id="assistant-name"
              type="text"
              value={settings.name || ''}
              onChange={e => onSettingsChange({ name: e.target.value })}
              className="w-full p-2 border border-border-color rounded-md bg-white/70 focus:ring-2 focus:ring-brand-secondary-glow focus:border-transparent transition"
              placeholder="e.g., Harvey"
              disabled={disabled}
              required
            />
          </div>
        </div>
      </div>

      {/* Personality */}
      <div>
        <h3 className="text-lg font-semibold text-text-primary">Personality Traits</h3>
        <p className="text-sm text-text-secondary mt-1">
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
        <h3 className="text-lg font-semibold text-text-primary">Attitude</h3>
        <p className="text-sm text-text-secondary mt-1">
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
        <h3 className="text-lg font-semibold text-text-primary">Voice</h3>
        <p className="text-sm text-text-secondary mt-1">
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h3 className="text-lg font-semibold text-text-primary">Knowledge Base</h3>
          <p className="text-sm text-text-secondary mt-1">
            Provide context or data for the assistant to draw upon (optional).
          </p>
          <textarea
            value={settings.knowledge_base || ''}
            onChange={e => onSettingsChange({ knowledge_base: e.target.value })}
            className="w-full p-2 border border-border-color rounded-md bg-white/70 focus:ring-2 focus:ring-brand-secondary-glow focus:border-transparent transition mt-2"
            rows={5}
            placeholder="e.g., The user's name is Alex. Alex is a software engineer..."
            disabled={disabled}
          />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-text-primary">System Prompt</h3>
          <p className="text-sm text-text-secondary mt-1">
            The core instruction that guides all assistant responses.
          </p>
          <textarea
            value={settings.prompt || ''}
            onChange={e => onSettingsChange({ prompt: e.target.value })}
            className="w-full p-2 border border-border-color rounded-md bg-white/70 focus:ring-2 focus:ring-brand-secondary-glow focus:border-transparent transition mt-2"
            rows={5}
            placeholder="You are a helpful assistant."
            disabled={disabled}
          />
        </div>
      </div>
    </div>
  );
};
