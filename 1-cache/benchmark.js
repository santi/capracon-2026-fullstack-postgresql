const { Pool } = require('pg');
const Redis = require('ioredis');

const ITERATIONS = parseInt(process.argv.find((_, i, a) => a[i - 1] === '--iterations') || '2000');
const WARMUP = 100;

const pool = new Pool({
    host: 'localhost', port: 5433,
    database: 'speedtest', user: 'postgres', password: 'postgres',
});
const redis = new Redis({ host: 'localhost', port: 6380 });

// --- Shared helpers ---

async function measure(fn, n) {
    const timings = new Float64Array(n);
    for (let i = 0; i < n; i++) {
        const start = process.hrtime.bigint();
        await fn(i);
        timings[i] = Number(process.hrtime.bigint() - start) / 1e6;
    }
    return {
        avg: timings.reduce((a, b) => a + b, 0) / n,
    };
}

function fmt(ms) {
    return ms.toFixed(2) + 'ms';
}

module.exports = { pool, redis, ITERATIONS, WARMUP, measure, fmt };
