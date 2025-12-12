// Sync nur für Premier League, Bundesliga, La Liga
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
    return response.ok;
}

async function syncLeague(leagueId, leagueName) {
    console.log(`\n🏆 Syncing ${leagueName}...`);

    const standings = await callApi('/standings', { league: leagueId, season: 2025 });
    if (standings && standings.length > 0) {
        const standingsData = standings[0]?.league?.standings?.[0];
        if (standingsData) {
            for (const team of standingsData) {
                await supabaseInsert('football_teams', {
                    id: team.team.id, name: team.team.name, logo_url: team.team.logo
                });
                await supabaseInsert('football_standings', {
                    league_id: leagueId, team_id: team.team.id, season: 2025,
                    position: team.rank, points: team.points, played: team.all.played,
                    won: team.all.win, drawn: team.all.draw, lost: team.all.lose,
                    goals_for: team.all.goals.for, goals_against: team.all.goals.against,
                    goal_diff: team.goalsDiff, form: team.form
                });
            }
            console.log(`   ✅ ${standingsData.length} Teams`);
        }
    }

    // Warte 7 Sekunden zwischen Ligen um Rate Limit zu vermeiden
    console.log('   ⏳ Warte 7 Sekunden...');
    await new Promise(r => setTimeout(r, 7000));
}

async function main() {
    console.log('🚀 Sync für restliche Ligen...\n');
    await syncLeague(39, 'Premier League');
    await syncLeague(78, 'Bundesliga');
    await syncLeague(140, 'La Liga');
    console.log('\n✅ Fertig!');
}

main().catch(console.error);
