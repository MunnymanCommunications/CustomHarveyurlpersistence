import { useState, useEffect } from 'react';
import { getSupabase } from '../lib/supabaseClient.ts';
import type { Assistant } from '../types.ts';
import { Icon } from '../components/Icon.tsx';
import { AssistantCard } from '../components/AssistantCard.tsx';

export default function DashboardPage() {
  const [assistants, setAssistants] = useState<Assistant[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = getSupabase();
    const fetchAssistants = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data, error } = await supabase
          .from('assistants')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });
        
        if (error) {
          console.error('Error fetching assistants:', error);
        } else if (data) {
          setAssistants(data as Assistant[]);
        }
      }
      setLoading(false);
    };

    fetchAssistants();
  }, []);

  const handleLogout = async () => {
    const supabase = getSupabase();
    await supabase.auth.signOut();
  };

  if (loading) {
    return (
        <div className="flex items-center justify-center h-screen">
            <Icon name="loader" className="w-12 h-12 animate-spin text-brand-secondary-glow"/>
        </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto w-full min-h-screen">
        <header className="flex justify-between items-center mb-8">
             <h1 className="text-4xl font-bold text-text-primary dark:text-dark-text-primary">Your Assistants</h1>
             <button onClick={handleLogout} className="bg-base-light hover:bg-base-medium text-text-primary font-bold py-2 px-4 rounded-full dark:bg-dark-base-medium dark:hover:bg-dark-border-color dark:text-dark-text-primary">Logout</button>
        </header>
       
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <a href="#/assistant/new" className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-base-medium rounded-2xl text-text-secondary hover:bg-base-light hover:border-brand-secondary-glow transition-all duration-300 min-h-[200px] dark:border-dark-border-color dark:text-dark-text-secondary dark:hover:bg-dark-base-medium">
                <Icon name="plus" className="w-10 h-10 mb-2"/>
                <span className="font-semibold">Create New Assistant</span>
            </a>

            {assistants.map(assistant => (
                <AssistantCard key={assistant.id} assistant={assistant} />
            ))}
        </div>
    </div>
  );
}