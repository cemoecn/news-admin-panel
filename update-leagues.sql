-- Ligen aktualisieren mit korrekten IDs
INSERT INTO football_leagues (id, name, country, country_code, season, is_active) VALUES
    (203, 'Süper Lig', 'Turkey', 'TR', 2024, true),
    (204, '1. Lig', 'Turkey', 'TR', 2024, true),
    (206, 'Türkiye Kupası', 'Turkey', 'TR', 2024, true),
    (2, 'UEFA Champions League', 'World', 'EU', 2024, true),
    (3, 'UEFA Europa League', 'World', 'EU', 2024, true),
    (39, 'Premier League', 'England', 'GB', 2024, true),
    (78, 'Bundesliga', 'Germany', 'DE', 2024, true),
    (140, 'La Liga', 'Spain', 'ES', 2024, true)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    country = EXCLUDED.country,
    is_active = true,
    updated_at = NOW();
