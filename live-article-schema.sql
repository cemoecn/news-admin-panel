-- Add is_live column to articles table
-- Run this in Supabase SQL Editor

ALTER TABLE articles ADD COLUMN IF NOT EXISTS is_live BOOLEAN DEFAULT false;

-- Create index for faster live article queries
CREATE INDEX IF NOT EXISTS idx_articles_is_live ON articles(is_live) WHERE is_live = true;
