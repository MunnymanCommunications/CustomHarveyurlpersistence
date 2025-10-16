import React, { useState, Children, isValidElement } from 'react';
import './Stepper.css';

// The Step component is a simple container for step content.
export const Step: React.FC<{ children: React.ReactNode }> = ({ children }) => <>{children}</>;

interface StepperProps {
  children: React.ReactNode;
  onFinalStepCompleted: () => void;
  backButtonText?: string;
  nextButtonText?: string;
}

const Stepper: React.FC<StepperProps> = ({
  children,
  onFinalStepCompleted,
  backButtonText = 'Back',
  nextButtonText = 'Next',
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const steps = Children.toArray(children).filter(child => isValidElement(child) && child.type === Step);
  const totalSteps = steps.length;
  const isLastStep = currentStep === totalSteps - 1;

  const goToNext = () => {
    if (isLastStep) {
      onFinalStepCompleted();
    } else {
      setCurrentStep(prev => Math.min(prev + 1, totalSteps - 1));
    }
  };

  const goToPrevious = () => {
    setCurrentStep(prev => Math.max(prev - 1, 0));
  };

  return (
    <div className="w-full max-w-3xl glassmorphic p-6 sm:p-10 space-y-8 rounded-2xl">
      {/* Step Content */}
      <div className="min-h-[22rem] flex flex-col justify-center">
        {steps[currentStep]}
      </div>

      {/* Step Indicator */}
      <div className="flex justify-center space-x-2">
        {steps.map((_, index) => (
          <div
            key={index}
            className={`w-3 h-3 rounded-full transition-colors ${
              currentStep >= index ? 'bg-brand-secondary-glow' : 'bg-base-medium dark:bg-dark-base-light'
            }`}
          />
        ))}
      </div>

      {/* Navigation */}
      <div className="flex justify-between items-center pt-4">
        <button
          onClick={goToPrevious}
          disabled={currentStep === 0}
          className="bg-base-light hover:bg-base-medium text-text-primary font-bold py-3 px-8 rounded-full transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-dark-base-medium dark:hover:bg-dark-border-color dark:text-dark-text-primary"
        >
          {backButtonText}
        </button>
        <button
          onClick={goToNext}
          className="bg-gradient-to-r from-brand-secondary-glow to-brand-tertiary-glow text-on-brand font-bold py-3 px-8 rounded-full transition-all duration-300 shadow-lg transform hover:scale-105"
        >
          {isLastStep ? 'Finish Setup' : nextButtonText}
        </button>
      </div>
    </div>
  );
};

export default Stepper;
