-- Migration to add MCP Server Integration support
-- Run this SQL in your Supabase SQL Editor to add MCP server settings to the assistants table

-- Add mcp_server_settings column to assistants table
ALTER TABLE assistants
ADD COLUMN IF NOT EXISTS mcp_server_settings JSONB DEFAULT NULL;

-- Add comment to document the column
COMMENT ON COLUMN assistants.mcp_server_settings IS 'MCP (Model Context Protocol) server configuration including URL, headers, API key, tools, and optimized descriptions';

-- Create an index on the mcp_server_settings column for faster queries
CREATE INDEX IF NOT EXISTS idx_assistants_mcp_enabled
ON assistants ((mcp_server_settings->>'enabled'))
WHERE mcp_server_settings IS NOT NULL;
