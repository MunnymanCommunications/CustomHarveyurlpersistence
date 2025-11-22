# Reminder Feature Setup Instructions

## Overview
The reminder feature allows users to set reminders that the AI assistant will naturally bring up in conversations. Reminders can be date-specific or general, and the assistant intelligently reminds users at the right time.

## Database Setup

### 1. Run the Migration
You need to create the `reminders` table in your Supabase database. The SQL migration file is located at:

```
supabase/migrations/20250114_create_reminders_table.sql
```

**To apply the migration:**

1. Go to your Supabase Dashboard
2. Navigate to **SQL Editor**
3. Copy the contents of `supabase/migrations/20250114_create_reminders_table.sql`
4. Paste into the SQL Editor
5. Click **Run**

Alternatively, if you have Supabase CLI installed:

```bash
supabase db push
```

### 2. Verify the Migration
After running the migration, verify that the `reminders` table was created with the following columns:
- `id` (UUID, primary key)
- `user_id` (UUID, foreign key to auth.users)
- `assistant_id` (UUID, foreign key to assistants)
- `content` (TEXT)
- `due_date` (TIMESTAMP WITH TIME ZONE, nullable)
- `is_completed` (BOOLEAN, default FALSE)
- `created_at` (TIMESTAMP WITH TIME ZONE, default NOW())
- `completed_at` (TIMESTAMP WITH TIME ZONE, nullable)

Also verify that Row Level Security (RLS) policies are enabled.

## Features

### How Reminders Work

1. **Creating Reminders**
   - Users can create reminders through the Reminders page in the navigation
   - Reminders can optionally have a due date
   - Reminders without dates will appear in every conversation

2. **Smart Reminder Display**
   - Reminders without due dates appear in every conversation
   - Date-specific reminders only appear when they're within 3 days of the due date
   - This prevents cluttering the AI's context with far-future reminders

3. **Natural Integration**
   - The AI assistant receives active reminders in its system instruction
   - The assistant brings up reminders naturally during conversation
   - When users confirm completion, the assistant acknowledges warmly

4. **Completing Reminders**
   - Users can mark reminders as complete from the Reminders page
   - Completed reminders are moved to a separate "Completed" tab
   - Completed reminders are no longer shown to the AI

5. **Managing Reminders**
   - View active and completed reminders
   - Delete reminders
   - See due dates with visual indicators (overdue, today, tomorrow, etc.)

## Text Chat Improvements

Along with the reminder feature, we've improved the text chat experience:

### Longer Responses
- Increased `maxOutputTokens` from default to 2048
- Removed "Keep responses concise" instruction
- AI can now provide more thoughtful, complete responses

### Better Formatting
- All markdown formatting is properly rendered
- Code blocks, links, bold, italic all work correctly
- Copy buttons on all messages

## Usage

1. Navigate to an assistant's conversation
2. Click on "Reminders" in the navigation menu
3. Add a new reminder (with or without a due date)
4. Start a conversation - the AI will naturally remind you when appropriate
5. Mark reminders as complete when done

## Example Use Cases

- "Remind me to call mom" (no date = appears every conversation)
- "Remind me to submit the report on Friday" (appears when Friday is within 3 days)
- "Remind me to take out the trash" (general reminder)
- "Remind me about the dentist appointment next Tuesday" (date-specific)

## Technical Details

### Files Changed/Added

**New Files:**
- `src/pages/RemindersPage.tsx` - Reminders UI page
- `supabase/migrations/20250114_create_reminders_table.sql` - Database migration
- `REMINDER_FEATURE_SETUP.md` - This file

**Modified Files:**
- `src/types.ts` - Added Reminder interface
- `src/layouts/AssistantLayout.tsx` - Added reminder fetching, handlers, and system instruction integration
- `src/components/Navigation.tsx` - Added Reminders navigation item
- `src/layouts/PublicAssistantLayout.tsx` - Increased maxOutputTokens for text chat

### System Instruction Integration

The assistant receives reminders in this format:

```
IMPORTANT - Active reminders to bring up naturally in conversation:
- Call mom (Due: Tue, Dec 12)
- Take out the trash
- Submit report (Due: Fri, Dec 15)

When appropriate in the conversation, naturally remind the user about these items.
Ask if they've completed them yet. If they confirm completion, acknowledge it warmly.
```

### Filtering Logic

```typescript
const threeDaysFromNow = new Date();
threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

return reminders.filter(reminder => {
    if (!reminder.due_date) return true; // No date = always show
    const dueDate = new Date(reminder.due_date);
    return dueDate <= threeDaysFromNow; // Show if due within 3 days
});
```

## Troubleshooting

### Reminders not showing in conversation
- Check that the reminder is not completed
- For date-specific reminders, ensure the due date is within 3 days
- Verify the migration was applied successfully

### Database errors
- Ensure RLS policies are enabled
- Check that the user is authenticated
- Verify the reminders table exists

### AI not mentioning reminders
- Check the system instruction in the browser console
- Verify reminders are being fetched (check Network tab)
- Ensure reminders are marked as not completed

## Future Enhancements

Potential improvements for the future:
- Recurring reminders (daily, weekly, monthly)
- Reminder notifications
- Snooze functionality
- Reminder categories/tags
- Export reminders
- Share reminders between assistants
