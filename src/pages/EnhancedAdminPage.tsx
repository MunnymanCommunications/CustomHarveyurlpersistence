import { useState, useEffect } from 'react';
import { getSupabase } from '../lib/supabaseClient';
import type { AppLog, UserSession, UserWithProfile } from '../types';
import { Icon } from '../components/Icon';

interface LogWithUser extends AppLog {
  user_email?: string;
  user_name?: string;
}

interface SessionWithUser extends UserSession {
  user_email?: string;
  user_name?: string;
  assistant_name?: string;
}

interface UsageStats {
  totalSessions: number;
  totalUsers: number;
  avgSessionDuration: number;
  totalErrors: number;
  criticalErrors: number;
  activeToday: number;
  activeThisWeek: number;
}

export default function EnhancedAdminPage() {
    const [logs, setLogs] = useState<LogWithUser[]>([]);
    const [sessions, setSessions] = useState<SessionWithUser[]>([]);
    const [stats, setStats] = useState<UsageStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'overview' | 'logs' | 'sessions'>('overview');
    const [severityFilter, setSeverityFilter] = useState<string>('all');

    useEffect(() => {
        fetchAdminData();
    }, []);

    const fetchAdminData = async () => {
        try {
            const supabase = getSupabase();

            // Fetch logs with user info
            const { data: logsData, error: logsError } = await supabase
                .from('app_logs')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(200);

            if (logsError) throw logsError;

            // Fetch user profiles to get emails
            const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers();

            if (usersError) console.warn('Could not fetch user emails:', usersError);

            // Fetch profiles for names
            const { data: profiles, error: profilesError } = await supabase
                .from('profiles')
                .select('id, full_name, username');

            if (profilesError) console.warn('Could not fetch profiles:', profilesError);

            // Create lookup maps
            const userEmailMap = new Map(users?.map(u => [u.id, u.email]) || []);
            const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

            // Enrich logs with user info
            const enrichedLogs = logsData.map(log => ({
                ...log,
                user_email: userEmailMap.get(log.user_id),
                user_name: profileMap.get(log.user_id)?.full_name || profileMap.get(log.user_id)?.username,
            }));

            setLogs(enrichedLogs as LogWithUser[]);

            // Fetch sessions with user and assistant info
            const { data: sessionsData, error: sessionsError } = await supabase
                .from('user_sessions')
                .select('*, assistants(name)')
                .order('started_at', { ascending: false })
                .limit(100);

            if (sessionsError) throw sessionsError;

            const enrichedSessions = sessionsData.map((session: any) => ({
                ...session,
                user_email: userEmailMap.get(session.user_id),
                user_name: profileMap.get(session.user_id)?.full_name || profileMap.get(session.user_id)?.username,
                assistant_name: session.assistants?.name,
            }));

            setSessions(enrichedSessions as SessionWithUser[]);

            // Calculate usage stats
            const now = new Date();
            const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
            const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

            const totalSessions = sessionsData.length;
            const uniqueUsers = new Set(sessionsData.map((s: any) => s.user_id)).size;
            const completedSessions = sessionsData.filter((s: any) => s.duration_seconds !== null);
            const avgDuration = completedSessions.length > 0
                ? completedSessions.reduce((sum: number, s: any) => sum + (s.duration_seconds || 0), 0) / completedSessions.length
                : 0;

            const errorLogs = logsData.filter(log => log.severity === 'ERROR' || log.severity === 'CRITICAL');
            const criticalLogs = logsData.filter(log => log.severity === 'CRITICAL');

            const activeToday = new Set(
                logsData
                    .filter(log => new Date(log.created_at) > oneDayAgo)
                    .map(log => log.user_id)
            ).size;

            const activeThisWeek = new Set(
                logsData
                    .filter(log => new Date(log.created_at) > oneWeekAgo)
                    .map(log => log.user_id)
            ).size;

            setStats({
                totalSessions,
                totalUsers: uniqueUsers,
                avgSessionDuration: Math.round(avgDuration),
                totalErrors: errorLogs.length,
                criticalErrors: criticalLogs.length,
                activeToday,
                activeThisWeek,
            });

            setLoading(false);
        } catch (err: any) {
            setError(err.message);
            console.error('Error fetching admin data:', err);
            setLoading(false);
        }
    };

    const formatDuration = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}m ${secs}s`;
    };

    const filteredLogs = severityFilter === 'all'
        ? logs
        : logs.filter(log => log.severity === severityFilter);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <Icon name="loader" className="w-12 h-12 animate-spin text-brand-secondary-glow"/>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center h-full text-danger">
                <Icon name="error" className="w-8 h-8 mr-2"/>
                {error}
            </div>
        );
    }

    return (
        <div className="glassmorphic rounded-2xl shadow-2xl p-4 sm:p-8 max-w-7xl mx-auto w-full h-full flex flex-col">
            <header className="flex-shrink-0 flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-text-primary dark:text-dark-text-primary flex items-center">
                    <Icon name="shield" className="w-8 h-8 mr-3" />
                    Admin Panel
                </h1>
                <div className="flex items-center gap-4">
                    <button
                        onClick={fetchAdminData}
                        className="text-sm text-brand-secondary-glow hover:underline flex items-center gap-1"
                    >
                        <Icon name="refresh" className="w-4 h-4" /> Refresh
                    </button>
                    <a href="#/" className="text-sm text-brand-secondary-glow hover:underline">
                        Back to Dashboard
                    </a>
                </div>
            </header>

            {/* Tabs */}
            <div className="flex-shrink-0 flex gap-4 mb-6 border-b border-border-color dark:border-dark-border-color">
                <button
                    onClick={() => setActiveTab('overview')}
                    className={`pb-2 px-4 ${activeTab === 'overview' ? 'border-b-2 border-brand-secondary-glow text-brand-secondary-glow' : 'text-text-secondary dark:text-dark-text-secondary'}`}
                >
                    Overview
                </button>
                <button
                    onClick={() => setActiveTab('logs')}
                    className={`pb-2 px-4 ${activeTab === 'logs' ? 'border-b-2 border-brand-secondary-glow text-brand-secondary-glow' : 'text-text-secondary dark:text-dark-text-secondary'}`}
                >
                    Logs {stats && stats.totalErrors > 0 && (
                        <span className="ml-2 bg-danger text-white text-xs px-2 py-0.5 rounded-full">
                            {stats.totalErrors}
                        </span>
                    )}
                </button>
                <button
                    onClick={() => setActiveTab('sessions')}
                    className={`pb-2 px-4 ${activeTab === 'sessions' ? 'border-b-2 border-brand-secondary-glow text-brand-secondary-glow' : 'text-text-secondary dark:text-dark-text-secondary'}`}
                >
                    Sessions
                </button>
            </div>

            <div className="flex-grow overflow-auto">
                {activeTab === 'overview' && stats && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {/* Stats Cards */}
                        <div className="bg-white/60 dark:bg-dark-base-light/60 p-6 rounded-lg border border-border-color dark:border-dark-border-color">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-text-secondary dark:text-dark-text-secondary text-sm">Total Sessions</p>
                                    <p className="text-3xl font-bold text-text-primary dark:text-dark-text-primary mt-1">{stats.totalSessions}</p>
                                </div>
                                <Icon name="activity" className="w-12 h-12 text-brand-secondary-glow opacity-50" />
                            </div>
                        </div>

                        <div className="bg-white/60 dark:bg-dark-base-light/60 p-6 rounded-lg border border-border-color dark:border-dark-border-color">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-text-secondary dark:text-dark-text-secondary text-sm">Total Users</p>
                                    <p className="text-3xl font-bold text-text-primary dark:text-dark-text-primary mt-1">{stats.totalUsers}</p>
                                </div>
                                <Icon name="users" className="w-12 h-12 text-brand-secondary-glow opacity-50" />
                            </div>
                        </div>

                        <div className="bg-white/60 dark:bg-dark-base-light/60 p-6 rounded-lg border border-border-color dark:border-dark-border-color">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-text-secondary dark:text-dark-text-secondary text-sm">Avg Session</p>
                                    <p className="text-3xl font-bold text-text-primary dark:text-dark-text-primary mt-1">{formatDuration(stats.avgSessionDuration)}</p>
                                </div>
                                <Icon name="clock" className="w-12 h-12 text-brand-secondary-glow opacity-50" />
                            </div>
                        </div>

                        <div className="bg-white/60 dark:bg-dark-base-light/60 p-6 rounded-lg border border-border-color dark:border-dark-border-color">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-text-secondary dark:text-dark-text-secondary text-sm">Active Today</p>
                                    <p className="text-3xl font-bold text-text-primary dark:text-dark-text-primary mt-1">{stats.activeToday}</p>
                                </div>
                                <Icon name="trending-up" className="w-12 h-12 text-green-500 opacity-50" />
                            </div>
                        </div>

                        <div className="bg-white/60 dark:bg-dark-base-light/60 p-6 rounded-lg border border-border-color dark:border-dark-border-color">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-text-secondary dark:text-dark-text-secondary text-sm">Active This Week</p>
                                    <p className="text-3xl font-bold text-text-primary dark:text-dark-text-primary mt-1">{stats.activeThisWeek}</p>
                                </div>
                                <Icon name="calendar" className="w-12 h-12 text-blue-500 opacity-50" />
                            </div>
                        </div>

                        <div className="bg-white/60 dark:bg-dark-base-light/60 p-6 rounded-lg border border-border-color dark:border-dark-border-color">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-text-secondary dark:text-dark-text-secondary text-sm">Errors / Critical</p>
                                    <p className="text-3xl font-bold text-text-primary dark:text-dark-text-primary mt-1">
                                        {stats.totalErrors} <span className="text-danger text-xl">/ {stats.criticalErrors}</span>
                                    </p>
                                </div>
                                <Icon name="alert-triangle" className="w-12 h-12 text-danger opacity-50" />
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'logs' && (
                    <div>
                        {/* Severity Filter */}
                        <div className="mb-4 flex gap-2">
                            <button
                                onClick={() => setSeverityFilter('all')}
                                className={`px-3 py-1 rounded-full text-sm ${severityFilter === 'all' ? 'bg-brand-secondary-glow text-on-brand' : 'bg-base-light dark:bg-dark-base-medium'}`}
                            >
                                All
                            </button>
                            <button
                                onClick={() => setSeverityFilter('INFO')}
                                className={`px-3 py-1 rounded-full text-sm ${severityFilter === 'INFO' ? 'bg-blue-500 text-white' : 'bg-base-light dark:bg-dark-base-medium'}`}
                            >
                                Info
                            </button>
                            <button
                                onClick={() => setSeverityFilter('WARNING')}
                                className={`px-3 py-1 rounded-full text-sm ${severityFilter === 'WARNING' ? 'bg-yellow-500 text-white' : 'bg-base-light dark:bg-dark-base-medium'}`}
                            >
                                Warning
                            </button>
                            <button
                                onClick={() => setSeverityFilter('ERROR')}
                                className={`px-3 py-1 rounded-full text-sm ${severityFilter === 'ERROR' ? 'bg-orange-500 text-white' : 'bg-base-light dark:bg-dark-base-medium'}`}
                            >
                                Error
                            </button>
                            <button
                                onClick={() => setSeverityFilter('CRITICAL')}
                                className={`px-3 py-1 rounded-full text-sm ${severityFilter === 'CRITICAL' ? 'bg-danger text-white' : 'bg-base-light dark:bg-dark-base-medium'}`}
                            >
                                Critical
                            </button>
                        </div>

                        <table className="w-full text-left text-sm">
                            <thead className="sticky top-0 bg-base-medium/80 dark:bg-dark-base-medium/80 backdrop-blur-sm">
                                <tr>
                                    <th className="p-2">Timestamp</th>
                                    <th className="p-2">Severity</th>
                                    <th className="p-2">Event</th>
                                    <th className="p-2">User</th>
                                    <th className="p-2">Assistant ID</th>
                                    <th className="p-2">Metadata</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredLogs.map(log => (
                                    <tr key={log.id} className="border-b border-border-color dark:border-dark-border-color">
                                        <td className="p-2 whitespace-nowrap text-xs">{new Date(log.created_at).toLocaleString()}</td>
                                        <td className="p-2">
                                            <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                                                log.severity === 'CRITICAL' ? 'bg-danger text-white' :
                                                log.severity === 'ERROR' ? 'bg-orange-500 text-white' :
                                                log.severity === 'WARNING' ? 'bg-yellow-500 text-white' :
                                                'bg-blue-500 text-white'
                                            }`}>
                                                {log.severity || 'INFO'}
                                            </span>
                                        </td>
                                        <td className="p-2 font-mono text-xs">{log.event_type}</td>
                                        <td className="p-2 text-xs">
                                            {log.user_name && <div className="font-semibold">{log.user_name}</div>}
                                            {log.user_email && <div className="text-text-secondary dark:text-dark-text-secondary">{log.user_email}</div>}
                                            {!log.user_name && !log.user_email && <span className="font-mono">{log.user_id.substring(0, 8)}...</span>}
                                        </td>
                                        <td className="p-2 font-mono text-xs">{log.assistant_id ? `${log.assistant_id.substring(0, 8)}...` : 'N/A'}</td>
                                        <td className="p-2">
                                            {log.metadata && Object.keys(log.metadata).length > 0 && (
                                                <details>
                                                    <summary className="cursor-pointer text-brand-secondary-glow hover:underline">View</summary>
                                                    <pre className="text-xs bg-base-light dark:bg-dark-base-light p-2 rounded mt-1 max-w-xs overflow-auto">
                                                        {JSON.stringify(log.metadata, null, 2)}
                                                    </pre>
                                                </details>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {filteredLogs.length === 0 && <p className="text-center py-8 text-text-secondary">No logs found.</p>}
                    </div>
                )}

                {activeTab === 'sessions' && (
                    <table className="w-full text-left text-sm">
                        <thead className="sticky top-0 bg-base-medium/80 dark:bg-dark-base-medium/80 backdrop-blur-sm">
                            <tr>
                                <th className="p-2">Started</th>
                                <th className="p-2">Duration</th>
                                <th className="p-2">Type</th>
                                <th className="p-2">User</th>
                                <th className="p-2">Assistant</th>
                                <th className="p-2">Errors</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sessions.map(session => (
                                <tr key={session.id} className="border-b border-border-color dark:border-dark-border-color">
                                    <td className="p-2 whitespace-nowrap text-xs">{new Date(session.started_at).toLocaleString()}</td>
                                    <td className="p-2">
                                        {session.duration_seconds !== null ? (
                                            <span className="font-semibold">{formatDuration(session.duration_seconds)}</span>
                                        ) : (
                                            <span className="text-text-secondary dark:text-dark-text-secondary">In progress</span>
                                        )}
                                    </td>
                                    <td className="p-2">
                                        <span className={`px-2 py-0.5 rounded text-xs ${
                                            session.session_type === 'voice' ? 'bg-brand-secondary-glow text-on-brand' : 'bg-base-medium dark:bg-dark-base-medium'
                                        }`}>
                                            {session.session_type}
                                        </span>
                                    </td>
                                    <td className="p-2 text-xs">
                                        {session.user_name && <div className="font-semibold">{session.user_name}</div>}
                                        {session.user_email && <div className="text-text-secondary dark:text-dark-text-secondary">{session.user_email}</div>}
                                        {!session.user_name && !session.user_email && <span className="font-mono">{session.user_id.substring(0, 8)}...</span>}
                                    </td>
                                    <td className="p-2 text-xs">{session.assistant_name || 'Unknown'}</td>
                                    <td className="p-2">
                                        {session.error_count > 0 ? (
                                            <span className="text-danger font-semibold">{session.error_count}</span>
                                        ) : (
                                            <span className="text-green-600">0</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}
