-- Football Admin Enhancement
-- Neue Felder für bearbeitbare Namen

-- Teams: Display-Name und Kurzname hinzufügen
ALTER TABLE football_teams ADD COLUMN IF NOT EXISTS display_name TEXT;
ALTER TABLE football_teams ADD COLUMN IF NOT EXISTS short_name TEXT;
ALTER TABLE football_teams ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT false;

-- Ligen: Display-Name hinzufügen
ALTER TABLE football_leagues ADD COLUMN IF NOT EXISTS display_name TEXT;
ALTER TABLE football_leagues ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT false;

-- Kommentare für Klarheit
COMMENT ON COLUMN football_teams.display_name IS 'Überschreibt API-Name falls gesetzt';
COMMENT ON COLUMN football_teams.short_name IS 'Kurzname für kompakte Anzeige';
COMMENT ON COLUMN football_teams.is_locked IS 'Wenn true, wird Name bei Sync nicht überschrieben';
COMMENT ON COLUMN football_leagues.display_name IS 'Überschreibt API-Name falls gesetzt';
COMMENT ON COLUMN football_leagues.is_locked IS 'Wenn true, wird Name bei Sync nicht überschrieben';
