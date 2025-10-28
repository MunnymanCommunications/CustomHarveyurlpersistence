import { useState } from 'react';
import Stepper, { Step } from '../components/stepper/Stepper.tsx';
import { SettingsPanel } from '../components/SettingsPanel.tsx';
import type { Assistant } from '../types.ts';
import { DEFAULT_AVATAR_URL, VOICE_SETTINGS } from '../constants.ts';
import { getSupabase } from '../lib/supabaseClient.ts';
import { Icon } from '../components/Icon.tsx';
import { logEvent } from '../lib/logger.ts';

interface SettingsPageProps {
  onComplete: (assistantId: string) => void;
}

const INITIAL_SETTINGS: Partial<Assistant> = {
  name: '',
  avatar: DEFAULT_AVATAR_URL,
  personality: [],
  attitude: 'Practical',
  voice: VOICE_SETTINGS[0].value,
  knowledge_base: '',
  prompt: 'You are a friendly and helpful AI assistant. Respond concisely and be pleasant.',
  description: '',
  author_name: '',
  orb_hue: 240, // Default hue (blue/purple)
  is_public: false,
  is_embeddable: false,
};

export default function SettingsPage({ onComplete }: SettingsPageProps) {
  const [settings, setSettings] = useState(INITIAL_SETTINGS);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSettingsChange = (newSettings: Partial<Assistant>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  };

  const uploadAvatar = async (userId: string, assistantId: string, file: File) => {
    const supabase = getSupabase();
    const filePath = `${userId}/${assistantId}/${file.name.replace(/[^a-zA-Z0-9.\-_]/g, '')}`;
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      throw uploadError;
    }
    
    const { data } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath);

    return data.publicUrl;
  };

  const handleCreateAssistant = async () => {
    setIsSaving(true);
    setError(null);
    const supabase = getSupabase();

    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("User not authenticated");

        // 1. Insert assistant data to get an ID
        const { data: newAssistant, error: insertError } = await supabase
            .from('assistants')
            .insert({
                user_id: user.id,
                name: settings.name,
                personality: settings.personality,
                attitude: settings.attitude,
                voice: settings.voice,
                prompt: settings.prompt,
                avatar: DEFAULT_AVATAR_URL, // Start with default
                description: settings.description,
                author_name: settings.author_name,
                orb_hue: settings.orb_hue,
                is_public: settings.is_public,
                is_embeddable: settings.is_embeddable,
                knowledge_base: settings.knowledge_base,
            })
            .select()
            .single();

        if (insertError) throw insertError;
        
        // 2. Seed memory from the knowledge_base text area
        const initialMemories = (settings.knowledge_base || '')
            .split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0);

        if (initialMemories.length > 0) {
            const memoryRecords = initialMemories.map(content => ({
                assistant_id: newAssistant.id,
                user_id: user.id,
                content: content,
            }));
            const { error: memoryError } = await supabase.from('memory_items').insert(memoryRecords);
            if (memoryError) throw memoryError;
        }

        let finalAvatarUrl = newAssistant.avatar;

        // 3. If there's a new avatar file, upload it
        if (avatarFile) {
            finalAvatarUrl = await uploadAvatar(user.id, newAssistant.id, avatarFile);
            
            // 4. Update the assistant with the new avatar URL
            const { error: updateError } = await supabase
                .from('assistants')
                .update({ avatar: finalAvatarUrl })
                .eq('id', newAssistant.id);

            if (updateError) throw updateError;
        }
        
        logEvent('ASSISTANT_CREATE', {
          assistantId: newAssistant.id,
          metadata: { name: newAssistant.name }
        });

        onComplete(newAssistant.id);

    } catch (e: any) {
        setError(e.message || 'An unexpected error occurred.');
        console.error("Error creating assistant:", e);
        setIsSaving(false);
    }
  };
  
  if (isSaving) {
    return (
        <div className="flex flex-col items-center justify-center h-screen">
            <Icon name="loader" className="w-12 h-12 animate-spin text-brand-secondary-glow"/>
            <p className="mt-4 text-text-secondary dark:text-dark-text-secondary">Creating your assistant...</p>
        </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center p-4 bg-base-light dark:bg-dark-base-light">
      <div className="text-center mb-8">
        <h1 className="text-5xl font-bold text-text-primary dark:text-dark-text-primary">Create Your Assistant</h1>
        <p className="text-xl text-text-secondary dark:text-dark-text-secondary mt-2">Let's define its personality and purpose.</p>
      </div>
      
      {error && <p className="text-red-500 bg-red-100 p-3 rounded-md mb-4">{error}</p>}

      <Stepper onFinalStepCompleted={handleCreateAssistant}>
        <Step>
            <SettingsPanel 
                settings={settings}
                onSettingsChange={handleSettingsChange}
                onAvatarFileChange={setAvatarFile}
                disabled={isSaving}
                showKnowledgeBase={true}
            />
        </Step>
        <Step>
            <div className="text-center">
                <h2 className="text-3xl font-bold text-text-primary dark:text-dark-text-primary">Ready to Go!</h2>
                <p className="text-lg text-text-secondary dark:text-dark-text-secondary mt-4">
                    You've configured {settings.name || 'your new assistant'}.
                    Click "Finish Setup" to create it and start your first conversation.
                </p>
                <div className="mt-8 flex justify-center">
                    <img src={avatarFile ? URL.createObjectURL(avatarFile) : settings.avatar || DEFAULT_AVATAR_URL} alt="Avatar Preview" className="w-40 h-40 rounded-full object-cover shadow-2xl"/>
                </div>
            </div>
        </Step>
      </Stepper>
    </div>
  );
}