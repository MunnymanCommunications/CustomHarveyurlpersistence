import { useState, useRef, useCallback } from 'react';
// Fix: Correct import for GoogleGenAI and related types.
import { GoogleGenAI, LiveServerMessage, Modality, Type, FunctionDeclaration, LiveSession } from '@google/genai';
import { createBlob, decode, decodeAudioData } from '../utils/audio.ts';
import type { ConversationStatus, VoiceOption } from '../types.ts';

// Get API key from environment variables
const API_KEY = (import.meta as any).env.VITE_API_KEY;
if (!API_KEY) {
    throw new Error("VITE_API_KEY is not set in the environment variables.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

const SAVE_TO_MEMORY_TOOL: FunctionDeclaration = {
  name: 'save_to_memory',
  description: 'Saves a piece of information about the user to a long-term memory bank. Use this when the user explicitly tells you to remember something or provides a key piece of personal information.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      info: {
        type: Type.STRING,
        description: 'The specific piece of information to save. Should be a concise fact.',
      },
    },
    required: ['info'],
  },
};

interface UseGeminiLiveProps {
  voice: VoiceOption;
  systemInstruction: string;
  onSaveToMemory: (info: string) => Promise<void>;
  onTurnComplete: (userTranscript: string, assistantTranscript: string) => void;
}

export function useGeminiLive({ voice, systemInstruction, onSaveToMemory, onTurnComplete }: UseGeminiLiveProps) {
    const [sessionStatus, setSessionStatus] = useState<ConversationStatus>('IDLE');
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [userTranscript, setUserTranscript] = useState('');
    const [assistantTranscript, setAssistantTranscript] = useState('');
    const [error, setError] = useState<string | null>(null);

    const sessionPromiseRef = useRef<Promise<LiveSession> | null>(null);
    const mediaStreamRef = useRef<MediaStream | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
    const mediaStreamSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
    
    const outputAudioContextRef = useRef<AudioContext | null>(null);
    const outputGainNodeRef = useRef<GainNode | null>(null);
    const nextStartTimeRef = useRef(0);
    const audioQueueRef = useRef<Set<AudioBufferSourceNode>>(new Set());

    const currentInputTranscriptionRef = useRef('');
    const currentOutputTranscriptionRef = useRef('');

    const startSession = useCallback(async () => {
        setSessionStatus('CONNECTING');
        setError(null);
        setUserTranscript('');
        setAssistantTranscript('');
        currentInputTranscriptionRef.current = '';
        currentOutputTranscriptionRef.current = '';

        try {
            // Setup input audio context
            const inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
            audioContextRef.current = inputAudioContext;

            // Setup output audio context
            const outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
            outputAudioContextRef.current = outputAudioContext;
            const outputGainNode = outputAudioContext.createGain();
            outputGainNode.connect(outputAudioContext.destination);
            outputGainNodeRef.current = outputGainNode;
            
            // Get microphone access
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaStreamRef.current = stream;

            sessionPromiseRef.current = ai.live.connect({
                model: 'gemini-2.5-flash-native-audio-preview-09-2025',
                config: {
                    responseModalities: [Modality.AUDIO],
                    speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } } },
                    systemInstruction: systemInstruction,
                    inputAudioTranscription: {},
                    outputAudioTranscription: {},
                    tools: [{ functionDeclarations: [SAVE_TO_MEMORY_TOOL] }],
                },
                callbacks: {
                    onopen: () => {
                        setSessionStatus('ACTIVE');
                        const source = inputAudioContext.createMediaStreamSource(stream);
                        mediaStreamSourceRef.current = source;
                        const scriptProcessor = inputAudioContext.createScriptProcessor(4096, 1, 1);
                        scriptProcessorRef.current = scriptProcessor;

                        scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
                            const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
                            const pcmBlob = createBlob(inputData);
                            if (sessionPromiseRef.current) {
                                sessionPromiseRef.current.then((session) => {
                                    session.sendRealtimeInput({ media: pcmBlob });
                                });
                            }
                        };
                        source.connect(scriptProcessor);
                        scriptProcessor.connect(inputAudioContext.destination);
                    },
                    onmessage: async (message: LiveServerMessage) => {
                        // Handle audio output
                        const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
                        if (base64Audio && outputAudioContextRef.current && outputGainNodeRef.current) {
                            setIsSpeaking(true);
                            nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputAudioContextRef.current.currentTime);
                            const audioBuffer = await decodeAudioData(decode(base64Audio), outputAudioContextRef.current, 24000, 1);
                            
                            const sourceNode = outputAudioContextRef.current.createBufferSource();
                            sourceNode.buffer = audioBuffer;
                            sourceNode.connect(outputGainNodeRef.current);
                            sourceNode.addEventListener('ended', () => {
                                audioQueueRef.current.delete(sourceNode);
                                if (audioQueueRef.current.size === 0) {
                                    setIsSpeaking(false);
                                }
                            });
                            sourceNode.start(nextStartTimeRef.current);
                            nextStartTimeRef.current += audioBuffer.duration;
                            audioQueueRef.current.add(sourceNode);
                        }

                        // Handle transcriptions
                        if (message.serverContent?.inputTranscription) {
                            currentInputTranscriptionRef.current += message.serverContent.inputTranscription.text;
                            setUserTranscript(currentInputTranscriptionRef.current);
                        }
                        if (message.serverContent?.outputTranscription) {
                            currentOutputTranscriptionRef.current += message.serverContent.outputTranscription.text;
                            setAssistantTranscript(currentOutputTranscriptionRef.current);
                        }
                        if (message.serverContent?.turnComplete) {
                            onTurnComplete(currentInputTranscriptionRef.current, currentOutputTranscriptionRef.current);
                            const fullInput = currentInputTranscriptionRef.current; // copy before clearing
                            currentInputTranscriptionRef.current = '';
                            currentOutputTranscriptionRef.current = '';
                            if (fullInput.trim() !== '') { // only clear display if there was input
                                setUserTranscript('');
                                setAssistantTranscript('');
                            }
                        }
                        if(message.serverContent?.interrupted) {
                            for(const sourceNode of audioQueueRef.current.values()) {
                                sourceNode.stop();
                                audioQueueRef.current.delete(sourceNode);
                            }
                            nextStartTimeRef.current = 0;
                            setIsSpeaking(false);
                        }

                        // Handle tool calls
                        if (message.toolCall?.functionCalls) {
                            for (const fc of message.toolCall.functionCalls) {
                                if (fc.name === 'save_to_memory') {
                                    await onSaveToMemory(fc.args.info);
                                    if(sessionPromiseRef.current) {
                                        sessionPromiseRef.current.then(session => {
                                            session.sendToolResponse({
                                                functionResponses: {
                                                    id: fc.id,
                                                    name: fc.name,
                                                    response: { result: "OK, I've remembered that." },
                                                }
                                            });
                                        });
                                    }
                                }
                            }
                        }
                    },
                    onerror: (e) => {
                        console.error("Session error:", e);
                        setError("Connection error. Please try again.");
                        setSessionStatus('ERROR');
                        // stopSession is called in onclose which is triggered by error
                    },
                    onclose: () => {
                        stopSession(); // ensure cleanup on close
                    },
                }
            });

        } catch (e: any) {
            console.error("Failed to start session:", e);
            setError(e.message || "Failed to access microphone. Please check permissions.");
            setSessionStatus('ERROR');
        }
    }, [voice, systemInstruction, onSaveToMemory, onTurnComplete]);

    const stopSession = useCallback(() => {
        if (sessionStatus === 'IDLE') return; // Prevent multiple calls

        // Close Gemini session first
        if (sessionPromiseRef.current) {
            sessionPromiseRef.current.then(session => session.close()).catch(console.error);
            sessionPromiseRef.current = null;
        }

        // Stop microphone processing
        if (scriptProcessorRef.current) {
            scriptProcessorRef.current.disconnect();
            scriptProcessorRef.current = null;
        }
        if (mediaStreamSourceRef.current) {
            mediaStreamSourceRef.current.disconnect();
            mediaStreamSourceRef.current = null;
        }
        if (mediaStreamRef.current) {
            mediaStreamRef.current.getTracks().forEach(track => track.stop());
            mediaStreamRef.current = null;
        }
        if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
            audioContextRef.current.close();
            audioContextRef.current = null;
        }

        // Stop audio playback
        for(const source of audioQueueRef.current.values()) {
            try { source.stop(); } catch(e) {/* already stopped */}
        }
        audioQueueRef.current.clear();
        if (outputAudioContextRef.current && outputAudioContextRef.current.state !== 'closed') {
            outputAudioContextRef.current.close();
            outputAudioContextRef.current = null;
        }
        
        setSessionStatus('IDLE');
        setIsSpeaking(false);
        nextStartTimeRef.current = 0;
    }, [sessionStatus]);

    return {
        sessionStatus,
        startSession,
        stopSession,
        isSpeaking,
        userTranscript,
        assistantTranscript,
        error
    };
}
