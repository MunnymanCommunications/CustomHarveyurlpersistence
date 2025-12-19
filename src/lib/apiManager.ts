import { GoogleGenAI } from '@google/genai';
import { logEvent } from './logger';

export interface APIConfig {
  model: string;
  priority: number;
  enabled: boolean;
  maxRetries: number;
}

// API configurations with fallback priority
const VOICE_API_CONFIGS: APIConfig[] = [
  {
    model: 'gemini-2.0-flash-exp',
    priority: 1,
    enabled: true,
    maxRetries: 2,
  },
  {
    model: 'gemini-flash-latest',
    priority: 2,
    enabled: true,
    maxRetries: 2,
  },
];

export class APIManager {
  private apiKey: string;
  private ai: GoogleGenAI;
  private currentModel: string | null = null;
  private failedModels: Set<string> = new Set();

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    this.ai = new GoogleGenAI({ apiKey });
  }

  /**
   * Attempts to connect to a Gemini Live session with automatic fallback
   */
  async connectWithFallback(config: any, assistantId: string): Promise<any> {
    const sortedConfigs = VOICE_API_CONFIGS
      .filter(c => c.enabled && !this.failedModels.has(c.model))
      .sort((a, b) => a.priority - b.priority);

    if (sortedConfigs.length === 0) {
      // All models failed, reset and try again
      console.warn('All API models failed, resetting failed models list');
      this.failedModels.clear();
      throw new Error('All API providers are currently unavailable. Please try again later.');
    }

    for (const apiConfig of sortedConfigs) {
      try {
        console.log(`Attempting to connect with model: ${apiConfig.model}`);

        const session = await this.connectToModel(apiConfig.model, config, apiConfig.maxRetries);

        this.currentModel = apiConfig.model;

        // Log successful connection
        await logEvent('API_SUCCESS', {
          assistantId,
          metadata: {
            model: apiConfig.model,
            priority: apiConfig.priority,
          },
          severity: 'INFO',
        });

        return session;
      } catch (error: any) {
        console.error(`Failed to connect with ${apiConfig.model}:`, error);

        // Mark this model as failed
        this.failedModels.add(apiConfig.model);

        const severity = apiConfig.priority === sortedConfigs.length ? 'CRITICAL' : 'ERROR';

        await logEvent('API_FAILURE', {
          assistantId,
          metadata: {
            model: apiConfig.model,
            priority: apiConfig.priority,
            error: error.message,
            failedModels: Array.from(this.failedModels),
          },
          severity,
        });

        // If this was the last model, throw the error
        if (apiConfig.priority === sortedConfigs[sortedConfigs.length - 1].priority) {
          throw new Error(`All API models failed. Last error: ${error.message}`);
        }

        // Otherwise, continue to next model
        console.log(`Falling back to next available model...`);
      }
    }

    throw new Error('Failed to connect to any API model');
  }

  /**
   * Attempts to connect to a specific model with retries
   */
  private async connectToModel(model: string, config: any, maxRetries: number): Promise<any> {
    let lastError: any;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      if (attempt > 0) {
        const delay = Math.pow(2, attempt - 1) * 1000; // Exponential backoff: 1s, 2s, 4s
        console.log(`Retry attempt ${attempt}/${maxRetries} after ${delay}ms delay`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }

      try {
        // Use the model parameter to create a session with the appropriate model
        // Note: Gemini Live API may require specific model names
        const sessionPromise = this.ai.live.connect({
          ...config,
          model, // Override model in config
        });

        const session = await sessionPromise;
        return session;
      } catch (error) {
        lastError = error;
        console.error(`Attempt ${attempt + 1}/${maxRetries + 1} failed:`, error);
      }
    }

    throw lastError;
  }

  /**
   * Gets the currently connected model
   */
  getCurrentModel(): string | null {
    return this.currentModel;
  }

  /**
   * Resets the failed models list (useful for retry after some time)
   */
  resetFailedModels() {
    this.failedModels.clear();
  }

  /**
   * Gets list of failed models
   */
  getFailedModels(): string[] {
    return Array.from(this.failedModels);
  }

  /**
   * Checks if all models have failed
   */
  allModelsFailed(): boolean {
    return this.failedModels.size >= VOICE_API_CONFIGS.filter(c => c.enabled).length;
  }
}

// Singleton instance
let apiManagerInstance: APIManager | null = null;

export const getAPIManager = (apiKey: string): APIManager => {
  if (!apiManagerInstance || !apiKey) {
    apiManagerInstance = new APIManager(apiKey);
  }
  return apiManagerInstance;
};

export const resetAPIManager = () => {
  apiManagerInstance = null;
};
