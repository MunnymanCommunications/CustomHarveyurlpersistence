<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1KI-I4mq4XrTMU109ZoO_x-I1eQKzTQ7_

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `.env.local` (these are public identifiers, safe for the client bundle)
3. Deploy the Supabase Edge Functions in `supabase/functions/` and set the `GEMINI_API_KEY` secret on your Supabase project (`supabase secrets set GEMINI_API_KEY=...`) - this key must NOT be set as a `VITE_`-prefixed variable, since anything prefixed `VITE_` is bundled into the client-side JS and exposed to every visitor.
4. Run the app:
   `npm run dev`
