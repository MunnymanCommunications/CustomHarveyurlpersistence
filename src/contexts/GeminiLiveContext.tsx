import React, { useState, useRef, useCallback, useEffect, createContext, ReactNode } from 'react';
import {
  GoogleGenAI,
  LiveServerMessage,
  Modality,
  FunctionDeclaration,
  Type,
} from '@google/genai';
import { createBlob, decode, decodeAudioData, unlockAudioContext } from '../utils/audio.ts';
import type { ConversationStatus, VoiceOption, MCPServerSettings } from '../types.ts';
import { logEvent, startSession as startSessionTracking, endSession as endSessionTracking, incrementSessionErrors } from '../lib/logger.ts';
import { performSearchAndSummarize } from '../agents/webSearchAgent.ts';
import { executeMCPTool, convertMCPToolsToFunctionDeclarations } from '../agents/mcpToolAgent.ts';

type LiveSession = Awaited<ReturnType<InstanceType<typeof GoogleGenAI>['live']['connect']>>;

// Gemini API Model Configuration with Automatic Fallback
// Both models must support native audio for voice conversations
// Primary: Uses VITE_API_KEY
const PRIMARY_MODEL = 'gemini-2.5-flash-native-audio-preview-09-2025';
// Fallback: Uses VITE_FALLBACK_API_KEY (separate API key, same model)
const FALLBACK_MODEL = 'gemini-2.5-flash-native-audio-preview-09-2025';

const saveToMemoryFunctionDeclaration: FunctionDeclaration = {
  name: 'saveToMemory',
  description: 'Saves important information that the user wants you to remember for future conversations. Use this when the user: (1) explicitly asks you to remember something ("remember that", "save this", "don\'t forget"), (2) mentions preferences, likes/dislikes, or personal information, (3) shares important facts about themselves, their work, or their life, (4) gives you instructions about how they want you to behave or respond, (5) asks you to add something to memory. Always use this proactively to build a better understanding of the user over time.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      info: {
        type: Type.STRING,
        description: 'The specific piece of information to save. Be concise but complete.',
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

const addReminderFunctionDeclaration: FunctionDeclaration = {
    name: 'addReminder',
    description: 'Creates a reminder for the user. Use this when the user asks you to remind them about something, set a reminder, or when they mention something they need to do in the future. Examples: "remind me to call mom tomorrow", "set a reminder for my meeting", "I need to remember to buy groceries".',
    parameters: {
        type: Type.OBJECT,
        properties: {
            content: {
                type: Type.STRING,
                description: 'The reminder content - what the user wants to be reminded about.',
            },
            dueDate: {
                type: Type.STRING,
                description: 'Optional due date in ISO format (YYYY-MM-DD). Calculate this based on what the user says (e.g., "tomorrow" means the next day, "next week" means 7 days from now).',
            },
        },
        required: ['content'],
    },
};

const completeReminderFunctionDeclaration: FunctionDeclaration = {
    name: 'completeReminder',
    description: 'Marks a reminder as completed. Use this when the user indicates they have done or completed a task that was set as a reminder. Examples: "I did that", "done", "finished", "completed", "I already did that".',
    parameters: {
        type: Type.OBJECT,
        properties: {
            reminderContent: {
                type: Type.STRING,
                description: 'The content of the reminder to mark as complete. Match it as closely as possible to the original reminder text.',
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
  onAddReminder: (content: string, dueDate: string | null) => Promise<void>;
  onCompleteReminder: (reminderContent: string) => Promise<boolean>;
  mcpServerSettings?: MCPServerSettings | null;
}

// Helper function to count legible words (at least 2 characters each)
const countLegibleWords = (text: string): number => {
  if (!text) return 0;
  // Split by whitespace and filter for words with at least 2 characters
  // Also filter out common filler sounds
  const fillerSounds = ['um', 'uh', 'ah', 'eh', 'oh', 'mm', 'hm', 'hmm'];
  const words = text.toLowerCase().split(/\s+/).filter(word => {
    const cleanWord = word.replace(/[^a-zA-Z]/g, '');
    return cleanWord.length >= 2 && !fillerSounds.includes(cleanWord);
  });
  return words.length;
};

export const GeminiLiveProvider: React.FC<GeminiLiveProviderProps> = ({
  children,
  voice,
  systemInstruction,
  assistantId,
  onSaveToMemory,
  onTurnComplete,
  onAddReminder,
  onCompleteReminder,
  mcpServerSettings,
}) => {
  const [sessionStatus, setSessionStatus] = useState<ConversationStatus>('IDLE');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [userTranscript, setUserTranscript] = useState('');
  const [assistantTranscript, setAssistantTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [groundingSources, setGroundingSources] = useState<any[]>([]);

  const sessionRef = useRef<LiveSession | null>(null);
  const aiRef = useRef<GoogleGenAI | null>(null);
  const fallbackAiRef = useRef<GoogleGenAI | null>(null);
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
  const hasInterruptedCurrentTurnRef = useRef(false);
  
  useEffect(() => {
    assistantIdRef.current = assistantId;
  }, [assistantId]);

  useEffect(() => {
    const apiKey = process.env.API_KEY;
    const fallbackApiKey = process.env.FALLBACK_API_KEY;

    if (!apiKey || apiKey === 'undefined') {
      setError('API key is not configured. Please set VITE_API_KEY in your environment.');
      setSessionStatus('ERROR');
      return;
    }

    // Initialize primary AI client
    aiRef.current = new GoogleGenAI({ apiKey });

    // Initialize fallback AI client if fallback key provided
    if (fallbackApiKey && fallbackApiKey !== 'undefined') {
      fallbackAiRef.current = new GoogleGenAI({ apiKey: fallbackApiKey });
      console.log('✅ Fallback API initialized (separate key)');
    } else {
      console.warn('⚠️ No VITE_FALLBACK_API_KEY configured. Fallback disabled.');
    }
  }, []);

  const stopSession = useCallback(async () => {
    if (sessionRef.current) {
      await endSessionTracking();
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
        await startSessionTracking(assistantId, 'voice');

        // Detect if running as iOS PWA or iOS browser
        const isIOSPWA = (window.navigator as any).standalone === true;
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        const needsIOSHandling = isIOS || isIOSPWA;

        console.log('Platform detection - iOS:', isIOS, 'PWA:', isIOSPWA);

        // For iOS, don't specify sampleRate - let it use native rate (usually 48kHz)
        // iOS Safari doesn't support custom sample rates well in AudioContext
        if (needsIOSHandling) {
            inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
            outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        } else {
            inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
            outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        }

        // Store the actual sample rate for resampling later
        const inputSampleRate = inputAudioContextRef.current.sampleRate;
        console.log('AudioContext created with sample rate:', inputSampleRate);

        nextStartTimeRef.current = 0;

        // Unlock audio context on iOS - this is critical for PWA audio
        if (needsIOSHandling) {
            console.log('Unlocking audio context for iOS...');
            await unlockAudioContext(inputAudioContextRef.current);
            await unlockAudioContext(outputAudioContextRef.current);
            console.log('Audio contexts unlocked');
        } else {
            // For non-iOS, just resume if suspended
            if (inputAudioContextRef.current.state === 'suspended') {
                await inputAudioContextRef.current.resume();
            }
            if (outputAudioContextRef.current.state === 'suspended') {
                await outputAudioContextRef.current.resume();
            }
        }

        console.log('AudioContext states - input:', inputAudioContextRef.current.state, 'output:', outputAudioContextRef.current.state);

        // Request microphone access with iOS-compatible constraints
        const audioConstraints: MediaStreamConstraints = {
            audio: {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true,
            }
        };

        console.log('Requesting microphone access...');
        const stream = await navigator.mediaDevices.getUserMedia(audioConstraints);
        microphoneStreamRef.current = stream;
        console.log('Microphone access granted');

        // Verify audio tracks are active
        const audioTrack = stream.getAudioTracks()[0];
        if (!audioTrack || !audioTrack.enabled) {
            throw new Error('Microphone track is not available or enabled');
        }
        console.log('Microphone track:', audioTrack.label, 'enabled:', audioTrack.enabled, 'muted:', audioTrack.muted, 'readyState:', audioTrack.readyState);

        // Get track settings for debugging
        const trackSettings = audioTrack.getSettings();
        console.log('Track settings:', JSON.stringify(trackSettings));

        // Extract connection configuration for reuse in fallback
        const connectionCallbacks = {
                onopen: async () => {
                    setSessionStatus('ACTIVE');
                    console.log('WebSocket connection opened');

                    // iOS PWA fix: Ensure AudioContext is resumed when connection opens
                    if (inputAudioContextRef.current?.state === 'suspended') {
                        await inputAudioContextRef.current.resume();
                        console.log('AudioContext resumed in onopen');
                    }

                    const currentSampleRate = inputAudioContextRef.current?.sampleRate || 16000;
                    console.log('AudioContext state:', inputAudioContextRef.current?.state, 'sampleRate:', currentSampleRate);

                    const source = inputAudioContextRef.current!.createMediaStreamSource(stream);
                    mediaStreamSourceRef.current = source;

                    // Use larger buffer for iOS to ensure stable audio processing
                    const bufferSize = needsIOSHandling ? 8192 : 4096;
                    const scriptProcessor = inputAudioContextRef.current!.createScriptProcessor(bufferSize, 1, 1);
                    scriptProcessorRef.current = scriptProcessor;

                    let audioChunkCount = 0;
                    let totalSamplesSent = 0;
                    scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
                        const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);

                        // Debug: Check if we're getting actual audio data (not silence)
                        audioChunkCount++;
                        if (audioChunkCount % 25 === 1) { // Log more frequently for debugging
                            const maxAmplitude = Math.max(...Array.from(inputData).map(Math.abs));
                            const hasAudio = maxAmplitude > 0.001;
                            console.log(`Audio chunk ${audioChunkCount}: amplitude=${maxAmplitude.toFixed(4)}, hasAudio=${hasAudio}, samples=${inputData.length}, totalSent=${totalSamplesSent}`);
                        }

                        // Create blob with proper sample rate for resampling
                        const pcmBlob = createBlob(inputData, currentSampleRate);
                        totalSamplesSent += inputData.length;

                        sessionPromise.then((session) => {
                            session.sendRealtimeInput({ media: pcmBlob });
                        });
                    };

                    source.connect(scriptProcessor);
                    scriptProcessor.connect(inputAudioContextRef.current!.destination);
                    console.log('Audio processing pipeline connected');
                },
                onmessage: async (message: LiveServerMessage) => {
                    if (message.serverContent?.inputTranscription) {
                        const newText = message.serverContent.inputTranscription.text;
                        currentInputTranscriptionRef.current += newText;
                        setUserTranscript(currentInputTranscriptionRef.current);

                        // Check if we should allow interruption (2+ legible words threshold)
                        // Only interrupt if assistant is speaking and we haven't already interrupted
                        if (isSpeaking && !hasInterruptedCurrentTurnRef.current) {
                            const wordCount = countLegibleWords(currentInputTranscriptionRef.current);
                            if (wordCount >= 2) {
                                // User has said at least 2 legible words, allow interruption
                                hasInterruptedCurrentTurnRef.current = true;
                                sourcesRef.current.forEach(source => source.stop());
                                sourcesRef.current.clear();
                                setIsSpeaking(false);
                                nextStartTimeRef.current = 0;
                            }
                        }
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
                        hasInterruptedCurrentTurnRef.current = false; // Reset interrupt flag for next turn
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
                            } else if (fc.name === 'addReminder') {
                                toolUsed = 'addReminder';
                                try {
                                    const content = fc.args?.content;
                                    const dueDate = typeof fc.args?.dueDate === 'string' ? fc.args.dueDate : null;
                                    if (typeof content === 'string') {
                                        await onAddReminder(content, dueDate);
                                        result = `Successfully created reminder: "${content}"${dueDate ? ` for ${dueDate}` : ''}.`;
                                    } else {
                                        result = "Failed to create reminder, content was not provided.";
                                    }
                                } catch (e) {
                                    console.error("Failed to add reminder:", e);
                                    result = "Failed to create reminder.";
                                }
                            } else if (fc.name === 'completeReminder') {
                                toolUsed = 'completeReminder';
                                try {
                                    const reminderContent = fc.args?.reminderContent;
                                    if (typeof reminderContent === 'string') {
                                        const success = await onCompleteReminder(reminderContent);
                                        if (success) {
                                            result = `Great! I've marked the reminder "${reminderContent}" as completed.`;
                                        } else {
                                            result = `I couldn't find a matching reminder for "${reminderContent}". It may have already been completed or doesn't exist.`;
                                        }
                                    } else {
                                        result = "Failed to complete reminder, content was not provided.";
                                    }
                                } catch (e) {
                                    console.error("Failed to complete reminder:", e);
                                    result = "Failed to complete reminder.";
                                }
                            } else if (mcpServerSettings?.enabled && fc.name && mcpServerSettings.tools.find(t => t.name === fc.name)) {
                                // Handle MCP tool execution via Gemini Pro sub-agent
                                toolUsed = fc.name;
                                if (aiRef.current) {
                                    const mcpResult = await executeMCPTool(
                                        fc.name,
                                        fc.args || {},
                                        mcpServerSettings.config,
                                        mcpServerSettings.tools,
                                        mcpServerSettings.optimizedToolDescriptions,
                                        aiRef.current
                                    );
                                    result = mcpResult.summary;

                                    // Log MCP tool execution
                                    logEvent('MCP_TOOL_EXECUTED', {
                                        assistantId,
                                        metadata: {
                                            tool: fc.name,
                                            success: mcpResult.success,
                                            error: mcpResult.error,
                                        }
                                    });
                                } else {
                                    result = "Could not execute MCP tool: AI client not initialized.";
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
                       // Only allow server-side interrupt if we've already passed the 2-word threshold
                       // This ensures users can't interrupt with just a single sound/word
                       if (hasInterruptedCurrentTurnRef.current) {
                           sourcesRef.current.forEach(source => source.stop());
                           sourcesRef.current.clear();
                           setIsSpeaking(false);
                           nextStartTimeRef.current = 0;
                       }
                    }
                },
                onerror: (e: ErrorEvent) => {
                    console.error('Session error:', e);
                    setError('A connection error occurred.');
                    setSessionStatus('ERROR');
                    incrementSessionErrors();
                    logEvent('SESSION_ERROR', {
                      assistantId,
                      metadata: { error: e.message },
                      severity: 'ERROR'
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
        };

        const connectionConfig = {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } },
                },
                systemInstruction: systemInstruction,
                inputAudioTranscription: {},
                outputAudioTranscription: {},
                tools: [{
                    functionDeclarations: [
                        saveToMemoryFunctionDeclaration,
                        webSearchFunctionDeclaration,
                        addReminderFunctionDeclaration,
                        completeReminderFunctionDeclaration,
                        // Add MCP tools if enabled
                        ...(mcpServerSettings?.enabled && mcpServerSettings.tools.length > 0
                            ? convertMCPToolsToFunctionDeclarations(mcpServerSettings.tools)
                            : [])
                    ]
                }],
        };

        // Create primary connection
        const sessionPromise = aiRef.current.live.connect({
            model: PRIMARY_MODEL,
            callbacks: connectionCallbacks,
            config: connectionConfig,
        });

        // Attempt to connect with primary model
        try {
            console.log(`🔵 Connecting to PRIMARY: ${PRIMARY_MODEL}`);
            sessionRef.current = await sessionPromise;
            console.log(`✅ Connected to PRIMARY: ${PRIMARY_MODEL}`);
        } catch (primaryError: any) {
            console.error(`❌ PRIMARY model failed: ${primaryError.message}`);

            // Log primary failure
            await logEvent('API_PRIMARY_FAILED', {
                assistantId,
                metadata: {
                    model: PRIMARY_MODEL,
                    error: primaryError.message
                },
                severity: 'WARNING'
            });

            // Attempt fallback if available
            if (fallbackAiRef.current) {
                console.log(`🟡 Attempting FALLBACK: ${FALLBACK_MODEL}`);

                try {
                    // Create fallback connection with same config
                    const fallbackPromise = fallbackAiRef.current.live.connect({
                        model: FALLBACK_MODEL,
                        callbacks: connectionCallbacks,
                        config: connectionConfig,
                    });

                    sessionRef.current = await fallbackPromise;
                    console.log(`✅ Connected to FALLBACK: ${FALLBACK_MODEL}`);

                    // Log successful fallback
                    await logEvent('API_FALLBACK_SUCCESS', {
                        assistantId,
                        metadata: {
                            primaryModel: PRIMARY_MODEL,
                            fallbackModel: FALLBACK_MODEL,
                            primaryError: primaryError.message
                        },
                        severity: 'WARNING'
                    });
                } catch (fallbackError: any) {
                    console.error(`❌ FALLBACK model also failed: ${fallbackError.message}`);
                    throw new Error(`Both API models failed. Primary: ${primaryError.message}, Fallback: ${fallbackError.message}`);
                }
            } else {
                // No fallback available, re-throw primary error
                throw primaryError;
            }
        }

    } catch (err: any) {
      console.error('Failed to start session:', err);
      setError(err.message || 'Failed to start the microphone.');
      setSessionStatus('ERROR');
      incrementSessionErrors();
      logEvent('SESSION_ERROR', {
          assistantId,
          metadata: { error: err.message || 'Failed to start microphone' },
          severity: 'ERROR'
      });
    }
  }, [voice, systemInstruction, onSaveToMemory, onTurnComplete, onAddReminder, onCompleteReminder, stopSession, sessionStatus, assistantId, mcpServerSettings, isSpeaking]);

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