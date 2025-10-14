

import React from 'react';
import { SettingsPanel } from '../components/SettingsPanel.tsx';
import type { Assistant } from '../types.ts';
import { Icon } from '../components/Icon.tsx';

interface SettingsDashboardPageProps {
  settings: Assistant;
  // FIX: Corrected prop type to align with how it's used in SettingsPanel.
  onSettingsChange: (newSettings: Partial<Assistant>) => void;
}

export default function SettingsDashboardPage({ settings, onSettingsChange }: SettingsDashboardPageProps) {
  return (
    <div className="w-full max-w-4xl mx-auto glassmorphic p-4 sm:p-8 h-full overflow-y-auto">
      <header className="mb-8">
          <h1 className="text-3xl font-bold text-text-primary flex items-center">
              <Icon name="settings" className="w-8 h-8 mr-4" />
              Settings
          </h1>
          <p className="text-text-secondary mt-2">Adjust your AI assistant's personality, knowledge, and voice.</p>
      </header>
      <SettingsPanel settings={settings} onSettingsChange={onSettingsChange} disabled={false} />
    </div>
  );
}
