-- Schema-Update für TV-Programm: Mehrere Sender pro Übertragung
-- Führe diese SQL-Befehle in deinem Supabase SQL Editor aus

-- Neue Junction-Tabelle für Broadcasts und Channels
CREATE TABLE IF NOT EXISTS broadcast_channels (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    broadcast_id UUID REFERENCES broadcasts(id) ON DELETE CASCADE,
    channel_id UUID REFERENCES channels(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(broadcast_id, channel_id)
);

-- Index für schnellere Abfragen
CREATE INDEX IF NOT EXISTS idx_broadcast_channels_broadcast ON broadcast_channels(broadcast_id);
CREATE INDEX IF NOT EXISTS idx_broadcast_channels_channel ON broadcast_channels(channel_id);

-- RLS aktivieren
ALTER TABLE broadcast_channels ENABLE ROW LEVEL SECURITY;

-- Öffentlichen Lesezugriff erlauben
CREATE POLICY "Public read access" ON broadcast_channels FOR SELECT USING (true);

-- Authentifizierte Benutzer können schreiben
CREATE POLICY "Authenticated write access" ON broadcast_channels FOR ALL USING (auth.role() = 'authenticated');
