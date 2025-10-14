import React from 'react';
import type { Assistant } from '../types.ts';
import {
  PERSONALITY_TRAITS,
  ATTITUDE_OPTIONS,
  VOICE_SETTINGS,
} from '../constants.ts';
import { SelectionButton } from './SelectionButton.tsx';
import { AvatarUploader } from './AvatarUploader.tsx';

interface SettingsPanelProps {
  settings: Partial<Assistant>;
  onSettingsChange: (newSettings: Partial<Assistant>) => void;
  onAvatarFileChange?: (file: File) => void;
  disabled: boolean;
}

const SettingsSection: React.FC<{ title: string; description: string; children: React.ReactNode }> = ({ title, description, children }) => (
  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-8 py-6 border-b border-border-color">
    <div className="md:col-span-1">
      <h3 className="font-semibold text-text-primary">{title}</h3>
      <p className="text-sm text-text-secondary mt-1">{description}</p>
    </div>
    <div className="md:col-span-2 space-y-4">
      {children}
    </div>
  </div>
);

export const SettingsPanel: React.FC<SettingsPanelProps> = ({
  settings,
  onSettingsChange,
  onAvatarFileChange,
  disabled,
}) => {
  const handleFieldChange = (field: keyof Assistant, value: any) => {
    onSettingsChange({ [field]: value });
  };
  
  const togglePersonality = (trait: string) => {
    const currentTraits = settings.personality || [];
    const newTraits = currentTraits.includes(trait as any)
      ? currentTraits.filter(t => t !== trait)
      : [...currentTraits, trait];
    onSettingsChange({ personality: newTraits as any });
  };

  return (
    <div className="space-y-6">
      <SettingsSection title="Name & Avatar" description="Give your assistant a unique identity.">
        <div className="flex flex-col sm:flex-row items-center gap-6">
            {onAvatarFileChange && (
                 <AvatarUploader 
                    avatarUrl={settings.avatar || ''} 
                    onAvatarChange={onAvatarFileChange}
                    disabled={disabled}
                />
            )}
            <input
                type="text"
                placeholder="Assistant Name (e.g., Jarvis)"
                value={settings.name || ''}
                onChange={e => handleFieldChange('name', e.target.value)}
                disabled={disabled}
                className="settings-input w-full"
                required
            />
        </div>
      </SettingsSection>
      
      <SettingsSection title="Core Prompt" description="The main instruction that guides your assistant's behavior. Be specific.">
        <textarea
          value={settings.prompt || ''}
          onChange={e => handleFieldChange('prompt', e.target.value)}
          disabled={disabled}
          className="settings-input min-h-[120px] w-full"
          placeholder="e.g., You are a witty companion who speaks like a 1920s detective..."
        />
      </SettingsSection>

      <SettingsSection title="Personality Traits" description="Select up to 5 traits. This adds nuance to the core prompt.">
        <div className="flex flex-wrap gap-2">
            {PERSONALITY_TRAITS.map(trait => (
                <button 
                    key={trait} 
                    type="button"
                    onClick={() => togglePersonality(trait)}
                    disabled={disabled || (settings.personality && settings.personality.length >= 5 && !settings.personality.includes(trait))}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors border ${
                        settings.personality?.includes(trait)
                            ? 'bg-brand-secondary-glow text-on-brand border-transparent'
                            : 'bg-white/50 text-text-secondary border-border-color hover:border-brand-secondary-glow'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                    {trait}
                </button>
            ))}
        </div>
      </SettingsSection>

      <SettingsSection title="Attitude" description="What is the assistant's general outlook or style?">
         <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {ATTITUDE_OPTIONS.map(option => (
                <SelectionButton
                    key={option}
                    onClick={() => handleFieldChange('attitude', option)}
                    isActive={settings.attitude === option}
                    disabled={disabled}
                    size="sm"
                >
                    {option}
                </SelectionButton>
            ))}
        </div>
      </SettingsSection>

       <SettingsSection title="Voice" description="Choose the voice your assistant will use to speak.">
         <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {VOICE_SETTINGS.map(({name, value}) => (
                <SelectionButton
                    key={value}
                    onClick={() => handleFieldChange('voice', value)}
                    isActive={settings.voice === value}
                    disabled={disabled}
                    size="sm"
                >
                    {name}
                </SelectionButton>
            ))}
        </div>
      </SettingsSection>
      
      <SettingsSection title="Knowledge Base" description="Add specific information, facts, or data points. This content is prioritized in responses.">
          <textarea
              value={settings.knowledge_base || ''}
              onChange={e => handleFieldChange('knowledge_base', e.target.value)}
              disabled={disabled}
              className="settings-input min-h-[120px] w-full"
              placeholder="e.g., The user's name is Alex. Alex works as a designer. Alex's favorite color is blue."
          />
      </SettingsSection>
    </div>
  );
};
