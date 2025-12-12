-- =============================================
-- API-Football Integration Schema
-- Für Live-Ergebnisse, Tabellen und Statistiken
-- =============================================

-- 1. Ligen/Wettbewerbe
CREATE TABLE IF NOT EXISTS football_leagues (
    id INTEGER PRIMARY KEY,  -- API-Football League ID
    name TEXT NOT NULL,
    country TEXT,
    country_code TEXT,
    logo_url TEXT,
    flag_url TEXT,
    season INTEGER DEFAULT 2024,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Mannschaften
CREATE TABLE IF NOT EXISTS football_teams (
    id INTEGER PRIMARY KEY,  -- API-Football Team ID
    name TEXT NOT NULL,
    short_name TEXT,
    logo_url TEXT,
    country TEXT,
    founded INTEGER,
    venue_name TEXT,
    venue_city TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Tabellenstände (gecached)
CREATE TABLE IF NOT EXISTS football_standings (
    id SERIAL PRIMARY KEY,
    league_id INTEGER REFERENCES football_leagues(id) ON DELETE CASCADE,
    team_id INTEGER REFERENCES football_teams(id) ON DELETE CASCADE,
    season INTEGER DEFAULT 2024,
    position INTEGER,
    points INTEGER DEFAULT 0,
    played INTEGER DEFAULT 0,
    won INTEGER DEFAULT 0,
    drawn INTEGER DEFAULT 0,
    lost INTEGER DEFAULT 0,
    goals_for INTEGER DEFAULT 0,
    goals_against INTEGER DEFAULT 0,
    goal_diff INTEGER DEFAULT 0,
    form TEXT,  -- z.B. "WWDLW"
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(league_id, team_id, season)
);

-- 4. Spiele/Begegnungen
CREATE TABLE IF NOT EXISTS football_fixtures (
    id INTEGER PRIMARY KEY,  -- API-Football Fixture ID
    league_id INTEGER REFERENCES football_leagues(id) ON DELETE CASCADE,
    season INTEGER DEFAULT 2024,
    round TEXT,  -- z.B. "Regular Season - 15"
    home_team_id INTEGER REFERENCES football_teams(id),
    away_team_id INTEGER REFERENCES football_teams(id),
    kickoff TIMESTAMP WITH TIME ZONE,
    status_short TEXT,  -- NS, 1H, HT, 2H, FT, etc.
    status_long TEXT,   -- "Not Started", "First Half", etc.
    elapsed INTEGER,    -- Spielminute
    home_score INTEGER,
    away_score INTEGER,
    home_score_ht INTEGER,  -- Halbzeitstand
    away_score_ht INTEGER,
    venue TEXT,
    referee TEXT,
    is_live BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Spielereignisse (Tore, Karten, etc.)
CREATE TABLE IF NOT EXISTS football_events (
    id SERIAL PRIMARY KEY,
    fixture_id INTEGER REFERENCES football_fixtures(id) ON DELETE CASCADE,
    team_id INTEGER REFERENCES football_teams(id),
    player_name TEXT,
    player_id INTEGER,
    assist_name TEXT,
    minute INTEGER,
    extra_minute INTEGER,  -- Nachspielzeit
    event_type TEXT,  -- Goal, Card, Subst, Var
    detail TEXT,      -- Normal Goal, Yellow Card, Red Card, etc.
    comments TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Sync-Log (um API-Calls zu tracken)
CREATE TABLE IF NOT EXISTS football_sync_log (
    id SERIAL PRIMARY KEY,
    sync_type TEXT NOT NULL,  -- leagues, standings, fixtures, live
    league_id INTEGER,
    records_updated INTEGER DEFAULT 0,
    api_calls_used INTEGER DEFAULT 1,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- Indexes für Performance
-- =============================================

CREATE INDEX IF NOT EXISTS idx_fixtures_kickoff ON football_fixtures(kickoff);
CREATE INDEX IF NOT EXISTS idx_fixtures_league ON football_fixtures(league_id);
CREATE INDEX IF NOT EXISTS idx_fixtures_status ON football_fixtures(status_short);
CREATE INDEX IF NOT EXISTS idx_fixtures_live ON football_fixtures(is_live) WHERE is_live = true;
CREATE INDEX IF NOT EXISTS idx_standings_league ON football_standings(league_id);
CREATE INDEX IF NOT EXISTS idx_events_fixture ON football_events(fixture_id);

-- =============================================
-- Aktive Ligen konfigurieren
-- =============================================

INSERT INTO football_leagues (id, name, country, country_code, season, is_active) VALUES
    (203, 'Süper Lig', 'Turkey', 'TR', 2024, true),
    (204, 'TFF 1. Lig', 'Turkey', 'TR', 2024, true),
    (206, 'Türkiye Kupası', 'Turkey', 'TR', 2024, true),
    (2, 'UEFA Champions League', 'World', 'EU', 2024, true),
    (3, 'UEFA Europa League', 'World', 'EU', 2024, true),
    (78, 'Bundesliga', 'Germany', 'DE', 2024, true),
    (39, 'Premier League', 'England', 'GB', 2024, true),
    (140, 'La Liga', 'Spain', 'ES', 2024, true)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    is_active = EXCLUDED.is_active,
    updated_at = NOW();

-- =============================================
-- RLS Policies (Row Level Security)
-- =============================================

ALTER TABLE football_leagues ENABLE ROW LEVEL SECURITY;
ALTER TABLE football_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE football_standings ENABLE ROW LEVEL SECURITY;
ALTER TABLE football_fixtures ENABLE ROW LEVEL SECURITY;
ALTER TABLE football_events ENABLE ROW LEVEL SECURITY;

-- Leserechte für alle (anon)
CREATE POLICY "Allow public read" ON football_leagues FOR SELECT USING (true);
CREATE POLICY "Allow public read" ON football_teams FOR SELECT USING (true);
CREATE POLICY "Allow public read" ON football_standings FOR SELECT USING (true);
CREATE POLICY "Allow public read" ON football_fixtures FOR SELECT USING (true);
CREATE POLICY "Allow public read" ON football_events FOR SELECT USING (true);

-- Schreibrechte nur für service_role (Backend)
CREATE POLICY "Allow service write" ON football_leagues FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Allow service write" ON football_teams FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Allow service write" ON football_standings FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Allow service write" ON football_fixtures FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Allow service write" ON football_events FOR ALL USING (auth.role() = 'service_role');
