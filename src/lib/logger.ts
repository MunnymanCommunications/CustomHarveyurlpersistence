import { getSupabase } from './supabaseClient';
import type { UserSession } from '../types';

export type LogSeverity = 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';

export const logEvent = async (
  eventType: string,
  details: {
    assistantId?: string;
    metadata?: Record<string, any>;
    severity?: LogSeverity;
  } = {}
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
      severity: details.severity || 'INFO',
    });

    if (error) {
      console.error('Error logging event:', error.message);
    }
  } catch (e) {
    console.error('Failed to log event:', e);
  }
};

// Session tracking functions
let activeSessionId: string | null = null;

export const startSession = async (
  assistantId: string,
  sessionType: 'voice' | 'chat'
): Promise<string | null> => {
  try {
    const supabase = getSupabase();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return null;

    const { data: session, error } = await supabase
      .from('user_sessions')
      .insert({
        user_id: user.id,
        assistant_id: assistantId,
        session_type: sessionType,
        started_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('Error starting session:', error.message);
      return null;
    }

    activeSessionId = session.id;

    // Also log the event
    await logEvent('SESSION_START', {
      assistantId,
      metadata: { sessionId: session.id, sessionType },
      severity: 'INFO'
    });

    return session.id;
  } catch (e) {
    console.error('Failed to start session:', e);
    return null;
  }
};

export const endSession = async (sessionId?: string) => {
  try {
    const supabase = getSupabase();
    const idToEnd = sessionId || activeSessionId;

    if (!idToEnd) return;

    // Get the session to calculate duration
    const { data: session, error: fetchError } = await supabase
      .from('user_sessions')
      .select('*')
      .eq('id', idToEnd)
      .single();

    if (fetchError || !session) {
      console.error('Error fetching session:', fetchError);
      return;
    }

    const endTime = new Date();
    const startTime = new Date(session.started_at);
    const durationSeconds = Math.floor((endTime.getTime() - startTime.getTime()) / 1000);

    const { error } = await supabase
      .from('user_sessions')
      .update({
        ended_at: endTime.toISOString(),
        duration_seconds: durationSeconds,
      })
      .eq('id', idToEnd);

    if (error) {
      console.error('Error ending session:', error.message);
    } else {
      // Log the session end event
      await logEvent('SESSION_STOP', {
        assistantId: session.assistant_id,
        metadata: { sessionId: idToEnd, durationSeconds },
        severity: 'INFO'
      });
    }

    if (idToEnd === activeSessionId) {
      activeSessionId = null;
    }
  } catch (e) {
    console.error('Failed to end session:', e);
  }
};

export const incrementSessionErrors = async (sessionId?: string) => {
  try {
    const supabase = getSupabase();
    const idToUpdate = sessionId || activeSessionId;

    if (!idToUpdate) return;

    const { data: session, error: fetchError } = await supabase
      .from('user_sessions')
      .select('error_count')
      .eq('id', idToUpdate)
      .single();

    if (fetchError || !session) return;

    await supabase
      .from('user_sessions')
      .update({ error_count: (session.error_count || 0) + 1 })
      .eq('id', idToUpdate);
  } catch (e) {
    console.error('Failed to increment session errors:', e);
  }
};

export const getActiveSessionId = () => activeSessionId;