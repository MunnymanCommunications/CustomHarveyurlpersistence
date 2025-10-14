import React from 'react';
import type { Assistant, PersonalityTrait, AttitudeOption, VoiceOption } from '../types.ts';
import { PERSONALITY_TRAITS, ATTITUDE_OPTIONS, VOICE_SETTINGS } from '../constants.ts';
import { SelectionButton } from './SelectionButton.tsx';

interface SettingsPanelProps {
  settings: Partial<Assistant>;
  onSettingsChange: (newSettings: Partial<Assistant>) => void;
  disabled?: boolean;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({ settings, onSettingsChange, disabled = false }) => {
  const handleSimpleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    onSettingsChange({ ...settings, [e.target.name]: e.target.value });
  };

  const togglePersonality = (trait: PersonalityTrait) => {
    const currentTraits = settings.personality || [];
    const newTraits = currentTraits.includes(trait)
      ? currentTraits.filter(t => t !== trait)
      : [...currentTraits, trait];
    onSettingsChange({ ...settings, personality: newTraits });
  };

  const setAttitude = (attitude: AttitudeOption) => {
    onSettingsChange({ ...settings, attitude });
  };
  
  const setVoice = (voice: VoiceOption) => {
    onSettingsChange({ ...settings, voice });
  };

  return (
    <div className="space-y-8">
      {/* Name and Avatar */}
      <div className="flex flex-col sm:flex-row items-center gap-6">
        <div className="relative group">
          <img src={settings.avatar} alt="Avatar" className="w-24 h-24 rounded-full object-cover shadow-lg"/>
          <input
            type="text"
            name="avatar"
            value={settings.avatar || ''}
            onChange={handleSimpleChange}
            placeholder="Image URL"
            disabled={disabled}
            className="absolute bottom-0 w-full text-xs p-1 text-center bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity rounded-b-full"
          />
        </div>
        <div className="flex-grow w-full">
          <label htmlFor="name" className="settings-label">Assistant Name</label>
          <input
            id="name"
            name="name"
            type="text"
            value={settings.name || ''}
            onChange={handleSimpleChange}
            disabled={disabled}
            className="settings-input"
            placeholder="E.g., Jarvis"
          />
        </div>
      </div>
      
      {/* Personality Traits */}
      <div>
        <label className="settings-label">Personality Traits</label>
        <p className="settings-description">Select up to 5 traits that best describe your assistant.</p>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 mt-2">
          {PERSONALITY_TRAITS.map(trait => (
            <SelectionButton
              key={trait}
              onClick={() => togglePersonality(trait)}
              isActive={settings.personality?.includes(trait) ?? false}
              disabled={disabled || (!settings.personality?.includes(trait) && (settings.personality?.length ?? 0) >= 5)}
              size="sm"
            >
              {trait}
            </SelectionButton>
          ))}
        </div>
      </div>
      
      {/* Attitude */}
      <div>
        <label className="settings-label">Attitude</label>
        <p className="settings-description">Choose the overall attitude and communication style.</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mt-2">
          {ATTITUDE_OPTIONS.map(attitude => (
            <SelectionButton
              key={attitude}
              onClick={() => setAttitude(attitude)}
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
        <label className="settings-label">Voice</label>
        <p className="settings-description">Select the voice for your assistant.</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mt-2">
          {VOICE_SETTINGS.map(voice => (
            <SelectionButton
              key={voice.value}
              onClick={() => setVoice(voice.value)}
              isActive={settings.voice === voice.value}
              disabled={disabled}
              size="md"
            >
              {voice.name}
            </SelectionButton>
          ))}
        </div>
      </div>

      {/* Knowledge Base */}
      <div>
        <label htmlFor="knowledge_base" className="settings-label">Knowledge Base</label>
        <p className="settings-description">Provide background information, facts, or context. The AI will treat this as its established knowledge.</p>
        <textarea
          id="knowledge_base"
          name="knowledge_base"
          rows={5}
          value={settings.knowledge_base || ''}
          onChange={handleSimpleChange}
          disabled={disabled}
          className="settings-input mt-2"
          placeholder="E.g., I am a financial advisor bot specializing in retirement planning. The user, John Doe, is 45 years old and works in tech..."
        />
      </div>

      {/* Custom Prompt */}
      <div>
        <label htmlFor="prompt" className="settings-label">Custom Prompt</label>
        <p className="settings-description">Give specific instructions or rules for the AI to follow. This is a powerful way to guide its behavior.</p>
        <textarea
          id="prompt"
          name="prompt"
          rows={5}
          value={settings.prompt || ''}
          onChange={handleSimpleChange}
          disabled={disabled}
          className="settings-input mt-2"
          placeholder="E.g., Always respond in a cheerful and optimistic tone. Never provide medical advice. Keep responses under 100 words."
        />
      </div>
    </div>
  );
};