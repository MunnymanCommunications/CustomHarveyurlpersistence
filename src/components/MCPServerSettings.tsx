import React, { useState } from 'react';
import type { MCPServerSettings, MCPTool } from '../types.ts';
import { GoogleGenAI } from '@google/genai';
import { optimizeToolDescriptions } from '../agents/mcpToolAgent.ts';
import { Icon } from './Icon.tsx';

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
  const [optimizeError, setOptimizeError] = useState<string | null>(null);

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

  // Handle headers as key-value pairs
  const headerEntries = Object.entries(currentSettings.config.headers || {});

  const handleAddHeader = () => {
    const newHeaders = { ...currentSettings.config.headers, '': '' };
    onSettingsChange({
      ...currentSettings,
      config: {
        ...currentSettings.config,
        headers: newHeaders,
      },
    });
  };

  const handleHeaderKeyChange = (oldKey: string, newKey: string) => {
    const headers = { ...currentSettings.config.headers };
    if (oldKey !== newKey) {
      const value = headers[oldKey];
      delete headers[oldKey];
      headers[newKey] = value;
    }
    onSettingsChange({
      ...currentSettings,
      config: {
        ...currentSettings.config,
        headers,
      },
    });
  };

  const handleHeaderValueChange = (key: string, value: string) => {
    onSettingsChange({
      ...currentSettings,
      config: {
        ...currentSettings.config,
        headers: {
          ...currentSettings.config.headers,
          [key]: value,
        },
      },
    });
  };

  const handleRemoveHeader = (key: string) => {
    const headers = { ...currentSettings.config.headers };
    delete headers[key];
    onSettingsChange({
      ...currentSettings,
      config: {
        ...currentSettings.config,
        headers,
      },
    });
  };

  // Handle tools as individual entries
  const handleAddTool = () => {
    const newTool: MCPTool = {
      name: '',
      description: '',
      parameters: {},
    };
    onSettingsChange({
      ...currentSettings,
      tools: [...currentSettings.tools, newTool],
    });
  };

  const handleToolChange = (index: number, field: keyof MCPTool, value: string) => {
    const newTools = [...currentSettings.tools];
    newTools[index] = { ...newTools[index], [field]: value };
    onSettingsChange({
      ...currentSettings,
      tools: newTools,
    });
  };

  const handleRemoveTool = (index: number) => {
    const newTools = currentSettings.tools.filter((_, i) => i !== index);
    onSettingsChange({
      ...currentSettings,
      tools: newTools,
    });
  };

  const handleOptimize = async () => {
    const apiKey = import.meta.env.VITE_API_KEY || (window as any).process?.env?.API_KEY;
    if (!apiKey || apiKey === 'undefined') {
      setOptimizeError('API key is not configured. Cannot optimize tool descriptions.');
      return;
    }

    if (currentSettings.tools.length === 0) {
      setOptimizeError('Please add at least one tool before optimizing.');
      return;
    }

    // Validate tools have names and descriptions
    const invalidTools = currentSettings.tools.filter(t => !t.name || !t.description);
    if (invalidTools.length > 0) {
      setOptimizeError('All tools must have a name and description before optimizing.');
      return;
    }

    setIsOptimizing(true);
    setOptimizeError(null);
    try {
      const aiClient = new GoogleGenAI({ apiKey });
      const optimized = await optimizeToolDescriptions(currentSettings.tools, aiClient);

      onSettingsChange({
        ...currentSettings,
        optimizedToolDescriptions: optimized,
      });
    } catch (error) {
      console.error('Failed to optimize tool descriptions:', error);
      setOptimizeError('Failed to optimize tool descriptions. Please try again.');
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
        <div className="space-y-6 pt-4 border-t border-border-color dark:border-dark-border-color">
          {/* Server URL */}
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

          {/* API Key */}
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

          {/* Custom Headers */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-text-primary dark:text-dark-text-primary">
                Custom Headers (Optional)
              </label>
              <button
                onClick={handleAddHeader}
                disabled={disabled}
                className="text-sm text-brand-secondary-glow hover:underline disabled:opacity-50"
              >
                + Add Header
              </button>
            </div>
            {headerEntries.length > 0 && (
              <div className="space-y-2">
                {headerEntries.map(([key, value], index) => (
                  <div key={index} className="flex gap-2">
                    <input
                      type="text"
                      value={key}
                      onChange={e => handleHeaderKeyChange(key, e.target.value)}
                      placeholder="Header name"
                      className="w-1/3 p-2 border border-border-color rounded-md bg-white/70 focus:ring-2 focus:ring-brand-secondary-glow focus:border-transparent transition dark:bg-dark-base-light dark:border-dark-border-color dark:text-dark-text-primary text-sm"
                      disabled={disabled}
                    />
                    <input
                      type="text"
                      value={value}
                      onChange={e => handleHeaderValueChange(key, e.target.value)}
                      placeholder="Header value"
                      className="flex-1 p-2 border border-border-color rounded-md bg-white/70 focus:ring-2 focus:ring-brand-secondary-glow focus:border-transparent transition dark:bg-dark-base-light dark:border-dark-border-color dark:text-dark-text-primary text-sm"
                      disabled={disabled}
                    />
                    <button
                      onClick={() => handleRemoveHeader(key)}
                      disabled={disabled}
                      className="px-3 py-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition disabled:opacity-50"
                    >
                      <Icon name="trash" className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Tools */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div>
                <label className="block text-sm font-medium text-text-primary dark:text-dark-text-primary">
                  Tool Definitions
                </label>
                <p className="text-xs text-text-secondary dark:text-dark-text-secondary mt-1">
                  Define the tools available from your MCP server
                </p>
              </div>
              <button
                onClick={handleAddTool}
                disabled={disabled}
                className="text-sm text-brand-secondary-glow hover:underline disabled:opacity-50"
              >
                + Add Tool
              </button>
            </div>

            {currentSettings.tools.length > 0 && (
              <div className="space-y-4">
                {currentSettings.tools.map((tool, index) => (
                  <div
                    key={index}
                    className="p-4 border border-border-color dark:border-dark-border-color rounded-md bg-white/50 dark:bg-dark-base-light/50 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-medium text-text-primary dark:text-dark-text-primary">
                        Tool {index + 1}
                      </h4>
                      <button
                        onClick={() => handleRemoveTool(index)}
                        disabled={disabled}
                        className="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 p-1 rounded transition disabled:opacity-50"
                      >
                        <Icon name="trash" className="w-4 h-4" />
                      </button>
                    </div>
                    <input
                      type="text"
                      value={tool.name}
                      onChange={e => handleToolChange(index, 'name', e.target.value)}
                      placeholder="Tool name (e.g., get_weather)"
                      className="w-full p-2 border border-border-color rounded-md bg-white/70 focus:ring-2 focus:ring-brand-secondary-glow focus:border-transparent transition dark:bg-dark-base-light dark:border-dark-border-color dark:text-dark-text-primary text-sm"
                      disabled={disabled}
                    />
                    <textarea
                      value={tool.description}
                      onChange={e => handleToolChange(index, 'description', e.target.value)}
                      placeholder="Tool description (e.g., Get current weather for a location)"
                      className="w-full p-2 border border-border-color rounded-md bg-white/70 focus:ring-2 focus:ring-brand-secondary-glow focus:border-transparent transition dark:bg-dark-base-light dark:border-dark-border-color dark:text-dark-text-primary text-sm"
                      rows={2}
                      disabled={disabled}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Optimize Button */}
          {currentSettings.tools.length > 0 && (
            <div>
              <button
                onClick={handleOptimize}
                disabled={disabled || isOptimizing}
                className="w-full px-4 py-3 bg-gradient-to-r from-brand-secondary-glow to-brand-tertiary-glow text-white rounded-md hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition font-medium flex items-center justify-center gap-2"
              >
                {isOptimizing ? (
                  <>
                    <Icon name="loader" className="w-5 h-5 animate-spin" />
                    Optimizing with Harvey...
                  </>
                ) : (
                  <>
                    <Icon name="sparkles" className="w-5 h-5" />
                    Have Harvey Optimize
                  </>
                )}
              </button>
              {optimizeError && (
                <p className="text-sm text-red-500 mt-2">{optimizeError}</p>
              )}
              <p className="text-xs text-text-secondary dark:text-dark-text-secondary mt-2">
                Harvey will analyze your tool descriptions and rewrite them to be clearer and more effective for AI agents.
              </p>
            </div>
          )}

          {/* Optimized Descriptions */}
          {currentSettings.optimizedToolDescriptions && (
            <div>
              <label className="block text-sm font-medium text-text-primary dark:text-dark-text-primary mb-1">
                Harvey's Optimized Descriptions
              </label>
              <div className="w-full p-3 border border-green-500 rounded-md bg-green-50 dark:bg-green-900/20 text-sm whitespace-pre-wrap text-text-primary dark:text-dark-text-primary">
                {currentSettings.optimizedToolDescriptions}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
