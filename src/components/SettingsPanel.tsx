import React from 'react';
import type { Assistant, AttitudeOption, PersonalityTrait, VoiceOption } from '../types.ts';
import { PERSONALITY_TRAITS, ATTITUDE_OPTIONS, VOICE_SETTINGS } from '../constants.ts';
import { AvatarUploader } from './AvatarUploader.tsx';
import { SelectionButton } from './SelectionButton.tsx';

interface SettingsPanelProps {
  settings: Partial<Assistant>;
  onSettingsChange: (newSettings: Partial<Assistant>) => void;
  onAvatarFileChange?: (file: File) => void;
  disabled: boolean;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({ settings, onSettingsChange, onAvatarFileChange, disabled }) => {
  const handleFieldChange = (field: keyof Assistant, value: any) => {
    onSettingsChange({ [field]: value });
  };

  const togglePersonality = (trait: PersonalityTrait) => {
    const currentTraits = settings.personality || [];
    const newTraits = currentTraits.includes(trait)
      ? currentTraits.filter(t => t !== trait)
      : [...currentTraits, trait];
    onSettingsChange({ personality: newTraits });
  };
  
  return (
    <div className="space-y-8">
      {/* Basic Info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
        <div className="md:col-span-1">
          <h3 className="text-lg font-semibold text-text-primary">Avatar & Name</h3>
          <p className="text-sm text-text-secondary">Choose a visual identity for your assistant.</p>
        </div>
        <div className="md:col-span-2 flex flex-col md:flex-row items-center gap-6 glassmorphic p-6 rounded-lg">
          {onAvatarFileChange && (
            <AvatarUploader 
              avatarUrl={settings.avatar || ''} 
              onAvatarChange={onAvatarFileChange} 
              disabled={disabled} 
            />
          )}
          <div className="w-full">
            <label htmlFor="name" className="block text-sm font-medium text-text-primary mb-2">Assistant Name</label>
            <input
              id="name"
              type="text"
              className="w-full p-2 border border-border-color rounded-md bg-white/70 focus:ring-2 focus:ring-brand-secondary-glow focus:border-transparent"
              value={settings.name || ''}
              onChange={(e) => handleFieldChange('name', e.target.value)}
              placeholder="e.g., Sparky"
              disabled={disabled}
            />
          </div>
        </div>
      </div>

      {/* Personality */}
      <div>
        <h3 className="text-lg font-semibold text-text-primary">Personality Traits</h3>
        <p className="text-sm text-text-secondary mb-4">Select multiple traits to define its character.</p>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2">
          {PERSONALITY_TRAITS.map(trait => (
            <SelectionButton
              key={trait}
              onClick={() => togglePersonality(trait)}
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
        <p className="text-sm text-text-secondary mb-4">Choose one primary attitude or worldview.</p>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
          {ATTITUDE_OPTIONS.map(attitude => (
            <SelectionButton
              key={attitude}
              onClick={() => handleFieldChange('attitude', attitude)}
              isActive={settings.attitude === attitude}
              disabled={disabled}
            >
              {attitude}
            </SelectionButton>
          ))}
        </div>
      </div>

      {/* Voice */}
      <div>
        <h3 className="text-lg font-semibold text-text-primary">Voice</h3>
        <p className="text-sm text-text-secondary mb-4">Select the voice for your assistant.</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {VOICE_SETTINGS.map(voice => (
            <SelectionButton
              key={voice.value}
              onClick={() => handleFieldChange('voice', voice.value)}
              isActive={settings.voice === voice.value}
              disabled={disabled}
            >
              {voice.name}
            </SelectionButton>
          ))}
        </div>
      </div>

      {/* Prompt */}
      <div>
        <h3 className="text-lg font-semibold text-text-primary">Core Prompt</h3>
        <p className="text-sm text-text-secondary mb-4">Provide a detailed system prompt to guide the assistant's behavior, role, and constraints.</p>
        <textarea
            className="w-full p-2 border border-border-color rounded-md bg-white/70 focus:ring-2 focus:ring-brand-secondary-glow focus:border-transparent h-32"
            value={settings.prompt || ''}
            onChange={(e) => handleFieldChange('prompt', e.target.value)}
            placeholder="e.g., You are a helpful assistant that specializes in creative writing..."
            disabled={disabled}
        />
      </div>
    </div>
  );
};
