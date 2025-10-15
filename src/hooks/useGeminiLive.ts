import { useState, useRef, useCallback, useEffect } from 'react';
import {
  GoogleGenAI,
  // FIX: LiveSession is not a public type, so it shouldn't be imported.
  // We can get the session type from the return value of ai.live.connect.
  LiveServerMessage,
  Modality,
  FunctionDeclaration,
  Type,
} from '@google/genai';
import { createBlob, decode, decodeAudioData } from '../utils/audio.ts';
import type { ConversationStatus } from '../types.ts';

// Let TypeScript infer the session type.
type LiveSession = Awaited<ReturnType<InstanceType<typeof GoogleGenAI>['live']['connect']>>;

// Function declaration for saving information to memory
const saveToMemoryFunctionDeclaration: FunctionDeclaration = {
  name: 'saveToMemory',
  description: 'Saves a piece of information that the user explicitly asks to be remembered. Only use this when the user says "remember that", "save this", or a similar direct command.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      info: {
        type: Type.STRING,
        description: 'The specific piece of information to save.',
      },
    },
    required: ['info'],
  },
};

interface UseGeminiLiveProps {
  voice: string;
  systemInstruction: string;
  onSaveToMemory: (info: string) => Promise<void>;
  onTurnComplete: (userTranscript: string, assistantTranscript: string) => void;
}

export function useGeminiLive({
  voice,
  systemInstruction,
  onSaveToMemory,
  onTurnComplete,
}: UseGeminiLiveProps) {
  const [sessionStatus, setSessionStatus] = useState<ConversationStatus>('IDLE');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [userTranscript, setUserTranscript] = useState('');
  const [assistantTranscript, setAssistantTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);

  const sessionRef = useRef<LiveSession | null>(null);
  const aiRef = useRef<GoogleGenAI | null>(null);

  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const microphoneStreamRef = useRef<MediaStream | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const mediaStreamSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);

  // Audio playback queue
  const audioQueueRef = useRef<{ buffer: AudioBuffer; source: AudioBufferSourceNode }[]>([]);
  const nextStartTimeRef = useRef(0);
  const isPlayingRef = useRef(false);
  const sourcesRef = useRef(new Set<AudioBufferSourceNode>());

  // Transcription state
  const currentInputTranscriptionRef = useRef('');
  const currentOutputTranscriptionRef = useRef('');

  useEffect(() => {
    // FIX: Use process.env.API_KEY as per Gemini API guidelines.
    // The value is injected at build time by Vite's `define` config.
    // Added a check for 'undefined' string to handle missing env vars.
    const apiKey = process.env.API_KEY;
    if (!apiKey || apiKey === 'undefined') {
      setError('API key is not configured. Please set VITE_API_KEY in your environment.');
      setSessionStatus('ERROR');
      return;
    }
    aiRef.current = new GoogleGenAI({ apiKey });
  }, []);

  const playNextInQueue = useCallback(() => {
    if (audioQueueRef.current.length === 0 || isPlayingRef.current) {
      if (audioQueueRef.current.length === 0) {
        setIsSpeaking(false);
      }
      return;
    }

    isPlayingRef.current = true;
    setIsSpeaking(true);
    const { buffer, source } = audioQueueRef.current.shift()!;
    const outputNode = outputAudioContextRef.current!.createGain();
    outputNode.connect(outputAudioContextRef.current!.destination);

    source.buffer = buffer;
    source.connect(outputNode);

    source.onended = () => {
      sourcesRef.current.delete(source);
      isPlayingRef.current = false;
      playNextInQueue();
    };

    const currentTime = outputAudioContextRef.current!.currentTime;
    nextStartTimeRef.current = Math.max(nextStartTimeRef.current, currentTime);

    source.start(nextStartTimeRef.current);
    nextStartTimeRef.current += buffer.duration;
    sourcesRef.current.add(source);
  }, []);

  const stopSession = useCallback(async () => {
    if (sessionRef.current) {
      sessionRef.current.close();
      sessionRef.current = null;
    }

    if (scriptProcessorRef.current) {
      scriptProcessorRef.current.disconnect();
      scriptProcessorRef.current = null;
    }
    if (mediaStreamSourceRef.current) {
      mediaStreamSourceRef.current.disconnect();
      mediaStreamSourceRef.current = null;
    }
    if (microphoneStreamRef.current) {
      microphoneStreamRef.current.getTracks().forEach(track => track.stop());
      microphoneStreamRef.current = null;
    }
    
    // Close audio contexts safely
    if (inputAudioContextRef.current && inputAudioContextRef.current.state !== 'closed') {
      await inputAudioContextRef.current.close();
    }
    inputAudioContextRef.current = null;

    if (outputAudioContextRef.current && outputAudioContextRef.current.state !== 'closed') {
      await outputAudioContextRef.current.close();
    }
    outputAudioContextRef.current = null;
    
    // Clear audio queue and stop speaking
    sourcesRef.current.forEach(source => source.stop());
    sourcesRef.current.clear();
    audioQueueRef.current = [];
    isPlayingRef.current = false;
    setIsSpeaking(false);
    nextStartTimeRef.current = 0;

    setSessionStatus('IDLE');
    setUserTranscript('');
    setAssistantTranscript('');
    setError(null);
  }, []);

  const startSession = useCallback(async () => {
    setError(null);
    setSessionStatus('CONNECTING');

    if (!aiRef.current) {
        setError('Gemini AI client is not initialized.');
        setSessionStatus('ERROR');
        return;
    }
    
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setError('Your browser does not support audio recording.');
      setSessionStatus('ERROR');
      return;
    }
    
    try {
        // FIX: Re-create audio contexts each time a session starts.
        inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
        outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        nextStartTimeRef.current = 0;

        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        microphoneStreamRef.current = stream;

        // FIX: Use `sessionPromise` to prevent race conditions when sending data.
        const sessionPromise = aiRef.current.live.connect({
            model: 'gemini-2.5-flash-native-audio-preview-09-2025',
            // FIX: Add required callbacks for onopen, onmessage, onerror, and onclose.
            callbacks: {
                onopen: () => {
                    setSessionStatus('ACTIVE');
                    
                    const source = inputAudioContextRef.current!.createMediaStreamSource(stream);
                    mediaStreamSourceRef.current = source;
                    
                    const scriptProcessor = inputAudioContextRef.current!.createScriptProcessor(4096, 1, 1);
                    scriptProcessorRef.current = scriptProcessor;

                    scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
                        const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
                        const pcmBlob = createBlob(inputData);
                        // FIX: Reliantly use the sessionPromise to send data.
                        sessionPromise.then((session) => {
                            session.sendRealtimeInput({ media: pcmBlob });
                        });
                    };
                    source.connect(scriptProcessor);
                    scriptProcessor.connect(inputAudioContextRef.current!.destination);
                },
                onmessage: async (message: LiveServerMessage) => {
                    // Handle transcription
                    if (message.serverContent?.inputTranscription) {
                        const newText = message.serverContent.inputTranscription.text;
                        currentInputTranscriptionRef.current += newText;
                        setUserTranscript(currentInputTranscriptionRef.current);
                    }
                    if (message.serverContent?.outputTranscription) {
                        const newText = message.serverContent.outputTranscription.text;
                        currentOutputTranscriptionRef.current += newText;
                        setAssistantTranscript(currentOutputTranscriptionRef.current);
                    }
                    if (message.serverContent?.turnComplete) {
                        onTurnComplete(currentInputTranscriptionRef.current, currentOutputTranscriptionRef.current);
                        currentInputTranscriptionRef.current = '';
                        currentOutputTranscriptionRef.current = '';
                    }

                    // Handle tool calls
                    if (message.toolCall?.functionCalls) {
                        for (const fc of message.toolCall.functionCalls) {
                            if (fc.name === 'saveToMemory') {
                                try {
                                    const info = fc.args?.info;
                                    if (typeof info === 'string') {
                                        await onSaveToMemory(info);
                                        sessionPromise.then(session => session.sendToolResponse({
                                            functionResponses: {
                                                id: fc.id,
                                                name: fc.name,
                                                response: { result: "Successfully saved to memory." }
                                            }
                                        }));
                                    } else {
                                        sessionPromise.then(session => session.sendToolResponse({
                                             functionResponses: {
                                                id: fc.id,
                                                name: fc.name,
                                                response: { result: "Failed to save to memory, info was not provided." }
                                            }
                                        }));
                                    }
                                } catch (e) {
                                    console.error("Failed to save to memory:", e);
                                    sessionPromise.then(session => session.sendToolResponse({
                                         functionResponses: {
                                            id: fc.id,
                                            name: fc.name,
                                            response: { result: "Failed to save to memory." }
                                        }
                                    }));
                                }
                            }
                        }
                    }

                    // Handle audio output
                    const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
                    if (base64Audio && outputAudioContextRef.current) {
                        const audioBytes = decode(base64Audio);
                        const audioBuffer = await decodeAudioData(
                            audioBytes,
                            outputAudioContextRef.current,
                            24000,
                            1
                        );
                        const source = outputAudioContextRef.current.createBufferSource();
                        audioQueueRef.current.push({ buffer: audioBuffer, source });
                        playNextInQueue();
                    }
                    
                    if (message.serverContent?.interrupted) {
                       sourcesRef.current.forEach(source => source.stop());
                       sourcesRef.current.clear();
                       audioQueueRef.current = [];
                       isPlayingRef.current = false;
                       setIsSpeaking(false);
                       nextStartTimeRef.current = 0;
                    }
                },
                onerror: (e: ErrorEvent) => {
                    console.error('Session error:', e);
                    setError('A connection error occurred.');
                    setSessionStatus('ERROR');
                    stopSession();
                },
                onclose: () => {
                   // stopSession is called on component unmount or when explicitly stopped.
                },
            },
            config: {
                // FIX: responseModalities must be an array with a single Modality.AUDIO element.
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } },
                },
                systemInstruction: systemInstruction,
                // FIX: Enable both input and output transcriptions.
                inputAudioTranscription: {},
                outputAudioTranscription: {},
                tools: [{ functionDeclarations: [saveToMemoryFunctionDeclaration] }],
            },
        });
        
        sessionRef.current = await sessionPromise;

    } catch (err: any) {
      console.error('Failed to start session:', err);
      setError(err.message || 'Failed to start the microphone.');
      setSessionStatus('ERROR');
    }
  }, [voice, systemInstruction, onSaveToMemory, onTurnComplete, playNextInQueue, stopSession]);

  // Cleanup effect
  useEffect(() => {
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