import { useState, useRef, useCallback } from 'react';
import {
  GoogleGenAI,
  LiveSession,
  LiveServerMessage,
  Modality,
  FunctionDeclaration,
  Type,
} from '@google/genai';
import { createBlob, decode, decodeAudioData } from '../utils/audio.ts';
import type { ConversationStatus, VoiceOption } from '../types.ts';

// FIX: Initialized GoogleGenAI client once and handled missing API key gracefully.
const API_KEY = (import.meta as any).env.VITE_GEMINI_API_KEY;
let ai: GoogleGenAI | null = null;
if (API_KEY) {
  ai = new GoogleGenAI({ apiKey: API_KEY });
}

const saveToMemoryFunctionDeclaration: FunctionDeclaration = {
  name: 'saveToMemory',
  parameters: {
    type: Type.OBJECT,
    description: 'Use this function to save a specific piece of information that the user wants you to remember for later. Only save what is explicitly asked to be remembered.',
    properties: {
      info: {
        type: Type.STRING,
        description: 'The specific piece of information to save to the memory bank.',
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
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [userTranscript, setUserTranscript] = useState('');
  const [assistantTranscript, setAssistantTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);

  const sessionPromiseRef = useRef<Promise<LiveSession> | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);

  const nextStartTimeRef = useRef(0);
  const audioSourcesRef = useRef(new Set<AudioBufferSourceNode>());
  const currentInputTranscriptionRef = useRef('');
  const currentOutputTranscriptionRef = useRef('');

  const stopSession = useCallback(async () => {
    setSessionStatus('IDLE');
    setError(null);
    setIsSpeaking(false);

    if (sessionPromiseRef.current) {
      try {
        const session = await sessionPromiseRef.current;
        session.close();
      } catch (e) {
        console.error("Error closing session:", e);
      }
      sessionPromiseRef.current = null;
    }
    
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    if (scriptProcessorRef.current) {
      scriptProcessorRef.current.disconnect();
      scriptProcessorRef.current = null;
    }
    if (sourceRef.current) {
        sourceRef.current.disconnect();
        sourceRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      await audioContextRef.current.close();
      audioContextRef.current = null;
    }
    if (outputAudioContextRef.current && outputAudioContextRef.current.state !== 'closed') {
        await outputAudioContextRef.current.close();
        outputAudioContextRef.current = null;
    }
    
     for (const source of audioSourcesRef.current.values()) {
        source.stop();
    }
    audioSourcesRef.current.clear();
    nextStartTimeRef.current = 0;
    
  }, []);

  const startSession = useCallback(async () => {
    setError(null);
    setSessionStatus('CONNECTING');
    setUserTranscript('');
    setAssistantTranscript('');
    currentInputTranscriptionRef.current = '';
    currentOutputTranscriptionRef.current = '';
    
    if (!ai) {
      setError("VITE_GEMINI_API_KEY is not set. Please add it to your .env file.");
      setSessionStatus('ERROR');
      return;
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setError('Your browser does not support audio recording.');
      setSessionStatus('ERROR');
      return;
    }
    
    try {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
        outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    } catch (e) {
        setError('Could not initialize audio context. Please allow microphone access.');
        setSessionStatus('ERROR');
        console.error('Error initializing audio contexts:', e);
        return;
    }
    
    const outputNode = outputAudioContextRef.current.createGain();

    sessionPromiseRef.current = ai.live.connect({
      model: 'gemini-2.5-flash-native-audio-preview-09-2025',
      callbacks: {
        onopen: async () => {
          setSessionStatus('ACTIVE');
          try {
            mediaStreamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
            const source = audioContextRef.current!.createMediaStreamSource(mediaStreamRef.current);
            sourceRef.current = source;
            const scriptProcessor = audioContextRef.current!.createScriptProcessor(4096, 1, 1);
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
            scriptProcessor.connect(audioContextRef.current!.destination);
          } catch(err) {
            setError('Microphone access was denied. Please allow access and try again.');
            setSessionStatus('ERROR');
            console.error('Error getting user media:', err);
            await stopSession();
          }
        },
        onmessage: async (message: LiveServerMessage) => {
          const base64EncodedAudioString = message.serverContent?.modelTurn?.parts[0]?.inlineData.data;
          if (base64EncodedAudioString) {
            setIsSpeaking(true);
            nextStartTimeRef.current = Math.max(
              nextStartTimeRef.current,
              outputAudioContextRef.current!.currentTime,
            );
            const audioBuffer = await decodeAudioData(
              decode(base64EncodedAudioString),
              outputAudioContextRef.current!,
              24000,
              1,
            );
            const source = outputAudioContextRef.current!.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(outputNode);
            source.addEventListener('ended', () => {
              audioSourcesRef.current.delete(source);
              if (audioSourcesRef.current.size === 0) {
                  setIsSpeaking(false);
              }
            });

            source.start(nextStartTimeRef.current);
            nextStartTimeRef.current = nextStartTimeRef.current + audioBuffer.duration;
            audioSourcesRef.current.add(source);
          }

          if (message.serverContent?.outputTranscription) {
            currentOutputTranscriptionRef.current += message.serverContent.outputTranscription.text;
            setAssistantTranscript(currentOutputTranscriptionRef.current);
          } else if (message.serverContent?.inputTranscription) {
            currentInputTranscriptionRef.current += message.serverContent.inputTranscription.text;
            setUserTranscript(currentInputTranscriptionRef.current);
          }

          if (message.serverContent?.turnComplete) {
            onTurnComplete(currentInputTranscriptionRef.current, currentOutputTranscriptionRef.current);
            currentInputTranscriptionRef.current = '';
            currentOutputTranscriptionRef.current = '';
            setUserTranscript('');
            setAssistantTranscript('');
          }
          
          if (message.toolCall?.functionCalls) {
            for (const fc of message.toolCall.functionCalls) {
              if (fc.name === 'saveToMemory' && fc.args.info) {
                  await onSaveToMemory(fc.args.info as string);
                  const session = await sessionPromiseRef.current;
                  session?.sendToolResponse({
                      functionResponses: {
                          id : fc.id,
                          name: fc.name,
                          response: { result: 'ok, saved.' },
                      }
                  });
              }
            }
          }

          const interrupted = message.serverContent?.interrupted;
          if (interrupted) {
            for (const source of audioSourcesRef.current.values()) {
              source.stop();
              audioSourcesRef.current.delete(source);
            }
            nextStartTimeRef.current = 0;
            setIsSpeaking(false);
          }
        },
        onerror: (e: ErrorEvent) => {
          console.error('Session error:', e);
          setError(`Connection error: ${e.message}`);
          setSessionStatus('ERROR');
          stopSession();
        },
        onclose: () => {
          console.debug('Session closed');
          stopSession();
        },
      },
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } } },
        systemInstruction: systemInstruction,
        inputAudioTranscription: {},
        outputAudioTranscription: {},
        tools: [{ functionDeclarations: [saveToMemoryFunctionDeclaration] }],
      },
    });
  }, [voice, systemInstruction, onSaveToMemory, onTurnComplete, stopSession]);
  
  return {
    sessionStatus,
    startSession,
    stopSession,
    isSpeaking,
    userTranscript,
    assistantTranscript,
    error
  };
};
