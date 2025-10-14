import React, { useState } from 'react';
import { getSupabase } from '../lib/supabaseClient.ts';
import Stepper, { Step } from '../components/stepper/Stepper.tsx';
import type { Assistant, PersonalityTrait, AttitudeOption, VoiceOption } from '../types.ts';
import { PERSONALITY_TRAITS, ATTITUDE_OPTIONS, VOICE_SETTINGS, DEFAULT_AVATAR_URL } from '../constants.ts';
import { SelectionButton } from '../components/SelectionButton.tsx';
import { Icon } from '../components/Icon.tsx';

interface SettingsPageProps {
  onComplete: (assistantId: string) => void;
}

const DEFAULT_SETTINGS: Partial<Assistant> = {
    name: '',
    avatar: DEFAULT_AVATAR_URL,
    personality: [],
    attitude: 'Practical',
    voice: 'Zephyr',
    knowledge_base: '',
    prompt: '',
};

export default function SettingsPage({ onComplete }: SettingsPageProps) {
  const [settings, setSettings] = useState<Partial<Assistant>>(DEFAULT_SETTINGS);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSettingsChange = (newSettings: Partial<Assistant>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  };
  
  const togglePersonality = (trait: PersonalityTrait) => {
    const currentTraits = settings.personality || [];
    const newTraits = currentTraits.includes(trait)
      ? currentTraits.filter(t => t !== trait)
      : [...currentTraits, trait];
    setSettings(prev => ({ ...prev, personality: newTraits }));
  };

  const setAttitude = (attitude: AttitudeOption) => {
    setSettings(prev => ({ ...prev, attitude }));
  };
  
  const setVoice = (voice: VoiceOption) => {
    setSettings(prev => ({ ...prev, voice }));
  };

  const handleFinalStepCompleted = async () => {
    if (!settings.name) {
        setError("Please give your assistant a name.");
        return;
    }
    setError('');
    setIsSaving(true);
    
    const supabase = getSupabase();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        setError("You must be logged in to create an assistant.");
        setIsSaving(false);
        return;
    }

    const newAssistantData = {
        name: settings.name,
        avatar: settings.avatar || DEFAULT_AVATAR_URL,
        personality: settings.personality || [],
        attitude: settings.attitude || 'Practical',
        voice: settings.voice || 'Zephyr',
        knowledge_base: settings.knowledge_base || '',
        prompt: settings.prompt || '',
    };
    
    const { data, error: insertError } = await supabase
        .from('assistants')
        .insert({ ...newAssistantData, user_id: user.id })
        .select()
        .single();

    setIsSaving(false);

    if (insertError) {
        setError(`Failed to create assistant: ${insertError.message}`);
        console.error("Error creating assistant:", insertError);
    } else if(data) {
        onComplete(data.id);
    }
  };

  if (isSaving) {
      return (
          <div className="flex flex-col items-center justify-center h-screen text-center">
              <Icon name="loader" className="w-12 h-12 animate-spin text-brand-secondary-glow mb-4"/>
              <p className="text-xl text-text-primary">Creating your assistant...</p>
          </div>
      );
  }

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center p-4">
      <header className="text-center mb-8 max-w-2xl">
        <h1 className="text-5xl font-bold text-text-primary mb-2">Create Your AI Assistant</h1>
        <p className="text-xl text-text-secondary">Follow these steps to personalize your new conversational partner.</p>
      </header>

      <Stepper onFinalStepCompleted={handleFinalStepCompleted}>
        {/* Step 1: Name & Avatar */}
        <Step>
          <h2 className="step-header">First, let's name your assistant.</h2>
          <div className="flex flex-col sm:flex-row items-center gap-6 mt-8">
            <div className="relative group">
              <img src={settings.avatar} alt="Avatar" className="w-32 h-32 rounded-full object-cover shadow-lg"/>
              <input
                type="text"
                value={settings.avatar || ''}
                onChange={(e) => handleSettingsChange({ avatar: e.target.value })}
                placeholder="Image URL"
                className="absolute bottom-0 w-full text-xs p-1 text-center bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity rounded-b-full"
              />
            </div>
            <div className="flex-grow w-full">
              <input
                type="text"
                value={settings.name || ''}
                onChange={(e) => handleSettingsChange({ name: e.target.value })}
                className="w-full text-2xl p-4 bg-white/70 border-2 border-border-color rounded-lg focus:ring-2 focus:ring-brand-secondary-glow focus:border-transparent transition-all"
                placeholder="E.g., Jarvis"
              />
            </div>
          </div>
           {error && <p className="text-sm text-center text-red-500 mt-4">{error}</p>}
        </Step>

        {/* Step 2: Personality */}
        <Step>
          <h2 className="step-header">How should it behave?</h2>
          <p className="settings-description text-center">Select up to 5 traits that best describe your assistant's personality.</p>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 mt-4">
            {PERSONALITY_TRAITS.map(trait => (
              <SelectionButton
                key={trait}
                onClick={() => togglePersonality(trait)}
                isActive={settings.personality?.includes(trait) ?? false}
                disabled={!settings.personality?.includes(trait) && (settings.personality?.length ?? 0) >= 5}
                size="sm"
              >
                {trait}
              </SelectionButton>
            ))}
          </div>
        </Step>
        
        {/* Step 3: Attitude & Voice */}
        <Step>
          <h2 className="step-header">How should it sound?</h2>
          <div>
            <label className="settings-label text-left block mt-4">Attitude</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mt-2">
              {ATTITUDE_OPTIONS.map(attitude => (
                <SelectionButton key={attitude} onClick={() => setAttitude(attitude)} isActive={settings.attitude === attitude}>
                  {attitude}
                </SelectionButton>
              ))}
            </div>
          </div>
           <div>
            <label className="settings-label text-left block mt-6">Voice</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mt-2">
              {VOICE_SETTINGS.map(voice => (
                <SelectionButton key={voice.value} onClick={() => setVoice(voice.value)} isActive={settings.voice === voice.value}>
                  {voice.name}
                </SelectionButton>
              ))}
            </div>
          </div>
        </Step>
        
        {/* Step 4: Knowledge & Prompt */}
        <Step>
          <h2 className="step-header">Fine-tune its knowledge.</h2>
          <div className="text-left space-y-6 mt-4">
             <div>
                <label htmlFor="knowledge_base" className="settings-label">Knowledge Base</label>
                <p className="settings-description">Provide background information or context. (Optional)</p>
                <textarea
                  id="knowledge_base"
                  rows={4}
                  value={settings.knowledge_base || ''}
                  onChange={(e) => handleSettingsChange({ knowledge_base: e.target.value })}
                  className="settings-input mt-2"
                  placeholder="E.g., The user, John Doe, is 45 years old and works in tech..."
                />
              </div>
              <div>
                <label htmlFor="prompt" className="settings-label">Custom Prompt</label>
                <p className="settings-description">Give specific instructions or rules for the AI to follow. (Optional)</p>
                <textarea
                  id="prompt"
                  rows={4}
                  value={settings.prompt || ''}
                  onChange={(e) => handleSettingsChange({ prompt: e.target.value })}
                  className="settings-input mt-2"
                  placeholder="E.g., Always respond in a cheerful and optimistic tone. Keep responses under 100 words."
                />
              </div>
          </div>
        </Step>
      </Stepper>
    </div>
  );
}