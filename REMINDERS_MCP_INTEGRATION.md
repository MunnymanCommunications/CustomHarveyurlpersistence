# Reminders MCP Integration Documentation

This document explains the complete MCP (Model Context Protocol) server integration for the AI Architect application's reminders functionality.

## Overview

This integration enables AI assistants (like Claude) to create, read, update, and delete reminders for users through a standardized MCP server interface. The integration consists of:

1. **Database Schema** - Supabase table for storing reminders
2. **MCP Server** - Node.js server exposing reminder tools to AI assistants
3. **UI Components** - React components for managing reminders in the web app
4. **Type Definitions** - Shared TypeScript types across frontend and MCP server

## Architecture

```
┌─────────────────┐
│  AI Assistant   │  (Claude, etc.)
│  (MCP Client)   │
└────────┬────────┘
         │
         │ MCP Protocol
         │
┌────────▼────────┐
│   MCP Server    │
│  (Node.js)      │
└────────┬────────┘
         │
         │ Supabase Client
         │
┌────────▼────────┐     ┌──────────────┐
│    Supabase     │◄────┤  React App   │
│   (PostgreSQL)  │     │   (Frontend) │
└─────────────────┘     └──────────────┘
```

## Components

### 1. Database Schema

**Location**: `supabase/migrations/001_create_reminders_table.sql`

**Table Structure**:
```sql
CREATE TABLE reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  assistant_id UUID REFERENCES assistants(id),
  title TEXT NOT NULL,
  description TEXT,
  due_date TIMESTAMPTZ NOT NULL,
  reminder_time TIMESTAMPTZ,
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

**Features**:
- Row Level Security (RLS) enabled
- Automatic `updated_at` timestamp trigger
- Cascading delete when user is deleted
- Indexes on frequently queried columns
- Status constraint (`pending`, `completed`, `cancelled`)

**Setup**:
1. Navigate to your Supabase project dashboard
2. Go to SQL Editor
3. Run the migration file content
4. Verify the table was created in Table Editor

### 2. MCP Server

**Location**: `mcp-server/`

**Key Files**:
- `src/index.ts` - Main MCP server implementation
- `src/types.ts` - TypeScript type definitions
- `package.json` - Dependencies and scripts
- `tsconfig.json` - TypeScript configuration
- `.env.example` - Environment variables template

**Available Tools**:

| Tool Name | Description | Required Params | Optional Params |
|-----------|-------------|-----------------|-----------------|
| `create_reminder` | Create a new reminder | user_id, title, due_date | assistant_id, description, reminder_time |
| `list_reminders` | List user's reminders | user_id | assistant_id, status, limit |
| `get_reminder` | Get specific reminder | reminder_id, user_id | - |
| `update_reminder` | Update a reminder | reminder_id, user_id | title, description, due_date, reminder_time, status |
| `delete_reminder` | Delete a reminder | reminder_id, user_id | - |
| `complete_reminder` | Mark reminder as completed | reminder_id, user_id | - |

**Installation**:
```bash
cd mcp-server
npm install
```

**Build**:
```bash
npm run build
```

**Run**:
```bash
npm start
```

**Configuration**:
Create `.env` file:
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
```

### 3. Claude Desktop Integration

**macOS Configuration**:
Edit `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "ai-architect-reminders": {
      "command": "node",
      "args": ["/absolute/path/to/CustomHarveyurlpersistence/mcp-server/dist/index.js"],
      "env": {
        "SUPABASE_URL": "https://your-project.supabase.co",
        "SUPABASE_ANON_KEY": "your-anon-key"
      }
    }
  }
}
```

**Windows Configuration**:
Edit `%APPDATA%\Claude\claude_desktop_config.json` with similar configuration.

After configuration, restart Claude Desktop to load the MCP server.

### 4. Frontend Integration

**New Files**:
- `src/pages/RemindersPage.tsx` - Main reminders UI component
- `src/types.ts` - Added `Reminder` and `ReminderStatus` types

**Modified Files**:
- `src/layouts/AssistantLayout.tsx` - Added reminders state and CRUD handlers
- `src/components/Navigation.tsx` - Added reminders navigation item

**Features**:
- Create reminders with title, description, due date, and reminder time
- Filter reminders by status (all, pending, completed, cancelled)
- Edit existing reminders inline
- Mark reminders as completed with one click
- Delete reminders with confirmation
- Visual indicators for overdue reminders
- Responsive design matching existing UI patterns

**Type Definitions** (`src/types.ts`):
```typescript
export type ReminderStatus = 'pending' | 'completed' | 'cancelled';

export interface Reminder {
  id: string;
  user_id: string;
  assistant_id?: string | null;
  title: string;
  description?: string | null;
  due_date: string;
  reminder_time?: string | null;
  status: ReminderStatus;
  created_at: string;
  updated_at: string;
}
```

## Usage Examples

### Using the MCP Server with Claude

Once configured in Claude Desktop, you can interact with reminders naturally:

**Create a Reminder**:
```
User: "Create a reminder for me to call the dentist tomorrow at 2pm"

Claude will:
1. Parse the natural language request
2. Call create_reminder tool with:
   - title: "Call the dentist"
   - due_date: "2024-12-16T14:00:00Z"
   - user_id: [your user ID]
3. Return confirmation with reminder details
```

**List Reminders**:
```
User: "Show me all my pending reminders"

Claude will:
1. Call list_reminders tool with:
   - user_id: [your user ID]
   - status: "pending"
2. Display formatted list of reminders
```

**Update a Reminder**:
```
User: "Change the dentist reminder to 3pm"

Claude will:
1. Search for matching reminder
2. Call update_reminder tool with:
   - reminder_id: [found ID]
   - due_date: "2024-12-16T15:00:00Z"
3. Confirm the update
```

**Complete a Reminder**:
```
User: "Mark the dentist reminder as done"

Claude will:
1. Find the reminder
2. Call complete_reminder tool
3. Confirm completion
```

### Using the Web UI

1. Navigate to your assistant page
2. Click "Reminders" in the sidebar
3. Click "New" to create a reminder
4. Fill in the form:
   - Title (required)
   - Description (optional)
   - Due Date (required)
   - Reminder Time (optional)
5. Click "Add Reminder"

**Managing Reminders**:
- Click "Edit" to modify a reminder
- Click the checkmark icon to mark as completed
- Click the trash icon to delete
- Use filter buttons to view by status

## Security Considerations

### Row Level Security (RLS)

The reminders table has RLS policies that ensure:
- Users can only view their own reminders
- Users can only create reminders for themselves
- Users can only update their own reminders
- Users can only delete their own reminders

### MCP Server Security

- Uses Supabase anonymous key (not service role key)
- All operations go through RLS policies
- User ID is required for all operations
- No direct database access - all through Supabase SDK

### Best Practices

1. **Never commit `.env` files** - Use `.env.example` as template
2. **Use anonymous key** - Not service role key unless admin operations needed
3. **Validate user input** - Both in frontend and MCP server
4. **Rate limiting** - Consider implementing for production

## Troubleshooting

### MCP Server Issues

**Error: "Missing required environment variables"**
- Ensure `.env` file exists in `mcp-server/` directory
- Check that `SUPABASE_URL` and `SUPABASE_ANON_KEY` are set

**Error: "Failed to create reminder: ... does not exist"**
- Run the database migration SQL
- Verify the `reminders` table exists in Supabase

**Error: "Reminder not found or user not authorized"**
- Check user_id is correct
- Verify RLS policies are enabled
- Ensure user is authenticated

### Frontend Issues

**Reminders page is blank**
- Check browser console for errors
- Verify you're logged in
- Check network tab for failed Supabase requests

**Can't create reminders**
- Verify the `reminders` table exists
- Check RLS policies are set up correctly
- Ensure user is authenticated

### Claude Desktop Integration Issues

**MCP server not loading**
- Check the config file path is correct
- Verify absolute paths (not relative)
- Restart Claude Desktop after config changes
- Check Claude Desktop logs for errors

**Tools not appearing**
- Ensure MCP server is built (`npm run build`)
- Verify the `dist/index.js` file exists
- Check environment variables in config

## Development

### Adding New Features

**To add a new MCP tool**:
1. Add tool definition to `TOOLS` array in `mcp-server/src/index.ts`
2. Implement the handler function
3. Add case in `CallToolRequestSchema` handler
4. Update types in `mcp-server/src/types.ts` if needed
5. Rebuild: `npm run build`

**To modify the UI**:
1. Edit `src/pages/RemindersPage.tsx` for UI changes
2. Update `src/layouts/AssistantLayout.tsx` for business logic
3. Modify types in `src/types.ts` if schema changes

### Testing

**MCP Server Testing**:
```bash
# Run in development mode with auto-rebuild
cd mcp-server
npm run dev

# Test with Claude Desktop
# Add the server to config and interact through Claude
```

**Frontend Testing**:
```bash
# Run development server
npm run dev

# Navigate to http://localhost:5173
# Log in and test reminders functionality
```

## Future Enhancements

Potential improvements for this integration:

1. **Notifications** - Add email/push notifications for reminder times
2. **Recurring Reminders** - Support for daily/weekly/monthly reminders
3. **Categories/Tags** - Organize reminders by category
4. **Priorities** - Add priority levels (high, medium, low)
5. **Attachments** - Allow file attachments to reminders
6. **Sharing** - Share reminders with other users
7. **Calendar Integration** - Sync with Google Calendar, iCal, etc.
8. **Natural Language** - Enhanced NLP for creating reminders from text
9. **Snooze** - Ability to snooze/postpone reminders
10. **Templates** - Create reminder templates for common tasks

## Support

For issues or questions:
- Check the troubleshooting section above
- Review the MCP server README in `mcp-server/README.md`
- Consult Supabase documentation for database issues
- Check MCP protocol documentation for integration questions

## License

This integration is part of the AI Architect project.
