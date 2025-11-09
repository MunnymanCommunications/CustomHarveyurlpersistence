import React, { useState } from 'react';
import type { MCPServerSettings, MCPTool } from '../types.ts';
import { GoogleGenAI } from '@google/genai';
import { optimizeToolDescriptions } from '../agents/mcpToolAgent.ts';

interface MCPServerSettingsProps {
  settings: MCPServerSettings | null | undefined;
  onSettingsChange: (newSettings: MCPServerSettings) => void;
  disabled: boolean;
}

export const MCPServerSettingsComponent: React.FC<MCPServerSettingsProps> = ({
  settings,
  onSettingsChange,
  disabled,
}) => {
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [toolsInput, setToolsInput] = useState(
    settings?.tools ? JSON.stringify(settings.tools, null, 2) : '[]'
  );
  const [headersInput, setHeadersInput] = useState(
    settings?.config.headers ? JSON.stringify(settings.config.headers, null, 2) : '{}'
  );

  const currentSettings: MCPServerSettings = settings || {
    enabled: false,
    config: {
      url: '',
      headers: {},
      apiKey: '',
    },
    tools: [],
    optimizedToolDescriptions: '',
  };

  const handleToggleEnabled = () => {
    onSettingsChange({
      ...currentSettings,
      enabled: !currentSettings.enabled,
    });
  };

  const handleUrlChange = (url: string) => {
    onSettingsChange({
      ...currentSettings,
      config: {
        ...currentSettings.config,
        url,
      },
    });
  };

  const handleApiKeyChange = (apiKey: string) => {
    onSettingsChange({
      ...currentSettings,
      config: {
        ...currentSettings.config,
        apiKey,
      },
    });
  };

  const handleHeadersChange = (value: string) => {
    setHeadersInput(value);
    try {
      const parsed = JSON.parse(value);
      onSettingsChange({
        ...currentSettings,
        config: {
          ...currentSettings.config,
          headers: parsed,
        },
      });
    } catch (e) {
      // Invalid JSON, don't update settings yet
    }
  };

  const handleToolsChange = (value: string) => {
    setToolsInput(value);
    try {
      const parsed: MCPTool[] = JSON.parse(value);
      onSettingsChange({
        ...currentSettings,
        tools: parsed,
      });
    } catch (e) {
      // Invalid JSON, don't update settings yet
    }
  };

  const handleOptimize = async () => {
    const apiKey = process.env.API_KEY;
    if (!apiKey || apiKey === 'undefined') {
      alert('API key is not configured. Cannot optimize tool descriptions.');
      return;
    }

    if (currentSettings.tools.length === 0) {
      alert('Please add at least one tool before optimizing.');
      return;
    }

    setIsOptimizing(true);
    try {
      const aiClient = new GoogleGenAI({ apiKey });
      const optimized = await optimizeToolDescriptions(currentSettings.tools, aiClient);

      onSettingsChange({
        ...currentSettings,
        optimizedToolDescriptions: optimized,
      });

      alert('Tool descriptions have been optimized by Harvey!');
    } catch (error) {
      console.error('Failed to optimize tool descriptions:', error);
      alert('Failed to optimize tool descriptions. Please try again.');
    } finally {
      setIsOptimizing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-text-primary dark:text-dark-text-primary">
            MCP Server Integration
          </h3>
          <p className="text-sm text-text-secondary dark:text-dark-text-secondary mt-1">
            Connect to an MCP (Model Context Protocol) server to extend Harvey's capabilities with custom tools.
          </p>
        </div>
        <label className="flex items-center cursor-pointer">
          <div className="relative">
            <input
              type="checkbox"
              checked={currentSettings.enabled}
              onChange={handleToggleEnabled}
              disabled={disabled}
              className="sr-only"
            />
            <div
              className={`block w-14 h-8 rounded-full transition ${
                currentSettings.enabled
                  ? 'bg-brand-secondary-glow'
                  : 'bg-base-medium dark:bg-dark-border-color'
              }`}
            ></div>
            <div
              className={`dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition ${
                currentSettings.enabled ? 'transform translate-x-6' : ''
              }`}
            ></div>
          </div>
          <span className="ml-3 text-sm font-medium text-text-primary dark:text-dark-text-primary">
            {currentSettings.enabled ? 'Enabled' : 'Disabled'}
          </span>
        </label>
      </div>

      {currentSettings.enabled && (
        <div className="space-y-4 pt-4 border-t border-border-color dark:border-dark-border-color">
          <div>
            <label
              htmlFor="mcp-url"
              className="block text-sm font-medium text-text-primary dark:text-dark-text-primary mb-1"
            >
              MCP Server URL
            </label>
            <input
              id="mcp-url"
              type="url"
              value={currentSettings.config.url}
              onChange={e => handleUrlChange(e.target.value)}
              className="w-full p-2 border border-border-color rounded-md bg-white/70 focus:ring-2 focus:ring-brand-secondary-glow focus:border-transparent transition dark:bg-dark-base-light dark:border-dark-border-color dark:text-dark-text-primary"
              placeholder="https://your-mcp-server.com/api/tools"
              disabled={disabled}
            />
          </div>

          <div>
            <label
              htmlFor="mcp-api-key"
              className="block text-sm font-medium text-text-primary dark:text-dark-text-primary mb-1"
            >
              API Key (Optional)
            </label>
            <input
              id="mcp-api-key"
              type="password"
              value={currentSettings.config.apiKey || ''}
              onChange={e => handleApiKeyChange(e.target.value)}
              className="w-full p-2 border border-border-color rounded-md bg-white/70 focus:ring-2 focus:ring-brand-secondary-glow focus:border-transparent transition dark:bg-dark-base-light dark:border-dark-border-color dark:text-dark-text-primary"
              placeholder="Enter API key if required"
              disabled={disabled}
            />
          </div>

          <div>
            <label
              htmlFor="mcp-headers"
              className="block text-sm font-medium text-text-primary dark:text-dark-text-primary mb-1"
            >
              Custom Headers (Optional, JSON format)
            </label>
            <textarea
              id="mcp-headers"
              value={headersInput}
              onChange={e => handleHeadersChange(e.target.value)}
              className="w-full p-2 border border-border-color rounded-md bg-white/70 focus:ring-2 focus:ring-brand-secondary-glow focus:border-transparent transition font-mono text-sm dark:bg-dark-base-light dark:border-dark-border-color dark:text-dark-text-primary"
              rows={3}
              placeholder='{"X-Custom-Header": "value"}'
              disabled={disabled}
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label
                htmlFor="mcp-tools"
                className="block text-sm font-medium text-text-primary dark:text-dark-text-primary"
              >
                Tool Descriptions (JSON format)
              </label>
              <button
                onClick={handleOptimize}
                disabled={disabled || isOptimizing || currentSettings.tools.length === 0}
                className="px-4 py-2 bg-brand-secondary-glow text-white rounded-md hover:bg-brand-secondary-glow/90 disabled:opacity-50 disabled:cursor-not-allowed transition text-sm font-medium"
              >
                {isOptimizing ? 'Optimizing...' : 'Have Harvey Optimize'}
              </button>
            </div>
            <p className="text-xs text-text-secondary dark:text-dark-text-secondary mb-2">
              Define the tools available from your MCP server. Harvey can optimize these descriptions
              to make them easier for AI agents to understand and use.
            </p>
            <textarea
              id="mcp-tools"
              value={toolsInput}
              onChange={e => handleToolsChange(e.target.value)}
              className="w-full p-2 border border-border-color rounded-md bg-white/70 focus:ring-2 focus:ring-brand-secondary-glow focus:border-transparent transition font-mono text-sm dark:bg-dark-base-light dark:border-dark-border-color dark:text-dark-text-primary"
              rows={8}
              placeholder={`[
  {
    "name": "get_weather",
    "description": "Get current weather for a location",
    "parameters": {
      "location": {
        "type": "string",
        "description": "City name or coordinates"
      }
    }
  }
]`}
              disabled={disabled}
            />
          </div>

          {currentSettings.optimizedToolDescriptions && (
            <div>
              <label className="block text-sm font-medium text-text-primary dark:text-dark-text-primary mb-1">
                Harvey's Optimized Descriptions
              </label>
              <div className="w-full p-3 border border-green-500 rounded-md bg-green-50 dark:bg-green-900/20 text-sm whitespace-pre-wrap">
                {currentSettings.optimizedToolDescriptions}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
