-- Alle 2024er Daten löschen
DELETE FROM football_events WHERE fixture_id IN (SELECT id FROM football_fixtures WHERE season = 2024);
DELETE FROM football_fixtures WHERE season = 2024;
DELETE FROM football_standings WHERE season = 2024;

-- Ligen auf 2025 aktualisieren
UPDATE football_leagues SET season = 2025 WHERE season = 2024;
