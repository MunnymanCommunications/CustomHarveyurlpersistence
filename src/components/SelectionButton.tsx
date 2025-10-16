import React from 'react';

// A standardized, reusable button for selections to ensure consistent styling.
export const SelectionButton: React.FC<{
    onClick: () => void;
    isActive: boolean;
    children: React.ReactNode;
    disabled?: boolean;
    size?: 'sm' | 'md';
}> = ({ onClick, isActive, children, disabled = false, size = 'md' }) => {
    const sizeClasses = {
        md: 'p-3 h-20 text-sm',
        sm: 'p-2 h-16 text-xs',
    };
    
    return (
        <button
            onClick={onClick}
            type="button"
            disabled={disabled}
            className={`flex items-center justify-center rounded-lg text-center transition-all duration-300 border ${sizeClasses[size]} ${
                isActive
                    ? 'bg-gradient-to-br from-brand-secondary-glow to-brand-tertiary-glow text-on-brand font-semibold shadow-lg border-transparent'
                    : 'bg-white/50 text-text-primary font-medium border-border-color hover:border-brand-secondary-glow hover:bg-white/70 dark:bg-dark-base-medium/50 dark:text-dark-text-primary dark:border-dark-border-color dark:hover:border-brand-secondary-glow dark:hover:bg-dark-base-medium/70'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
            {children}
        </button>
    );
};
