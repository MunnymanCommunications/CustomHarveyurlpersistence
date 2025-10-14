import { useState, useRef, useCallback, useEffect } from 'react';
import {
  GoogleGenAI,
  LiveServerMessage,
  Modality,
  type LiveSession,
  type FunctionDeclaration,
  Type,
  type Blob as GenAI_Blob,
} from '@google/genai';
import type { ConversationStatus, VoiceOption } from '../types';
import { createBlob, decode, decodeAudioData } from '../utils/audio';

const saveToMemoryFunctionDeclaration: FunctionDeclaration = {
  name: 'saveToMemory',
  parameters: {
    type: Type.OBJECT,
    description: 'Saves a piece of key information about the user to a long-term memory bank. Use this ONLY when the user explicitly asks you to remember something or provides a critical piece of personal information (e.g., name, preferences, facts).',
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

// NOTE: This hook manages a complex state machine for live audio streaming.
// It is designed to be self-contained and handles setup, teardown, and event processing.
export function useGeminiLive({ voice, systemInstruction, onSaveToMemory, onTurnComplete }: UseGeminiLiveProps) {
  const [sessionStatus, setSessionStatus] = useState<ConversationStatus>('IDLE');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [userTranscript, setUserTranscript] = useState('');
  const [assistantTranscript, setAssistantTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);

  const ai = useRef<GoogleGenAI | null>(null);
  const sessionPromise = useRef<Promise<LiveSession> | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const nextStartTime = useRef(0);
  const audioSources = useRef<Set<AudioBufferSourceNode>>(new Set());

  const currentInputTranscription = useRef('');
  const currentOutputTranscription = useRef('');

  useEffect(() => {
    // Per guidelines, initialize with API key from process.env.
    // We assume the build environment makes this variable available.
    ai.current = new GoogleGenAI({ apiKey: process.env.API_KEY });
  }, []);

  const stopSession = useCallback(async () => {
    if (sessionPromise.current) {
        try {
            const session = await sessionPromise.current;
            session.close();
        } catch (e) {
            console.error("Error closing session:", e);
        }
    }
    
    streamRef.current?.getTracks().forEach(track => track.stop());
    
    if (scriptProcessorRef.current && sourceNodeRef.current && audioContextRef.current) {
        try {
            sourceNodeRef.current.disconnect(scriptProcessorRef.current);
            scriptProcessorRef.current.disconnect(audioContextRef.current.destination);
        } catch(e) { /* ignore disconnect errors on already closed contexts */ }
    }

    scriptProcessorRef.current = null;
    sourceNodeRef.current = null;
    streamRef.current = null;
    sessionPromise.current = null;

    audioContextRef.current?.close();
    outputAudioContextRef.current?.close();
    audioContextRef.current = null;
    outputAudioContextRef.current = null;

    audioSources.current.forEach(source => source.stop());
    audioSources.current.clear();
    nextStartTime.current = 0;

    // Reset state
    if (sessionStatus !== 'ERROR') {
        setSessionStatus('IDLE');
    }
    setIsSpeaking(false);
    setUserTranscript('');
    setAssistantTranscript('');
    currentInputTranscription.current = '';
    currentOutputTranscription.current = '';

  }, [sessionStatus]);

  const startSession = useCallback(async () => {
    if (sessionStatus !== 'IDLE' && sessionStatus !== 'ERROR') return;
    
    if (!ai.current) {
      setError("Gemini AI client not initialized. Check API Key configuration.");
      setSessionStatus('ERROR');
      return;
    }

    setSessionStatus('CONNECTING');
    setError(null);
    setUserTranscript('');
    setAssistantTranscript('');
    currentInputTranscription.current = '';
    currentOutputTranscription.current = '';

    try {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
      outputAudioContextRef.current = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 24000 });
      nextStartTime.current = 0;

      sessionPromise.current = ai.current.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } },
          },
          systemInstruction,
          tools: [{ functionDeclarations: [saveToMemoryFunctionDeclaration] }],
        },
        callbacks: {
          onopen: async () => {
            setSessionStatus('ACTIVE');
            streamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
            sourceNodeRef.current = audioContextRef.current!.createMediaStreamSource(streamRef.current);
            scriptProcessorRef.current = audioContextRef.current!.createScriptProcessor(4096, 1, 1);
            
            scriptProcessorRef.current.onaudioprocess = (audioProcessingEvent) => {
              const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
              const pcmBlob: GenAI_Blob = createBlob(inputData);
              sessionPromise.current?.then((session) => {
                  session.sendRealtimeInput({ media: pcmBlob });
              });
            };
            sourceNodeRef.current.connect(scriptProcessorRef.current);
            scriptProcessorRef.current.connect(audioContextRef.current!.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            if (message.serverContent?.inputTranscription) {
                const text = message.serverContent.inputTranscription.text;
                currentInputTranscription.current += text;
                setUserTranscript(currentInputTranscription.current);
            }
            if (message.serverContent?.outputTranscription) {
                const text = message.serverContent.outputTranscription.text;
                currentOutputTranscription.current += text;
                setAssistantTranscript(currentOutputTranscription.current);
            }
            if (message.serverContent?.turnComplete) {
                onTurnComplete(currentInputTranscription.current.trim(), currentOutputTranscription.current.trim());
                currentInputTranscription.current = '';
                currentOutputTranscription.current = '';
            }

            const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData.data;
            if (base64Audio) {
              setIsSpeaking(true);
              const outputCtx = outputAudioContextRef.current!;
              nextStartTime.current = Math.max(nextStartTime.current, outputCtx.currentTime);
              
              const audioBuffer = await decodeAudioData(decode(base64Audio), outputCtx, 24000, 1);
              const source = outputCtx.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(outputCtx.destination);
              source.start(nextStartTime.current);

              nextStartTime.current += audioBuffer.duration;
              audioSources.current.add(source);

              source.onended = () => {
                audioSources.current.delete(source);
                if (audioSources.current.size === 0) {
                  setIsSpeaking(false);
                }
              };
            }

            if (message.serverContent?.interrupted) {
                audioSources.current.forEach(source => source.stop());
                audioSources.current.clear();
                nextStartTime.current = 0;
                setIsSpeaking(false);
            }

            if (message.toolCall) {
                for (const fc of message.toolCall.functionCalls) {
                    if (fc.name === 'saveToMemory' && fc.args.info) {
                        await onSaveToMemory(fc.args.info as string);
                        sessionPromise.current?.then(session => {
                            session.sendToolResponse({
                                functionResponses: {
                                    id: fc.id,
                                    name: fc.name,
                                    response: { result: 'OK, I have saved that information.' },
                                }
                            });
                        });
                    }
                }
            }
          },
          onerror: (e: ErrorEvent) => {
            console.error('Session error:', e);
            setError(`Connection error: ${e.message || 'An unknown error occurred.'}`);
            setSessionStatus('ERROR');
            stopSession();
          },
          onclose: () => {
            if(sessionStatus !== 'ERROR') {
                stopSession();
            }
          },
        },
      });

    } catch (e: any) {
      console.error("Failed to start session:", e);
      setError(e.message || "An unknown error occurred.");
      setSessionStatus('ERROR');
      stopSession();
    }
  }, [voice, systemInstruction, onSaveToMemory, onTurnComplete, sessionStatus, stopSession]);

  useEffect(() => {
    // Cleanup on unmount
    return () => {
      stopSession();
    };
  }, [stopSession]);

  return {
    sessionStatus,
    startSession,
    stopSession,
    isSpeaking,
    userTranscript,
    assistantTranscript,
    error,
  };
}
