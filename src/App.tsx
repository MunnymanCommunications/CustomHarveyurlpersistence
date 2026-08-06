import { useEffect, useState } from 'react';
import { ASSISTANT_URL, UPGRADE_MAILTO } from './config';

const WORD = ['H', 'A', 'R', 'V', 'E', 'Y'];

/** Current `window.location.hash`, re-rendering on every hashchange. */
function useHash() {
  const [hash, setHash] = useState(() => window.location.hash || '#/');
  useEffect(() => {
    const onChange = () => setHash(window.location.hash || '#/');
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return hash;
}

/**
 * The whole site: a landing page and a hand-off.
 *
 * Anything under `#/public/` is an assistant link — this site doesn't host the
 * assistant, so those go straight to the main app. Everything else shows the
 * landing page.
 */
export default function App() {
  const hash = useHash();
  const isAssistantLink = hash.startsWith('#/public/');

  useEffect(() => {
    // replace(), not assign() — the old URL must not sit in history, or Back
    // lands on it and bounces the visitor straight forward again.
    if (isAssistantLink) window.location.replace(ASSISTANT_URL);
  }, [isAssistantLink]);

  if (isAssistantLink) return <p className="handoff">Taking you to Harvey…</p>;

  return (
    <main>
      <h1 className="wordmark" aria-label="Harvey">
        {WORD.map((ch, i) => (
          <span key={i} style={{ animationDelay: `${i * 0.09}s` }} aria-hidden>
            {ch}
          </span>
        ))}
      </h1>

      <p className="eyebrow">Voice AI by Harvey iO</p>

      <p className="blurb">
        Ask Harvey anything, out loud. No app, no sign-up — press the button and
        start talking.
      </p>

      <div className="actions">
        <a className="btn btn-primary" href={ASSISTANT_URL}>
          <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor"
               strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <rect x="9" y="3" width="6" height="12" rx="3" />
            <path d="M5 11a7 7 0 0 0 14 0M12 18v3M8 21h8" />
          </svg>
          Speak with Harvey
        </a>

        <a className="btn btn-secondary" href={UPGRADE_MAILTO}>
          <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor"
               strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <rect x="3" y="6" width="18" height="12" rx="2" />
            <path d="M3.5 7.5l8.5 6 8.5-6" />
          </svg>
          Upgrade to a paid subscription
        </a>
      </div>

      <p className="footer">Harvey iO · Munnyman Communications</p>
    </main>
  );
}
