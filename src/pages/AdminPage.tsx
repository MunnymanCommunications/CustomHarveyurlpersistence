import { useState, useEffect } from 'react';
import { getSupabase } from '../lib/supabaseClient';
import type { AppLog } from '../types';
import { Icon } from '../components/Icon';

export default function AdminPage() {
    const [logs, setLogs] = useState<AppLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchLogs = async () => {
            const supabase = getSupabase();
            const { data, error } = await supabase
                .from('app_logs')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(100);
            
            if (error) {
                setError(error.message);
                console.error('Error fetching logs:', error);
            } else {
                setLogs(data as AppLog[]);
            }
            setLoading(false);
        };
        fetchLogs();
    }, []);

    if (loading) {
        return <div className="flex items-center justify-center h-full"><Icon name="loader" className="w-12 h-12 animate-spin text-brand-secondary-glow"/></div>;
    }
    
    if (error) {
        return <div className="flex items-center justify-center h-full text-danger"><Icon name="error" className="w-8 h-8 mr-2"/> {error}</div>;
    }

    return (
        <div className="glassmorphic rounded-2xl shadow-2xl p-4 sm:p-8 max-w-7xl mx-auto w-full h-full flex flex-col">
            <header className="flex-shrink-0 flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-text-primary dark:text-dark-text-primary flex items-center">
                    <Icon name="shield" className="w-8 h-8 mr-3" />
                    Admin Panel - App Logs
                </h1>
                <a href="#/" className="text-sm text-brand-secondary-glow hover:underline">Back to Dashboard</a>
            </header>
            <div className="flex-grow overflow-auto">
                <table className="w-full text-left text-sm">
                    <thead className="sticky top-0 bg-base-medium/80 dark:bg-dark-base-medium/80 backdrop-blur-sm">
                        <tr>
                            <th className="p-2">Timestamp</th>
                            <th className="p-2">Event Type</th>
                            <th className="p-2">User ID</th>
                            <th className="p-2">Assistant ID</th>
                            <th className="p-2">Metadata</th>
                        </tr>
                    </thead>
                    <tbody>
                        {logs.map(log => (
                            <tr key={log.id} className="border-b border-border-color dark:border-dark-border-color">
                                <td className="p-2 whitespace-nowrap">{new Date(log.created_at).toLocaleString()}</td>
                                <td className="p-2 font-mono">{log.event_type}</td>
                                <td className="p-2 font-mono text-xs" title={log.user_id}>{log.user_id.substring(0, 8)}...</td>
                                <td className="p-2 font-mono text-xs" title={log.assistant_id || ''}>{log.assistant_id ? `${log.assistant_id.substring(0, 8)}...` : 'N/A'}</td>
                                <td className="p-2">
                                    {log.metadata && Object.keys(log.metadata).length > 0 && (
                                        <details>
                                            <summary className="cursor-pointer">View</summary>
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
                 {logs.length === 0 && <p className="text-center py-8 text-text-secondary">No logs found.</p>}
            </div>
        </div>
    );
}