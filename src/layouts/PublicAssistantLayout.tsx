import { useState, useEffect, useCallback } from 'react';
import { getSupabase } from '../lib/supabaseClient.ts';
import type { Assistant } from '../types.ts';
import { GoogleGenAI } from '@google/genai';

import { Icon } from '../components/Icon.tsx';
import { AssistantAvatar } from '../components/AssistantAvatar.tsx';
import ConversationPage from '../pages/ConversationPage.tsx';
import { GeminiLiveProvider } from '../contexts/GeminiLiveContext.tsx';
import { useGeminiLive } from '../hooks/useGeminiLive.ts';

// A stripped-down version of the Assistant type for public view
type PublicAssistant = Omit<Assistant, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'knowledge_base' | 'original_assistant_id'>;

const inIframe = () => {
  try {
    return window.self !== window.top;
  } catch (e) {
    return true; // Assume it's in an iframe if we can't access top
  }
};

const getMimeTypeFromUrl = (url: string): string => {
    if (url.endsWith('.png')) return 'image/png';
    if (url.endsWith('.jpg') || url.endsWith('.jpeg')) return 'image/jpeg';
    if (url.endsWith('.gif')) return 'image/gif';
    if (url.endsWith('.svg')) return 'image/svg+xml';
    return 'image/png'; // Default
};

const PublicAssistantView = ({ assistant, groundingChunks }: { assistant: Assistant, groundingChunks: any[]}) => {
    const { sessionStatus, startSession, stopSession, isSpeaking } = useGeminiLive();

    const handleAvatarClick = () => {
        if (sessionStatus === 'IDLE' || sessionStatus === 'ERROR') {
            startSession();
        } else {
            stopSession();
        }
    };

    return (
        <>
            {/* Avatar - Centered and elevated higher for transcription space */}
            <div className="absolute z-30 top-1/2 left-1/2 -translate-x-1/2 -translate-y-[calc(50%+8rem)]">
                <AssistantAvatar
                    avatarUrl={assistant.avatar}
                    isSpeaking={isSpeaking}
                    status={sessionStatus}
                    onClick={handleAvatarClick}
                    orbHue={assistant.orb_hue}
                />
            </div>

            <ConversationPage
                assistant={assistant}
                memory={[]}
                onNavigateToMemory={() => {}}
                groundingSources={groundingChunks}
                onToggleChat={() => {}}
            />
        </>
    );
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
                setAssistant(data as unknown as PublicAssistant);

                // Update document title and meta tags for sharing
                document.title = `Harvey IO - ${data.name}`;

                // Update Open Graph meta tags
                let ogTitle = document.querySelector('meta[property="og:title"]');
                if (ogTitle) ogTitle.setAttribute('content', `Harvey IO - ${data.name}`);

                let ogDescription = document.querySelector('meta[property="og:description"]');
                if (ogDescription && data.description) {
                    ogDescription.setAttribute('content', data.description);
                }

                // Update Twitter meta tags
                let twitterTitle = document.querySelector('meta[property="twitter:title"]');
                if (twitterTitle) twitterTitle.setAttribute('content', `Harvey IO - ${data.name}`);

                let twitterDescription = document.querySelector('meta[property="twitter:description"]');
                if (twitterDescription && data.description) {
                    twitterDescription.setAttribute('content', data.description);
                }

                // Dynamically update manifest for PWA
                const baseUrl = window.location.origin;
                const avatarUrl = data.avatar || '/favicon.svg';
                const absoluteAvatarUrl = avatarUrl.startsWith('http') ? avatarUrl : `${baseUrl}${avatarUrl}`;
                const mimeType = getMimeTypeFromUrl(avatarUrl);

                const manifest = {
                    name: `Harvey IO - ${data.name}`,
                    short_name: data.name,
                    start_url: `${baseUrl}/#/public/${assistantId}`,
                    scope: '/',
                    display: 'standalone',
                    background_color: '#111827',
                    theme_color: '#111827',
                    icons: [
                        { src: absoluteAvatarUrl, sizes: '192x192', type: mimeType, purpose: 'any' },
                        { src: absoluteAvatarUrl, sizes: '512x512', type: mimeType, purpose: 'any' },
                    ],
                };

                const manifestBlob = new Blob([JSON.stringify(manifest)], { type: 'application/json' });
                const manifestUrl = URL.createObjectURL(manifestBlob);

                // Remove old and add new manifest link
                document.querySelector('link[rel="manifest"]')?.remove();
                const newManifestLink = document.createElement('link');
                newManifestLink.rel = 'manifest';
                newManifestLink.href = manifestUrl;
                document.head.appendChild(newManifestLink);

                // Update apple-touch-icon as well
                const appleTouchIcon = document.querySelector('link[rel="apple-touch-icon"]');
                if (appleTouchIcon) {
                    appleTouchIcon.setAttribute('href', avatarUrl);
                }
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
        setError(null); // Clear previous errors

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
            setError("Sorry, I couldn't get results from the web right now.");
        }
    }, [ai]);

    const systemInstruction = assistant ? `
        You are an AI assistant named ${assistant.name || 'Assistant'}.
        Your personality traits are: ${(assistant.personality || []).join(', ')}.
        Your attitude is: ${assistant.attitude || 'Practical'}.
        Your core instruction is: ${assistant.prompt || 'Be a helpful assistant.'}
        You are speaking to a member of the public. You have no memory of past conversations.
        
        A Google Search tool is available to you. You MUST NOT use this tool unless the user explicitly asks you to search for something or requests current, real-time information (e.g., "what's the latest news?", "search for...", "how is the weather today?"). For all other questions, including general knowledge, creative tasks, and persona-based responses, you must rely solely on your internal knowledge and NOT use the search tool.
    ` : '';

    const handleTurnComplete = useCallback((userTranscript: string, _assistantTranscript: string) => {
        const searchKeywords = ['search for', 'look up', 'find out', 'what is the latest', 'what are the current', 'google', 'search', 'how is the weather', "what's the weather", "what's the news"];
        const lowerCaseTranscript = userTranscript.toLowerCase();
        const shouldSearch = searchKeywords.some(keyword => lowerCaseTranscript.includes(keyword));

        if (userTranscript.trim() && shouldSearch) {
            fetchGrounding(userTranscript);
        } else {
            setGroundingChunks([]);
        }
    }, [fetchGrounding]);

    const handleSaveToMemory = useCallback(async (_info: string) => {
        // Do nothing in public mode
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen bg-base-light dark:bg-dark-base-light">
                <img src="/favicon.svg" alt="Loading..." className="w-32 h-32 animate-blink" />
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
        ...(assistant as Assistant),
        id: assistantId,
        user_id: '',
        created_at: new Date().toISOString(),
    }

    return (
        <div className="h-screen w-screen flex items-center justify-center relative">
             <GeminiLiveProvider
                assistantId={assistantId}
                voice={assistant.voice || 'Zephyr'}
                systemInstruction={systemInstruction}
                onSaveToMemory={handleSaveToMemory}
                onTurnComplete={handleTurnComplete}
             >
                <PublicAssistantView 
                    assistant={fullAssistant} 
                    groundingChunks={groundingChunks}
                />
            </GeminiLiveProvider>
            <a href="#/upgrade" className="absolute bottom-4 text-xs text-text-tertiary dark:text-dark-text-tertiary hover:underline z-10">
                Upgrade to create your own AI
            </a>
        </div>
    );
}