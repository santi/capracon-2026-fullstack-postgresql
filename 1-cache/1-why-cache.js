// Part 1: Why cache at all?
// Compares computing a leaderboard query from scratch every time
// vs reading a pre-computed result from Redis.
//
// Run: node 1-why-cache.js [--iterations N]
// SQL: sql/1-cache-logged.sql

const { pool, redis, ITERATIONS: _IT, WARMUP: _WU, measure, fmt } = require('./benchmark');

// Override: the compute query is expensive (~40ms), so fewer iterations
const ITERATIONS = Math.min(_IT, 50);
const WARMUP = Math.min(_WU, 20);

const LEADERBOARD_QUERY = `
    SELECT q.id, q.title, u.username, t.title as talk_title,
           COUNT(v.id) as vote_count
    FROM questions q
        JOIN users u ON q.user_id = u.id
        JOIN talks t ON q.talk_id = t.id
        LEFT JOIN votes v ON v.question_id = q.id
    GROUP BY q.id, q.title, u.username, t.title
    ORDER BY vote_count DESC
    LIMIT 10
`;

async function main() {
    console.log(`\n  Part 1: Why cache? (${ITERATIONS} iterations)\n`);

    // Pre-compute the leaderboard and store in Redis
    const leaderboard = await pool.query(LEADERBOARD_QUERY);
    const leaderboardJson = JSON.stringify(leaderboard.rows);
    await redis.set('leaderboard', leaderboardJson, 'EX', 60);

    // Also store in a regular PG table
    await pool.query(
        `INSERT INTO cache_logged (key, value, expires_at)
         VALUES ('leaderboard', $1, now() + interval '60 seconds')
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, expires_at = EXCLUDED.expires_at`,
        [leaderboardJson]
    );

    // Warmup
    for (let i = 0; i < WARMUP; i++) await pool.query(LEADERBOARD_QUERY);
    for (let i = 0; i < WARMUP; i++) await redis.get('leaderboard');
    for (let i = 0; i < WARMUP; i++) await pool.query(`SELECT value FROM cache_logged WHERE key = 'leaderboard'`);

    process.stdout.write('  Computing from scratch...');
    const compute = await measure(async () => {
        await pool.query(LEADERBOARD_QUERY);
    }, ITERATIONS);
    process.stdout.write(' done\n');

    process.stdout.write('  Reading from PG table...');
    const pgCache = await measure(async () => {
        await pool.query(`SELECT value FROM cache_logged WHERE key = 'leaderboard'`);
    }, ITERATIONS);
    process.stdout.write(' done\n');

    process.stdout.write('  Reading from Redis...');
    const redisCache = await measure(async () => {
        await redis.get('leaderboard');
    }, ITERATIONS);
    process.stdout.write(' done\n');

    const speedup = compute.avg / pgCache.avg;

    console.log();
    console.log(`  PG query (compute):  ${fmt(compute.avg)}`);
    console.log(`  PG table (cached):   ${fmt(pgCache.avg)}`);
    console.log(`  Redis (cached):      ${fmt(redisCache.avg)}`);
    console.log();
    console.log(`  Caching is ~${speedup.toFixed(0)}x faster.`);
    console.log();

    await pool.end();
    redis.disconnect();
}

main().catch(err => { console.error(err); process.exit(1); });
