import { useState, useRef, useCallback, useEffect } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality, Type, FunctionDeclaration } from '@google/genai';
import { createBlob, decode, decodeAudioData } from '../utils/audio';
import type { VoiceOption, ConversationStatus } from '../types';

const SAVE_MEMORY_FUNCTION: FunctionDeclaration = {
    name: 'saveToMemory',
    parameters: {
        type: Type.OBJECT,
        description: 'Saves a new, non-trivial piece of information about the user to a long-term memory bank.',
        properties: {
            information: {
                type: Type.STRING,
                description: 'A concise summary of the information to be saved. For example: "The user\'s name is Jane and she is a doctor."'
            },
        },
        required: ['information'],
    },
};

interface UseGeminiLiveProps {
    voice: VoiceOption;
    systemInstruction: string;
    onSaveToMemory: (info: string) => void;
    onTurnComplete: (userTranscript: string, assistantTranscript: string) => void;
}

export const useGeminiLive = ({ voice, systemInstruction, onSaveToMemory, onTurnComplete }: UseGeminiLiveProps) => {
    const [sessionStatus, setSessionStatus] = useState<ConversationStatus>('IDLE');
    const [error, setError] = useState<string | null>(null);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [userTranscript, setUserTranscript] = useState('');
    const [assistantTranscript, setAssistantTranscript] = useState('');

    const sessionRef = useRef<{
        close: () => void;
        sendRealtimeInput: (input: { media: ReturnType<typeof createBlob> }) => void;
        sendToolResponse: (response: { functionResponses: { id: string; name: string; response: { result: string } } }) => void;
    } | null>(null);
    
    const inputAudioContextRef = useRef<AudioContext | null>(null);
    const outputAudioContextRef = useRef<AudioContext | null>(null);
    const mediaStreamRef = useRef<MediaStream | null>(null);
    const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
    const mediaStreamSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
    
    const currentInputTranscriptRef = useRef('');
    const currentOutputTranscriptRef = useRef('');
    
    const stopSession = useCallback(() => {
        if (sessionRef.current) {
            sessionRef.current.close();
            sessionRef.current = null;
        }
        // FIX: Ensure all audio nodes are disconnected to prevent resource leaks.
        if (scriptProcessorRef.current) {
            scriptProcessorRef.current.disconnect();
            scriptProcessorRef.current.onaudioprocess = null;
            scriptProcessorRef.current = null;
        }
        if(mediaStreamSourceRef.current) {
            mediaStreamSourceRef.current.disconnect();
            mediaStreamSourceRef.current = null;
        }
        if (inputAudioContextRef.current && inputAudioContextRef.current.state !== 'closed') {
            inputAudioContextRef.current.close().catch(console.error);
        }
        if (outputAudioContextRef.current && outputAudioContextRef.current.state !== 'closed') {
            outputAudioContextRef.current.close().catch(console.error);
        }
        if (mediaStreamRef.current) {
            mediaStreamRef.current.getTracks().forEach(track => track.stop());
            mediaStreamRef.current = null;
        }
        setSessionStatus('IDLE');
        setIsSpeaking(false);
        setUserTranscript('');
        setAssistantTranscript('');
        currentInputTranscriptRef.current = '';
        currentOutputTranscriptRef.current = '';
    }, []);

    const startSession = useCallback(async () => {
        setSessionStatus('CONNECTING');
        setError(null);
        
        try {
            // Access the config object injected by index.html
            const APP_CONFIG = (window as any).__APP_CONFIG__ || {};
            const apiKey = APP_CONFIG.API_KEY;
            if (!apiKey || apiKey.startsWith('%%')) {
                throw new Error("Gemini API_KEY was not provided or not replaced during the build process. Please check your deployment environment variables.");
            }
            const ai = new GoogleGenAI({ apiKey: apiKey });

            let nextStartTime = 0;
            const sources = new Set<AudioBufferSourceNode>();

            inputAudioContextRef.current = new (window.AudioContext)({ sampleRate: 16000 });
            outputAudioContextRef.current = new (window.AudioContext)({ sampleRate: 24000 });
            
            const sessionPromise = ai.live.connect({
                model: 'gemini-2.5-flash-native-audio-preview-09-2025',
                callbacks: {
                    onopen: async () => {
                        try {
                            setSessionStatus('ACTIVE');
                            mediaStreamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
                            mediaStreamSourceRef.current = inputAudioContextRef.current!.createMediaStreamSource(mediaStreamRef.current);
                            scriptProcessorRef.current = inputAudioContextRef.current!.createScriptProcessor(4096, 1, 1);
                            
                            scriptProcessorRef.current.onaudioprocess = (audioProcessingEvent) => {
                                const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
                                const pcmBlob = createBlob(inputData);
                                sessionPromise.then((session) => {
                                    session.sendRealtimeInput({ media: pcmBlob });
                                }).catch(e => console.error("Error sending realtime input:", e));
                            };
                            
                            mediaStreamSourceRef.current.connect(scriptProcessorRef.current);
                            scriptProcessorRef.current.connect(inputAudioContextRef.current!.destination);
                        } catch (e: any) {
                             console.error('Error in onopen:', e);
                             setError(e.message || 'Microphone access denied or error.');
                             setSessionStatus('ERROR');
                             stopSession();
                        }
                    },
                    onmessage: async (message: LiveServerMessage) => {
                        if (message.serverContent?.outputTranscription) {
                            currentOutputTranscriptRef.current += message.serverContent.outputTranscription.text;
                            setAssistantTranscript(currentOutputTranscriptRef.current);
                        }
                        if (message.serverContent?.inputTranscription) {
                            currentInputTranscriptRef.current += message.serverContent.inputTranscription.text;
                            setUserTranscript(currentInputTranscriptRef.current);
                        }

                        if (message.serverContent?.turnComplete) {
                            onTurnComplete(currentInputTranscriptRef.current, currentOutputTranscriptRef.current);
                            currentInputTranscriptRef.current = '';
                            currentOutputTranscriptRef.current = '';
                            setUserTranscript('');
                            setAssistantTranscript('');
                        }

                        if (message.toolCall) {
                            for (const fc of message.toolCall.functionCalls) {
                                if (fc.name === 'saveToMemory' && fc.args.information) {
                                    onSaveToMemory(fc.args.information as string);
                                    sessionPromise.then(session => {
                                        session.sendToolResponse({
                                            functionResponses: { id: fc.id, name: fc.name, response: { result: "OK, information saved." } }
                                        });
                                    }).catch(e => console.error("Error sending tool response:", e));
                                }
                            }
                        }

                        if (message.serverContent?.interrupted) {
                            for (const source of sources.values()) {
                                source.stop();
                            }
                            sources.clear();
                            nextStartTime = 0;
                            setIsSpeaking(false);
                        }

                        const base64EncodedAudioString = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
                        if (base64EncodedAudioString) {
                            setIsSpeaking(true);
                            nextStartTime = Math.max(nextStartTime, outputAudioContextRef.current!.currentTime);
                            const audioBuffer = await decodeAudioData(decode(base64EncodedAudioString), outputAudioContextRef.current!, 24000, 1);
                            const source = outputAudioContextRef.current!.createBufferSource();
                            source.buffer = audioBuffer;
                            source.connect(outputAudioContextRef.current!.destination);
                            source.addEventListener('ended', () => {
                                sources.delete(source);
                                if (sources.size === 0) {
                                    setIsSpeaking(false);
                                }
                            });
                            source.start(nextStartTime);
                            nextStartTime += audioBuffer.duration;
                            sources.add(source);
                        }
                    },
                    onerror: (e: ErrorEvent) => {
                        console.error('Session error:', e);
                        setError(e.message || 'An unknown error occurred.');
                        setSessionStatus('ERROR');
                        stopSession();
                    },
                    onclose: () => {
                        stopSession();
                    },
                },
                config: {
                    responseModalities: [Modality.AUDIO],
                    speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } } },
                    systemInstruction,
                    inputAudioTranscription: {},
                    outputAudioTranscription: {},
                    tools: [{ functionDeclarations: [SAVE_MEMORY_FUNCTION] }]
                },
            });
            sessionRef.current = await sessionPromise;

        } catch (e: any) {
            console.error("Failed to start session:", e);
            setError(e.message);
            setSessionStatus('ERROR');
            stopSession();
        }
    }, [voice, systemInstruction, onSaveToMemory, onTurnComplete, stopSession]);

    useEffect(() => {
        return () => {
            stopSession();
        };
    }, [stopSession]);

    return { sessionStatus, startSession, stopSession, isSpeaking, userTranscript, assistantTranscript, error };
};