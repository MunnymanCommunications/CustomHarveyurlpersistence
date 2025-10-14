import React, { useState, useCallback, useEffect } from 'react';
import SettingsPage from './pages/SettingsPage';
import ConversationPage from './pages/ConversationPage';
import MemoryPage from './pages/MemoryPage';
import HistoryPage from './pages/HistoryPage';
import SettingsDashboardPage from './pages/SettingsDashboardPage';
import type { Settings, HistoryEntry } from './types';
import { DEFAULT_SETTINGS } from './constants';
import { Icon } from './components/Icon';
import { Navigation } from './components/Navigation';

// =================================================================
// State Persistence in URL
// =================================================================

// Data structure to be encoded in the URL
interface PersistentState {
    settings: Settings;
    memory: string[];
    history: HistoryEntry[];
}

// Compresses and encodes the app state into a URL-safe string.
async function encodeState(state: PersistentState): Promise<string> {
    const jsonString = JSON.stringify(state);
    const stream = new ReadableStream({
        start(controller) {
            controller.enqueue(new TextEncoder().encode(jsonString));
            controller.close();
        }
    });
    const compressedStream = stream.pipeThrough(new CompressionStream('gzip'));
    const chunks = [];
    const reader = compressedStream.getReader();
    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
    }
    const compressedBlob = new Blob(chunks);
    const buffer = await compressedBlob.arrayBuffer();
    
    // Convert ArrayBuffer to Base64
    let binary = '';
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    const base64String = btoa(binary);

    // Make it URL-safe
    return base64String.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

// Decodes and decompresses the state from a URL-safe string.
async function decodeState(encodedString: string): Promise<PersistentState | null> {
    try {
        let base64 = encodedString.replace(/-/g, '+').replace(/_/g, '/');
        while (base64.length % 4) {
            base64 += '=';
        }
        const binaryString = atob(base64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        
        const stream = new ReadableStream({
            start(controller) {
                controller.enqueue(bytes);
                controller.close();
            }
        });

        const decompressedStream = stream.pipeThrough(new DecompressionStream('gzip'));
        const reader = decompressedStream.getReader();
        const chunks = [];
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            chunks.push(value);
        }
        const decompressedBlob = new Blob(chunks);
        const jsonString = await decompressedBlob.text();
        return JSON.parse(jsonString);
    } catch (error) {
        console.error("Failed to decode state from URL:", error);
        return null;
    }
}


// =================================================================
// Sub-components for different application states
// =================================================================

/**
 * The landing page shown to new users to create their first session.
 */
function LandingPage() {
    const createNewSession = () => {
        const newId = crypto.randomUUID();
        window.location.hash = `#/session/${newId}`;
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen text-center w-full p-4">
            <div className="max-w-2xl mx-auto">
                <h1 className="text-5xl md:text-7xl font-bold text-text-primary mb-4 bg-clip-text text-transparent bg-gradient-to-r from-brand-secondary-glow to-brand-primary-glow">
                    Your Personal AI Companion
                </h1>
                <p className="text-lg md:text-xl text-text-secondary mb-10">
                    Create a unique, personalized AI voice assistant. Your settings, memory, and conversations are saved to a unique URL, just for you. No accounts, no logins.
                </p>
                <button
                    onClick={createNewSession}
                    className="bg-gradient-to-r from-brand-secondary-glow to-brand-tertiary-glow text-on-brand font-bold py-4 px-10 rounded-full flex items-center justify-center mx-auto transition-all duration-300 shadow-lg transform hover:scale-105 hover:shadow-2xl hover:shadow-brand-tertiary-glow/30"
                >
                    <Icon name="plus" className="w-6 h-6 mr-3" />
                    Create Your Assistant
                </button>
                 <p className="text-xs text-text-secondary/80 mt-8">
                    Bookmark the URL on the next page to save your session. You can even encode it to an NFC tag for quick access!
                </p>
            </div>
        </div>
    );
}

/**
 * The main application view for a specific user session.
 */
type Page = 'conversation' | 'memory' | 'history' | 'settings';

interface AssistantProps {
  sessionId: string;
  data: string | null;
}

function Assistant({ sessionId, data }: AssistantProps) {
  const [settings, setSettings] = useLocalStorage<Settings>(`gemini-live-settings-${sessionId}`, DEFAULT_SETTINGS);
  const [memory, setMemory] = useLocalStorage<string[]>(`gemini-live-memory-${sessionId}`, []);
  const [history, setHistory] = useLocalStorage<HistoryEntry[]>(`gemini-live-history-${sessionId}`, []);
  const [hasCompletedSetup, setHasCompletedSetup] = useLocalStorage<boolean>(`gemini-live-setup-complete-${sessionId}`, false);

  const [currentPage, setCurrentPage] = useState<Page>('conversation');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isNavCollapsed, setIsNavCollapsed] = useState(false);
  
  // Effect to load state from URL if present
  useEffect(() => {
    const loadStateFromUrl = async () => {
        // Only run if data exists and setup isn't already marked complete in this session
        if (data && !hasCompletedSetup) {
            const decodedState = await decodeState(data);
            if (decodedState) {
                setSettings(decodedState.settings);
                setMemory(decodedState.memory);
                setHistory(decodedState.history);
                setHasCompletedSetup(true); // Mark setup as complete
            }
        }
    };
    loadStateFromUrl();
  }, [data, hasCompletedSetup, setSettings, setMemory, setHistory, setHasCompletedSetup]);
  
  const addHistoryEntry = useCallback((entry: HistoryEntry) => {
    setHistory(prev => [entry, ...prev]);
  }, [setHistory]);

  const clearHistory = useCallback(() => {
    setHistory([]);
  }, [setHistory]);

  const handleSetupComplete = async () => {
    const stateToPersist: PersistentState = { settings, memory, history };
    try {
        const encodedData = await encodeState(stateToPersist);
        setHasCompletedSetup(true); // Set flag for smooth transition
        // Update the URL to include the persisted state. The hashchange listener will trigger a re-render.
        window.location.hash = `#/session/${sessionId}?data=${encodedData}`;
    } catch (error) {
        console.error("Failed to encode settings for URL:", error);
        // Fallback to old method if encoding fails
        setHasCompletedSetup(true);
    }
  };
  
  const handleNavigate = (page: Page) => {
    setCurrentPage(page);
    setIsSidebarOpen(false); // Close sidebar on navigation
  };

  if (!hasCompletedSetup) {
    return <SettingsPage settings={settings} onSettingsChange={setSettings} onComplete={handleSetupComplete} />;
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'settings':
        return <SettingsDashboardPage settings={settings} onSettingsChange={setSettings} />;
      case 'memory':
        return <MemoryPage memory={memory} setMemory={setMemory} />;
      case 'history':
        return <HistoryPage history={history} onClear={clearHistory} />;
      case 'conversation':
      default:
        return (
          <ConversationPage
            settings={settings}
            memory={memory}
            setMemory={setMemory}
            addHistoryEntry={addHistoryEntry}
          />
        );
    }
  };

  return (
    <div className="bg-base-lighter text-text-primary min-h-screen w-full flex font-sans relative overflow-hidden">
      <Navigation
        currentPage={currentPage}
        onNavigate={handleNavigate}
        assistantName={settings.name}
        assistantAvatar={settings.avatar}
        isMobileOpen={isSidebarOpen}
        onMobileClose={() => setIsSidebarOpen(false)}
        isCollapsed={isNavCollapsed}
        onToggleCollapse={() => setIsNavCollapsed(prev => !prev)}
      />
      <main className="flex-1 h-screen overflow-y-auto p-4 md:p-8 flex flex-col">
        {/* Mobile Header */}
        <header className="md:hidden flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
                 <img src={settings.avatar} alt="Avatar" className="w-8 h-8 rounded-full"/>
                 <h1 className="font-bold text-lg">{settings.name}</h1>
            </div>
            <button onClick={() => setIsSidebarOpen(true)} className="p-2">
                <Icon name="settings" className="w-6 h-6"/>
            </button>
        </header>
        <div className="flex-1 flex flex-col">
             {renderPage()}
        </div>
      </main>
    </div>
  );
}

// A simple local storage hook
function useLocalStorage<T>(key: string, initialValue: T): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(error);
      return initialValue;
    }
  });

  const setValue: React.Dispatch<React.SetStateAction<T>> = (value) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.error(error);
    }
  };

  return [storedValue, setValue];
}

// =================================================================
// Main App Component (Client-Side Router)
// =================================================================

const parseHash = (hash: string) => {
    if (!hash || hash === '#/') {
        return { page: 'landing', sessionId: null, data: null };
    }
    // Use URL constructor to easily parse path and search params from the hash
    const url = new URL(hash.substring(1), window.location.origin);
    const match = url.pathname.match(/^\/session\/(.+)$/);

    if (match && match[1]) {
        return { 
            page: 'assistant', 
            sessionId: match[1], 
            data: url.searchParams.get('data') 
        };
    }
    return { page: 'landing', sessionId: null, data: null };
};

export default function App() {
    const [route, setRoute] = useState(parseHash(window.location.hash));

    useEffect(() => {
        const handleHashChange = () => {
            setRoute(parseHash(window.location.hash));
        };

        window.addEventListener('hashchange', handleHashChange);
        
        return () => {
            window.removeEventListener('hashchange', handleHashChange);
        };
    }, []);
    
    if (route.page === 'assistant' && route.sessionId) {
        return <Assistant sessionId={route.sessionId} data={route.data} />;
    }
    
    return <LandingPage />;
}