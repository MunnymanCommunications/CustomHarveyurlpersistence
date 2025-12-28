import React, { useState, useRef, useCallback, useEffect, createContext, ReactNode } from 'react';
import { createBlob, decode, decodeAudioData, unlockAudioContext } from '../utils/audio.ts';
import type { ConversationStatus, PrivateServerConfig } from '../types.ts';
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
  config: PrivateServerConfig;
  systemInstruction: string;
  assistantId: string;
  onTurnComplete: (userTranscript: string, assistantTranscript: string) => void;
}

export const PrivateServerProvider: React.FC<PrivateServerProviderProps> = ({
  children,
  config,
  systemInstruction,
  assistantId,
  onTurnComplete,
}) => {
  const [sessionStatus, setSessionStatus] = useState<ConversationStatus>('IDLE');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [userTranscript, setUserTranscript] = useState('');
  const [assistantTranscript, setAssistantTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [groundingSources, setGroundingSources] = useState<any[]>([]);

  const websocketRef = useRef<WebSocket | null>(null);
  const assistantIdRef = useRef(assistantId);

  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const microphoneStreamRef = useRef<MediaStream | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const mediaStreamSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);

  const nextStartTimeRef = useRef(0);
  const sourcesRef = useRef(new Set<AudioBufferSourceNode>());
  const speakingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentUserTranscriptRef = useRef('');
  const currentAssistantTranscriptRef = useRef('');

  useEffect(() => {
    assistantIdRef.current = assistantId;
  }, [assistantId]);

  const stopSession = useCallback(async () => {
    if (websocketRef.current) {
      logEvent('PRIVATE_SESSION_STOP', { assistantId: assistantIdRef.current });

      // Send close message to server
      if (websocketRef.current.readyState === WebSocket.OPEN) {
        websocketRef.current.send(JSON.stringify({ type: 'close' }));
      }

      websocketRef.current.close();
      websocketRef.current = null;
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

    if (!config?.websocketUrl || !config?.apiKey) {
        setError('Private server configuration is missing.');
        setSessionStatus('ERROR');
        return;
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setError('Your browser does not support audio recording.');
      setSessionStatus('ERROR');
      return;
    }

    try {
        logEvent('PRIVATE_SESSION_START', { assistantId });

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
            inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({
                sampleRate: 16000,
            });
            outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({
                sampleRate: 24000,
            });
        }

        // Unlock audio contexts for iOS
        if (needsIOSHandling) {
            await unlockAudioContext(inputAudioContextRef.current);
            await unlockAudioContext(outputAudioContextRef.current);
        }

        // Get microphone stream
        const constraints = needsIOSHandling
            ? { audio: true }
            : { audio: { sampleRate: 16000 } };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        microphoneStreamRef.current = stream;

        // Create WebSocket connection
        const ws = new WebSocket(config.websocketUrl);
        websocketRef.current = ws;

        // WebSocket event handlers
        ws.onopen = () => {
          console.log('WebSocket connected to private server');

          // Send authentication and configuration
          ws.send(JSON.stringify({
            type: 'auth',
            apiKey: config.apiKey,
            systemInstruction: systemInstruction,
          }));

          // Resume audio contexts if suspended
          if (inputAudioContextRef.current?.state === 'suspended') {
            inputAudioContextRef.current.resume();
          }
          if (outputAudioContextRef.current?.state === 'suspended') {
            outputAudioContextRef.current.resume();
          }

          // Set up audio processing
          const source = inputAudioContextRef.current!.createMediaStreamSource(stream);
          mediaStreamSourceRef.current = source;

          // Use larger buffer for iOS to reduce processing overhead
          const bufferSize = needsIOSHandling ? 8192 : 4096;
          const processor = inputAudioContextRef.current!.createScriptProcessor(bufferSize, 1, 1);
          scriptProcessorRef.current = processor;

          processor.onaudioprocess = (e) => {
            const inputData = e.inputBuffer.getChannelData(0);
            const sampleRate = inputAudioContextRef.current?.sampleRate || 16000;

            // Create blob with appropriate resampling
            const blob = createBlob(inputData, sampleRate);

            // Convert blob to base64 and send via WebSocket
            const reader = new FileReader();
            reader.onloadend = () => {
              const base64Audio = (reader.result as string).split(',')[1];
              if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({
                  type: 'audio',
                  data: base64Audio,
                }));
              }
            };
            reader.readAsDataURL(blob);
          };

          source.connect(processor);
          processor.connect(inputAudioContextRef.current!.destination);

          setSessionStatus('ACTIVE');
          console.log('Private server session active');
        };

        ws.onmessage = async (event) => {
          try {
            const message = JSON.parse(event.data);

            switch (message.type) {
              case 'user_transcript':
                // Update user transcript
                currentUserTranscriptRef.current = message.text || '';
                setUserTranscript(currentUserTranscriptRef.current);
                break;

              case 'assistant_transcript':
                // Update assistant transcript
                currentAssistantTranscriptRef.current = message.text || '';
                setAssistantTranscript(currentAssistantTranscriptRef.current);
                break;

              case 'audio':
                // Decode and play audio response
                if (message.data && outputAudioContextRef.current) {
                  try {
                    const audioData = decode(message.data);
                    const audioBuffer = await decodeAudioData(
                      audioData,
                      outputAudioContextRef.current,
                      24000,
                      1
                    );

                    const source = outputAudioContextRef.current.createBufferSource();
                    source.buffer = audioBuffer;
                    source.connect(outputAudioContextRef.current.destination);

                    const now = outputAudioContextRef.current.currentTime;
                    const startTime = Math.max(now, nextStartTimeRef.current);

                    source.onended = () => {
                      sourcesRef.current.delete(source);
                      if (sourcesRef.current.size === 0) {
                        if (speakingTimeoutRef.current) {
                          clearTimeout(speakingTimeoutRef.current);
                        }
                        speakingTimeoutRef.current = setTimeout(() => {
                          setIsSpeaking(false);
                        }, 500);
                      }
                    };

                    source.start(startTime);
                    sourcesRef.current.add(source);
                    setIsSpeaking(true);

                    nextStartTimeRef.current = startTime + audioBuffer.duration;
                  } catch (audioError) {
                    console.error('Error decoding/playing audio:', audioError);
                  }
                }
                break;

              case 'turn_complete':
                // Turn completed
                onTurnComplete(currentUserTranscriptRef.current, currentAssistantTranscriptRef.current);
                currentUserTranscriptRef.current = '';
                currentAssistantTranscriptRef.current = '';
                setUserTranscript('');
                setAssistantTranscript('');
                break;

              case 'error':
                console.error('Server error:', message.message);
                setError(message.message || 'Unknown server error');
                break;

              default:
                console.log('Unknown message type:', message.type);
            }
          } catch (parseError) {
            console.error('Error parsing WebSocket message:', parseError);
          }
        };

        ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          setError('Connection error with private server');
          setSessionStatus('ERROR');
        };

        ws.onclose = () => {
          console.log('WebSocket connection closed');
          if (sessionStatus === 'ACTIVE' || sessionStatus === 'CONNECTING') {
            stopSession();
          }
        };

    } catch (err: any) {
        console.error('Error starting private server session:', err);
        setError(err.message || 'Failed to start session with private server');
        setSessionStatus('ERROR');
        stopSession();
    }
  }, [config, systemInstruction, assistantId, sessionStatus, stopSession, onTurnComplete]);

  const contextValue: PrivateServerContextType = {
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
    <PrivateServerContext.Provider value={contextValue}>
      {children}
    </PrivateServerContext.Provider>
  );
};
