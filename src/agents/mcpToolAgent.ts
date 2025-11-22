import { GoogleGenAI, Type } from '@google/genai';
import type { MCPServerConfig, MCPTool } from '../types.ts';

/**
 * MCP Tool Agent using Gemini Pro
 * This sub-agent handles tool execution for MCP server integrations
 */

interface MCPToolExecutionResult {
  success: boolean;
  result: any;
  error?: string;
  summary: string;
}

/**
 * Optimizes tool descriptions using Gemini Pro to make them more agent-friendly
 */
export async function optimizeToolDescriptions(
  tools: MCPTool[],
  aiClient: GoogleGenAI
): Promise<string> {
  const toolsJson = JSON.stringify(tools, null, 2);
  const prompt = `You are Harvey, an AI assistant optimizer. Your task is to analyze and rewrite tool descriptions to make them clearer and easier for AI agents to understand and execute.

Given the following tool descriptions:
${toolsJson}

Please rewrite these tool descriptions following these principles:
1. Use clear, concise language
2. Specify exact parameters and their types
3. Provide examples of when to use each tool
4. Clarify any ambiguous terminology
5. Add helpful context about expected inputs and outputs

Return the optimized descriptions in a clear, structured format that an AI agent can easily parse and understand.`;

  const result = await aiClient.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
  });

  return result.text ?? '';
}

/**
 * Executes a tool via MCP server using Gemini Pro as the sub-agent
 */
export async function executeMCPTool(
  toolName: string,
  toolArgs: Record<string, any>,
  config: MCPServerConfig,
  tools: MCPTool[],
  optimizedDescriptions: string | undefined,
  aiClient: GoogleGenAI
): Promise<MCPToolExecutionResult> {
  try {
    // Find the tool definition
    const toolDef = tools.find(t => t.name === toolName);
    if (!toolDef) {
      return {
        success: false,
        result: null,
        error: `Tool ${toolName} not found in MCP server configuration`,
        summary: `Failed to execute ${toolName}: Tool not found`,
      };
    }

    // Prepare headers for MCP server request
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...config.headers,
    };

    if (config.apiKey) {
      headers['Authorization'] = `Bearer ${config.apiKey}`;
    }

    // Execute the MCP server request
    const response = await fetch(config.url, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        tool: toolName,
        parameters: toolArgs,
      }),
    });

    if (!response.ok) {
      throw new Error(`MCP server responded with status ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();

    // Use Gemini Pro to summarize the result for the main agent
    const summaryPrompt = `You are a sub-agent for Harvey, the main AI assistant. You've just executed a tool via an MCP server and received the following result:

Tool: ${toolName}
Description: ${toolDef.description}
Arguments: ${JSON.stringify(toolArgs, null, 2)}
Result: ${JSON.stringify(result, null, 2)}

${optimizedDescriptions ? `Optimized Context: ${optimizedDescriptions}` : ''}

Please provide a clear, concise summary of this result that the main assistant can relay to the user. Focus on:
1. What was accomplished
2. Key information from the result
3. Any important details the user should know

Keep the summary conversational and user-friendly.`;

    const summaryResult = await aiClient.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: summaryPrompt,
    });

    const summary = summaryResult.text ?? '';

    return {
      success: true,
      result,
      summary,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`MCP Tool execution error for ${toolName}:`, error);

    return {
      success: false,
      result: null,
      error: errorMessage,
      summary: `Failed to execute ${toolName}: ${errorMessage}`,
    };
  }
}

/**
 * Converts MCP tools to Gemini function declarations
 */
export function convertMCPToolsToFunctionDeclarations(tools: MCPTool[]) {
  return tools.map(tool => {
    const parameters = tool.parameters || {};

    // Ensure each parameter has a type field
    const properties: Record<string, any> = {};
    for (const [key, value] of Object.entries(parameters)) {
      if (typeof value === 'object' && value !== null) {
        // If it's already an object with a type, use it as-is
        properties[key] = value.type ? value : { type: Type.STRING, ...value };
      } else {
        // If it's a simple value, wrap it with a type
        properties[key] = { type: Type.STRING, description: String(value) };
      }
    }

    return {
      name: tool.name,
      description: tool.description,
      parameters: {
        type: Type.OBJECT,
        properties,
        required: Object.keys(parameters),
      },
    };
  });
}
