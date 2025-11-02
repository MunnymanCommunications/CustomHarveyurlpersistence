import { useState } from 'react';
import { Icon } from '../components/Icon.tsx';

export default function UpgradePage() {
    const [isAnnual, setIsAnnual] = useState(false);
    
    // Replace these with your actual Stripe/Square payment links
    const paymentMonthlyLink = "https://buy.stripe.com/test_dummy_monthly_link";
    const paymentAnnualLink = "https://buy.stripe.com/test_dummy_annual_link";

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-base-light dark:bg-dark-base-light">
            <div className="w-full max-w-lg glassmorphic p-8 rounded-2xl shadow-2xl text-center relative">
                <a href="#/" className="absolute top-4 left-4 text-text-secondary hover:text-text-primary dark:text-dark-text-secondary dark:hover:text-dark-text-primary">
                    <Icon name="chevronLeft" className="w-6 h-6" />
                </a>
                
                <h1 className="text-4xl font-bold text-text-primary dark:text-dark-text-primary">Upgrade Your Experience</h1>
                <p className="text-lg text-text-secondary dark:text-dark-text-secondary mt-2">
                    Unlock the full potential of your personal AI assistants.
                </p>
                
                <ul className="text-left space-y-4 mt-8 text-text-primary dark:text-dark-text-primary">
                    <li className="flex items-center"><Icon name="brain" className="w-6 h-6 mr-3 text-brand-secondary-glow"/> Save and access Memories across all assistants.</li>
                    <li className="flex items-center"><Icon name="settings" className="w-6 h-6 mr-3 text-brand-secondary-glow"/> Fully customize Harvey and other AI assistants.</li>
                    <li className="flex items-center"><Icon name="plus" className="w-6 h-6 mr-3 text-brand-secondary-glow"/> Create unlimited specialized AI assistants.</li>
                    <li className="flex items-center"><Icon name="shield" className="w-6 h-6 mr-3 text-brand-secondary-glow"/> Build your own Personal AI, just like Harvey iO.</li>
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
                    href={isAnnual ? paymentAnnualLink : paymentMonthlyLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-8 w-full block bg-gradient-to-r from-brand-secondary-glow to-brand-tertiary-glow text-on-brand font-bold py-4 px-8 rounded-full transition-all duration-300 shadow-lg transform hover:scale-105 text-lg"
                >
                    Upgrade Now
                </a>
            </div>
        </div>
    );
}