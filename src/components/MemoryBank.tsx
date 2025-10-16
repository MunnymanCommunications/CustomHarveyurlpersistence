import React from 'react';
import { Icon } from './Icon.tsx';

interface MemoryBankProps {
  memory: string[];
  onEdit: () => void;
}

export const MemoryBank: React.FC<MemoryBankProps> = ({ memory, onEdit }) => {
  if (memory.length === 0) {
    return null;
  }

  return (
    <div className="glassmorphic p-3 rounded-lg max-w-xs">
      <h3 className="text-sm font-semibold text-text-primary dark:text-dark-text-primary mb-2 flex items-center">
        <Icon name="brain" className="w-4 h-4 mr-2" />
        Memory Bank
      </h3>
      <ul className="space-y-1 text-xs text-text-secondary dark:text-dark-text-secondary list-disc list-inside max-h-24 overflow-y-auto">
        {memory.slice(0, 3).map((item, index) => (
          <li key={index} className="truncate">{item}</li>
        ))}
        {memory.length > 3 && <li className="text-xs italic">...and {memory.length - 3} more.</li>}
      </ul>
       <button onClick={onEdit} className="text-xs text-brand-light hover:underline mt-2">View & Edit</button>
    </div>
  );
};
