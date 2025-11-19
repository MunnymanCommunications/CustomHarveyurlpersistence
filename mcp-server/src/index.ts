#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import {
  CreateReminderParams,
  UpdateReminderParams,
  ListRemindersParams,
  DeleteReminderParams,
  CompleteReminderParams,
  Reminder,
} from './types.js';

// Load environment variables
dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing required environment variables: SUPABASE_URL and SUPABASE_ANON_KEY');
  process.exit(1);
}

// Initialize Supabase client
const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_KEY);

// Define tools
const TOOLS: Tool[] = [
  {
    name: 'create_reminder',
    description: 'Create a new reminder for a user. Requires user_id, title, and due_date. Optionally accepts assistant_id, description, and reminder_time.',
    inputSchema: {
      type: 'object',
      properties: {
        user_id: {
          type: 'string',
          description: 'The UUID of the user creating the reminder',
        },
        assistant_id: {
          type: 'string',
          description: 'Optional UUID of the assistant associated with this reminder',
        },
        title: {
          type: 'string',
          description: 'The title/summary of the reminder',
        },
        description: {
          type: 'string',
          description: 'Optional detailed description of the reminder',
        },
        due_date: {
          type: 'string',
          description: 'ISO 8601 datetime when the reminder is due (e.g., "2024-12-25T10:00:00Z")',
        },
        reminder_time: {
          type: 'string',
          description: 'Optional ISO 8601 datetime when to send a notification',
        },
      },
      required: ['user_id', 'title', 'due_date'],
    },
  },
  {
    name: 'list_reminders',
    description: 'List reminders for a user. Can filter by assistant_id, status, and limit the number of results.',
    inputSchema: {
      type: 'object',
      properties: {
        user_id: {
          type: 'string',
          description: 'The UUID of the user whose reminders to retrieve',
        },
        assistant_id: {
          type: 'string',
          description: 'Optional UUID to filter reminders by assistant',
        },
        status: {
          type: 'string',
          enum: ['pending', 'completed', 'cancelled'],
          description: 'Optional status filter (pending, completed, or cancelled)',
        },
        limit: {
          type: 'number',
          description: 'Optional maximum number of reminders to return (default: 50)',
        },
      },
      required: ['user_id'],
    },
  },
  {
    name: 'update_reminder',
    description: 'Update an existing reminder. Can update title, description, due_date, reminder_time, or status.',
    inputSchema: {
      type: 'object',
      properties: {
        reminder_id: {
          type: 'string',
          description: 'The UUID of the reminder to update',
        },
        user_id: {
          type: 'string',
          description: 'The UUID of the user (for authorization)',
        },
        title: {
          type: 'string',
          description: 'Optional new title for the reminder',
        },
        description: {
          type: 'string',
          description: 'Optional new description for the reminder',
        },
        due_date: {
          type: 'string',
          description: 'Optional new due date (ISO 8601 format)',
        },
        reminder_time: {
          type: 'string',
          description: 'Optional new reminder time (ISO 8601 format)',
        },
        status: {
          type: 'string',
          enum: ['pending', 'completed', 'cancelled'],
          description: 'Optional new status (pending, completed, or cancelled)',
        },
      },
      required: ['reminder_id', 'user_id'],
    },
  },
  {
    name: 'delete_reminder',
    description: 'Permanently delete a reminder.',
    inputSchema: {
      type: 'object',
      properties: {
        reminder_id: {
          type: 'string',
          description: 'The UUID of the reminder to delete',
        },
        user_id: {
          type: 'string',
          description: 'The UUID of the user (for authorization)',
        },
      },
      required: ['reminder_id', 'user_id'],
    },
  },
  {
    name: 'complete_reminder',
    description: 'Mark a reminder as completed. This is a convenience method that updates the status to "completed".',
    inputSchema: {
      type: 'object',
      properties: {
        reminder_id: {
          type: 'string',
          description: 'The UUID of the reminder to complete',
        },
        user_id: {
          type: 'string',
          description: 'The UUID of the user (for authorization)',
        },
      },
      required: ['reminder_id', 'user_id'],
    },
  },
  {
    name: 'get_reminder',
    description: 'Get details of a specific reminder by ID.',
    inputSchema: {
      type: 'object',
      properties: {
        reminder_id: {
          type: 'string',
          description: 'The UUID of the reminder to retrieve',
        },
        user_id: {
          type: 'string',
          description: 'The UUID of the user (for authorization)',
        },
      },
      required: ['reminder_id', 'user_id'],
    },
  },
];

// Tool implementations
async function createReminder(params: CreateReminderParams): Promise<Reminder> {
  const { data, error } = await supabase
    .from('reminders')
    .insert({
      user_id: params.user_id,
      assistant_id: params.assistant_id || null,
      title: params.title,
      description: params.description || null,
      due_date: params.due_date,
      reminder_time: params.reminder_time || null,
      status: 'pending',
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create reminder: ${error.message}`);
  }

  return data as Reminder;
}

async function listReminders(params: ListRemindersParams): Promise<Reminder[]> {
  let query = supabase
    .from('reminders')
    .select('*')
    .eq('user_id', params.user_id)
    .order('due_date', { ascending: true });

  if (params.assistant_id) {
    query = query.eq('assistant_id', params.assistant_id);
  }

  if (params.status) {
    query = query.eq('status', params.status);
  }

  if (params.limit) {
    query = query.limit(params.limit);
  } else {
    query = query.limit(50);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to list reminders: ${error.message}`);
  }

  return data as Reminder[];
}

async function updateReminder(params: UpdateReminderParams): Promise<Reminder> {
  const updateData: Partial<Reminder> = {};

  if (params.title !== undefined) updateData.title = params.title;
  if (params.description !== undefined) updateData.description = params.description;
  if (params.due_date !== undefined) updateData.due_date = params.due_date;
  if (params.reminder_time !== undefined) updateData.reminder_time = params.reminder_time;
  if (params.status !== undefined) updateData.status = params.status;

  const { data, error } = await supabase
    .from('reminders')
    .update(updateData)
    .eq('id', params.reminder_id)
    .eq('user_id', params.user_id)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update reminder: ${error.message}`);
  }

  if (!data) {
    throw new Error('Reminder not found or user not authorized');
  }

  return data as Reminder;
}

async function deleteReminder(params: DeleteReminderParams): Promise<{ success: boolean }> {
  const { error } = await supabase
    .from('reminders')
    .delete()
    .eq('id', params.reminder_id)
    .eq('user_id', params.user_id);

  if (error) {
    throw new Error(`Failed to delete reminder: ${error.message}`);
  }

  return { success: true };
}

async function completeReminder(params: CompleteReminderParams): Promise<Reminder> {
  return updateReminder({
    reminder_id: params.reminder_id,
    user_id: params.user_id,
    status: 'completed',
  });
}

async function getReminder(params: { reminder_id: string; user_id: string }): Promise<Reminder> {
  const { data, error } = await supabase
    .from('reminders')
    .select('*')
    .eq('id', params.reminder_id)
    .eq('user_id', params.user_id)
    .single();

  if (error) {
    throw new Error(`Failed to get reminder: ${error.message}`);
  }

  if (!data) {
    throw new Error('Reminder not found or user not authorized');
  }

  return data as Reminder;
}

// Create and configure MCP server
const server = new Server(
  {
    name: 'ai-architect-reminders',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Register tool handlers
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: TOOLS,
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'create_reminder':
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(await createReminder(args as CreateReminderParams), null, 2),
            },
          ],
        };

      case 'list_reminders':
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(await listReminders(args as ListRemindersParams), null, 2),
            },
          ],
        };

      case 'update_reminder':
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(await updateReminder(args as UpdateReminderParams), null, 2),
            },
          ],
        };

      case 'delete_reminder':
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(await deleteReminder(args as DeleteReminderParams), null, 2),
            },
          ],
        };

      case 'complete_reminder':
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(await completeReminder(args as CompleteReminderParams), null, 2),
            },
          ],
        };

      case 'get_reminder':
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(await getReminder(args as { reminder_id: string; user_id: string }), null, 2),
            },
          ],
        };

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ error: errorMessage }, null, 2),
        },
      ],
      isError: true,
    };
  }
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('AI Architect Reminders MCP Server running on stdio');
}

main().catch((error) => {
  console.error('Fatal error in main():', error);
  process.exit(1);
});
