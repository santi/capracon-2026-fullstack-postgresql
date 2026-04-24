// Listen for notifications on the "events" channel.
// Run this in one terminal, then send messages from another.
//
// Run: node 1-listen.js

const { Client } = require('pg');

const client = new Client({
    host: 'localhost', port: 5437,
    database: 'pubsubtest', user: 'postgres', password: 'postgres',
});

async function main() {
    await client.connect();
    await client.query('LISTEN events');

    console.log('  Listening on channel "events"... (Ctrl+C to stop)\n');

    client.on('notification', (msg) => {
        const time = new Date().toLocaleTimeString();
        console.log(`  [${time}] ${msg.payload}`);
    });
}

main().catch(err => { console.error(err); process.exit(1); });
