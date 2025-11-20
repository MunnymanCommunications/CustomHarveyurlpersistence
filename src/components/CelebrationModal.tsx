import { Icon } from './Icon.tsx';

interface CelebrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  type: 'success' | 'upgrade';
}

export default function CelebrationModal({ isOpen, onClose, title, message, type }: CelebrationModalProps) {
  if (!isOpen) return null;

  const handleUpgradeClick = () => {
    window.location.hash = '#/upgrade';
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-md glassmorphic p-8 rounded-2xl shadow-2xl transform transition-all animate-scale-in">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-text-secondary hover:text-text-primary dark:text-dark-text-secondary dark:hover:text-dark-text-primary"
        >
          <Icon name="close" className="w-6 h-6" />
        </button>

        <div className="text-center">
          {type === 'success' && (
            <>
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <Icon name="check" className="w-12 h-12 text-green-600 dark:text-green-400" />
              </div>
              <h2 className="text-3xl font-bold text-text-primary dark:text-dark-text-primary mb-3">
                {title}
              </h2>
              <p className="text-lg text-text-secondary dark:text-dark-text-secondary mb-6">
                {message}
              </p>
              <button
                onClick={onClose}
                className="w-full bg-gradient-to-r from-brand-secondary-glow to-brand-tertiary-glow text-on-brand font-bold py-3 px-6 rounded-full transition-all duration-300 shadow-lg transform hover:scale-105"
              >
                Continue
              </button>
            </>
          )}

          {type === 'upgrade' && (
            <>
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                <Icon name="star" className="w-12 h-12 text-orange-600 dark:text-orange-400" />
              </div>
              <h2 className="text-3xl font-bold text-text-primary dark:text-dark-text-primary mb-3">
                {title}
              </h2>
              <p className="text-lg text-text-secondary dark:text-dark-text-secondary mb-6">
                {message}
              </p>
              <div className="space-y-3">
                <button
                  onClick={handleUpgradeClick}
                  className="w-full bg-gradient-to-r from-brand-secondary-glow to-brand-tertiary-glow text-on-brand font-bold py-3 px-6 rounded-full transition-all duration-300 shadow-lg transform hover:scale-105"
                >
                  Upgrade to Pro
                </button>
                <button
                  onClick={onClose}
                  className="w-full text-text-secondary hover:text-text-primary dark:text-dark-text-secondary dark:hover:text-dark-text-primary font-medium py-2"
                >
                  Maybe Later
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
