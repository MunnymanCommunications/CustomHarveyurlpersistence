# MCP Server Integration Guide

## Overview

The MCP (Model Context Protocol) Server Integration allows you to extend Harvey's capabilities by connecting to external MCP servers. This feature enables Harvey to access custom tools and services through a standardized protocol.

## Features

- **Custom Tool Integration**: Connect Harvey to external tools via MCP server
- **Gemini Pro Sub-Agent**: Tool execution is handled by a dedicated Gemini Pro sub-agent
- **Harvey Optimization**: AI-powered tool description optimization for better agent understanding
- **Flexible Configuration**: Support for custom headers, API keys, and tool definitions
- **Real-time Communication**: Seamless integration with the main audio-to-audio model

## Architecture

```
Main Audio Model (Gemini 2.5 Flash)
    ↓
    Detects tool need
    ↓
Gemini Pro Sub-Agent
    ↓
    Executes MCP Tool
    ↓
    Summarizes result
    ↓
Main Assistant
    ↓
    Relays to user
```

## Setup Instructions

### 1. Database Migration

First, run the database migration to add MCP support to your assistants table:

```bash
# Run this SQL in your Supabase SQL Editor
cat supabase_migration_mcp.sql
```

Or manually execute:

```sql
ALTER TABLE assistants
ADD COLUMN IF NOT EXISTS mcp_server_settings JSONB DEFAULT NULL;
```

### 2. Configure MCP Server in Settings

1. Navigate to your assistant's settings page
2. Scroll to the **MCP Server Integration** section
3. Toggle **Enable** to activate MCP integration
4. Fill in the following fields:

#### Required Fields

- **MCP Server URL**: The endpoint URL of your MCP server
  - Example: `https://your-mcp-server.com/api/tools`

#### Optional Fields

- **API Key**: Authentication key if your MCP server requires it
- **Custom Headers**: Additional HTTP headers in JSON format
  ```json
  {
    "X-Custom-Header": "value",
    "X-Another-Header": "value"
  }
  ```

- **Tool Descriptions**: Define the tools available from your MCP server in JSON format
  ```json
  [
    {
      "name": "get_weather",
      "description": "Get current weather for a location",
      "parameters": {
        "location": {
          "type": "string",
          "description": "City name or coordinates"
        }
      }
    },
    {
      "name": "send_email",
      "description": "Send an email to a recipient",
      "parameters": {
        "to": {
          "type": "string",
          "description": "Email address of recipient"
        },
        "subject": {
          "type": "string",
          "description": "Email subject line"
        },
        "body": {
          "type": "string",
          "description": "Email body content"
        }
      }
    }
  ]
  ```

### 3. Optimize Tool Descriptions (Recommended)

After defining your tools, click the **Have Harvey Optimize** button. This uses AI to rewrite your tool descriptions to be more clear and easier for agents to understand and execute.

Benefits of optimization:
- Clearer parameter descriptions
- Better context about when to use each tool
- Examples of expected inputs/outputs
- Disambiguation of terminology

### 4. Save Settings

Click **Save** to apply your MCP server configuration. The settings will be stored and used whenever Harvey needs to execute a tool.

## MCP Server Requirements

Your MCP server should implement the following endpoint:

### POST /api/tools (or your configured URL)

**Request Format:**
```json
{
  "tool": "tool_name",
  "parameters": {
    "param1": "value1",
    "param2": "value2"
  }
}
```

**Response Format:**
```json
{
  "success": true,
  "data": {
    // Your tool's result data
  },
  "message": "Optional message"
}
```

**Authentication:**
- If you provide an API key, it will be sent as: `Authorization: Bearer YOUR_API_KEY`
- Custom headers are included as-is

## How It Works

1. **User makes a request** that requires a tool
2. **Main audio model** (Gemini 2.5 Flash) detects the need for a specific tool
3. **Gemini Pro sub-agent** is invoked with:
   - Tool name and parameters
   - MCP server configuration
   - Optimized tool descriptions (if available)
4. **Sub-agent executes** the tool by calling your MCP server
5. **Sub-agent summarizes** the result in a user-friendly format
6. **Main assistant** receives the summary and relays it to the user via audio

## Example Use Cases

### Weather Service Integration
```json
{
  "name": "get_weather",
  "description": "Retrieves current weather conditions for any city",
  "parameters": {
    "city": {
      "type": "string",
      "description": "Name of the city"
    }
  }
}
```

### Database Query Tool
```json
{
  "name": "query_database",
  "description": "Executes a safe read-only database query",
  "parameters": {
    "query": {
      "type": "string",
      "description": "SQL SELECT query to execute"
    }
  }
}
```

### API Integration
```json
{
  "name": "fetch_user_data",
  "description": "Retrieves user profile information from external API",
  "parameters": {
    "user_id": {
      "type": "string",
      "description": "Unique identifier for the user"
    }
  }
}
```

## Troubleshooting

### Tools Not Being Called

- Verify your tool descriptions are clear and specific
- Use the "Have Harvey Optimize" button to improve descriptions
- Check that your MCP server URL is correct and accessible
- Ensure your API key (if required) is valid

### MCP Server Errors

- Check your MCP server logs for error details
- Verify the request format matches the expected structure
- Ensure custom headers are properly formatted JSON
- Test your MCP server endpoint independently

### Sub-Agent Timeout

- MCP tool execution has a timeout to prevent hanging
- Optimize your MCP server for faster responses
- Consider breaking complex tools into smaller operations

## Security Considerations

- **API Keys**: Stored securely in the database, transmitted via HTTPS
- **Custom Headers**: Ensure you don't expose sensitive data in headers
- **Tool Validation**: The system validates tool definitions before use
- **HTTPS Required**: MCP server should use HTTPS for secure communication
- **Access Control**: Only authenticated users can configure MCP settings for their assistants

## Development

### File Structure

```
src/
├── agents/
│   └── mcpToolAgent.ts          # Gemini Pro sub-agent implementation
├── components/
│   └── MCPServerSettings.tsx    # Settings UI component
├── contexts/
│   └── GeminiLiveContext.tsx    # Integration with main agent
└── types.ts                     # TypeScript type definitions
```

### Key Functions

- `executeMCPTool()`: Executes tool via MCP server using Gemini Pro
- `optimizeToolDescriptions()`: Uses Gemini Pro to optimize tool descriptions
- `convertMCPToolsToFunctionDeclarations()`: Converts MCP tools to Gemini format

## Support

For issues or questions:
1. Check this guide thoroughly
2. Review your MCP server logs
3. Open an issue in the repository with:
   - Your MCP server configuration (without sensitive data)
   - Tool definitions
   - Error messages or unexpected behavior

## Future Enhancements

Potential improvements for future versions:
- Multiple MCP server support
- Tool usage analytics
- Caching of tool results
- Tool marketplace/discovery
- Visual tool flow builder
- Automatic tool testing
