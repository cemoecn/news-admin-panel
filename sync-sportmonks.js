#!/usr/bin/env node

/**
 * Sportmonks Football Sync Script
 * Run with: node sync-sportmonks.js
 */

const SPORTMONKS_API_TOKEN = 'uycwuQvOWCgM2JY7Pwpj5GCieMVpuZGOMxJ2faZG8OceCJQk4IwuXfO4fGE1';
const SPORTMONKS_BASE_URL = 'https://api.sportmonks.com/v3/football';

// Supabase configuration
const SUPABASE_URL = 'https://joezzqytxgsrgpujgbsl.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpvZXp6cXl0eGdzcmdwdWpnYnNsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUzMTc4NjEsImV4cCI6MjA4MDg5Mzg2MX0.EuUBBWIZX6EMCYTi3VdvtTjti9BejJ-5xxr80DsMqIE';

// Available leagues (Sportmonks Free Plan - Season 2025/2026)
const LEAGUES_TO_SYNC = [
    { id: 271, seasonId: 25536, name: 'Superliga', country: 'Denmark' },
    { id: 501, seasonId: 25598, name: 'Premiership', country: 'Scotland' },
];

async function callSportmonks(endpoint, params = {}) {
    const url = new URL(`${SPORTMONKS_BASE_URL}${endpoint}`);
    url.searchParams.append('api_token', SPORTMONKS_API_TOKEN);
    Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));

    console.log(`📡 API Call: ${endpoint}`);
    const response = await fetch(url);

    if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    if (data.message) {
        throw new Error(data.message);
    }
    return data.data;
}

async function supabaseRequest(table, method, body, query = '') {
    const url = `${SUPABASE_URL}/rest/v1/${table}${query}`;
    const options = {
        method,
        headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'resolution=merge-duplicates'
        }
    };
    if (body) {
        options.body = JSON.stringify(body);
    }
    const response = await fetch(url, options);
    if (!response.ok) {
        const text = await response.text();
        throw new Error(`Supabase error: ${text}`);
    }
    return response;
}

async function syncLeagueStandings(league) {
    console.log(`\n🏆 Syncing ${league.name}...`);

    // Ensure league exists
    await supabaseRequest('football_leagues', 'POST', {
        id: league.id,
        name: league.name,
        country: league.country,
        is_active: true,
        updated_at: new Date().toISOString()
    });

    // Get standings with participant and details
    const standings = await callSportmonks(`/standings/seasons/${league.seasonId}`, {
        include: 'participant;details'
    });

    if (!standings || standings.length === 0) {
        console.log(`   ⚠️ No standings found`);
        return;
    }

    console.log(`   📊 Found ${standings.length} teams`);

    for (const standing of standings) {
        const team = standing.participant;
        if (!team) continue;

        // Upsert team
        await supabaseRequest('football_teams', 'POST', {
            id: team.id,
            name: team.name,
            logo_url: team.image_path,
            updated_at: new Date().toISOString()
        });

        // Get stats from details
        const getDetail = (typeId) => standing.details?.find(d => d.type_id === typeId)?.value || 0;

        // Upsert standing
        await supabaseRequest('football_standings', 'POST', {
            league_id: league.id,
            team_id: team.id,
            season: 2025,
            position: standing.position,
            points: standing.points,
            played: getDetail(129),
            won: getDetail(130),
            drawn: getDetail(131),
            lost: getDetail(132),
            goals_for: getDetail(133),
            goals_against: getDetail(134),
            goal_diff: getDetail(179),
            form: standing.recent_form || '',
            updated_at: new Date().toISOString()
        });

        console.log(`   ✓ ${standing.position}. ${team.name} - ${standing.points} pts`);
    }
}

async function syncAllFixtures() {
    console.log(`\n⚽ Syncing fixtures for all leagues...`);

    // Get league IDs for filter
    const leagueIds = LEAGUES_TO_SYNC.map(l => l.id).join(',');

    // Sync fixtures for the next 14 days
    let totalFixtures = 0;

    for (let dayOffset = 0; dayOffset <= 14; dayOffset++) {
        const date = new Date(Date.now() + dayOffset * 24 * 60 * 60 * 1000);
        const dateStr = date.toISOString().split('T')[0];

        try {
            const fixtures = await callSportmonks(`/fixtures/date/${dateStr}`, {
                include: 'participants;state;scores',
                'filters': `fixtureLeagues:${leagueIds}`
            });

            if (!fixtures || fixtures.length === 0) continue;

            for (const fixture of fixtures) {
                const homeTeam = fixture.participants?.find(p => p.meta?.location === 'home');
                const awayTeam = fixture.participants?.find(p => p.meta?.location === 'away');

                if (!homeTeam || !awayTeam) continue;

                // Upsert teams
                await supabaseRequest('football_teams', 'POST', {
                    id: homeTeam.id,
                    name: homeTeam.name,
                    logo_url: homeTeam.image_path
                });
                await supabaseRequest('football_teams', 'POST', {
                    id: awayTeam.id,
                    name: awayTeam.name,
                    logo_url: awayTeam.image_path
                });

                // Get scores
                const homeScore = fixture.scores?.find(s => s.description === 'CURRENT' && s.score?.participant === 'home')?.score?.goals;
                const awayScore = fixture.scores?.find(s => s.description === 'CURRENT' && s.score?.participant === 'away')?.score?.goals;

                // Determine if live
                const liveStates = ['LIVE', 'HT', '1H', '2H', 'ET', 'PEN_LIVE'];
                const isLive = liveStates.includes(fixture.state?.state);

                // Upsert fixture
                await supabaseRequest('football_fixtures', 'POST', {
                    id: fixture.id,
                    league_id: fixture.league_id,
                    season: 2025,
                    round: fixture.round_id?.toString() || '',
                    home_team_id: homeTeam.id,
                    away_team_id: awayTeam.id,
                    kickoff: fixture.starting_at,
                    status_short: fixture.state?.short_name || 'NS',
                    status_long: fixture.state?.state || 'Not Started',
                    elapsed: fixture.state?.clock?.minute || 0,
                    home_score: homeScore ?? null,
                    away_score: awayScore ?? null,
                    venue: fixture.venue?.name || null,
                    is_live: isLive,
                    updated_at: new Date().toISOString()
                });

                const matchDate = new Date(fixture.starting_at).toLocaleDateString('de-DE');
                console.log(`   ✓ ${matchDate}: ${homeTeam.name} vs ${awayTeam.name}`);
                totalFixtures++;
            }
        } catch (err) {
            // Skip days with no fixtures quietly
        }
    }

    console.log(`   📅 Total: ${totalFixtures} fixtures synced`);
}

async function main() {
    console.log('🚀 Sportmonks Football Sync\n');
    console.log('Available leagues:');
    LEAGUES_TO_SYNC.forEach(l => console.log(`  - ${l.name} (${l.country})`));

    const args = process.argv.slice(2);
    const syncType = args[0] || 'standings';

    console.log(`\n📊 Sync type: ${syncType}\n`);

    try {
        if (syncType === 'standings' || syncType === 'all') {
            for (const league of LEAGUES_TO_SYNC) {
                await syncLeagueStandings(league);
            }
        }
        if (syncType === 'fixtures' || syncType === 'all') {
            await syncAllFixtures();
        }

        console.log('\n✅ Sync completed successfully!');
    } catch (error) {
        console.error('\n❌ Error:', error.message);
        process.exit(1);
    }
}

main();
