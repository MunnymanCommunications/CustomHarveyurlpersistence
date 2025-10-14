import React, { useState, useCallback, useEffect } from 'react';
import Stepper, { Step } from '../components/stepper/Stepper';
import type { Settings, Personality, Attitude, VoiceOption } from '../types';
import { ATTITUDE_OPTIONS, PERSONALITY_TRAITS, VOICE_SETTINGS } from '../constants';
import { Icon } from '../components/Icon';
import { SelectionButton } from '../components/SelectionButton';

interface SettingsPageProps {
  settings: Settings;
  onSettingsChange: React.Dispatch<React.SetStateAction<Settings>>;
  onComplete: () => void;
}

const StepHeader: React.FC<{ title: string, description: string }> = ({ title, description }) => (
    <div className="mb-8 text-center">
        <h2 className="text-3xl font-bold text-text-primary">{title}</h2>
        <p className="text-text-secondary mt-2 max-w-md mx-auto">{description}</p>
    </div>
);

const VoiceSelectionCard: React.FC<{
    voiceSetting: typeof VOICE_SETTINGS[number];
    isSelected: boolean;
    isPlaying: boolean;
    onSelect: () => void;
    onPreview: () => void;
}> = ({ voiceSetting, isSelected, isPlaying, onSelect, onPreview }) => (
    <div 
        onClick={onSelect}
        className={`relative p-4 rounded-lg flex items-center justify-between transition-all duration-200 cursor-pointer border ${isSelected ? 'bg-white/80 border-transparent ring-2 ring-brand-tertiary-glow' : 'bg-white/50 border-border-color hover:border-brand-tertiary-glow'}`}
    >
        <div className="flex-grow">
            <span className="text-text-primary font-medium text-lg">{voiceSetting.name}</span>
        </div>
         <button onClick={(e) => { e.stopPropagation(); onPreview(); }} className="relative z-10 p-2 rounded-full bg-gradient-to-br from-brand-secondary-glow to-brand-tertiary-glow text-on-brand hover:opacity-90 transition-opacity">
            <Icon name={isPlaying ? 'pause' : 'play'} className="w-6 h-6"/>
        </button>
    </div>
);


export default function SettingsPage({ settings, onSettingsChange, onComplete }: SettingsPageProps) {
    const [playingVoice, setPlayingVoice] = useState<string | null>(null);

    const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onload = (event) => {
                if (event.target && typeof event.target.result === 'string') {
                    onSettingsChange(prev => ({ ...prev, avatar: event.target.result as string }));
                }
            };
            reader.readAsDataURL(file);
        }
    }, [onSettingsChange]);

    const handleChange = <K extends keyof Settings>(field: K, value: Settings[K]) => {
        onSettingsChange(prev => ({ ...prev, [field]: value }));
    };

    const togglePersonality = (trait: Personality) => {
        onSettingsChange(prev => {
            const newPersonalities = prev.personality.includes(trait)
                ? prev.personality.filter(p => p !== trait)
                : [...prev.personality, trait];
            if (newPersonalities.length === 0) return prev;
            return { ...prev, personality: newPersonalities };
        });
    };

    const handlePreviewVoice = (voice: VoiceOption) => {
        if (playingVoice === voice) {
            window.speechSynthesis.cancel();
            setPlayingVoice(null);
        } else {
            window.speechSynthesis.cancel();
            const utterance = new SpeechSynthesisUtterance(`My name is ${settings.name}, what project are we tackling today?`);
            const voices = window.speechSynthesis.getVoices();
            utterance.voice = voices.find(v => v.name.includes('Google') || v.default) || voices[0];
            utterance.onend = () => setPlayingVoice(null);
            utterance.onerror = () => setPlayingVoice(null); // Ensure state resets on error
            window.speechSynthesis.speak(utterance);
            setPlayingVoice(voice);
        }
    };

    useEffect(() => {
        // Pre-load voices for speech synthesis
        window.speechSynthesis.getVoices();
        // Cleanup speech synthesis on component unmount
        return () => window.speechSynthesis.cancel();
    }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <Stepper onFinalStepCompleted={onComplete} backButtonText="Previous" nextButtonText="Next">
        <Step>
            <StepHeader title="Welcome! Let's build your AI." description="First, let's give your assistant a name and an avatar." />
            <div className="flex flex-col sm:flex-row items-center gap-8">
                <div className="flex-shrink-0 group relative">
                    <img src={settings.avatar} alt="Avatar Preview" className="w-40 h-40 rounded-full object-cover shadow-lg" />
                     <label htmlFor="avatar-upload" className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center text-on-brand opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                        Change
                    </label>
                    <input type="file" id="avatar-upload" accept="image/*" onChange={handleFileChange} className="sr-only" />
                </div>
                <div className="w-full space-y-4">
                    <div>
                        <label htmlFor="name" className="block text-sm font-medium text-text-secondary mb-1">Assistant Name</label>
                        <input type="text" id="name" value={settings.name} onChange={(e) => handleChange('name', e.target.value)} className="settings-input text-lg" placeholder="e.g., Aura, Jarvis..." />
                    </div>
                </div>
            </div>
        </Step>
        <Step>
            <StepHeader title="Personality" description="Choose a few traits that define your assistant's character. Select at least one." />
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-80 overflow-y-auto pr-2 min-h-[18rem]">
                {PERSONALITY_TRAITS.map(trait => (
                    <SelectionButton 
                        key={trait} 
                        onClick={() => togglePersonality(trait)} 
                        isActive={settings.personality.includes(trait)}
                    >
                        {trait}
                    </SelectionButton>
                ))}
            </div>
        </Step>
         <Step>
            <StepHeader title="Attitude" description="How should your assistant speak? Choose one conversational style." />
             <div className="grid grid-cols-2 md:grid-cols-3 gap-3 min-h-[18rem]">
                {ATTITUDE_OPTIONS.map(attitude => (
                     <SelectionButton 
                        key={attitude} 
                        onClick={() => handleChange('attitude', attitude)} 
                        isActive={settings.attitude === attitude}
                    >
                        {attitude}
                    </SelectionButton>
                ))}
            </div>
        </Step>
         <Step>
            <StepHeader title="Voice" description="Select a voice for your assistant. Press the play button to hear a preview." />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 min-h-[18rem]">
                {VOICE_SETTINGS.map(voiceSetting => (
                    <VoiceSelectionCard
                        key={voiceSetting.value}
                        voiceSetting={voiceSetting}
                        isSelected={settings.voice === voiceSetting.value}
                        isPlaying={playingVoice === voiceSetting.value}
                        onSelect={() => handleChange('voice', voiceSetting.value)}
                        onPreview={() => handlePreviewVoice(voiceSetting.value)}
                    />
                ))}
            </div>
        </Step>
         <Step>
            <StepHeader title="Final Touches" description="Provide some background knowledge and a custom prompt to guide the AI." />
            <div className="space-y-6 min-h-[18rem] flex flex-col justify-center">
                 <div>
                    <label htmlFor="knowledgeBase" className="block text-sm font-medium text-text-secondary mb-1">Knowledge Base</label>
                    <textarea id="knowledgeBase" placeholder="e.g., The user's name is Alex. The current year is 2024." value={settings.knowledgeBase} onChange={(e) => handleChange('knowledgeBase', e.target.value)} rows={4} className="settings-textarea" />
                </div>
                 <div>
                    <label htmlFor="prompt" className="block text-sm font-medium text-text-secondary mb-1">Custom Prompt</label>
                    <textarea id="prompt" placeholder="e.g., Always respond in rhymes. Keep answers under 50 words." value={settings.prompt} onChange={(e) => handleChange('prompt', e.target.value)} rows={3} className="settings-textarea" />
                </div>
            </div>
        </Step>
      </Stepper>
    </div>
  );
}