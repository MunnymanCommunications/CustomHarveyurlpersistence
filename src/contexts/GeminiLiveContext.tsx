import React, { useState, useRef, useCallback, useEffect, createContext, ReactNode } from 'react';
import {
  GoogleGenAI,
  LiveServerMessage,
  Modality,
  FunctionDeclaration,
  Type,
} from '@google/genai';
import { createBlob, decode, decodeAudioData } from '../utils/audio.ts';
import type { ConversationStatus, VoiceOption, MCPServerSettings } from '../types.ts';
import { logEvent } from '../lib/logger.ts';
import { performSearchAndSummarize } from '../agents/webSearchAgent.ts';
import { executeMCPTool, convertMCPToolsToFunctionDeclarations } from '../agents/mcpToolAgent.ts';

type LiveSession = Awaited<ReturnType<InstanceType<typeof GoogleGenAI>['live']['connect']>>;

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
    description: 'Creates a reminder for the user. Use this when the user asks you to remind them of something, set a reminder, or mentions they need to do something later. You can set reminders with or without a specific date.',
    parameters: {
        type: Type.OBJECT,
        properties: {
            content: {
                type: Type.STRING,
                description: 'What the user wants to be reminded about. Be clear and specific.',
            },
            dueDate: {
                type: Type.STRING,
                description: 'Optional due date in ISO 8601 format (YYYY-MM-DD). Only include if the user specifies a date. Leave empty for general reminders.',
            },
        },
        required: ['content'],
    },
};

const completeReminderFunctionDeclaration: FunctionDeclaration = {
    name: 'completeReminder',
    description: 'Marks a reminder as completed. Use this when the user confirms they have completed a task you reminded them about, or when they explicitly say they finished something that was in their reminders.',
    parameters: {
        type: Type.OBJECT,
        properties: {
            content: {
                type: Type.STRING,
                description: 'The content of the reminder to mark as complete. Should match what the user is referring to.',
            },
        },
        required: ['content'],
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
  onCompleteReminder: (content: string) => Promise<void>;
  mcpServerSettings?: MCPServerSettings | null;
}

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
  
  useEffect(() => {
    assistantIdRef.current = assistantId;
  }, [assistantId]);

  useEffect(() => {
    const apiKey = process.env.API_KEY;
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

        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        microphoneStreamRef.current = stream;

        const sessionPromise = aiRef.current.live.connect({
            model: 'gemini-2.5-flash-native-audio-preview-09-2025',
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
                        sessionPromise.then((session) => {
                            session.sendRealtimeInput({ media: pcmBlob });
                        });
                    };
                    source.connect(scriptProcessor);
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
                            } else if (fc.name === 'addReminder') {
                                toolUsed = 'addReminder';
                                try {
                                    const content = fc.args?.content;
                                    const dueDate = fc.args?.dueDate || null;
                                    if (typeof content === 'string') {
                                        await onAddReminder(content, dueDate);
                                        result = "Successfully created reminder.";
                                    } else {
                                        result = "Failed to create reminder, content was not provided.";
                                    }
                                } catch (e) {
                                    console.error("Failed to create reminder:", e);
                                    result = "Failed to create reminder.";
                                }
                            } else if (fc.name === 'completeReminder') {
                                toolUsed = 'completeReminder';
                                try {
                                    const content = fc.args?.content;
                                    if (typeof content === 'string') {
                                        await onCompleteReminder(content);
                                        result = "Successfully marked reminder as complete.";
                                    } else {
                                        result = "Failed to complete reminder, content was not provided.";
                                    }
                                } catch (e) {
                                    console.error("Failed to complete reminder:", e);
                                    result = "Failed to complete reminder.";
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
                tools: [{
                    functionDeclarations: [
                        saveToMemoryFunctionDeclaration,
                        addReminderFunctionDeclaration,
                        completeReminderFunctionDeclaration,
                        webSearchFunctionDeclaration,
                        // Add MCP tools if enabled
                        ...(mcpServerSettings?.enabled && mcpServerSettings.tools.length > 0
                            ? convertMCPToolsToFunctionDeclarations(mcpServerSettings.tools)
                            : [])
                    ]
                }],
            },
        });
        
        sessionRef.current = await sessionPromise;

    } catch (err: any) {
      console.error('Failed to start session:', err);
      setError(err.message || 'Failed to start the microphone.');
      setSessionStatus('ERROR');
      logEvent('SESSION_ERROR', {
          assistantId,
          metadata: { error: err.message || 'Failed to start microphone' }
      });
    }
  }, [voice, systemInstruction, onSaveToMemory, onTurnComplete, onAddReminder, onCompleteReminder, stopSession, sessionStatus, assistantId, mcpServerSettings]);

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