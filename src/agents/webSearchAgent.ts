import { getSupabase } from '../lib/supabaseClient.ts';

interface WebSearchResult {
    summary: string;
    sources: any[];
}

/**
 * A specialized agent that asks the gemini-generate Supabase Edge Function to search
 * the web (via Google Search grounding) and summarize the results. The Gemini API key
 * never leaves the server - this only ever talks to our own Supabase project.
 * @param query The user's search query.
 * @returns A promise that resolves to an object containing the summary and sources.
 */
export const performSearchAndSummarize = async (query: string): Promise<WebSearchResult> => {
    try {
        const supabase = getSupabase();
        const { data, error } = await supabase.functions.invoke('gemini-generate', {
            body: { action: 'websearch', query },
        });

        if (error) throw error;

        return {
            summary: data?.text ?? '',
            sources: data?.groundingChunks ?? [],
        };
    } catch (e) {
        console.error("Error in web search agent:", e);
        return {
            summary: "I'm sorry, I encountered an issue while searching the web. Please try again.",
            sources: []
        };
    }
};
