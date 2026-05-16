# Rebuild Prompt: "AI Architect" — Customizable Voice Assistant Platform

Paste the following prompt into an AI agent builder (Claude Code, Cursor, Aider, AI Studio, v0, Bolt, Lovable, etc.) to rebuild this application from scratch.

---

## ROLE

You are building **AI Architect** (a.k.a. "The Nexus") — a fully customizable, multi-tenant AI voice assistant platform. Each authenticated user can create multiple assistants, each with their own avatar, personality, voice, system prompt, knowledge base, and long-term memory. Assistants can be made public via a shareable URL (`#/public/:id`) and optionally embeddable in iframes. Voice conversations use Google Gemini Live (low-latency websocket audio); text chat uses Gemini Flash. The app speaks back with real PCM audio, transcribes both sides in real time, calls tools (web search, save-memory, reminders), and stores everything in Supabase.

Build the full app end-to-end. Match every behavior listed below. Do not invent features I did not specify, and do not skip ones I did.

---

## TECH STACK (do not deviate)

- **Framework**: React 18 + TypeScript, built with Vite 5
- **Styling**: Tailwind CSS 3 with `darkMode: 'class'`, PostCSS, Autoprefixer
- **AI SDK**: `@google/genai@^1.28.0` (Gemini Live + Gemini Flash + Google Search grounding tool)
- **Backend**: Supabase (`@supabase/supabase-js@^2.79.0`) for Auth (Google + GitHub OAuth), Postgres, and Storage
- **Auth UI**: `@supabase/auth-ui-react` + `@supabase/auth-ui-shared` (`ThemeSupa`)
- **WebGL**: `ogl@^1.0.11` for the animated avatar orb
- **Node**: `>=20.19.0`
- **Routing**: Hash-based custom router (NO react-router). Listen to `hashchange` and parse `window.location.hash`.
- **Module loading**: Dependencies above are loaded from `esm.sh` via an HTML `<script type="importmap">`. Vite is configured to mark them as `external` in `rollupOptions` and `optimizeDeps.exclude`. The importmap keys MUST match the externals list exactly.

`package.json` scripts: `"dev": "vite"`, `"build": "tsc && vite build"`, `"preview": "vite preview"`. Add a `nixpacks.toml` that installs with `npm ci --ignore-scripts`, builds with `npm run build`, and starts with `npx serve dist -s -l 3000`.

`vite.config.ts` must map `VITE_*` env vars to `process.env.*` via `define`:
```ts
'process.env.API_KEY': JSON.stringify(process.env.VITE_API_KEY),
'process.env.SUPABASE_URL': JSON.stringify(process.env.VITE_SUPABASE_URL),
'process.env.SUPABASE_ANON_KEY': JSON.stringify(process.env.VITE_SUPABASE_ANON_KEY),
```

Required environment variables (deployment): `VITE_API_KEY`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`. If Supabase vars are missing, the app must render a friendly config-error screen instead of crashing.

---

## DIRECTORY LAYOUT

```
src/
  main.tsx                       # ReactDOM root: StrictMode > ThemeProvider > ErrorBoundary > App
  App.tsx                        # Hash router, session bootstrapping, Memory Vault auto-create
  index.css                      # Tailwind directives + custom keyframes (breathing, pulse-strong, swipe-hint, fade-in)
  vite-env.d.ts
  types.ts                       # Assistant, MemoryItem, Reminder, HistoryEntry, Profile, AppLog, SessionStatus
  constants.ts                   # Personality traits, attitudes, voice options, MEMORY_VAULT_DEFAULTS
  definitions.ts                 # Function/tool declarations passed to Gemini
  contexts/
    ThemeContext.tsx
    GeminiLiveContext.tsx        # ~500 lines — the voice engine
  hooks/
    useLocalStorage.ts
    useGeminiLive.ts             # context consumer hook
  lib/
    supabaseClient.ts            # singleton with SUPABASE_CONFIG_ERROR export
    logger.ts                    # logEvent() -> app_logs insert
  utils/
    audio.ts                     # encode/decode/decodeAudioData/createBlob
  agents/
    webSearchAgent.ts            # performSearchAndSummarize(query, ai)
  layouts/
    AssistantLayout.tsx          # ~700 lines — main authenticated shell
    PublicAssistantLayout.tsx    # stripped public-mode shell
  pages/
    AuthPage.tsx
    DashboardPage.tsx
    SettingsPage.tsx             # create flow (stepper)
    SettingsDashboardPage.tsx    # edit flow + sharing toggles
    ConversationPage.tsx
    TextChatPage.tsx
    MemoryPage.tsx
    HistoryPage.tsx
    RemindersPage.tsx
    AdminPage.tsx
    UpgradePage.tsx
  components/
    AssistantAvatar.tsx          # clickable animated avatar + orb background
    AvatarUploader.tsx           # file picker + preview
    CommunityAssistantHeader.tsx # preview-mode banner + "Add to My Assistants" clone
    ConversationControls.tsx
    ErrorBoundary.tsx            # logs FATAL_ERROR
    Icon.tsx                     # ~24 inline SVG icons
    MemoryBank.tsx               # top-left widget showing up to 3 memories
    Navigation.tsx               # sidebar (collapsible desktop, drawer mobile) + ThemeToggle + version
    SelectionButton.tsx
    SettingsPanel.tsx            # shared identity+personality+voice form
    ThemeToggle.tsx
    TranscriptionDisplay.tsx     # assistant text large, user text smaller
    WebResults.tsx               # grounding source links
    orb/Orb.tsx + Orb.css        # WebGL shader orb with hue rotation
    stepper/Stepper.tsx + Stepper.css
index.html                       # importmap + <div id="root">
manifest.json                    # PWA manifest (name, short_name, icons, theme_color #111827)
metadata.json                    # { name, description, requestFramePermissions: ["microphone"] }
favicon.svg
tailwind.config.js               # see palette below
postcss.config.js
tsconfig.json                    # strict, jsx: react-jsx, moduleResolution: bundler
vite.config.ts                   # see externals above
nixpacks.toml
```

Tailwind palette (`tailwind.config.js > theme.extend.colors`):
```
brand-primary: '#1a1a1a', brand-secondary: '#4a4a4a',
brand-secondary-glow: '#6a82fb', brand-tertiary: '#b3b3b3',
brand-tertiary-glow: '#87e0f5', brand-light: '#a6c1ee', on-brand: '#ffffff',
text-primary: '#2d3748', text-secondary: '#718096', text-tertiary: '#a0aec0',
base-light: '#f7fafc', base-medium: '#edf2f7', border-color: '#e2e8f0',
danger: '#e53e3e', danger-hover: '#c53030',
dark-text-primary: '#f9fafb', dark-text-secondary: '#9ca3af', dark-text-tertiary: '#6b7281',
dark-base-light: '#111827', dark-base-medium: '#1f2937', dark-border-color: '#374151'
```

---

## SUPABASE SCHEMA

Create these tables (Postgres). All `id`s are uuid unless noted. Enable RLS and write policies so users can only read/write their own rows, except `is_public=true` assistants are readable to anyone and `app_logs` is readable only to admins.

### `profiles`
```
id          uuid PK, references auth.users(id)
username    text
full_name   text
role        text default 'user'    -- 'user' | 'admin'
updated_at  timestamptz
```
Insert a row via trigger on `auth.users` creation.

### `assistants`
```
id                    uuid PK default gen_random_uuid()
user_id               uuid references auth.users(id)
name                  text
avatar                text                          -- public URL from Storage
description           text
author_name           text                          -- shown on community cards
personality           text[]                        -- e.g. ['witty','curious']
attitude              text                          -- single choice
voice                 text                          -- 'Zephyr'|'Kore'|'Puck'|'Fenrir'|'Charon'
prompt                text                          -- system instruction body
knowledge_base        text                          -- newline-separated seed memories (only used at creation)
orb_hue               int default 220               -- 0..360
is_public             boolean default false
is_embeddable         boolean default false         -- only meaningful when is_public
original_assistant_id uuid                          -- set on clone
mcp_server_settings   jsonb                         -- reserved, unused
created_at            timestamptz default now()
updated_at            timestamptz default now()
```

### `memory_items`
```
id           bigserial PK
assistant_id uuid references assistants(id) on delete cascade
user_id      uuid references auth.users(id)
content      text
created_at   timestamptz default now()
```

### `reminders`
```
id           uuid PK default gen_random_uuid()
user_id      uuid references auth.users(id)
assistant_id uuid references assistants(id) on delete cascade
content      text
due_date     date
is_completed boolean default false
completed_at timestamptz
created_at   timestamptz default now()
```

### `app_logs`
```
id           bigserial PK
created_at   timestamptz default now()
user_id      uuid
assistant_id uuid
event_type   text           -- SESSION_START | SESSION_STOP | SESSION_CLOSE | SESSION_ERROR | ASSISTANT_CREATE | FATAL_ERROR
metadata     jsonb
```

### Storage
Create a **public** bucket named `avatars`. Upload path: `{userId}/{assistantId}/{sanitizedFilename}` with `upsert: true`. Display via `getPublicUrl(path)`.

---

## ROUTES (hash-based)

| Hash                          | Component                                  | Access                       |
|-------------------------------|--------------------------------------------|------------------------------|
| `#/` or empty                 | `DashboardPage`                            | Authenticated                |
| `#/auth`                      | `AuthPage`                                 | Anonymous (redirects if in)  |
| `#/assistant/new`             | `SettingsPage` (create flow)               | Authenticated                |
| `#/assistant/:id`             | `AssistantLayout`                          | Authenticated, owner         |
| `#/assistant/preview/:id`     | `AssistantLayout` with `previewMode=true`  | Authenticated, any public assistant |
| `#/public/:id`                | `PublicAssistantLayout`                    | Anonymous, only `is_public=true`     |
| `#/admin`                     | `AdminPage`                                | `profile.role === 'admin'`   |
| `#/upgrade`                   | `UpgradePage`                              | Anyone                       |

`App.tsx` must:
1. On mount, get the Supabase session and subscribe to `onAuthStateChange`.
2. After login, fetch `profiles` for the logged-in user.
3. After login, check if a "Memory Vault" assistant exists for this user (`name === 'Memory Vault'`); if not, insert one with the `MEMORY_VAULT_DEFAULTS` (a calm helpful default persona) and log `ASSISTANT_CREATE` with `metadata: { auto: true }`.
4. Parse the hash on load and on every `hashchange` event; render the right page.
5. Redirect to `#/auth` if not authenticated except for `#/public/*` and `#/upgrade`.

---

## PAGES — REQUIRED BEHAVIOR

### AuthPage
- Renders `<Auth>` from `@supabase/auth-ui-react` with `appearance={{ theme: ThemeSupa }}`, `providers={['google','github']}`, `redirectTo` = current origin.
- Theme-aware (`dark` prop wired to ThemeContext).
- Glassmorphic card centered on the page (`max-w-md`, blurred background).

### DashboardPage
- Two tabs: **My Assistants** and **Community**.
- My Assistants: `from('assistants').select('*').eq('user_id', user.id)`.
- Community: `from('assistants').select('*').eq('is_public', true)` — exclude assistants where `user_id === current user`.
- Card shows: avatar (with orb halo using `orb_hue`), name, `author_name` (community only), description, first 2 personality traits as chips.
- Clicking a card on **My Assistants** → `#/assistant/{id}`.
- Clicking a card on **Community** → `#/assistant/preview/{id}` (preview mode).
- "Create New Assistant" button → `#/assistant/new`.
- If `profile.role === 'admin'`, show "Admin" link → `#/admin`.
- Logout button calls `supabase.auth.signOut()`.

### SettingsPage (create flow)
Use the `Stepper` component with two steps:
1. **Configure** — full `SettingsPanel` (avatar, name, author_name, description, personality multi-select, attitude single-select, voice, orb hue slider 0..360, knowledge_base textarea, prompt textarea).
2. **Review** — summary card. "Finish Setup" inserts the assistant, uploads avatar if a File was chosen, then splits `knowledge_base` by `\n`, trims, and bulk-inserts each non-empty line into `memory_items` for the new assistant. Log `ASSISTANT_CREATE`. Redirect to `#/assistant/{newId}`.

Defaults for new assistants:
- personality: `['curious','helpful']`
- attitude: `'friendly'`
- voice: `'Zephyr'`
- orb_hue: 220
- prompt: a one-paragraph friendly default

### SettingsDashboardPage (edit existing)
- Loads assistant by id; shows the same `SettingsPanel`.
- Save → `update(...).eq('id', id)` then refresh.
- **Sharing & Privacy** section only shown if `assistant.user_id === user.id` and `original_assistant_id` is null:
  - Toggle `is_public`.
  - Toggle `is_embeddable` (disabled unless `is_public`).
  - When public, render `https://{origin}/{pathname}#/public/{id}` plus a Copy button.
- In preview mode all fields are read-only and Save is hidden.

### ConversationPage (voice mode, inside AssistantLayout)
- Centered animated `AssistantAvatar` (positioned by layout).
- Real-time transcripts via `TranscriptionDisplay` (assistant text large; user smaller, below).
- Top-left: `MemoryBank` widget (up to 3 most recent memories, "View & Edit" button → MemoryPage). Hidden if no memories or in public mode.
- Bottom-left: `WebResults` widget when grounding sources are present.
- Status messages: when `IDLE` show "Tap {name} to start"; on `ERROR` show the error text in danger color.
- Swipe-left (≥50px on touch) → switch to TextChatPage (carousel transform, see layout).

### TextChatPage
- Turn-based chat using `ai.chats.create({ model: 'gemini-flash-latest', config: { systemInstruction, tools: [{ functionDeclarations }] } })`.
- Message list with user bubbles and assistant bubbles (assistant bubble shows the avatar to its left).
- Auto-scroll to bottom on new message; show typing indicator while awaiting.
- Function call loop: if the model returns a function call, execute it locally (`saveToMemory`, `webSearch`, `createReminder`, `listReminders`, `completeReminder`), then send the function response back into the chat and continue.
- Input form: textarea + send button; Enter sends (Shift+Enter newline).
- Swipe-right → return to ConversationPage.

### MemoryPage
- Lists `memory_items` for the current assistant (or for the user when on Memory Vault).
- Textarea + "Add" button → insert.
- Each item has inline edit (pencil) and delete (with confirmation).
- Order: ascending `created_at`.

### HistoryPage
- Reads `localStorage["assistant_history_{assistantId}"]` as `HistoryEntry[] = { user, assistant, timestamp }[]`.
- Renders chronologically; timestamp formatted as locale string.
- "Clear History" with confirmation removes the key.
- History is appended in `AssistantLayout.onTurnComplete` after both transcripts are non-empty.

### RemindersPage
- Filter tabs: All / Active / Completed (default Active).
- Sorting: incomplete first (by `due_date` asc, nulls last), then completed (by `completed_at` desc).
- "Add reminder" form: content textarea + optional date input.
- Each card: content, due date, edit (inline), complete (sets `is_completed=true`, `completed_at=now()`), delete.
- Past-due (due_date < today and not completed) → red border/background.
- Completed → green tint with a check icon.

### AdminPage
- Gate: if `profile.role !== 'admin'`, render "Not authorized."
- `from('app_logs').select('*').order('created_at', { ascending: false }).limit(100)`.
- Table: timestamp, event_type, user_id, assistant_id, metadata (click to expand JSON).

### UpgradePage
- Static pricing page. Monthly/annual toggle (annual saves 15%).
- Monthly $30, Annual $305.
- Feature list: Unlimited assistants, Long-term memories, Voice + text, Personal AI on every device.
- CTAs link to placeholder Stripe URLs (use constants `PAYMENT_MONTHLY_LINK`, `PAYMENT_ANNUAL_LINK`).

---

## LAYOUTS

### AssistantLayout (authenticated)

Wraps every authenticated `#/assistant/*` route. Responsibilities:

1. **Fetch** assistant by id (and assert ownership unless `previewMode`). Fetch `memory_items`, `reminders`. On Memory Vault, query memories by `user_id`; else by `assistant_id`.
2. **State**: current sub-page (`conversation|memory|history|reminders|settings`), conversation mode (`voice|chat`), nav open/collapsed, cloning flag, chat messages array.
3. **Layout**: flex container, full screen, `<Navigation>` sidebar + `<main>` content. Sidebar collapses on desktop (state persisted to `localStorage['is_nav_collapsed']`) and slides as a drawer on mobile (hamburger button in main area).
4. **CommunityAssistantHeader** appears at top when `previewMode`: text "Previewing community assistant" + "Add to My Assistants" button. Clone deep-copies the assistant (new id, `user_id=currentUser`, `original_assistant_id=originalId`, `is_public=false`), copies memories, and navigates to the clone.
5. **Animated avatar** floats absolute-positioned: centered/large in voice mode, top-left/scale-50 in chat mode, with smooth CSS transition.
6. **Voice/chat carousel**: the content area is `w-[200%]` with two side-by-side panes; toggle by translating `-translate-x-1/2`. Touch swipe (≥50px) flips it.
7. **Provide** `GeminiLiveProvider` with the assembled system instruction and the five tool callbacks (see below).
8. **History persistence**: on `onTurnComplete(userText, assistantText)`, prepend `{ user, assistant, timestamp: Date.now() }` to `localStorage["assistant_history_{id}"]`.

**System instruction (voice)** — assemble verbatim:
```
You are an AI assistant named {name}.
Your personality traits are: {personality.join(', ')}.
Your attitude is: {attitude}.
Your core instruction is: {prompt}

You have access to the following tools:
- webSearch
- saveToMemory
- createReminder
- listReminders
- completeReminder

Key information about the user to remember and draw upon (long-term memory):
{memoryItems.map(m => m.content).join('\n')}

Active reminders:
{reminders.filter(r => !r.is_completed).map(r => `- ${r.content}${r.due_date ? ` (due ${r.due_date})` : ''}`).join('\n')}

Recent conversation history (for context):
{lastThree.map(h => `User: ${h.user}\nAssistant: ${h.assistant}`).join('\n\n')}
```

**System instruction (text chat)**:
```
You are an AI assistant named {name}.
Your personality traits are: {personality}.
Your attitude is: {attitude}.
Your core instruction is: {prompt}

Based on this persona, engage in a text-based conversation with the user. Keep responses concise and conversational.
```

### PublicAssistantLayout

Used at `#/public/:id`. Stripped-down voice/chat surface for anonymous visitors.

- Fetch with `.eq('id', id).eq('is_public', true)`. If not found, render "Assistant not found or private."
- If `window.self !== window.top` and `!assistant.is_embeddable`, render "Embedding disabled by the creator."
- Dynamically rewrite the page title, `<link rel="manifest">` with a generated blob, and `<link rel="apple-touch-icon">` so the PWA reflects this assistant.
- No memory, no reminders, no history. `onSaveToMemory` is a no-op.
- **Conditional web search**: only call `performSearchAndSummarize` when the user transcript contains one of: `"search for"`, `"look up"`, `"find out"`, `"what is the latest"`, `"what are the current"`, `"google"`, `"search"`, `"how is the weather"`, `"what's the weather"`, `"what's the news"`.
- System instruction:
```
You are an AI assistant named {name}.
Your personality traits are: {personality}.
Your attitude is: {attitude}.
Your core instruction is: {prompt}

You are speaking to a member of the public. You have no memory of past conversations.

A Google Search tool is available to you. You MUST NOT use this tool unless the user explicitly asks you to search for something or requests current, real-time information (e.g., "what's the latest news?", "search for...", "how is the weather today?"). For all other questions, including general knowledge, creative tasks, and persona-based responses, you must rely solely on your internal knowledge and NOT use the search tool.
```
- Footer link: "Upgrade to create your own AI" → `#/upgrade`.

---

## GEMINI LIVE — `contexts/GeminiLiveContext.tsx`

Implement a context provider that owns the entire voice lifecycle.

### Models & voices
- Voice model: **`gemini-2.5-flash-native-audio-preview-09-2025`**
- Text model (TextChatPage): **`gemini-flash-latest`**
- Web-search agent model: **`gemini-2.5-flash`** with `tools: [{ googleSearch: {} }]`
- Voice options: `Zephyr`, `Kore`, `Puck`, `Fenrir`, `Charon`

### Props
```ts
type GeminiLiveProviderProps = {
  apiKey: string;
  systemInstruction: string;
  voice: string;
  onSaveToMemory: (content: string) => Promise<void>;
  onCreateReminder: (content: string, dueDate?: string) => Promise<void>;
  onListReminders: () => Promise<string>;
  onCompleteReminderByContent: (content: string) => Promise<string>;
  onTurnComplete: (userText: string, assistantText: string) => void;
  children: React.ReactNode;
};
```

### Exposed context value
```ts
{
  sessionStatus: 'IDLE'|'CONNECTING'|'CONNECTED'|'ERROR',
  startSession: () => Promise<void>,
  stopSession: () => void,
  isSpeaking: boolean,
  userTranscript: string,
  assistantTranscript: string,
  error: string | null,
  groundingSources: any[],
}
```

### Connect config
```ts
ai.live.connect({
  model: 'gemini-2.5-flash-native-audio-preview-09-2025',
  config: {
    responseModalities: [Modality.AUDIO],
    speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } } },
    systemInstruction,
    inputAudioTranscription: {},
    outputAudioTranscription: {},
    tools: [{ functionDeclarations: TOOL_DEFINITIONS }],
  },
  callbacks: { onopen, onmessage, onerror, onclose },
});
```

### Audio pipeline
- Mic capture: `navigator.mediaDevices.getUserMedia({ audio: { sampleRate: 16000, channelCount: 1, echoCancellation: true, noiseSuppression: true } })`.
- Input `AudioContext` at 16000 Hz → `MediaStreamSource` → `GainNode` (used to mute mic when assistant speaking) → `ScriptProcessorNode(4096,1,1)` → in `onaudioprocess` convert Float32 to PCM via `createBlob()` and `session.sendRealtimeInput({ media })`.
- Output `AudioContext` at 24000 Hz. On `serverContent.modelTurn.parts[].inlineData` with `audio/pcm`, base64-decode, `decodeAudioData(...)` into the output context, schedule a `BufferSource` at `nextStartTimeRef` to avoid overlap. Add the source to a `Set`; on `ended`, remove. While the set is non-empty, `isSpeaking = true` and the input gain is set to 0; otherwise gain is 1.
- On `serverContent.turnComplete`: fire `onTurnComplete(userTranscript, assistantTranscript)` then clear both.
- Transcripts: accumulate from `inputTranscription.text` and `outputTranscription.text` deltas.

### Tools (function declarations in `definitions.ts`)
```ts
export const TOOL_DEFINITIONS = [
  {
    name: 'saveToMemory',
    description: 'Save a fact about the user to long-term memory. Use when the user shares something they want remembered.',
    parameters: { type: 'object', properties: { information: { type: 'string' } }, required: ['information'] },
  },
  {
    name: 'webSearch',
    description: 'Search the web for current information.',
    parameters: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] },
  },
  {
    name: 'createReminder',
    description: 'Create a reminder for the user.',
    parameters: {
      type: 'object',
      properties: { content: { type: 'string' }, dueDate: { type: 'string', description: 'ISO date YYYY-MM-DD' } },
      required: ['content'],
    },
  },
  {
    name: 'listReminders',
    description: "List the user's active reminders.",
    parameters: { type: 'object', properties: {} },
  },
  {
    name: 'completeReminder',
    description: 'Mark a reminder as completed by matching its content.',
    parameters: { type: 'object', properties: { reminderContent: { type: 'string' } }, required: ['reminderContent'] },
  },
];
```

On `toolCall` from the server, route by name to the appropriate callback, then call `session.sendToolResponse({ functionResponses: [{ id, name, response: { result } }] })`. For `webSearch`, set the returned sources via `setGroundingSources` for UI display and send the summary back.

### Error / lifecycle logging
- `SESSION_START` on open success.
- `SESSION_STOP` on user-initiated stop.
- `SESSION_CLOSE` on server close (include reason in metadata).
- `SESSION_ERROR` on error (include message). Map known errors:
  - `NotAllowedError` / `permission` → "Microphone access denied."
  - 401/403 → "Invalid API key."
  - everything else → "Connection error."

---

## AGENTS — `agents/webSearchAgent.ts`

```ts
export async function performSearchAndSummarize(query: string, ai: GoogleGenAI) {
  const res = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: query,
    config: {
      tools: [{ googleSearch: {} }],
      systemInstruction:
        'You are a web search and summarization expert. Search for the query and return a concise, factual summary.',
    },
  });
  const summary = res.text ?? '';
  const sources = (res.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [])
    .filter((c: any) => c.web);
  return { summary, sources };
}
```

Use this from both the voice tool handler and the text-chat tool handler. Display sources via `WebResults` (one anchor per source: title + uri).

---

## COMPONENTS — KEY DETAILS

### AssistantAvatar
- Container with the WebGL `<Orb hue={orb_hue} />` behind a circular `<img src={avatar} />`.
- `onClick` toggles `startSession` / `stopSession` from `useGeminiLive()`.
- Tailwind animation classes change by status:
  - `IDLE` → `animate-breathing`
  - `CONNECTING` → `animate-pulse`
  - `CONNECTED` + `isSpeaking` → `animate-pulse-strong`
  - `ERROR` → red ring

### Orb (ogl)
- Fullscreen-sized canvas mounted into a fixed-aspect container.
- GLSL fragment shader produces a moving radial gradient with subtle noise; uniforms `uTime`, `uHue`, `uHover`.
- Hue rotation done in YIQ space so the base palette deforms cleanly across the full 0..360 range.

### Stepper
- Props: `steps: { label: string; content: ReactNode }[]`, `onFinish`.
- Renders step pills + active content + Prev/Next; last step's button reads "Finish Setup".

### SettingsPanel
- All assistant fields editable in one component. Bind to a single `formState` and call `onChange(newState)` upward.
- Personality options: `['witty','curious','helpful','sarcastic','formal','playful','empathetic','blunt','optimistic','analytical']` (multi-select chips via `SelectionButton`).
- Attitude options: `['friendly','professional','enthusiastic','calm','direct']` (single-select).
- Voice options: the five voice names listed above.
- `orb_hue`: `<input type="range" min="0" max="360" />` with live preview swatch.
- `AvatarUploader`: file input restricted to image types, shows preview, returns the `File` (do not upload here — upload happens at save).

### Navigation
- Sidebar with icon + label rows: Conversation, Memory, History, Reminders, Settings.
- Each row highlights when active.
- Footer: ThemeToggle + version string + Dashboard link.
- Collapse button on desktop (persisted). Mobile drawer slides in from left; backdrop click closes.

### ErrorBoundary
- Catches render errors; calls `logEvent('FATAL_ERROR', { metadata: { message, stack, componentStack } })`; renders a fallback with the error message and a "Refresh" button.

---

## HOOKS & UTILS

### `useLocalStorage<T>(key, initial): [T, Setter]`
- Read JSON from `localStorage[key]` once; fallback to `initial` on parse error.
- Wrap setter so it writes through to `localStorage`.

### `utils/audio.ts`
- `encode(bytes: Uint8Array): string` → base64.
- `decode(base64: string): Uint8Array`.
- `decodeAudioData(data: Uint8Array, ctx: AudioContext, sampleRate: number, channels: number): Promise<AudioBuffer>` — manually interpret 16-bit PCM little-endian to Float32 in `[-1,1]`, build an `AudioBuffer`.
- `createBlob(data: Float32Array): { data: string, mimeType: string }` — Float32 → Int16 PCM → base64; `mimeType: 'audio/pcm;rate=16000'`.

### `lib/logger.ts`
```ts
export async function logEvent(eventType: string, details?: { assistantId?: string; metadata?: Record<string, any> }) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('app_logs').insert({
      user_id: user?.id,
      assistant_id: details?.assistantId,
      event_type: eventType,
      metadata: details?.metadata ?? {},
    });
  } catch (e) { console.error(e); }
}
```

### `lib/supabaseClient.ts`
- Read `process.env.SUPABASE_URL` and `process.env.SUPABASE_ANON_KEY`.
- If either missing, set `SUPABASE_CONFIG_ERROR = "Missing Supabase environment variables..."` and export it; do not crash.
- Otherwise export a singleton `createClient(url, key)`.

---

## PERSISTENCE SUMMARY

| Where        | What                                                             |
|--------------|------------------------------------------------------------------|
| Supabase     | profiles, assistants, memory_items, reminders, app_logs, avatars |
| localStorage | `theme`, `is_nav_collapsed`, `assistant_history_{id}`            |

Public users have **no** persistent state. Memory Vault memories are keyed by `user_id` (global across that user's assistants); all other assistants' memories are keyed by `assistant_id`.

---

## DISTINCTIVE BEHAVIORS (DO NOT OMIT)

1. **Memory Vault auto-create** on first login with a calm-helpful default persona; memories queried by `user_id`.
2. **Swipe carousel** between voice and chat modes (≥50px) inside AssistantLayout; avatar smoothly scales and reflows.
3. **Echo prevention**: input mic gain = 0 while assistant is speaking, restored to 1 when output buffer set is empty.
4. **Public sharing**: `is_public` makes an assistant appear on Community and reachable at `#/public/:id`; `is_embeddable` controls iframe access; public users get a stricter system prompt and gated web search.
5. **Cloning**: from `#/assistant/preview/:id`, the "Add to My Assistants" button deep-copies the assistant and its memories under the current user with `original_assistant_id` set, and the Sharing & Privacy panel is hidden for clones.
6. **PWA dynamic identity** on public pages: rewrite manifest, title, apple-touch-icon to reflect the assistant.
7. **Web search gating** in public mode by keyword sniffing the user transcript.
8. **Grounding sources** are surfaced as a `WebResults` widget with clickable links during the conversation.
9. **Admin role gate** is checked client-side, but RLS on `app_logs` must enforce it server-side.
10. **Function-calling loop** in TextChatPage: keep round-tripping function calls and responses through `chat.sendMessage` until the model returns a final text turn.
11. **Hash router** must be the only router. Do not pull in react-router.
12. **All deps loaded via importmap** — match the externals list in vite.config and the import keys in index.html exactly. The dev `optimizeDeps.exclude` must list the same keys.

---

## ACCEPTANCE TEST PLAN

When done, verify all of the following manually:

1. Sign in with Google. A Memory Vault assistant is auto-created and visible on the dashboard.
2. Create a new assistant via the stepper with avatar upload, three personality traits, custom prompt, and three lines in the knowledge base. Confirm three `memory_items` rows are inserted.
3. Open the new assistant. Tap the avatar; the orb pulses; speak; both transcripts appear; the assistant replies in voice.
4. Ask "remember that my dog's name is Rex." Confirm a `memory_items` insert. Refresh; ask "what's my dog's name?" — answered correctly.
5. Ask "remind me to call mom tomorrow." Confirm row in `reminders` with a future `due_date`. Then say "list my reminders" — it reads the reminder out loud.
6. Ask "search for the latest news about Mars" — `WebResults` widget appears with links; assistant summarizes.
7. Swipe left → enters text chat; send "what's my dog's name?"; same memory works; swipe right → returns to voice.
8. Go to Settings, toggle Public, copy URL, open in a private window. Public assistant loads with no memory; weather query triggers a search but "tell me a joke" does not.
9. Embed the URL in a sandboxed iframe — works only when `is_embeddable` is on.
10. From an admin account at `#/admin`, see SESSION_START / ASSISTANT_CREATE rows.
11. Toggle theme; reload; theme persists. Collapse sidebar; reload; collapse persists. Add a few history entries; reload HistoryPage; entries persist.
12. Trigger a render error in dev → ErrorBoundary screen shows; a `FATAL_ERROR` row lands in `app_logs`.

If every item passes, the rebuild is complete.

---

## DELIVERABLE

Produce the full source tree above, the SQL migration for the five tables + RLS policies + the avatars bucket, a populated `.env.example`, and a README with setup steps (npm install, set the three `VITE_*` env vars, `npm run dev`). Do not ship placeholder files; every component and page above must be implemented.
