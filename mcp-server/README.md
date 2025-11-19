# AI Architect Reminders MCP Server

This is a Model Context Protocol (MCP) server that enables AI assistants to interact with the reminders functionality in the AI Architect application.

## Features

The server provides the following tools for AI assistants:

- **create_reminder** - Create a new reminder
- **list_reminders** - List reminders with optional filtering
- **get_reminder** - Get details of a specific reminder
- **update_reminder** - Update an existing reminder
- **delete_reminder** - Delete a reminder
- **complete_reminder** - Mark a reminder as completed

## Setup

### 1. Install Dependencies

```bash
cd mcp-server
npm install
```

### 2. Configure Environment Variables

Copy the example environment file and fill in your Supabase credentials:

```bash
cp .env.example .env
```

Edit `.env` and add your Supabase URL and anonymous key:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
```

### 3. Run Database Migration

Before using the server, you need to create the `reminders` table in your Supabase database. Run the migration SQL file located at `../supabase/migrations/001_create_reminders_table.sql` in your Supabase SQL editor.

### 4. Build the Server

```bash
npm run build
```

### 5. Start the Server

```bash
npm start
```

For development with auto-rebuild:

```bash
npm run dev
```

## Using with Claude Desktop

To use this MCP server with Claude Desktop, add it to your Claude Desktop configuration:

### macOS

Edit `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "ai-architect-reminders": {
      "command": "node",
      "args": ["/absolute/path/to/CustomHarveyurlpersistence/mcp-server/dist/index.js"],
      "env": {
        "SUPABASE_URL": "https://your-project.supabase.co",
        "SUPABASE_ANON_KEY": "your-anon-key-here"
      }
    }
  }
}
```

### Windows

Edit `%APPDATA%\Claude\claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "ai-architect-reminders": {
      "command": "node",
      "args": ["C:\\absolute\\path\\to\\CustomHarveyurlpersistence\\mcp-server\\dist\\index.js"],
      "env": {
        "SUPABASE_URL": "https://your-project.supabase.co",
        "SUPABASE_ANON_KEY": "your-anon-key-here"
      }
    }
  }
}
```

## Tool Usage Examples

### Create a Reminder

```
Create a reminder for me to call mom tomorrow at 3pm
```

The AI will call:
```json
{
  "name": "create_reminder",
  "arguments": {
    "user_id": "user-uuid",
    "title": "Call mom",
    "due_date": "2024-12-16T15:00:00Z",
    "description": "Call mom at 3pm"
  }
}
```

### List Reminders

```
Show me all my pending reminders
```

The AI will call:
```json
{
  "name": "list_reminders",
  "arguments": {
    "user_id": "user-uuid",
    "status": "pending"
  }
}
```

### Update a Reminder

```
Change the due date of reminder [id] to next Friday
```

The AI will call:
```json
{
  "name": "update_reminder",
  "arguments": {
    "reminder_id": "reminder-uuid",
    "user_id": "user-uuid",
    "due_date": "2024-12-20T00:00:00Z"
  }
}
```

### Complete a Reminder

```
Mark reminder [id] as completed
```

The AI will call:
```json
{
  "name": "complete_reminder",
  "arguments": {
    "reminder_id": "reminder-uuid",
    "user_id": "user-uuid"
  }
}
```

### Delete a Reminder

```
Delete reminder [id]
```

The AI will call:
```json
{
  "name": "delete_reminder",
  "arguments": {
    "reminder_id": "reminder-uuid",
    "user_id": "user-uuid"
  }
}
```

## Security Notes

- The server uses Row Level Security (RLS) policies in Supabase to ensure users can only access their own reminders
- Always use the anonymous key, not the service role key, unless you have a specific admin use case
- User authentication is handled through Supabase Auth
- All operations require a valid `user_id` for authorization

## Development

### Project Structure

```
mcp-server/
├── src/
│   ├── index.ts       # Main server implementation
│   └── types.ts       # TypeScript type definitions
├── dist/              # Compiled JavaScript (generated)
├── package.json       # Dependencies and scripts
├── tsconfig.json      # TypeScript configuration
├── .env.example       # Environment variables template
└── README.md          # This file
```

### Adding New Tools

To add a new tool:

1. Define the tool schema in the `TOOLS` array
2. Implement the function in the main file
3. Add a case in the `CallToolRequestSchema` handler
4. Update types in `types.ts` if needed
5. Rebuild with `npm run build`

## Troubleshooting

### "Missing required environment variables"

Make sure you've created a `.env` file with valid `SUPABASE_URL` and `SUPABASE_ANON_KEY` values.

### "Failed to create reminder: ... does not exist"

Run the database migration SQL file to create the `reminders` table.

### "Reminder not found or user not authorized"

Check that:
- The reminder ID is correct
- The user ID matches the reminder owner
- RLS policies are properly configured in Supabase

## License

This MCP server is part of the AI Architect project.
