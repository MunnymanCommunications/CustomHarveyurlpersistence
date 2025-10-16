import { Icon } from '../components/Icon.tsx';
import type { HistoryEntry } from '../types.ts';

interface HistoryPageProps {
  history: HistoryEntry[];
  onClear: () => void;
}

export default function HistoryPage({ history, onClear }: HistoryPageProps) {
  return (
    <div className="glassmorphic rounded-2xl shadow-2xl p-4 sm:p-8 max-w-4xl mx-auto w-full h-full flex flex-col">
      <header className="flex-shrink-0 flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-text-primary dark:text-dark-text-primary flex items-center">
          <Icon name="history" className="w-8 h-8 mr-3" />
          Conversation History
        </h1>
      </header>

      <div className="flex-grow space-y-4 mb-6 overflow-y-auto pr-2">
        {history.length === 0 ? (
          <p className="text-text-secondary dark:text-dark-text-secondary text-center py-8">No history yet.</p>
        ) : (
          history.map((entry, index) => (
            <div key={index} className="p-4 bg-white/60 rounded-lg border border-border-color dark:bg-dark-base-light/60 dark:border-dark-border-color">
              <p className="font-semibold text-brand-secondary-glow">You:</p>
              <p className="mb-2 text-text-secondary dark:text-dark-text-secondary">{entry.user || "..."}</p>
              <p className="font-semibold text-brand-tertiary-glow">Assistant:</p>
              <p className="text-text-secondary dark:text-dark-text-secondary">{entry.assistant || "..."}</p>
              <p className="text-xs text-right text-text-tertiary dark:text-dark-text-tertiary mt-2">{new Date(entry.timestamp).toLocaleString()}</p>
            </div>
          ))
        )}
      </div>

      <footer className="flex-shrink-0 flex justify-end items-center">
        <button
          onClick={onClear}
          disabled={history.length === 0}
          className="bg-danger/80 hover:bg-danger text-on-brand font-bold py-2 px-4 rounded-full flex items-center transition-all duration-300 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
        >
           <Icon name="trash" className="w-5 h-5 mr-2" />
          Clear History
        </button>
      </footer>
    </div>
  );
}
