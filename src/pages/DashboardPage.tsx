import React, { useState, useEffect } from 'react';
import { getSupabase } from '../lib/supabaseClient.ts';
import type { Assistant, Profile } from '../types.ts';
import { Icon } from '../components/Icon.tsx';
import { DEFAULT_AVATAR_URL } from '../constants.ts';

type Tab = 'my' | 'community';

export default function DashboardPage() {
  const [myAssistants, setMyAssistants] = useState<Assistant[]>([]);
  const [communityAssistants, setCommunityAssistants] = useState<Assistant[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('my');

  useEffect(() => {
    const supabase = getSupabase();
    const fetchAssistants = async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Fetch user's profile
        const { data: profileData } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        if (profileData) setProfile(profileData as Profile);
        
        // Fetch user's own assistants
        const { data: myData, error: myError } = await supabase
          .from('assistants')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });
        
        if (myError) console.error('Error fetching my assistants:', myError);
        else if (myData) setMyAssistants(myData as Assistant[]);

        // Fetch all public community assistants
        const { data: communityData, error: communityError } = await supabase
          .from('assistants')
          .select('*')
          .eq('is_public', true)
          .order('created_at', { ascending: false });

        if (communityError) console.error('Error fetching community assistants:', communityError);
        else if (communityData) setCommunityAssistants(communityData as Assistant[]);
      }
      setLoading(false);
    };

    fetchAssistants();
  }, []);

  const handleLogout = async () => {
    const supabase = getSupabase();
    await supabase.auth.signOut();
  };

  const TabButton: React.FC<{tab: Tab, label: string}> = ({ tab, label }) => (
    <button
      onClick={() => setActiveTab(tab)}
      className={`px-4 py-2 text-lg font-semibold rounded-t-lg transition-colors ${
        activeTab === tab 
          ? 'text-brand-secondary-glow border-b-2 border-brand-secondary-glow' 
          : 'text-text-secondary dark:text-dark-text-secondary hover:text-text-primary dark:hover:text-dark-text-primary'
      }`}
    >
      {label}
    </button>
  );

  const AssistantGrid: React.FC<{assistants: Assistant[], isCommunity: boolean}> = ({ assistants, isCommunity }) => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {!isCommunity && (
         <a href="#/assistant/new" className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-base-medium rounded-2xl text-text-secondary hover:bg-base-light hover:border-brand-secondary-glow transition-all duration-300 min-h-[230px] dark:border-dark-border-color dark:text-dark-text-secondary dark:hover:bg-dark-base-medium">
            <Icon name="plus" className="w-10 h-10 mb-2"/>
            <span className="font-semibold">Create New Assistant</span>
        </a>
      )}
      {assistants.map(assistant => (
          <a key={assistant.id} href={`#/assistant/${isCommunity ? 'preview/' : ''}${assistant.id}`} className="flex flex-col p-6 glassmorphic rounded-2xl hover:ring-2 hover:ring-brand-tertiary-glow transition-all duration-300 min-h-[230px]">
              <div className="flex-grow flex flex-col">
                <div className="flex items-start gap-4">
                    <img src={assistant.avatar || DEFAULT_AVATAR_URL} alt={assistant.name} className="w-16 h-16 rounded-full object-cover flex-shrink-0 shadow-md"/>
                    <div className="overflow-hidden">
                        <h2 className="text-2xl font-bold text-text-primary dark:text-dark-text-primary truncate">{assistant.name}</h2>
                        {assistant.author_name && isCommunity && <p className="text-sm text-text-secondary dark:text-dark-text-secondary truncate mt-1">by {assistant.author_name}</p>}
                    </div>
                </div>
                <div className="flex-grow mt-4">
                    <p className="text-sm text-text-secondary dark:text-dark-text-secondary line-clamp-3">
                    {assistant.description || 'No description provided.'}
                    </p>
                </div>
              </div>
              <div className="flex-shrink-0 mt-4 pt-4 border-t border-border-color/50 dark:border-dark-border-color/50">
                  <p className="text-xs text-text-tertiary dark:text-dark-text-tertiary line-clamp-1 truncate">
                    {(assistant.personality ?? []).join(' · ')}
                  </p>
              </div>
          </a>
      ))}
    </div>
  );

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto w-full min-h-screen">
      <header className="flex justify-between items-center mb-8">
           <h1 className="text-4xl font-bold text-text-primary dark:text-dark-text-primary">Dashboard</h1>
           <div className="flex items-center gap-4">
                {profile?.role === 'admin' && (
                    <a href="#/admin" className="bg-brand-secondary-glow/80 hover:bg-brand-secondary-glow text-on-brand font-bold py-2 px-4 rounded-full flex items-center gap-2 transition-all">
                        <Icon name="shield" className="w-5 h-5" />
                        Admin Panel
                    </a>
                )}
                <button onClick={handleLogout} className="bg-base-light hover:bg-base-medium text-text-primary font-bold py-2 px-4 rounded-full dark:bg-dark-base-medium dark:hover:bg-dark-border-color dark:text-dark-text-primary">Logout</button>
           </div>
      </header>
      
      <div className="border-b border-border-color dark:border-dark-border-color mb-6">
        <TabButton tab="my" label="My Assistants" />
        <TabButton tab="community" label="Community" />
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
            <Icon name="loader" className="w-12 h-12 animate-spin text-brand-secondary-glow"/>
        </div>
      ) : (
        <>
          {activeTab === 'my' && <AssistantGrid assistants={myAssistants} isCommunity={false} />}
          {activeTab === 'community' && (
            communityAssistants.length > 0
              ? <AssistantGrid assistants={communityAssistants} isCommunity={true} />
              : <p className="text-center text-text-secondary dark:text-dark-text-secondary py-10">No community assistants available yet.</p>
          )}
        </>
      )}
    </div>
  );
}