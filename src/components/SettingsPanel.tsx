
import React, { useCallback } from 'react';
import type { Assistant, Personality } from '../types.ts';
import { VOICE_OPTIONS, PERSONALITY_TRAITS, ATTITUDE_OPTIONS } from '../constants.ts';
import { SelectionButton } from './SelectionButton.tsx';

interface SettingsPanelProps {
  settings: Omit<Assistant, 'id' | 'user_id' | 'created_at' | 'updated_at'> | Assistant;
  onSettingsChange: React.Dispatch<React.SetStateAction<any>>;
  disabled: boolean;
}

const SettingsInput: React.FC<{ label: string; id: string; value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; disabled: boolean; type?: string; accept?: string }> = ({ label, id, value, onChange, disabled, type="text", accept }) => (
    <div>
        <label htmlFor={id} className="block text-sm font-medium text-text-secondary mb-1">{label}</label>
        <input type={type} id={id} value={type !== "file" ? value : undefined} onChange={onChange} disabled={disabled} className="settings-input" accept={accept} />
    </div>
);

const SettingsTextarea: React.FC<{ label: string; id: string; value: string; onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void; rows: number; disabled: boolean; }> = ({ label, id, value, onChange, rows, disabled }) => (
    <div>
        <label htmlFor={id} className="block text-sm font-medium text-text-secondary mb-1">{label}</label>
        <textarea id={id} value={value} onChange={onChange} rows={rows} disabled={disabled} className="settings-textarea" />
    </div>
);

const SettingsSelect: React.FC<{ label: string; id: string; value: string; onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void; options: readonly string[]; disabled: boolean; }> = ({ label, id, value, onChange, options, disabled }) => (
    <div>
        <label htmlFor={id} className="block text-sm font-medium text-text-secondary mb-1">{label}</label>
        <select id={id} value={value} onChange={onChange} disabled={disabled} className="settings-select">
            {options.map(option => <option key={option} value={option}>{option}</option>)}
        </select>
    </div>
);


export const SettingsPanel: React.FC<SettingsPanelProps> = ({ settings, onSettingsChange, disabled }) => {
    
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

    const handleChange = <T extends HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement,>(field: keyof Assistant) => 
        (e: React.ChangeEvent<T>) => {
        onSettingsChange(prev => ({ ...prev, [field]: e.target.value }));
    };

    const togglePersonality = (trait: Personality) => {
        if (disabled) return;
        onSettingsChange(prev => {
            const newPersonalities = prev.personality.includes(trait)
                ? prev.personality.filter(p => p !== trait)
                : [...prev.personality, trait];
            // Ensure at least one personality is always selected
            if (newPersonalities.length === 0) return prev;
            return { ...prev, personality: newPersonalities };
        });
    };

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <SettingsInput label="Name" id="name" value={settings.name} onChange={handleChange('name')} disabled={disabled} />
                <SettingsInput label="Avatar" id="avatar" type="file" accept="image/*" onChange={handleFileChange} disabled={disabled} />
            </div>

            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">Personality</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
                {PERSONALITY_TRAITS.map(trait => (
                  <SelectionButton 
                    key={trait} 
                    onClick={() => togglePersonality(trait)} 
                    isActive={settings.personality.includes(trait)}
                    disabled={disabled}
                    size="sm"
                  >
                    {trait}
                  </SelectionButton>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <SettingsSelect label="Attitude" id="attitude" value={settings.attitude} onChange={handleChange('attitude')} options={[...ATTITUDE_OPTIONS]} disabled={disabled} />
                <SettingsSelect label="Voice" id="voice" value={settings.voice} onChange={handleChange('voice')} options={[...VOICE_OPTIONS]} disabled={disabled} />
            </div>
            
            <SettingsTextarea label="Knowledge Base" id="knowledgeBase" value={settings.knowledgeBase} onChange={handleChange('knowledgeBase')} rows={4} disabled={disabled} />
            
            <SettingsTextarea label="Custom Prompt" id="prompt" value={settings.prompt} onChange={handleChange('prompt')} rows={3} disabled={disabled} />
        </div>
    );
};
