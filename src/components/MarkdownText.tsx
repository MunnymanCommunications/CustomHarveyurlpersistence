import React from 'react';

interface MarkdownTextProps {
  text: string;
  className?: string;
}

/**
 * Simple markdown renderer for chat messages
 * Supports: **bold**, *italic*, `code`, [links](url), and code blocks
 */
export const MarkdownText: React.FC<MarkdownTextProps> = ({ text, className = '' }) => {
  const parseMarkdown = (input: string): React.ReactNode[] => {
    let key = 0;

    // Patterns for markdown elements
    const patterns = [
      // Code blocks (```code```)
      { regex: /```([\s\S]*?)```/g, render: (match: string, _unused?: string) => (
        <pre key={key++} className="bg-base-medium dark:bg-dark-base-medium p-2 rounded my-2 overflow-x-auto">
          <code className="text-sm font-mono">{match}</code>
        </pre>
      )},
      // Inline code (`code`)
      { regex: /`([^`]+)`/g, render: (match: string, _unused?: string) => (
        <code key={key++} className="bg-base-medium dark:bg-dark-base-medium px-1.5 py-0.5 rounded text-sm font-mono">
          {match}
        </code>
      )},
      // Bold (**text**)
      { regex: /\*\*([^*]+)\*\*/g, render: (match: string, _unused?: string) => (
        <strong key={key++} className="font-bold">{match}</strong>
      )},
      // Italic (*text*)
      { regex: /\*([^*]+)\*/g, render: (match: string, _unused?: string) => (
        <em key={key++} className="italic">{match}</em>
      )},
      // Links ([text](url))
      { regex: /\[([^\]]+)\]\(([^)]+)\)/g, render: (text: string, url: string) => (
        <a key={key++} href={url} target="_blank" rel="noopener noreferrer" className="text-brand-secondary-glow hover:underline">
          {text}
        </a>
      )},
    ];

    const processText = (str: string): React.ReactNode[] => {
      if (!str) return [];

      const parts: React.ReactNode[] = [];
      let remaining = str;
      let partKey = 0;

      while (remaining.length > 0) {
        let earliestMatch: { index: number; length: number; element: React.ReactNode } | null = null;

        // Find the earliest match among all patterns
        for (const pattern of patterns) {
          pattern.regex.lastIndex = 0; // Reset regex
          const match = pattern.regex.exec(remaining);

          if (match && (earliestMatch === null || match.index < earliestMatch.index)) {
            // Call render with both capture groups (second will be undefined for single-group patterns)
            const element = pattern.render(match[1], match[2]);

            earliestMatch = {
              index: match.index,
              length: match[0].length,
              element
            };
          }
        }

        if (earliestMatch) {
          // Add text before the match
          if (earliestMatch.index > 0) {
            const before = remaining.substring(0, earliestMatch.index);
            parts.push(<span key={`text-${partKey++}`}>{before}</span>);
          }

          // Add the matched element
          parts.push(earliestMatch.element);

          // Continue with remaining text
          remaining = remaining.substring(earliestMatch.index + earliestMatch.length);
        } else {
          // No more matches, add remaining text
          parts.push(<span key={`text-${partKey++}`}>{remaining}</span>);
          break;
        }
      }

      return parts;
    };

    // Split by newlines to preserve line breaks
    const lines = input.split('\n');

    return lines.flatMap((line, lineIndex) => {
      const processed = processText(line);
      return [
        ...processed,
        lineIndex < lines.length - 1 ? <br key={`br-${lineIndex}`} /> : null
      ].filter(Boolean);
    });
  };

  return (
    <div className={className}>
      {parseMarkdown(text)}
    </div>
  );
};
