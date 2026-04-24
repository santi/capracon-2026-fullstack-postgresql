// Seed the queue with jobs
//
// Run: node 1-enqueue.js [count]

const { Pool } = require('pg');

const pool = new Pool({
    host: 'localhost', port: 5436,
    database: 'queuetest', user: 'postgres', password: 'postgres',
});

const count = parseInt(process.argv[2] || '20');

async function main() {
    // Reset
    await pool.query('TRUNCATE jobs RESTART IDENTITY');

    for (let i = 1; i <= count; i++) {
        await pool.query(
            `INSERT INTO jobs (payload) VALUES ($1)`,
            [`Send email to user_${i}`]
        );
    }

    console.log(`  Enqueued ${count} jobs.\n`);
    await pool.end();
}

main().catch(err => { console.error(err); process.exit(1); });
