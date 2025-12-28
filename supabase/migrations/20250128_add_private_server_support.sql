-- Migration to add Private Server support
-- This allows users to toggle between Google's audio-to-audio and a private server

-- Add server_mode column to assistants table (default to 'google')
ALTER TABLE assistants
ADD COLUMN IF NOT EXISTS server_mode TEXT DEFAULT 'google'
CHECK (server_mode IN ('google', 'private'));

-- Add private_server_config column to assistants table
ALTER TABLE assistants
ADD COLUMN IF NOT EXISTS private_server_config JSONB DEFAULT NULL;

-- Add comments to document the columns
COMMENT ON COLUMN assistants.server_mode IS 'Audio-to-audio server mode: "google" for Google Gemini Live, "private" for custom WebSocket server';
COMMENT ON COLUMN assistants.private_server_config IS 'Private server configuration including WebSocket URL and API key';

-- Create an index on server_mode for faster queries
CREATE INDEX IF NOT EXISTS idx_assistants_server_mode
ON assistants (server_mode);
