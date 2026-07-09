// Mints a short-lived ephemeral token for the Gemini Live API (voice sessions).
// The real GEMINI_API_KEY never leaves this function - only the ephemeral,
// single-use token (which expires in minutes) is sent to the browser.
import { GoogleGenAI } from 'npm:@google/genai@1.28.0';
import { corsHeaders } from '../_shared/cors.ts';

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

    const client = new GoogleGenAI({ apiKey });

    const token = await client.authTokens.create({
      config: {
        uses: 1,
        expireTime: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        newSessionExpireTime: new Date(Date.now() + 60 * 1000).toISOString(),
      },
    });

    return new Response(JSON.stringify({ token: token.name }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('gemini-token error:', err);
    return new Response(JSON.stringify({ error: 'Failed to mint ephemeral token.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
