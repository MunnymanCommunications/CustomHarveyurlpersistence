import { useState, useEffect } from 'react';
import { getSupabase } from '../lib/supabaseClient.ts';
import type { Assistant } from '../types.ts';
import { Icon } from '../components/Icon.tsx';
import { AssistantCard } from '../components/AssistantCard.tsx';

export default function CommunityPage() {
  const [assistants, setAssistants] = useState<Assistant[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = getSupabase();
    const fetchAssistants = async () => {
      const { data, error } = await supabase
        .from('assistants')
        .select('*')
        .eq('is_public', true)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching community assistants:', error);
      } else if (data) {
        setAssistants(data as Assistant[]);
      }
      setLoading(false);
    };

    fetchAssistants();
  }, []);

  if (loading) {
    return (
        <div className="flex items-center justify-center h-screen">
            <Icon name="loader" className="w-12 h-12 animate-spin text-brand-secondary-glow"/>
        </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto w-full min-h-screen">
        <header className="flex justify-between items-center mb-4">
             <div className="flex items-center gap-4">
                <Icon name="users" className="w-10 h-10 text-brand-secondary-glow"/>
                <div>
                    <h1 className="text-4xl font-bold text-text-primary dark:text-dark-text-primary">Community Assistants</h1>
                    <p className="text-text-secondary dark:text-dark-text-secondary mt-1">Discover assistants created by other users.</p>
                </div>
             </div>
             <a href="#/" className="bg-base-light hover:bg-base-medium text-text-primary font-bold py-2 px-4 rounded-full dark:bg-dark-base-medium dark:hover:bg-dark-border-color dark:text-dark-text-primary">Your Dashboard</a>
        </header>
       
        {assistants.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
                {assistants.map(assistant => (
                    <AssistantCard key={assistant.id} assistant={assistant} />
                ))}
            </div>
        ) : (
            <div className="text-center py-16">
                <p className="text-text-secondary dark:text-dark-text-secondary">No community assistants have been published yet.</p>
            </div>
        )}
    </div>
  );
}