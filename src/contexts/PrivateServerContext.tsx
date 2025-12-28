import React, { useState, useRef, useCallback, useEffect, createContext, ReactNode } from 'react';
import { createBlob, decode, decodeAudioData, unlockAudioContext } from '../utils/audio.ts';
import type { ConversationStatus } from '../types.ts';
import { logEvent } from '../lib/logger.ts';

export interface PrivateServerContextType {
  sessionStatus: ConversationStatus;
  startSession: () => Promise<void>;
  stopSession: () => void;
  isSpeaking: boolean;
  userTranscript: string;
  assistantTranscript: string;
  error: string | null;
  groundingSources: any[];
}

export const PrivateServerContext = createContext<PrivateServerContextType | undefined>(undefined);

interface PrivateServerProviderProps {
  children: ReactNode;
  systemInstruction: string;
  assistantId: string;
  onSaveToMemory: (info: string) => Promise<void>;
  onTurnComplete: (userTranscript: string, assistantTranscript: string) => void;
  onAddReminder: (content: string, dueDate: string | null) => Promise<void>;
  onCompleteReminder: (reminderContent: string) => Promise<boolean>;
  serverUrl?: string;
  apiKey?: string;
}

interface WebSocketMessage {
  type: 'audio' | 'transcript' | 'error' | 'status' | 'turn_complete';
  data?: string; // base64 encoded audio
  text?: string; // transcript text
  role?: 'user' | 'assistant';
  error?: string;
  status?: string;
}

// Helper function to count legible words (at least 2 characters each)
const countLegibleWords = (text: string): number => {
  if (!text) return 0;
  const fillerSounds = ['um', 'uh', 'ah', 'eh', 'oh', 'mm', 'hm', 'hmm'];
  const words = text.toLowerCase().split(/\s+/).filter(word => {
    const cleanWord = word.replace(/[^a-zA-Z]/g, '');
    return cleanWord.length >= 2 && !fillerSounds.includes(cleanWord);
  });
  return words.length;
};

export const PrivateServerProvider: React.FC<PrivateServerProviderProps> = ({
  children,
  systemInstruction,
  assistantId,
  onSaveToMemory,
  onTurnComplete,
  onAddReminder,
  onCompleteReminder,
  serverUrl = 'ws://localhost:8765/ws/audio',
  apiKey = 'MB8w2x1hGPRBVhZdnRvqJuBxnADUQjFc7GsqXEnJJ8w',
}) => {
  const [sessionStatus, setSessionStatus] = useState<ConversationStatus>('IDLE');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [userTranscript, setUserTranscript] = useState('');
  const [assistantTranscript, setAssistantTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [groundingSources, setGroundingSources] = useState<any[]>([]);

  const wsRef = useRef<WebSocket | null>(null);
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
  const isProcessingRef = useRef(false);

  useEffect(() => {
    assistantIdRef.current = assistantId;
  }, [assistantId]);

  const stopSession = useCallback(async () => {
    if (wsRef.current) {
      logEvent('SESSION_STOP', { assistantId: assistantIdRef.current, provider: 'private_server' });
      wsRef.current.close();
      wsRef.current = null;
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
    isProcessingRef.current = false;
  }, []);

  const startSession = useCallback(async () => {
    setError(null);
    setSessionStatus('CONNECTING');
    setGroundingSources([]);

    if (sessionStatus !== 'IDLE' && sessionStatus !== 'ERROR') {
        return;
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setError('Your browser does not support audio recording.');
      setSessionStatus('ERROR');
      return;
    }

    try {
        logEvent('SESSION_START', { assistantId, provider: 'private_server' });

        // Detect if running as iOS PWA or iOS browser
        const isIOSPWA = (window.navigator as any).standalone === true;
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        const needsIOSHandling = isIOS || isIOSPWA;

        console.log('Platform detection - iOS:', isIOS, 'PWA:', isIOSPWA);

        // Create audio contexts
        if (needsIOSHandling) {
            inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
            outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        } else {
            inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
            outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        }

        const inputSampleRate = inputAudioContextRef.current.sampleRate;
        console.log('AudioContext created with sample rate:', inputSampleRate);

        nextStartTimeRef.current = 0;

        // Unlock audio context on iOS
        if (needsIOSHandling) {
            console.log('Unlocking audio context for iOS...');
            await unlockAudioContext(inputAudioContextRef.current);
            await unlockAudioContext(outputAudioContextRef.current);
            console.log('Audio contexts unlocked');
        } else {
            if (inputAudioContextRef.current.state === 'suspended') {
                await inputAudioContextRef.current.resume();
            }
            if (outputAudioContextRef.current.state === 'suspended') {
                await outputAudioContextRef.current.resume();
            }
        }

        console.log('AudioContext states - input:', inputAudioContextRef.current.state, 'output:', outputAudioContextRef.current.state);

        // Request microphone access
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
        console.log('Microphone track:', audioTrack.label, 'enabled:', audioTrack.enabled);

        // Connect to WebSocket server
        const ws = new WebSocket(serverUrl);
        wsRef.current = ws;

        ws.onopen = async () => {
            console.log('WebSocket connection opened to private server');

            // Send authentication
            ws.send(JSON.stringify({
                type: 'auth',
                api_key: apiKey,
                system_instruction: systemInstruction,
            }));

            setSessionStatus('ACTIVE');

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
            scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
                const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);

                audioChunkCount++;
                if (audioChunkCount % 25 === 1) {
                    const maxAmplitude = Math.max(...Array.from(inputData).map(Math.abs));
                    const hasAudio = maxAmplitude > 0.001;
                    console.log(`Audio chunk ${audioChunkCount}: amplitude=${maxAmplitude.toFixed(4)}, hasAudio=${hasAudio}`);
                }

                // Convert to base64 and send to server
                const pcmBlob = createBlob(inputData, currentSampleRate);

                if (ws.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify({
                        type: 'audio',
                        data: pcmBlob.data, // Already base64 encoded
                        sample_rate: currentSampleRate,
                    }));
                }
            };

            source.connect(scriptProcessor);
            scriptProcessor.connect(inputAudioContextRef.current!.destination);
            console.log('Audio processing pipeline connected');
        };

        ws.onmessage = async (event) => {
            try {
                const message: WebSocketMessage = JSON.parse(event.data);

                switch (message.type) {
                    case 'transcript':
                        if (message.role === 'user' && message.text) {
                            currentInputTranscriptionRef.current = message.text;
                            setUserTranscript(message.text);

                            // Check if we should allow interruption (2+ legible words threshold)
                            if (isSpeaking && !hasInterruptedCurrentTurnRef.current) {
                                const wordCount = countLegibleWords(currentInputTranscriptionRef.current);
                                if (wordCount >= 2) {
                                    hasInterruptedCurrentTurnRef.current = true;
                                    sourcesRef.current.forEach(source => source.stop());
                                    sourcesRef.current.clear();
                                    setIsSpeaking(false);
                                    nextStartTimeRef.current = 0;

                                    // Send interrupt signal to server
                                    if (ws.readyState === WebSocket.OPEN) {
                                        ws.send(JSON.stringify({ type: 'interrupt' }));
                                    }
                                }
                            }
                        } else if (message.role === 'assistant' && message.text) {
                            currentOutputTranscriptionRef.current = message.text;
                            setAssistantTranscript(message.text);
                        }
                        break;

                    case 'audio':
                        if (message.data && outputAudioContextRef.current) {
                            if (speakingTimeoutRef.current) {
                                clearTimeout(speakingTimeoutRef.current);
                            }
                            setIsSpeaking(true);

                            const audioBytes = decode(message.data);
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
                        break;

                    case 'turn_complete':
                        onTurnComplete(currentInputTranscriptionRef.current, currentOutputTranscriptionRef.current);
                        currentInputTranscriptionRef.current = '';
                        currentOutputTranscriptionRef.current = '';
                        hasInterruptedCurrentTurnRef.current = false;
                        isProcessingRef.current = false;
                        break;

                    case 'error':
                        console.error('Server error:', message.error);
                        setError(message.error || 'Server error occurred');
                        break;

                    case 'status':
                        console.log('Server status:', message.status);
                        break;
                }
            } catch (err) {
                console.error('Failed to parse WebSocket message:', err);
            }
        };

        ws.onerror = (e) => {
            console.error('WebSocket error:', e);
            setError('Connection error with private server.');
            setSessionStatus('ERROR');
            logEvent('SESSION_ERROR', {
                assistantId,
                metadata: { error: 'WebSocket error', provider: 'private_server' }
            });
            stopSession();
        };

        ws.onclose = (e) => {
            console.debug('WebSocket closed:', e);
            logEvent('SESSION_CLOSE', {
                assistantId,
                metadata: { code: e.code, reason: e.reason, wasClean: e.wasClean, provider: 'private_server' }
            });
            stopSession();
        };

    } catch (err: any) {
      console.error('Failed to start session:', err);
      setError(err.message || 'Failed to start the microphone.');
      setSessionStatus('ERROR');
      logEvent('SESSION_ERROR', {
          assistantId,
          metadata: { error: err.message || 'Failed to start microphone', provider: 'private_server' }
      });
    }
  }, [systemInstruction, onTurnComplete, stopSession, sessionStatus, assistantId, serverUrl, apiKey, isSpeaking]);

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
    <PrivateServerContext.Provider value={value}>
      {children}
    </PrivateServerContext.Provider>
  );
};
