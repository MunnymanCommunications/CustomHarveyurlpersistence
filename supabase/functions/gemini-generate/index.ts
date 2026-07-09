// Server-side proxy for all non-Live (text) Gemini calls: text chat, web search,
// MCP tool-description optimization, and MCP result summarization.
// The real GEMINI_API_KEY only ever lives in this function's environment.
import { GoogleGenAI } from 'npm:@google/genai@1.28.0';
import { corsHeaders } from '../_shared/cors.ts';

const ALLOWED_MODELS = new Set([
  'gemini-flash-latest',
  'gemini-2.5-flash',
  'gemini-2.5-pro',
]);

interface GenerateBody {
  action: 'chat' | 'websearch' | 'generate';
  model?: string;
  systemInstruction?: string;
  history?: { role: 'user' | 'model'; text: string }[];
  message?: string;
  query?: string;
  contents?: string;
  maxOutputTokens?: number;
  useSearch?: boolean;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get('GEMINI_API_KEY');
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'GEMINI_API_KEY is not configured on the server.' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body: GenerateBody = await req.json();
    const model = body.model && ALLOWED_MODELS.has(body.model) ? body.model : 'gemini-2.5-flash';
    const ai = new GoogleGenAI({ apiKey });

    if (body.action === 'chat') {
      const history = (body.history ?? []).map(h => ({
        role: h.role,
        parts: [{ text: h.text }],
      }));

      const chat = ai.chats.create({
        model,
        history,
        config: {
          systemInstruction: body.systemInstruction,
          maxOutputTokens: body.maxOutputTokens ?? 2048,
          ...(body.useSearch ? { tools: [{ googleSearch: {} }] } : {}),
        },
      });

      const response = await chat.sendMessage({ message: body.message ?? '' });
      const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks?.filter((c: any) => c.web) ?? [];

      return new Response(JSON.stringify({ text: response.text ?? '', groundingChunks }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (body.action === 'websearch') {
      const query = body.query ?? '';
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: query,
        config: {
          systemInstruction: `You are a web search and summarization expert. Your task is to provide a concise, helpful summary based on the search results for the user's query: "${query}".`,
          tools: [{ googleSearch: {} }],
        },
      });

      const summary = response.text ?? '';
      const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks?.filter((c: any) => c.web) ?? [];

      return new Response(JSON.stringify({ text: summary, groundingChunks: sources }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (body.action === 'generate') {
      const response = await ai.models.generateContent({
        model,
        contents: body.contents ?? '',
        config: {
          systemInstruction: body.systemInstruction,
        },
      });

      return new Response(JSON.stringify({ text: response.text ?? '' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Unknown action.' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('gemini-generate error:', err);
    return new Response(JSON.stringify({ error: 'Failed to generate content.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
