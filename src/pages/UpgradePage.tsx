import { useState, useEffect } from 'react';
import { Icon } from '../components/Icon.tsx';
import { useSubscription } from '../contexts/SubscriptionContext.tsx';
import { getPaymentLink } from '../lib/stripe.ts';
import { getSupabase } from '../lib/supabaseClient.ts';

export default function UpgradePage() {
    const [isAnnual, setIsAnnual] = useState(false);
    const [userEmail, setUserEmail] = useState<string>('');
    const { subscription, usage, tier, memoryLimit, assistantLimit, memoryCount, assistantCount } = useSubscription();

    useEffect(() => {
        const fetchUserEmail = async () => {
            const supabase = getSupabase();
            const { data: { user } } = await supabase.auth.getUser();
            if (user?.email) {
                setUserEmail(user.email);
            }
        };
        fetchUserEmail();
    }, []);

    const isPro = subscription?.tier_id === 'pro' && subscription?.status === 'active';

    // Get payment links from environment or use defaults
    const paymentLink = getPaymentLink(isAnnual);

    if (isPro) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4 bg-base-light dark:bg-dark-base-light">
                <div className="w-full max-w-lg glassmorphic p-8 rounded-2xl shadow-2xl text-center relative">
                    <a href="#/" className="absolute top-4 left-4 text-text-secondary hover:text-text-primary dark:text-dark-text-secondary dark:hover:text-dark-text-primary">
                        <Icon name="chevronLeft" className="w-6 h-6" />
                    </a>

                    <Icon name="shield" className="w-20 h-20 mx-auto text-brand-secondary-glow mb-6" />

                    <h1 className="text-4xl font-bold text-text-primary dark:text-dark-text-primary">You're a Pro!</h1>
                    <p className="text-lg text-text-secondary dark:text-dark-text-secondary mt-2">
                        You have access to all premium features.
                    </p>

                    <div className="mt-8 p-6 bg-base-light/50 dark:bg-dark-base-medium/50 rounded-lg">
                        <h3 className="font-semibold text-text-primary dark:text-dark-text-primary mb-4">Your Pro Benefits:</h3>
                        <ul className="text-left space-y-3 text-text-secondary dark:text-dark-text-secondary">
                            <li className="flex items-center"><Icon name="check" className="w-5 h-5 mr-2 text-green-500"/> Unlimited Memories</li>
                            <li className="flex items-center"><Icon name="check" className="w-5 h-5 mr-2 text-green-500"/> Unlimited Custom Assistants</li>
                            <li className="flex items-center"><Icon name="check" className="w-5 h-5 mr-2 text-green-500"/> Priority Support</li>
                            <li className="flex items-center"><Icon name="check" className="w-5 h-5 mr-2 text-green-500"/> Advanced Customization</li>
                        </ul>
                    </div>

                    <a
                        href="#/"
                        className="mt-8 w-full block bg-gradient-to-r from-brand-secondary-glow to-brand-tertiary-glow text-on-brand font-bold py-4 px-8 rounded-full transition-all duration-300 shadow-lg transform hover:scale-105 text-lg"
                    >
                        Back to Dashboard
                    </a>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-base-light dark:bg-dark-base-light">
            <div className="w-full max-w-lg glassmorphic p-8 rounded-2xl shadow-2xl text-center relative">
                <a href="#/" className="absolute top-4 left-4 text-text-secondary hover:text-text-primary dark:text-dark-text-secondary dark:hover:text-dark-text-primary">
                    <Icon name="chevronLeft" className="w-6 h-6" />
                </a>

                <h1 className="text-4xl font-bold text-text-primary dark:text-dark-text-primary">Upgrade to Pro</h1>
                <p className="text-lg text-text-secondary dark:text-dark-text-secondary mt-2">
                    Unlock unlimited memories and assistants
                </p>

                {/* Current Usage Display */}
                <div className="mt-6 p-4 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                    <p className="text-sm text-orange-800 dark:text-orange-200 font-semibold mb-2">Current Usage (Free Plan):</p>
                    <div className="flex justify-around text-text-primary dark:text-dark-text-primary">
                        <div>
                            <p className="text-2xl font-bold">{memoryCount}/{memoryLimit || '∞'}</p>
                            <p className="text-xs text-text-secondary dark:text-dark-text-secondary">Memories</p>
                        </div>
                        <div>
                            <p className="text-2xl font-bold">{assistantCount}/{assistantLimit !== null ? assistantLimit + 1 : '∞'}</p>
                            <p className="text-xs text-text-secondary dark:text-dark-text-secondary">Assistants</p>
                        </div>
                    </div>
                </div>

                <ul className="text-left space-y-4 mt-8 text-text-primary dark:text-dark-text-primary">
                    <li className="flex items-center"><Icon name="brain" className="w-6 h-6 mr-3 text-brand-secondary-glow"/> Unlimited memories across all assistants</li>
                    <li className="flex items-center"><Icon name="settings" className="w-6 h-6 mr-3 text-brand-secondary-glow"/> Fully customize Harvey and other AI assistants</li>
                    <li className="flex items-center"><Icon name="plus" className="w-6 h-6 mr-3 text-brand-secondary-glow"/> Create unlimited specialized AI assistants</li>
                    <li className="flex items-center"><Icon name="shield" className="w-6 h-6 mr-3 text-brand-secondary-glow"/> Priority support and new features</li>
                </ul>

                <div className="mt-8 p-6 bg-base-light/50 dark:bg-dark-base-medium/50 rounded-lg">
                    <div className="flex items-center justify-center gap-4 mb-4">
                        <span className={`font-semibold ${!isAnnual ? 'text-brand-secondary-glow' : 'text-text-secondary'}`}>Monthly</span>
                        <label className="inline-flex items-center cursor-pointer">
                            <input type="checkbox" checked={isAnnual} onChange={() => setIsAnnual(!isAnnual)} className="sr-only peer" />
                            <div className="relative w-11 h-6 bg-base-medium peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-brand-secondary-glow/50 rounded-full peer dark:bg-dark-border-color peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-brand-secondary-glow"></div>
                        </label>
                        <span className={`font-semibold ${isAnnual ? 'text-brand-secondary-glow' : 'text-text-secondary'}`}>Annually (Save 15%)</span>
                    </div>

                    <div className="text-5xl font-bold text-text-primary dark:text-dark-text-primary">
                        {isAnnual ? '$305' : '$30'}
                    </div>
                    <div className="text-text-secondary dark:text-dark-text-secondary">
                        {isAnnual ? 'per year' : 'per month'}
                    </div>
                </div>

                <a
                    href={`${paymentLink}?prefilled_email=${encodeURIComponent(userEmail)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-8 w-full block bg-gradient-to-r from-brand-secondary-glow to-brand-tertiary-glow text-on-brand font-bold py-4 px-8 rounded-full transition-all duration-300 shadow-lg transform hover:scale-105 text-lg"
                >
                    Upgrade Now
                </a>

                <p className="mt-4 text-xs text-text-secondary dark:text-dark-text-secondary">
                    Secure payment powered by Stripe
                </p>
            </div>
        </div>
    );
}