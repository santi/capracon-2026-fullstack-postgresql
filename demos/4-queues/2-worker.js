// Worker that claims and processes jobs using SKIP LOCKED
// Run multiple instances to see them split work without conflicts.
//
// Run: node 2-worker.js [worker-name]

const { Pool } = require('pg');

const pool = new Pool({
    host: 'localhost', port: 5436,
    database: 'queuetest', user: 'postgres', password: 'postgres',
});

const name = process.argv[2] || 'worker-' + process.pid;

async function claimAndProcess() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const { rows } = await client.query(`
            SELECT id, payload FROM jobs
            ORDER BY created_at
            LIMIT 1
            FOR UPDATE SKIP LOCKED
        `);

        if (rows.length === 0) {
            await client.query('ROLLBACK');
            return null;
        }

        const job = rows[0];

        // Simulate work
        await new Promise(r => setTimeout(r, 500 + Math.random() * 500));

        await client.query('DELETE FROM jobs WHERE id = $1', [job.id]);
        await client.query('COMMIT');
        return job;
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
}

async function main() {
    console.log(`  [${name}] Starting...\n`);

    while (true) {
        const job = await claimAndProcess();
        if (!job) {
            console.log(`  [${name}] No more jobs. Done.\n`);
            break;
        }
        console.log(`  [${name}] Processed job #${job.id}: ${job.payload}`);
    }

    await pool.end();
}

main().catch(err => { console.error(err); process.exit(1); });
