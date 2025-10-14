import { useState, useRef, useCallback } from 'react';
// FIX: Using VITE_API_KEY environment variable to initialize GoogleGenAI.
import { GoogleGenAI, LiveServerMessage, Modality, Blob, FunctionDeclaration, Type, LiveSession } from '@google/genai';
import type { ConversationStatus, VoiceOption } from '../types.ts';
import { createBlob, decode, decodeAudioData } from '../utils/audio.ts';

// Get the API key from environment variables
const API_KEY = (import.meta as any).env.VITE_API_KEY;
if (!API_KEY) {
    throw new Error("VITE_API_KEY is not set in the environment.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

const saveToMemoryFunctionDeclaration: FunctionDeclaration = {
  name: 'saveToMemory',
  description: 'Saves a key piece of information about the user to a long-term memory bank. Use this when the user explicitly states something important to remember about them, like their name, preferences, goals, or key relationships.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      info: {
        type: Type.STRING,
        description: 'The specific piece of information to save. This should be a concise fact about the user.',
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

export const useGeminiLive = ({ voice, systemInstruction, onSaveToMemory, onTurnComplete }: UseGeminiLiveProps) => {
  const [sessionStatus, setSessionStatus] = useState<ConversationStatus>('IDLE');
  const [userTranscript, setUserTranscript] = useState('');
  const [assistantTranscript, setAssistantTranscript] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sessionPromiseRef = useRef<Promise<LiveSession> | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const mediaStreamSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const sourcesRef = useRef(new Set<AudioBufferSourceNode>());
  const nextStartTimeRef = useRef(0);

  const currentInputTranscription = useRef('');
  const currentOutputTranscription = useRef('');

  const stopSession = useCallback(async () => {
    setSessionStatus('IDLE');
    if (sessionPromiseRef.current) {
        try {
            const session = await sessionPromiseRef.current;
            session.close();
        } catch (e) {
            console.error("Error closing session:", e);
        }
        sessionPromiseRef.current = null;
    }
    
    scriptProcessorRef.current?.disconnect();
    mediaStreamSourceRef.current?.disconnect();
    mediaStreamRef.current?.getTracks().forEach(track => track.stop());
    
    audioContextRef.current?.close();
    outputAudioContextRef.current?.close();

    sourcesRef.current.forEach(source => source.stop());
    sourcesRef.current.clear();
    
    setUserTranscript('');
    setAssistantTranscript('');
    setIsSpeaking(false);
    nextStartTimeRef.current = 0;
  }, []);

  const startSession = useCallback(async () => {
    setError(null);
    setSessionStatus('CONNECTING');
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      const inputAudioContext = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
      audioContextRef.current = inputAudioContext;
      const outputAudioContext = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 24000 });
      outputAudioContextRef.current = outputAudioContext;

      sessionPromiseRef.current = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
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
            if (message.serverContent) {
                // Handle transcription
                if (message.serverContent.inputTranscription) {
                  currentInputTranscription.current += message.serverContent.inputTranscription.text;
                  setUserTranscript(currentInputTranscription.current);
                }
                if (message.serverContent.outputTranscription) {
                  currentOutputTranscription.current += message.serverContent.outputTranscription.text;
                  setAssistantTranscript(currentOutputTranscription.current);
                }
                // Handle turn completion
                if (message.serverContent.turnComplete) {
                    onTurnComplete(currentInputTranscription.current, currentOutputTranscription.current);
                    const fullInputTranscription = currentInputTranscription.current;
                    const fullOutputTranscription = currentOutputTranscription.current;
                    currentInputTranscription.current = '';
                    currentOutputTranscription.current = '';
                    // Only clear the display transcripts if they haven't been updated by a new turn already
                    setUserTranscript(prev => prev === fullInputTranscription ? '' : prev);
                    setAssistantTranscript(prev => prev === fullOutputTranscription ? '' : prev);
                }
                // Handle audio playback
                const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
                if (base64Audio) {
                    setIsSpeaking(true);
                    const outCtx = outputAudioContextRef.current;
                    if (!outCtx) return;

                    nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outCtx.currentTime);
                    const audioBuffer = await decodeAudioData(decode(base64Audio), outCtx, 24000, 1);
                    const source = outCtx.createBufferSource();
                    source.buffer = audioBuffer;
                    source.connect(outCtx.destination);
                    
                    source.onended = () => {
                        sourcesRef.current.delete(source);
                        if (sourcesRef.current.size === 0) {
                            setIsSpeaking(false);
                        }
                    };
                    
                    source.start(nextStartTimeRef.current);
                    nextStartTimeRef.current += audioBuffer.duration;
                    sourcesRef.current.add(source);
                }

                // Handle interruptions
                if (message.serverContent.interrupted) {
                    sourcesRef.current.forEach(s => s.stop());
                    sourcesRef.current.clear();
                    nextStartTimeRef.current = 0;
                    setIsSpeaking(false);
                }
            }

            if (message.toolCall) {
                for (const fc of message.toolCall.functionCalls) {
                    if (fc.name === 'saveToMemory') {
                        await onSaveToMemory(fc.args.info);
                        if (sessionPromiseRef.current) {
                            const session = await sessionPromiseRef.current;
                            session.sendToolResponse({
                                functionResponses: {
                                    id: fc.id,
                                    name: fc.name,
                                    response: { result: "ok, the information has been saved." },
                                }
                            });
                        }
                    }
                }
            }
          },
          onerror: (e: ErrorEvent) => {
            console.error("Session error:", e);
            setError("A connection error occurred. Please try again.");
            setSessionStatus('ERROR');
            stopSession();
          },
          onclose: () => {
            setSessionStatus('IDLE');
          },
        },
        config: {
          responseModalities: [Modality.AUDIO],
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } },
          },
          systemInstruction: systemInstruction,
          tools: [{ functionDeclarations: [saveToMemoryFunctionDeclaration] }],
        },
      });
    } catch (e: any) {
      console.error("Failed to start session:", e);
      setError(e.message || "Failed to access microphone. Please check permissions.");
      setSessionStatus('ERROR');
    }
  }, [voice, systemInstruction, onSaveToMemory, onTurnComplete, stopSession]);
  
  return {
    sessionStatus,
    startSession,
    stopSession,
    isSpeaking,
    userTranscript,
    assistantTranscript,
    error,
  };
};
