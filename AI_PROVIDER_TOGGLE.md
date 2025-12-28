# AI Provider Toggle Feature

## Overview

This feature allows users to toggle between Google Gemini and a private AI server for processing voice conversations. The implementation maintains the same user experience regardless of which provider is selected.

## Architecture

### New Files Created

1. **`src/contexts/PrivateServerContext.tsx`**
   - WebSocket-based context for private server communication
   - Handles audio streaming with Whisper STT, Gemma 3 12B LLM, and Edge TTS
   - Implements the same interface as GeminiLiveContext

2. **`src/contexts/AIConversationContext.tsx`**
   - Wrapper context that switches between Google and Private providers
   - Manages provider preference in localStorage (no database migration needed)
   - Helper functions for getting/setting provider preferences

3. **`src/hooks/useAIConversation.ts`**
   - Hook to access the current AI conversation context
   - Works with both Google and Private server providers

### Modified Files

1. **`src/components/SettingsPanel.tsx`**
   - Added "AI Provider" section with toggle between Google Gemini and Private Server
   - Advanced settings for WebSocket URL and API key configuration
   - Visual indicator showing which provider is active

2. **`src/layouts/AssistantLayout.tsx`**
   - Replaced `GeminiLiveProvider` with `AIConversationProvider`
   - Updated hook usage from `useGeminiLive` to `useAIConversation`

3. **`src/layouts/PublicAssistantLayout.tsx`**
   - Replaced `GeminiLiveProvider` with `AIConversationProvider`
   - Updated hook usage from `useGeminiLive` to `useAIConversation`

## Usage

### For Users

1. **Navigate to Settings**
   - Open any assistant
   - Click on the Settings tab

2. **Select AI Provider**
   - Scroll to the "AI Provider" section
   - Toggle between "Google Gemini" (default) and "Private Server"

3. **Configure Private Server (Optional)**
   - Click "Show Advanced" when Private Server is selected
   - Enter your WebSocket URL (e.g., `ws://localhost:8765/ws/audio` or `wss://your-ngrok-url.ngrok-free.app/ws/audio`)
   - Enter your API key
   - Click "Save Private Server Settings"

4. **Start Conversation**
   - Navigate back to the Conversation tab
   - Click the assistant avatar to start a conversation
   - The conversation will use your selected provider

### Default Configuration

- **Provider**: Google Gemini
- **Private Server URL**: `ws://localhost:8765/ws/audio`
- **Private Server API Key**: `MB8w2x1hGPRBVhZdnRvqJuBxnADUQjFc7GsqXEnJJ8w`

## Private Server Requirements

Your private server must implement the following WebSocket protocol:

### Connection

```
WebSocket URL: ws://your-server:port/ws/audio
```

### Authentication

Send on connection open:
```json
{
  "type": "auth",
  "api_key": "your-api-key",
  "system_instruction": "system prompt text"
}
```

### Audio Streaming (Client → Server)

```json
{
  "type": "audio",
  "data": "base64-encoded-pcm-audio",
  "sample_rate": 16000
}
```

### Server Responses

1. **Transcript (User Speech)**
```json
{
  "type": "transcript",
  "role": "user",
  "text": "transcribed user speech"
}
```

2. **Transcript (Assistant Response)**
```json
{
  "type": "transcript",
  "role": "assistant",
  "text": "assistant response text"
}
```

3. **Audio Response**
```json
{
  "type": "audio",
  "data": "base64-encoded-wav-audio"
}
```

4. **Turn Complete**
```json
{
  "type": "turn_complete"
}
```

5. **Error**
```json
{
  "type": "error",
  "error": "error message"
}
```

### Interruption Support

When user interrupts, client sends:
```json
{
  "type": "interrupt"
}
```

## Technical Details

### Storage

- Provider preference is stored in `localStorage` under the key `ai_provider_preference`
- Private server URL is stored under `private_server_url`
- Private server API key is stored under `private_server_api_key`

### No Database Migration Required

This implementation deliberately avoids database schema changes by:
- Using localStorage for user preferences
- Making the toggle global across all assistants
- Not persisting the choice in the database

### Context Switching

The `AIConversationContext` dynamically renders either:
- `GeminiLiveProvider` (for Google Gemini)
- `PrivateServerProvider` (for Private Server)

Based on the `ai_provider_preference` value.

### Event System

A custom event `ai-provider-changed` is dispatched when the provider changes, allowing components to react to the change.

## Features Supported

Both providers support:
- ✅ Real-time audio streaming
- ✅ Voice conversation
- ✅ Transcription (user and assistant)
- ✅ Conversation history
- ✅ Turn-based conversation flow
- ✅ Interruption support (2+ word threshold)
- ✅ iOS PWA compatibility

### Google Gemini Specific

- ✅ Function calling (saveToMemory, webSearch, addReminder, completeReminder)
- ✅ MCP tool integration
- ✅ Grounding sources for web search

### Private Server Notes

- ⚠️ Function calling not yet implemented (can be added to server)
- ⚠️ Web search not available (server-side feature)
- ✅ Simple text-to-LLM-to-speech pipeline

## Development

### Adding New Providers

To add a new provider:

1. Create a new context in `src/contexts/YourProviderContext.tsx`
2. Implement the same interface as `GeminiLiveContextType`
3. Add provider option to `AIProvider` type in `AIConversationContext.tsx`
4. Update `AIConversationProvider` to render your provider
5. Add UI toggle in `SettingsPanel.tsx`

### Testing

Test both providers by:
1. Toggling between providers in Settings
2. Starting a voice conversation
3. Verifying audio playback
4. Checking transcriptions
5. Testing interruption
6. Reviewing conversation history

## Troubleshooting

### Private Server Won't Connect

- Check WebSocket URL is correct (ws:// for local, wss:// for secure)
- Verify API key matches server configuration
- Ensure server is running and accessible
- Check browser console for WebSocket errors

### No Audio Playback

- Check microphone permissions
- Verify audio output is not muted
- Check browser console for AudioContext errors
- Try toggling back to Google Gemini to isolate issue

### Conversation Not Working

- Ensure you've clicked "Save Private Server Settings"
- Restart the conversation after changing providers
- Check server logs for errors
- Verify server implements the correct WebSocket protocol

## Future Enhancements

Possible improvements:
- [ ] Per-assistant provider selection
- [ ] Multiple private server configurations
- [ ] Server health check/ping
- [ ] Connection retry logic
- [ ] Latency monitoring
- [ ] Provider-specific features toggle
- [ ] Function calling support for private server
