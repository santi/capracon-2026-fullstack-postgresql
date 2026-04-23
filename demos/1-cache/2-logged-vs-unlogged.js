// Part 2: Logged vs. unlogged tables
// Both are PostgreSQL tables. The only difference: UNLOGGED skips the WAL.
// This matters for writes — reads are the same.
//
// Run: node 2-logged-vs-unlogged.js [--iterations N]
// SQL: sql/2-cache-unlogged.sql

const { pool, redis, ITERATIONS, WARMUP, measure, fmt } = require('./benchmark');

// ~2KB cached API response — realistic payload size
const SAMPLE_VALUE = JSON.stringify({
    leaderboard: Array.from({ length: 20 }, (_, i) => ({
        id: i + 1,
        title: `Question ${i + 1}: How does PostgreSQL handle ${['full-text search', 'JSON indexing', 'partitioning', 'replication', 'connection pooling'][i % 5]}?`,
        username: `user_${i * 7 + 3}`,
        talk_title: `Talk #${(i % 10) + 1}: Advanced PostgreSQL Patterns`,
        vote_count: 100 - i * 4,
        answers: [
            { id: i * 2 + 1, body: 'Great question! Here is a detailed answer with examples and benchmarks.', votes: 12 },
            { id: i * 2 + 2, body: 'We did this in production last year and it worked perfectly.', votes: 8 },
        ],
    })),
    generated_at: new Date().toISOString(),
    ttl: 60,
});

async function main() {
    console.log(`\n  Part 2: Logged vs. unlogged table (${ITERATIONS} iterations)\n`);

    // Tables pre-filled with 100k rows — benchmarks run against realistic table sizes

    const writeLogged = async (i) => {
        await pool.query(
            `INSERT INTO cache_logged (key, value, expires_at)
             VALUES ($1, $2, now() + interval '60 seconds')
             ON CONFLICT (key) DO UPDATE
                 SET value = EXCLUDED.value, expires_at = EXCLUDED.expires_at`,
            [`key:${i}`, SAMPLE_VALUE]
        );
    };

    const writeUnlogged = async (i) => {
        await pool.query(
            `INSERT INTO cache_unlogged (key, value, expires_at)
             VALUES ($1, $2, now() + interval '60 seconds')
             ON CONFLICT (key) DO UPDATE
                 SET value = EXCLUDED.value, expires_at = EXCLUDED.expires_at`,
            [`key:${i}`, SAMPLE_VALUE]
        );
    };

    const readLogged = async (i) => {
        await pool.query(`SELECT value FROM cache_logged WHERE key = $1`, [`key:${i}`]);
    };

    const readUnlogged = async (i) => {
        await pool.query(`SELECT value FROM cache_unlogged WHERE key = $1`, [`key:${i}`]);
    };

    // Warmup
    for (let i = 0; i < WARMUP; i++) await writeLogged(i);
    for (let i = 0; i < WARMUP; i++) await writeUnlogged(i);

    process.stdout.write('  Writing to logged table...');
    const wLogged = await measure(writeLogged, ITERATIONS);
    process.stdout.write(' done\n');

    process.stdout.write('  Writing to unlogged table...');
    const wUnlogged = await measure(writeUnlogged, ITERATIONS);
    process.stdout.write(' done\n');

    process.stdout.write('  Reading from logged table...');
    const rLogged = await measure(readLogged, ITERATIONS);
    process.stdout.write(' done\n');

    process.stdout.write('  Reading from unlogged table...');
    const rUnlogged = await measure(readUnlogged, ITERATIONS);
    process.stdout.write(' done\n');

    const writeFactor = wLogged.avg / wUnlogged.avg;

    console.log();
    console.log(`  Logged write:     ${fmt(wLogged.avg)}`);
    console.log(`  Unlogged write:   ${fmt(wUnlogged.avg)}  (${writeFactor.toFixed(1)}x faster — no WAL)`);
    console.log(`  Logged read:      ${fmt(rLogged.avg)}`);
    console.log(`  Unlogged read:    ${fmt(rUnlogged.avg)}  (same — both hit shared buffers)`);
    console.log();

    await pool.end();
    redis.disconnect();
}

main().catch(err => { console.error(err); process.exit(1); });
