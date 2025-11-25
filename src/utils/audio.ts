
import type { Blob } from '@google/genai';

export function encode(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function decode(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

/**
 * Resample audio data from source sample rate to target sample rate
 * Uses linear interpolation for simplicity and performance
 */
export function resampleAudio(
  inputData: Float32Array,
  inputSampleRate: number,
  outputSampleRate: number
): Float32Array {
  if (inputSampleRate === outputSampleRate) {
    return inputData;
  }

  const ratio = inputSampleRate / outputSampleRate;
  const outputLength = Math.floor(inputData.length / ratio);
  const outputData = new Float32Array(outputLength);

  for (let i = 0; i < outputLength; i++) {
    const srcIndex = i * ratio;
    const srcIndexFloor = Math.floor(srcIndex);
    const srcIndexCeil = Math.min(srcIndexFloor + 1, inputData.length - 1);
    const fraction = srcIndex - srcIndexFloor;

    // Linear interpolation between samples
    outputData[i] = inputData[srcIndexFloor] * (1 - fraction) + inputData[srcIndexCeil] * fraction;
  }

  return outputData;
}

/**
 * Create a PCM blob for sending to Gemini API
 * Handles resampling if the input sample rate doesn't match target (16kHz)
 */
export function createBlob(data: Float32Array, inputSampleRate: number = 16000): Blob {
  const targetSampleRate = 16000;

  // Resample if necessary (e.g., iOS uses 48kHz native)
  const processedData = inputSampleRate !== targetSampleRate
    ? resampleAudio(data, inputSampleRate, targetSampleRate)
    : data;

  const l = processedData.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    // Clamp values to prevent overflow
    const sample = Math.max(-1, Math.min(1, processedData[i]));
    int16[i] = sample * 32767;
  }
  return {
    data: encode(new Uint8Array(int16.buffer)),
    mimeType: 'audio/pcm;rate=16000',
  };
}

/**
 * Unlock audio on iOS by playing a silent buffer
 * iOS requires user interaction to enable audio playback
 */
export async function unlockAudioContext(ctx: AudioContext): Promise<void> {
  if (ctx.state === 'suspended') {
    await ctx.resume();
  }

  // Create and play a silent buffer to fully unlock audio on iOS
  const silentBuffer = ctx.createBuffer(1, 1, ctx.sampleRate);
  const source = ctx.createBufferSource();
  source.buffer = silentBuffer;
  source.connect(ctx.destination);
  source.start(0);
  source.stop(0.001);

  // Wait a tick for iOS to process
  await new Promise(resolve => setTimeout(resolve, 10));
}

