#!/usr/bin/env node

/**
 * Sportmonks Live Scores Service
 * Runs continuously, polling every 5 seconds for live matches
 * 
 * Usage: node live-sync.js
 * Stop: Ctrl+C
 */

const SPORTMONKS_API_TOKEN = 'uycwuQvOWCgM2JY7Pwpj5GCieMVpuZGOMxJ2faZG8OceCJQk4IwuXfO4fGE1';
const SPORTMONKS_BASE_URL = 'https://api.sportmonks.com/v3/football';

const SUPABASE_URL = 'https://joezzqytxgsrgpujgbsl.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpvZXp6cXl0eGdzcmdwdWpnYnNsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUzMTc4NjEsImV4cCI6MjA4MDg5Mzg2MX0.EuUBBWIZX6EMCYTi3VdvtTjti9BejJ-5xxr80DsMqIE';

// Available leagues (Sportmonks Free Plan)
const LEAGUE_IDS = [271, 501]; // Denmark Superliga, Scotland Premiership

const POLL_INTERVAL = 5000; // 5 seconds

let isRunning = true;
let lastUpdate = null;
let liveMatchCount = 0;

async function callSportmonks(endpoint, params = {}) {
    const url = new URL(`${SPORTMONKS_BASE_URL}${endpoint}`);
    url.searchParams.append('api_token', SPORTMONKS_API_TOKEN);
    Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));

    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    return data.data || [];
}

async function supabaseRequest(table, method, body) {
    const url = `${SUPABASE_URL}/rest/v1/${table}`;
    const response = await fetch(url, {
        method,
        headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'resolution=merge-duplicates'
        },
        body: JSON.stringify(body)
    });

    if (!response.ok) {
        const text = await response.text();
        throw new Error(`Supabase: ${text}`);
    }
}

async function updateLiveScores() {
    try {
        // Fetch all live matches
        const liveMatches = await callSportmonks('/livescores/inplay', {
            include: 'participants;state;scores',
            'filters': `fixtureLeagues:${LEAGUE_IDS.join(',')}`
        });

        liveMatchCount = liveMatches.length;
        lastUpdate = new Date().toLocaleTimeString('de-DE');

        if (liveMatches.length === 0) {
            return;
        }

        // Update each live match
        for (const match of liveMatches) {
            const homeTeam = match.participants?.find(p => p.meta?.location === 'home');
            const awayTeam = match.participants?.find(p => p.meta?.location === 'away');

            if (!homeTeam || !awayTeam) continue;

            // Get current scores
            const homeScore = match.scores?.find(s => s.description === 'CURRENT' && s.score?.participant === 'home')?.score?.goals ?? 0;
            const awayScore = match.scores?.find(s => s.description === 'CURRENT' && s.score?.participant === 'away')?.score?.goals ?? 0;

            // Update fixture in Supabase
            await supabaseRequest('football_fixtures', 'POST', {
                id: match.id,
                league_id: match.league_id,
                season: 2025,
                home_team_id: homeTeam.id,
                away_team_id: awayTeam.id,
                kickoff: match.starting_at,
                status_short: match.state?.short_name || 'LIVE',
                status_long: match.state?.state || 'In Play',
                elapsed: match.state?.clock?.minute || 0,
                home_score: homeScore,
                away_score: awayScore,
                is_live: true,
                updated_at: new Date().toISOString()
            });

            console.log(`⚽ ${homeTeam.name} ${homeScore}-${awayScore} ${awayTeam.name} (${match.state?.clock?.minute || 0}')`);
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

async function markFinishedMatches() {
    // This runs less frequently to clean up finished matches
    try {
        await fetch(`${SUPABASE_URL}/rest/v1/football_fixtures?is_live=eq.true`, {
            method: 'PATCH',
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                is_live: false,
                updated_at: new Date().toISOString()
            })
        });
    } catch (e) {
        // Ignore
    }
}

function displayStatus() {
    console.clear();
    console.log('╔═══════════════════════════════════════════════╗');
    console.log('║         ⚽ LIVE SCORES SERVICE ⚽              ║');
    console.log('╠═══════════════════════════════════════════════╣');
    console.log(`║  Status:      🟢 Running                      ║`);
    console.log(`║  Interval:    Every ${POLL_INTERVAL / 1000} seconds                  ║`);
    console.log(`║  Live Games:  ${String(liveMatchCount).padEnd(3)} matches                    ║`);
    console.log(`║  Last Update: ${(lastUpdate || 'Starting...').padEnd(20)}      ║`);
    console.log('╠═══════════════════════════════════════════════╣');
    console.log('║  Press Ctrl+C to stop                         ║');
    console.log('╚═══════════════════════════════════════════════╝');
    console.log('');
}

async function run() {
    console.log('🚀 Starting Live Scores Service...\n');

    // Initial status
    displayStatus();

    // Poll loop
    while (isRunning) {
        await updateLiveScores();
        displayStatus();
        await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL));
    }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
    console.log('\n\n🛑 Stopping Live Scores Service...');
    isRunning = false;
    await markFinishedMatches();
    console.log('✅ Stopped. All live matches marked as finished.');
    process.exit(0);
});

run();
