-- Categories Table for News Admin Panel
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    color TEXT DEFAULT '#667eea',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- Allow read access for everyone
CREATE POLICY "Categories are viewable by everyone"
    ON categories FOR SELECT
    USING (true);

-- Allow authenticated users to manage categories
CREATE POLICY "Authenticated users can insert categories"
    ON categories FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Authenticated users can update categories"
    ON categories FOR UPDATE
    TO authenticated
    USING (true);

CREATE POLICY "Authenticated users can delete categories"
    ON categories FOR DELETE
    TO authenticated
    USING (true);

-- Insert default categories
INSERT INTO categories (name, color) VALUES
    ('Tech', '#667eea'),
    ('Politik', '#ef4444'),
    ('Wirtschaft', '#10b981'),
    ('Sport', '#f59e0b'),
    ('Unterhaltung', '#ec4899'),
    ('Wissenschaft', '#8b5cf6')
ON CONFLICT (name) DO NOTHING;
