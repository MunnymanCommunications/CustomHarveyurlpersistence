import React, { useState, useRef, useCallback, useEffect, createContext, ReactNode } from 'react';
import {
  GoogleGenAI,
  LiveServerMessage,
  Modality,
  FunctionDeclaration,
  Type,
} from '@google/genai';
import { createBlob, decode, decodeAudioData } from '../utils/audio.ts';
import type { ConversationStatus, VoiceOption } from '../types.ts';
import { logEvent } from '../lib/logger.ts';
import { performSearchAndSummarize } from '../agents/webSearchAgent.ts';

type LiveSession = Awaited<ReturnType<InstanceType<typeof GoogleGenAI>['live']['connect']>>;

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

const webSearchFunctionDeclaration: FunctionDeclaration = {
    name: 'webSearch',
    description: 'Searches the web for current, real-time information, news, or topics that require up-to-date knowledge.',
    parameters: {
        type: Type.OBJECT,
        properties: {
            query: {
                type: Type.STRING,
                description: 'The search query to look up on the web.',
            },
        },
        required: ['query'],
    },
};

const createReminderFunctionDeclaration: FunctionDeclaration = {
    name: 'createReminder',
    description: 'Creates a new reminder for the user. Use when the user asks to be reminded about something or to create a reminder.',
    parameters: {
        type: Type.OBJECT,
        properties: {
            content: {
                type: Type.STRING,
                description: 'The content or description of what to remind about.',
            },
            dueDate: {
                type: Type.STRING,
                description: 'Optional due date in ISO format (YYYY-MM-DD). Leave empty if no specific date is mentioned.',
            },
        },
        required: ['content'],
    },
};

const listRemindersFunctionDeclaration: FunctionDeclaration = {
    name: 'listReminders',
    description: 'Lists all active (not completed) reminders for the user. Use when the user asks what reminders they have or to see their reminder list.',
    parameters: {
        type: Type.OBJECT,
        properties: {},
    },
};

const completeReminderFunctionDeclaration: FunctionDeclaration = {
    name: 'completeReminder',
    description: 'Marks a reminder as complete. Use when the user says they completed a task or want to mark a reminder as done. Match the reminder by its content/description.',
    parameters: {
        type: Type.OBJECT,
        properties: {
            reminderContent: {
                type: Type.STRING,
                description: 'The content or description of the reminder to complete. This will be matched against existing reminders.',
            },
        },
        required: ['reminderContent'],
    },
};

export interface GeminiLiveContextType {
  sessionStatus: ConversationStatus;
  startSession: () => Promise<void>;
  stopSession: () => void;
  isSpeaking: boolean;
  userTranscript: string;
  assistantTranscript: string;
  error: string | null;
  groundingSources: any[];
}

export const GeminiLiveContext = createContext<GeminiLiveContextType | undefined>(undefined);

interface GeminiLiveProviderProps {
  children: ReactNode;
  voice: VoiceOption;
  systemInstruction: string;
  assistantId: string;
  onSaveToMemory: (info: string) => Promise<void>;
  onTurnComplete: (userTranscript: string, assistantTranscript: string) => void;
  onCreateReminder: (content: string, dueDate: string | null) => Promise<void>;
  onListReminders: () => Promise<string>;
  onCompleteReminderByContent: (reminderContent: string) => Promise<string>;
}

export const GeminiLiveProvider: React.FC<GeminiLiveProviderProps> = ({
  children,
  voice,
  systemInstruction,
  assistantId,
  onSaveToMemory,
  onTurnComplete,
  onCreateReminder,
  onListReminders,
  onCompleteReminderByContent,
}) => {
  const [sessionStatus, setSessionStatus] = useState<ConversationStatus>('IDLE');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [userTranscript, setUserTranscript] = useState('');
  const [assistantTranscript, setAssistantTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [groundingSources, setGroundingSources] = useState<any[]>([]);

  const sessionRef = useRef<LiveSession | null>(null);
  const aiRef = useRef<GoogleGenAI | null>(null);
  const assistantIdRef = useRef(assistantId);

  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const microphoneStreamRef = useRef<MediaStream | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const mediaStreamSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);

  const nextStartTimeRef = useRef(0);
  const sourcesRef = useRef(new Set<AudioBufferSourceNode>());
  const speakingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentInputTranscriptionRef = useRef('');
  const currentOutputTranscriptionRef = useRef('');
  const isSpeakingRef = useRef(false);
  const gainNodeRef = useRef<GainNode | null>(null);

  // Keep the ref in sync with state for use in audio processing
  useEffect(() => {
    isSpeakingRef.current = isSpeaking;
    // Mute microphone input when assistant is speaking to prevent echo
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = isSpeaking ? 0 : 1;
    }
  }, [isSpeaking]);

  useEffect(() => {
    assistantIdRef.current = assistantId;
  }, [assistantId]);

  useEffect(() => {
    const apiKey = import.meta.env.VITE_API_KEY;
    if (!apiKey || apiKey === 'undefined') {
      setError('API key is not configured. Please set VITE_API_KEY in your environment.');
      setSessionStatus('ERROR');
      return;
    }
    aiRef.current = new GoogleGenAI({ apiKey });
  }, []);

  const stopSession = useCallback(async () => {
    if (sessionRef.current) {
      logEvent('SESSION_STOP', { assistantId: assistantIdRef.current });
      sessionRef.current.close();
      sessionRef.current = null;
    }

    if (scriptProcessorRef.current) {
      scriptProcessorRef.current.disconnect();
      scriptProcessorRef.current = null;
    }
    if (gainNodeRef.current) {
      gainNodeRef.current.disconnect();
      gainNodeRef.current = null;
    }
    if (mediaStreamSourceRef.current) {
      mediaStreamSourceRef.current.disconnect();
      mediaStreamSourceRef.current = null;
    }
    if (microphoneStreamRef.current) {
      microphoneStreamRef.current.getTracks().forEach(track => track.stop());
      microphoneStreamRef.current = null;
    }

    if (inputAudioContextRef.current && inputAudioContextRef.current.state !== 'closed') {
      await inputAudioContextRef.current.close();
    }
    inputAudioContextRef.current = null;

    if (outputAudioContextRef.current && outputAudioContextRef.current.state !== 'closed') {
      await outputAudioContextRef.current.close();
    }
    outputAudioContextRef.current = null;
    
    sourcesRef.current.forEach(source => source.stop());
    sourcesRef.current.clear();
    if (speakingTimeoutRef.current) {
      clearTimeout(speakingTimeoutRef.current);
    }
    setIsSpeaking(false);
    nextStartTimeRef.current = 0;

    setSessionStatus('IDLE');
    setUserTranscript('');
    setAssistantTranscript('');
    setError(null);
    setGroundingSources([]);
  }, []);

  const startSession = useCallback(async () => {
    setError(null);
    setSessionStatus('CONNECTING');
    setGroundingSources([]);

    if (sessionStatus !== 'IDLE' && sessionStatus !== 'ERROR') {
        return;
    }

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
        logEvent('SESSION_START', { assistantId });
        inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
        outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        nextStartTimeRef.current = 0;

        // Request echo cancellation and noise suppression to prevent self-interruption
        const stream = await navigator.mediaDevices.getUserMedia({
            audio: {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true,
            }
        });
        microphoneStreamRef.current = stream;

        const sessionPromise = aiRef.current.live.connect({
            model: 'gemini-2.5-flash-native-audio-preview-09-2025',
            callbacks: {
                onopen: () => {
                    setSessionStatus('ACTIVE');

                    const source = inputAudioContextRef.current!.createMediaStreamSource(stream);
                    mediaStreamSourceRef.current = source;

                    // Create a gain node to mute/unmute microphone when assistant is speaking
                    const gainNode = inputAudioContextRef.current!.createGain();
                    gainNode.gain.value = 1; // Start unmuted
                    gainNodeRef.current = gainNode;

                    const scriptProcessor = inputAudioContextRef.current!.createScriptProcessor(4096, 1, 1);
                    scriptProcessorRef.current = scriptProcessor;

                    scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
                        // Don't send audio when assistant is speaking (additional safety check)
                        if (isSpeakingRef.current) return;

                        const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
                        const pcmBlob = createBlob(inputData);
                        sessionPromise.then((session) => {
                            session.sendRealtimeInput({ media: pcmBlob });
                        });
                    };

                    // Chain: source -> gainNode -> scriptProcessor -> destination
                    source.connect(gainNode);
                    gainNode.connect(scriptProcessor);
                    scriptProcessor.connect(inputAudioContextRef.current!.destination);
                },
                onmessage: async (message: LiveServerMessage) => {
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
                        // Clear sources after a turn is complete
                        setTimeout(() => setGroundingSources([]), 3000);
                    }

                    if (message.toolCall?.functionCalls) {
                        for (const fc of message.toolCall.functionCalls) {
                           let result: string | undefined;
                           let toolUsed = '';

                           if (fc.name === 'saveToMemory') {
                                toolUsed = 'saveToMemory';
                                try {
                                    const info = fc.args?.info;
                                    if (typeof info === 'string') {
                                        await onSaveToMemory(info);
                                        result = "Successfully saved to memory.";
                                    } else {
                                        result = "Failed to save to memory, info was not provided.";
                                    }
                                } catch (e) {
                                    console.error("Failed to save to memory:", e);
                                    result = "Failed to save to memory.";
                                }
                            } else if (fc.name === 'webSearch') {
                                toolUsed = 'webSearch';
                                const query = fc.args?.query;
                                if (typeof query === 'string' && aiRef.current) {
                                    const searchResult = await performSearchAndSummarize(query, aiRef.current);
                                    result = searchResult.summary;
                                    setGroundingSources(searchResult.sources);
                                } else {
                                    result = "Could not perform web search due to an invalid query.";
                                }
                            } else if (fc.name === 'createReminder') {
                                toolUsed = 'createReminder';
                                try {
                                    const content = fc.args?.content;
                                    const dueDate = fc.args?.dueDate || null;
                                    if (typeof content === 'string') {
                                        await onCreateReminder(content, dueDate);
                                        result = `Reminder created successfully${dueDate ? ` with due date ${dueDate}` : ''}.`;
                                    } else {
                                        result = "Failed to create reminder: content is required.";
                                    }
                                } catch (e) {
                                    console.error("Failed to create reminder:", e);
                                    result = "Failed to create reminder.";
                                }
                            } else if (fc.name === 'listReminders') {
                                toolUsed = 'listReminders';
                                try {
                                    result = await onListReminders();
                                } catch (e) {
                                    console.error("Failed to list reminders:", e);
                                    result = "Failed to retrieve reminders.";
                                }
                            } else if (fc.name === 'completeReminder') {
                                toolUsed = 'completeReminder';
                                try {
                                    const reminderContent = fc.args?.reminderContent;
                                    if (typeof reminderContent === 'string') {
                                        result = await onCompleteReminderByContent(reminderContent);
                                    } else {
                                        result = "Failed to complete reminder: please specify which reminder to complete.";
                                    }
                                } catch (e) {
                                    console.error("Failed to complete reminder:", e);
                                    result = "Failed to complete reminder.";
                                }
                            }

                           if (toolUsed) {
                                sessionPromise.then(session => session.sendToolResponse({
                                    functionResponses: { id: fc.id, name: fc.name, response: { result: result ?? "Tool executed successfully." } }
                                }));
                           }
                        }
                    }

                    const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
                    if (base64Audio && outputAudioContextRef.current) {
                        if (speakingTimeoutRef.current) {
                            clearTimeout(speakingTimeoutRef.current);
                        }
                        setIsSpeaking(true);

                        const audioBytes = decode(base64Audio);
                        const audioBuffer = await decodeAudioData(
                            audioBytes,
                            outputAudioContextRef.current,
                            24000,
                            1
                        );
                        const source = outputAudioContextRef.current.createBufferSource();
                        source.buffer = audioBuffer;
                        const outputNode = outputAudioContextRef.current.createGain();
                        outputNode.connect(outputAudioContextRef.current.destination);
                        source.connect(outputNode);
                        
                        source.onended = () => {
                            sourcesRef.current.delete(source);
                            if (sourcesRef.current.size === 0) {
                                speakingTimeoutRef.current = setTimeout(() => setIsSpeaking(false), 200);
                            }
                        };
                        sourcesRef.current.add(source);

                        const currentTime = outputAudioContextRef.current.currentTime;
                        const startTime = Math.max(currentTime, nextStartTimeRef.current);
                        source.start(startTime);
                        nextStartTimeRef.current = startTime + audioBuffer.duration;
                    }
                    
                    if (message.serverContent?.interrupted) {
                       sourcesRef.current.forEach(source => source.stop());
                       sourcesRef.current.clear();
                       setIsSpeaking(false);
                       nextStartTimeRef.current = 0;
                    }
                },
                onerror: (e: ErrorEvent) => {
                    console.error('Session error:', e);
                    setError('A connection error occurred.');
                    setSessionStatus('ERROR');
                    logEvent('SESSION_ERROR', {
                      assistantId,
                      metadata: { error: e.message }
                    });
                    stopSession();
                },
                onclose: (e: CloseEvent) => {
                   console.debug('Session closed, cleaning up.', e);
                   logEvent('SESSION_CLOSE', {
                       assistantId,
                       metadata: { code: e.code, reason: e.reason, wasClean: e.wasClean }
                   });
                   stopSession();
                },
            },
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } },
                },
                systemInstruction: systemInstruction,
                inputAudioTranscription: {},
                outputAudioTranscription: {},
                tools: [{ functionDeclarations: [saveToMemoryFunctionDeclaration, webSearchFunctionDeclaration, createReminderFunctionDeclaration, listRemindersFunctionDeclaration, completeReminderFunctionDeclaration] }],
            },
        });
        
        sessionRef.current = await sessionPromise;

    } catch (err: any) {
      console.error('Failed to start session:', err);
      let errorMessage = 'Failed to start the voice session.';

      // Provide more specific error messages
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        errorMessage = 'Microphone permission was denied. Please allow microphone access in your browser settings and try again.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        errorMessage = 'No microphone found. Please connect a microphone and try again.';
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        errorMessage = 'Microphone is already in use by another application. Please close other apps using the microphone and try again.';
      } else if (err.message?.includes('API key')) {
        errorMessage = 'API key error. Please check your VITE_API_KEY environment variable.';
      } else if (err.message) {
        errorMessage = `Error: ${err.message}`;
      }

      setError(errorMessage);
      setSessionStatus('ERROR');
      logEvent('SESSION_ERROR', {
          assistantId,
          metadata: { error: err.message || 'Failed to start microphone', errorName: err.name }
      });
    }
  }, [voice, systemInstruction, onSaveToMemory, onTurnComplete, onCreateReminder, onListReminders, onCompleteReminderByContent, stopSession, sessionStatus, assistantId]);

  useEffect(() => {
    return () => {
      stopSession();
    };
  }, [stopSession]);

  const value = {
    sessionStatus,
    startSession,
    stopSession,
    isSpeaking,
    userTranscript,
    assistantTranscript,
    error,
    groundingSources,
  };

  return (
    <GeminiLiveContext.Provider value={value}>
      {children}
    </GeminiLiveContext.Provider>
  );
};