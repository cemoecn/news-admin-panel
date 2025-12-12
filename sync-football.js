// Erster Sync - Führe aus mit: node sync-football.js
// Stellt sicher dass die Datenbank gefüllt wird

const SUPABASE_URL = 'https://joezzqytxgsrgpujgbsl.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpvZXp6cXl0eGdzcmdwdWpnYnNsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUzMTc4NjEsImV4cCI6MjA4MDg5Mzg2MX0.EuUBBWIZX6EMCYTi3VdvtTjti9BejJ-5xxr80DsMqIE';
const API_FOOTBALL_KEY = '9b9ae93c9e217107e346b7d4a8b8fea6';

const apiHeaders = {
    'x-rapidapi-key': API_FOOTBALL_KEY,
    'x-rapidapi-host': 'v3.football.api-sports.io'
};

async function callApi(endpoint, params = {}) {
    const url = new URL(`https://v3.football.api-sports.io${endpoint}`);
    Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));

    console.log(`📡 API Call: ${endpoint}`);
    const response = await fetch(url, { headers: apiHeaders });
    const data = await response.json();

    if (data.errors && Object.keys(data.errors).length > 0) {
        console.error('❌ API Error:', data.errors);
        return null;
    }

    console.log(`✅ Got ${data.response?.length || 0} results`);
    return data.response;
}

async function supabaseInsert(table, data) {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
        method: 'POST',
        headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'resolution=merge-duplicates'
        },
        body: JSON.stringify(data)
    });

    if (!response.ok) {
        const error = await response.text();
        console.error(`❌ Supabase Error (${table}):`, error);
        return false;
    }
    return true;
}

async function syncStandings(leagueId, leagueName) {
    console.log(`\n🏆 Syncing ${leagueName} (ID: ${leagueId})...`);

    const standings = await callApi('/standings', { league: leagueId, season: 2025 });
    if (!standings || standings.length === 0) {
        console.log('   Keine Standings gefunden');
        return;
    }

    const leagueData = standings[0]?.league;
    const standingsData = leagueData?.standings?.[0];

    if (!standingsData) {
        console.log('   Keine Tabellendaten');
        return;
    }

    // Teams einfügen
    for (const team of standingsData) {
        await supabaseInsert('football_teams', {
            id: team.team.id,
            name: team.team.name,
            logo_url: team.team.logo,
            updated_at: new Date().toISOString()
        });

        await supabaseInsert('football_standings', {
            league_id: leagueId,
            team_id: team.team.id,
            season: 2025,
            position: team.rank,
            points: team.points,
            played: team.all.played,
            won: team.all.win,
            drawn: team.all.draw,
            lost: team.all.lose,
            goals_for: team.all.goals.for,
            goals_against: team.all.goals.against,
            goal_diff: team.goalsDiff,
            form: team.form,
            updated_at: new Date().toISOString()
        });
    }

    console.log(`   ✅ ${standingsData.length} Teams synchronisiert`);
}

async function syncFixtures(leagueId, leagueName) {
    console.log(`\n⚽ Syncing Fixtures für ${leagueName}...`);

    const today = new Date().toISOString().split('T')[0];
    const nextWeek = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const fixtures = await callApi('/fixtures', {
        league: leagueId,
        season: 2025,
        from: today,
        to: nextWeek
    });

    if (!fixtures || fixtures.length === 0) {
        console.log('   Keine Fixtures gefunden');
        return;
    }

    for (const fixture of fixtures) {
        // Teams
        await supabaseInsert('football_teams', [
            { id: fixture.teams.home.id, name: fixture.teams.home.name, logo_url: fixture.teams.home.logo },
            { id: fixture.teams.away.id, name: fixture.teams.away.name, logo_url: fixture.teams.away.logo }
        ]);

        // Fixture
        await supabaseInsert('football_fixtures', {
            id: fixture.fixture.id,
            league_id: leagueId,
            season: 2025,
            round: fixture.league.round,
            home_team_id: fixture.teams.home.id,
            away_team_id: fixture.teams.away.id,
            kickoff: fixture.fixture.date,
            status_short: fixture.fixture.status.short,
            status_long: fixture.fixture.status.long,
            elapsed: fixture.fixture.status.elapsed,
            home_score: fixture.goals.home,
            away_score: fixture.goals.away,
            venue: fixture.fixture.venue?.name,
            referee: fixture.fixture.referee,
            is_live: false,
            updated_at: new Date().toISOString()
        });
    }

    console.log(`   ✅ ${fixtures.length} Spiele synchronisiert`);
}

async function main() {
    console.log('🚀 Football Data Sync gestartet...\n');
    console.log('='.repeat(50));

    // Ligen die wir syncen wollen (korrekte IDs)
    const leagues = [
        { id: 203, name: 'Süper Lig' },
        { id: 204, name: '1. Lig' },
        { id: 206, name: 'Türkiye Kupası' },
        { id: 2, name: 'UEFA Champions League' },
        { id: 3, name: 'UEFA Europa League' },
        { id: 39, name: 'Premier League' },
        { id: 78, name: 'Bundesliga' },
        { id: 140, name: 'La Liga' },
    ];

    for (const league of leagues) {
        await syncStandings(league.id, league.name);
        await syncFixtures(league.id, league.name);
    }

    console.log('\n' + '='.repeat(50));
    console.log('✅ Sync abgeschlossen!');
    console.log('\nDie App sollte jetzt Daten anzeigen.');
}

main().catch(console.error);
