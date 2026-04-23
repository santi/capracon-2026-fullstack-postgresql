// Part 3: Redis vs. PostgreSQL unlogged table
// Head-to-head comparison. Both are ephemeral caches.
// One requires a separate service. The other is just a table.
//
// Run: node 3-redis-vs-unlogged.js [--iterations N]
// SQL: sql/3-redis-vs-unlogged.sql

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
    console.log(`\n  Part 3: Redis vs. PG unlogged table (${ITERATIONS} iterations)\n`);

    // Table pre-filled with 100k rows — benchmark runs against realistic table size
    await redis.flushall();

    const redisWrite = async (i) => {
        await redis.set(`key:${i}`, SAMPLE_VALUE, 'EX', 60);
    };

    const pgWrite = async (i) => {
        await pool.query(
            `INSERT INTO cache_unlogged (key, value, expires_at)
             VALUES ($1, $2, now() + interval '60 seconds')
             ON CONFLICT (key) DO UPDATE
                 SET value = EXCLUDED.value, expires_at = EXCLUDED.expires_at`,
            [`key:${i}`, SAMPLE_VALUE]
        );
    };

    const redisRead = async (i) => {
        await redis.get(`key:${i}`);
    };

    const pgRead = async (i) => {
        await pool.query(`SELECT value FROM cache_unlogged WHERE key = $1`, [`key:${i}`]);
    };

    // Warmup
    for (let i = 0; i < WARMUP; i++) { await redisWrite(i); await pgWrite(i); }
    for (let i = 0; i < WARMUP; i++) { await redisRead(i); await pgRead(i); }

    process.stdout.write('  Writing to Redis...');
    const wRedis = await measure(redisWrite, ITERATIONS);
    process.stdout.write(' done\n');

    process.stdout.write('  Writing to PG unlogged...');
    const wPg = await measure(pgWrite, ITERATIONS);
    process.stdout.write(' done\n');

    process.stdout.write('  Reading from Redis...');
    const rRedis = await measure(redisRead, ITERATIONS);
    process.stdout.write(' done\n');

    process.stdout.write('  Reading from PG unlogged...');
    const rPg = await measure(pgRead, ITERATIONS);
    process.stdout.write(' done\n');

    const writeDiff = (wPg.avg - wRedis.avg);
    const readDiff = (rPg.avg - rRedis.avg);

    console.log();
    console.log(`  Redis write:      ${fmt(wRedis.avg)}`);
    console.log(`  PG write:         ${fmt(wPg.avg)}`);
    console.log(`  Redis read:       ${fmt(rRedis.avg)}`);
    console.log(`  PG read:          ${fmt(rPg.avg)}`);
    console.log();
    console.log(`  Difference: ${writeDiff.toFixed(2)}ms writes, ${readDiff.toFixed(2)}ms reads.`);
    console.log();

    await pool.end();
    redis.disconnect();
}

main().catch(err => { console.error(err); process.exit(1); });
