// Send a notification to all listeners.
//
// Run: node 2-notify.js "your message here"

const { Client } = require('pg');

const client = new Client({
    host: 'localhost', port: 5437,
    database: 'pubsubtest', user: 'postgres', password: 'postgres',
});

const message = process.argv.slice(2).join(' ');

if (!message) {
    console.error('  Usage: node 2-notify.js "your message"');
    process.exit(1);
}

async function main() {
    await client.connect();
    await client.query('SELECT pg_notify($1, $2)', ['events', message]);
    console.log(`  Sent: ${message}`);
    await client.end();
}

main().catch(err => { console.error(err); process.exit(1); });
