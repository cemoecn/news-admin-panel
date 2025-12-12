-- RLS deaktivieren für Football-Tabellen
-- (Erlaubt Schreiben über anonymen Key für Sync)

ALTER TABLE football_leagues DISABLE ROW LEVEL SECURITY;
ALTER TABLE football_teams DISABLE ROW LEVEL SECURITY;
ALTER TABLE football_standings DISABLE ROW LEVEL SECURITY;
ALTER TABLE football_fixtures DISABLE ROW LEVEL SECURITY;
ALTER TABLE football_events DISABLE ROW LEVEL SECURITY;
ALTER TABLE football_sync_log DISABLE ROW LEVEL SECURITY;

-- Lesen ist weiterhin für alle erlaubt, Schreiben jetzt auch
