import { getSupabase } from './supabaseClient';

export const logEvent = async (
  eventType: string,
  details: { assistantId?: string; metadata?: Record<string, any> } = {}
) => {
  try {
    const supabase = getSupabase();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return; // Don't log if no user

    const { error } = await supabase.from('app_logs').insert({
      user_id: user.id,
      assistant_id: details.assistantId,
      event_type: eventType,
      metadata: details.metadata,
    });

    if (error) {
      console.error('Error logging event:', error.message);
    }
  } catch (e) {
    console.error('Failed to log event:', e);
  }
};