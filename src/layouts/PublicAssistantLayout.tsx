import { useState, useEffect, useCallback } from 'react';
import { getSupabase } from '../lib/supabaseClient.ts';
import type { Assistant } from '../types.ts';
import { GoogleGenAI } from '@google/genai';

import { Icon } from '../components/Icon.tsx';
import ConversationPage from '../pages/ConversationPage.tsx';
import { GeminiLiveProvider } from '../contexts/GeminiLiveContext.tsx';

// A stripped-down version of the Assistant type for public view
type PublicAssistant = Omit<Assistant, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'knowledge_base' | 'original_assistant_id'>;

const inIframe = () => {
  try {
    return window.self !== window.top;
  } catch (e) {
    return true; // Assume it's in an iframe if we can't access top
  }
};

export default function PublicAssistantLayout({ assistantId }: { assistantId: string }) {
    const [assistant, setAssistant] = useState<PublicAssistant | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [ai, setAi] = useState<GoogleGenAI | null>(null);
    const [groundingChunks, setGroundingChunks] = useState<any[]>([]);


    useEffect(() => {
        // Apply class to body for transparent background
        document.body.classList.add('public-view');
        return () => {
            document.body.classList.remove('public-view');
        };
    }, []);

    useEffect(() => {
        const apiKey = process.env.API_KEY;
        if (apiKey && apiKey !== 'undefined') {
            setAi(new GoogleGenAI({ apiKey }));
        } else {
            setError("This service is currently unavailable due to a configuration issue.");
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        const fetchPublicAssistant = async () => {
            const supabase = getSupabase();
            const { data, error } = await supabase
                .from('assistants')
                .select('name, avatar, personality, attitude, voice, prompt, orb_hue, description, author_name, is_public, is_embeddable')
                .eq('id', assistantId)
                .eq('is_public', true)
                .single();

            if (error || !data) {
                setError("This assistant is not public or could not be found.");
                console.error("Error fetching public assistant:", error);
            } else {
                setAssistant(data);
                
                // Update manifest for PWA
                const avatarUrl = data.avatar || '/favicon.svg';
                const mimeType = avatarUrl.toLowerCase().endsWith('.svg') ? 'image/svg+xml' : 
                                avatarUrl.toLowerCase().endsWith('.png') ? 'image/png' : 
                                'image/jpeg';

                // Build app name and start URL so the saved PWA opens this public assistant
                const appName = `${data.name} - EliteCardPro`;
                const startUrl = window.location.href;
                const scope = window.location.origin + '/';

                const manifest = {
                    name: appName,
                    short_name: appName,
                    start_url: startUrl,
                    scope,
                    display: 'standalone',
                    background_color: '#111827',
                    theme_color: '#111827',
                    icons: [
                        { src: avatarUrl, sizes: '192x192', type: mimeType, purpose: 'any maskable' },
                        { src: avatarUrl, sizes: '512x512', type: mimeType, purpose: 'any maskable' }
                    ]
                };

                const manifestBlob = new Blob([JSON.stringify(manifest)], { type: 'application/json' });
                const manifestUrl = URL.createObjectURL(manifestBlob);

                // If an existing manifest link exists and points to a blob URL, revoke it to avoid leaks
                const oldManifestLink = document.querySelector('link[rel="manifest"]') as HTMLLinkElement | null;
                if (oldManifestLink) {
                    const oldHref = oldManifestLink.href;
                    oldManifestLink.remove();
                    try {
                        if (oldHref && oldHref.startsWith('blob:')) {
                            URL.revokeObjectURL(oldHref);
                        }
                    } catch (e) {
                        // ignore
                    }
                }

                const newManifestLink = document.createElement('link');
                newManifestLink.rel = 'manifest';
                newManifestLink.href = manifestUrl;
                document.head.appendChild(newManifestLink);

                // Update apple-touch-icon for iOS
                // document.querySelector returns Element | null; cast to HTMLLinkElement for TypeScript
                let appleTouchIcon = document.querySelector('link[rel="apple-touch-icon"]') as HTMLLinkElement | null;
                if (!appleTouchIcon) {
                    appleTouchIcon = document.createElement('link') as HTMLLinkElement;
                    appleTouchIcon.rel = 'apple-touch-icon';
                    document.head.appendChild(appleTouchIcon);
                }
                appleTouchIcon.setAttribute('href', avatarUrl);
                
                // Update page title
                document.title = data.name;
            }
            setLoading(false);
        };

        if (ai) {
            fetchPublicAssistant();
        }
    }, [assistantId, ai]);

    const fetchGrounding = useCallback(async (text: string) => {
        if (!ai || !text.trim()) {
            setGroundingChunks([]);
            return;
        }
        setGroundingChunks([]);

        try {
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: text,
                config: {
                    tools: [{ googleSearch: {} }],
                },
            });
            const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks?.filter(c => c.web);
            if (chunks && chunks.length > 0) {
                setGroundingChunks(chunks);
            }
        } catch (e) {
            console.error("Error fetching grounding:", e);
            setGroundingChunks([]);
        }
    }, [ai]);

    const systemInstruction = assistant ? `
        You are an AI assistant named ${assistant.name}.
        Your personality traits are: ${assistant.personality.join(', ')}.
        Your attitude is: ${assistant.attitude}.
        Your core instruction is: ${assistant.prompt}
        You are speaking to a member of the public. You have no memory of past conversations.
        
        A Google Search tool is available to you. You MUST NOT use this tool unless the user explicitly asks you to search for something or requests current, real-time information (e.g., "what's the latest news?", "search for...", "how is the weather today?"). For all other questions, including general knowledge, creative tasks, and persona-based responses, you must rely solely on your internal knowledge and NOT use the search tool.
    ` : '';

    const handleTurnComplete = useCallback((userTranscript: string) => {
        const searchKeywords = ['search for', 'look up', 'find out', 'what is the latest', 'what are the current', 'google', 'search', 'how is the weather', "what's the weather", "what's the news"];
        const lowerCaseTranscript = userTranscript.toLowerCase();
        const shouldSearch = searchKeywords.some(keyword => lowerCaseTranscript.includes(keyword));

        if (userTranscript.trim() && shouldSearch) {
            fetchGrounding(userTranscript);
        } else {
            setGroundingChunks([]);
        }
    }, [fetchGrounding]);

    const handleSaveToMemory = useCallback(async () => {
        // Do nothing in public mode
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <Icon name="loader" className="w-12 h-12 animate-spin text-brand-secondary-glow"/>
            </div>
        );
    }

    if (error || !assistant) {
        return (
            <div className="flex flex-col items-center justify-center h-screen text-center p-4">
                <Icon name="error" className="w-16 h-16 text-danger mb-4" />
                <h1 className="text-2xl font-bold text-text-primary dark:text-dark-text-primary">{error || "Assistant not found."}</h1>
                <p className="text-text-secondary dark:text-dark-text-secondary mt-1">Please check the URL or contact the creator of this assistant.</p>
            </div>
        );
    }
    
    if (inIframe() && !assistant.is_embeddable) {
        return (
            <div className="flex flex-col items-center justify-center h-screen text-center p-4">
                <Icon name="error" className="w-16 h-16 text-danger mb-4" />
                <h1 className="text-2xl font-bold text-text-primary dark:text-dark-text-primary">Embedding Disabled</h1>
                <p className="text-text-secondary dark:text-dark-text-secondary mt-1">The creator of this assistant has not enabled it for embedding on other websites.</p>
            </div>
        );
    }
    
    // We need to add required properties for the ConversationPage component
    const fullAssistant: Assistant = {
        ...assistant,
        id: assistantId,
        user_id: '',
        created_at: new Date().toISOString(),
    }

    return (
        <div className="h-screen w-screen flex items-center justify-center">
             <GeminiLiveProvider
                assistantId={assistantId}
                voice={assistant.voice}
                systemInstruction={systemInstruction}
                onSaveToMemory={handleSaveToMemory} // Dummy function
                onTurnComplete={handleTurnComplete} // Dummy function
             >
                <ConversationPage
                    assistant={fullAssistant}
                    memory={[]}
                    onNavigateToMemory={() => {}}
                    groundingChunks={groundingChunks}
                />
            </GeminiLiveProvider>
        </div>
    );
}