-- TV-Programm Feature: Datenbank-Schema
-- Führe diese SQL-Befehle in deinem Supabase SQL Editor aus

-- Tabelle für TV-Sender
CREATE TABLE IF NOT EXISTS channels (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    logo_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabelle für Sportarten
CREATE TABLE IF NOT EXISTS sport_types (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    icon TEXT DEFAULT '⚽',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabelle für Übertragungen
CREATE TABLE IF NOT EXISTS broadcasts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    sport_type_id UUID REFERENCES sport_types(id) ON DELETE CASCADE,
    event_name TEXT NOT NULL,
    teams TEXT,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    channel_id UUID REFERENCES channels(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indizes für schnellere Abfragen
CREATE INDEX IF NOT EXISTS idx_broadcasts_start_time ON broadcasts(start_time);
CREATE INDEX IF NOT EXISTS idx_broadcasts_sport_type ON broadcasts(sport_type_id);

-- RLS (Row Level Security) aktivieren
ALTER TABLE channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE sport_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE broadcasts ENABLE ROW LEVEL SECURITY;

-- Öffentlichen Lesezugriff erlauben
CREATE POLICY "Public read access" ON channels FOR SELECT USING (true);
CREATE POLICY "Public read access" ON sport_types FOR SELECT USING (true);
CREATE POLICY "Public read access" ON broadcasts FOR SELECT USING (true);

-- Authentifizierte Benutzer können schreiben
CREATE POLICY "Authenticated write access" ON channels FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated write access" ON sport_types FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated write access" ON broadcasts FOR ALL USING (auth.role() = 'authenticated');
