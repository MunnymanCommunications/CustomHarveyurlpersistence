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

export interface CreateReminderParams {
  user_id: string;
  assistant_id?: string;
  title: string;
  description?: string;
  due_date: string;
  reminder_time?: string;
}

export interface UpdateReminderParams {
  reminder_id: string;
  user_id: string;
  title?: string;
  description?: string;
  due_date?: string;
  reminder_time?: string;
  status?: ReminderStatus;
}

export interface ListRemindersParams {
  user_id: string;
  assistant_id?: string;
  status?: ReminderStatus;
  limit?: number;
}

export interface DeleteReminderParams {
  reminder_id: string;
  user_id: string;
}

export interface CompleteReminderParams {
  reminder_id: string;
  user_id: string;
}
