-- Sportmonks Migration: Clear old API-Football data and insert new leagues
-- Run this in Supabase SQL Editor

-- Step 1: Clear all old football data
DELETE FROM football_events;
DELETE FROM football_fixtures;
DELETE FROM football_standings;
DELETE FROM football_teams;
DELETE FROM football_leagues;
DELETE FROM football_sync_log;

-- Step 2: Insert Sportmonks leagues (Free Plan)
INSERT INTO football_leagues (id, name, country, is_active, updated_at) VALUES
    (271, 'Superliga', 'Denmark', true, NOW()),
    (501, 'Premiership', 'Scotland', true, NOW());

-- Verify
SELECT * FROM football_leagues;
