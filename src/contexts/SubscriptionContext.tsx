import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getSupabase } from '../lib/supabaseClient';
import type { Session } from '@supabase/supabase-js';
import type { UserSubscription, UsageTracking, SubscriptionTier } from '../types';
import { SUBSCRIPTION_LIMITS } from '../constants';

interface SubscriptionContextType {
  subscription: UserSubscription | null;
  usage: UsageTracking | null;
  tier: SubscriptionTier | null;
  isLoading: boolean;
  canAddMemory: boolean;
  canCreateAssistant: boolean;
  memoryLimit: number | null;
  assistantLimit: number | null;
  memoryCount: number;
  assistantCount: number;
  updateUsage: (memories: number, assistants: number) => Promise<void>;
  markFirstMemoryCongrats: () => Promise<void>;
  markUpgradePromptShown: () => Promise<void>;
  shouldShowFirstMemoryCongrats: boolean;
  shouldShowUpgradePrompt: boolean;
  refetch: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

interface SubscriptionProviderProps {
  children: ReactNode;
  session: Session | null;
}

export function SubscriptionProvider({ children, session }: SubscriptionProviderProps) {
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [usage, setUsage] = useState<UsageTracking | null>(null);
  const [tier, setTier] = useState<SubscriptionTier | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchSubscriptionData = async () => {
    if (!session) {
      setSubscription(null);
      setUsage(null);
      setTier(null);
      setIsLoading(false);
      return;
    }

    try {
      const supabase = getSupabase();

      // Fetch user subscription
      const { data: subData, error: subError } = await supabase
        .from('user_subscriptions')
        .select('*')
        .eq('user_id', session.user.id)
        .single();

      if (subError && subError.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('Error fetching subscription:', subError);
      } else {
        setSubscription(subData as UserSubscription);

        // Fetch tier details
        if (subData) {
          const { data: tierData, error: tierError } = await supabase
            .from('subscription_tiers')
            .select('*')
            .eq('id', subData.tier_id)
            .single();

          if (tierError) {
            console.error('Error fetching tier:', tierError);
          } else {
            setTier(tierData as SubscriptionTier);
          }
        }
      }

      // Fetch usage tracking
      const { data: usageData, error: usageError } = await supabase
        .from('usage_tracking')
        .select('*')
        .eq('user_id', session.user.id)
        .single();

      if (usageError && usageError.code !== 'PGRST116') {
        console.error('Error fetching usage:', usageError);
      } else if (usageData) {
        setUsage(usageData as UsageTracking);
      }
    } catch (error) {
      console.error('Error in fetchSubscriptionData:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscriptionData();
  }, [session]);

  const updateUsage = async (memories: number, assistants: number) => {
    if (!session) return;

    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('usage_tracking')
        .update({
          memory_count: memories,
          assistant_count: assistants,
          first_memory_added_at: memories > 0 && !usage?.first_memory_added_at ? new Date().toISOString() : usage?.first_memory_added_at,
        })
        .eq('user_id', session.user.id)
        .select()
        .single();

      if (error) {
        console.error('Error updating usage:', error);
      } else {
        setUsage(data as UsageTracking);
      }
    } catch (error) {
      console.error('Error in updateUsage:', error);
    }
  };

  const markFirstMemoryCongrats = async () => {
    if (!session || !usage) return;

    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('usage_tracking')
        .update({ shown_first_memory_congrats: true })
        .eq('user_id', session.user.id)
        .select()
        .single();

      if (error) {
        console.error('Error marking congrats shown:', error);
      } else {
        setUsage(data as UsageTracking);
      }
    } catch (error) {
      console.error('Error in markFirstMemoryCongrats:', error);
    }
  };

  const markUpgradePromptShown = async () => {
    if (!session || !usage) return;

    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('usage_tracking')
        .update({ shown_upgrade_prompt: true })
        .eq('user_id', session.user.id)
        .select()
        .single();

      if (error) {
        console.error('Error marking upgrade prompt shown:', error);
      } else {
        setUsage(data as UsageTracking);
      }
    } catch (error) {
      console.error('Error in markUpgradePromptShown:', error);
    }
  };

  const refetch = async () => {
    setIsLoading(true);
    await fetchSubscriptionData();
  };

  // Calculate limits based on tier
  const memoryLimit = tier?.memory_limit ?? SUBSCRIPTION_LIMITS.FREE.MEMORY_LIMIT;
  const assistantLimit = tier?.assistant_limit ?? SUBSCRIPTION_LIMITS.FREE.ASSISTANT_LIMIT;
  const memoryCount = usage?.memory_count ?? 0;
  const assistantCount = usage?.assistant_count ?? 0;

  const canAddMemory = memoryLimit === null || memoryCount < memoryLimit;
  const canCreateAssistant = assistantLimit === null || assistantCount < assistantLimit;

  // Show first memory congrats if they just added their first memory and haven't seen it yet
  const shouldShowFirstMemoryCongrats = !!(
    usage &&
    memoryCount === 1 &&
    usage.first_memory_added_at &&
    !usage.shown_first_memory_congrats
  );

  // Show upgrade prompt when they hit the memory limit on free tier
  const shouldShowUpgradePrompt = !!(
    subscription?.tier_id === 'free' &&
    memoryCount >= SUBSCRIPTION_LIMITS.FREE.MEMORY_LIMIT &&
    usage &&
    !usage.shown_upgrade_prompt
  );

  const value: SubscriptionContextType = {
    subscription,
    usage,
    tier,
    isLoading,
    canAddMemory,
    canCreateAssistant,
    memoryLimit,
    assistantLimit,
    memoryCount,
    assistantCount,
    updateUsage,
    markFirstMemoryCongrats,
    markUpgradePromptShown,
    shouldShowFirstMemoryCongrats,
    shouldShowUpgradePrompt,
    refetch,
  };

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
}
