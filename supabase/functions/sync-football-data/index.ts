// Supabase Edge Function: sync-football-data
// Deploy mit: supabase functions deploy sync-football-data
// Cron Setup in Supabase Dashboard: Schedule Tasks

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const API_FOOTBALL_KEY = Deno.env.get('API_FOOTBALL_KEY') || '9b9ae93c9e217107e346b7d4a8b8fea6'
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

const apiHeaders = {
    'x-rapidapi-key': API_FOOTBALL_KEY,
    'x-rapidapi-host': 'v3.football.api-sports.io'
}

async function callApi(endpoint, params = {}) {
    const url = new URL(`https://v3.football.api-sports.io${endpoint}`)
    Object.keys(params).forEach(key => url.searchParams.append(key, params[key]))

    const response = await fetch(url, { headers: apiHeaders })
    const data = await response.json()

    if (data.errors && Object.keys(data.errors).length > 0) {
        console.error('API Error:', data.errors)
        return null
    }

    return data.response
}

// Sync Standings für eine Liga
async function syncStandings(leagueId, season = 2024) {
    console.log(`Syncing standings for league ${leagueId}...`)

    const standings = await callApi('/standings', { league: leagueId, season })
    if (!standings || standings.length === 0) return 0

    const leagueStandings = standings[0]?.league?.standings?.[0]
    if (!leagueStandings) return 0

    let count = 0
    for (const team of leagueStandings) {
        // Team upsert
        await supabase.from('football_teams').upsert({
            id: team.team.id,
            name: team.team.name,
            logo_url: team.team.logo,
            updated_at: new Date().toISOString()
        }, { onConflict: 'id' })

        // Standing upsert
        await supabase.from('football_standings').upsert({
            league_id: leagueId,
            team_id: team.team.id,
            season: season,
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
        }, { onConflict: 'league_id,team_id,season' })

        count++
    }

    return count
}

// Sync Fixtures für eine Liga
async function syncFixtures(leagueId, season = 2024) {
    console.log(`Syncing fixtures for league ${leagueId}...`)

    const today = new Date().toISOString().split('T')[0]
    const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

    const fixtures = await callApi('/fixtures', {
        league: leagueId,
        season,
        from: today,
        to: nextWeek
    })

    if (!fixtures) return 0

    let count = 0
    for (const fixture of fixtures) {
        // Teams upsert
        await supabase.from('football_teams').upsert([
            { id: fixture.teams.home.id, name: fixture.teams.home.name, logo_url: fixture.teams.home.logo },
            { id: fixture.teams.away.id, name: fixture.teams.away.name, logo_url: fixture.teams.away.logo }
        ], { onConflict: 'id' })

        // Fixture upsert
        await supabase.from('football_fixtures').upsert({
            id: fixture.fixture.id,
            league_id: leagueId,
            season: season,
            round: fixture.league.round,
            home_team_id: fixture.teams.home.id,
            away_team_id: fixture.teams.away.id,
            kickoff: fixture.fixture.date,
            status_short: fixture.fixture.status.short,
            status_long: fixture.fixture.status.long,
            elapsed: fixture.fixture.status.elapsed,
            home_score: fixture.goals.home,
            away_score: fixture.goals.away,
            home_score_ht: fixture.score?.halftime?.home,
            away_score_ht: fixture.score?.halftime?.away,
            venue: fixture.fixture.venue?.name,
            referee: fixture.fixture.referee,
            is_live: ['1H', '2H', 'HT', 'ET', 'P'].includes(fixture.fixture.status.short),
            updated_at: new Date().toISOString()
        }, { onConflict: 'id' })

        count++
    }

    return count
}

// Sync Live Spiele
async function syncLive() {
    console.log('Syncing live fixtures...')

    const liveFixtures = await callApi('/fixtures', { live: 'all' })
    if (!liveFixtures) return 0

    // Erst alle als nicht-live markieren
    await supabase.from('football_fixtures')
        .update({ is_live: false })
        .eq('is_live', true)

    let count = 0
    for (const fixture of liveFixtures) {
        await supabase.from('football_fixtures').upsert({
            id: fixture.fixture.id,
            league_id: fixture.league.id,
            status_short: fixture.fixture.status.short,
            status_long: fixture.fixture.status.long,
            elapsed: fixture.fixture.status.elapsed,
            home_score: fixture.goals.home,
            away_score: fixture.goals.away,
            is_live: true,
            updated_at: new Date().toISOString()
        }, { onConflict: 'id' })

        count++
    }

    return count
}

// Main Handler
Deno.serve(async (req) => {
    try {
        const { type } = await req.json().catch(() => ({ type: 'all' }))

        // Aktive Ligen holen
        const { data: leagues } = await supabase
            .from('football_leagues')
            .select('id')
            .eq('is_active', true)

        const results = {
            standings: 0,
            fixtures: 0,
            live: 0
        }

        if (type === 'all' || type === 'standings') {
            for (const league of leagues || []) {
                results.standings += await syncStandings(league.id)
            }
        }

        if (type === 'all' || type === 'fixtures') {
            for (const league of leagues || []) {
                results.fixtures += await syncFixtures(league.id)
            }
        }

        if (type === 'all' || type === 'live') {
            results.live = await syncLive()
        }

        // Sync Log
        await supabase.from('football_sync_log').insert({
            sync_type: type,
            records_updated: results.standings + results.fixtures + results.live,
            api_calls_used: (leagues?.length || 0) * 2 + (type === 'live' ? 1 : 0)
        })

        return new Response(JSON.stringify({
            success: true,
            results,
            timestamp: new Date().toISOString()
        }), {
            headers: { 'Content-Type': 'application/json' }
        })

    } catch (error) {
        console.error('Sync error:', error)
        return new Response(JSON.stringify({
            success: false,
            error: error.message
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        })
    }
})
