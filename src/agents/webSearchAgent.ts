import { GoogleGenAI } from '@google/genai';

interface WebSearchResult {
    summary: string;
    sources: any[];
}

/**
 * A specialized agent that uses Gemini Flash with Google Search to find
 * and summarize information from the web.
 * @param query The user's search query.
 * @param aiInstance An instance of the GoogleGenAI client.
 * @returns A promise that resolves to an object containing the summary and sources.
 */
export const performSearchAndSummarize = async (query: string, aiInstance: GoogleGenAI): Promise<WebSearchResult> => {
    try {
        const response = await aiInstance.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: query,
            // Instruct the model to act as a summarizer for the search results.
            config: {
                systemInstruction: `You are a web search and summarization expert. Your task is to provide a concise, helpful summary based on the search results for the user's query: "${query}".`,
                tools: [{ googleSearch: {} }],
            }
        });

        const summary = response.text ?? '';
        const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks?.filter(c => c.web) || [];
        
        return { summary, sources };

    } catch (e) {
        console.error("Error in web search agent:", e);
        // Return a structured error response
        return {
            summary: "I'm sorry, I encountered an issue while searching the web. Please try again.",
            sources: []
        };
    }
};