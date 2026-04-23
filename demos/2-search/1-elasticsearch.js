// Part 1: Search with Elasticsearch
// The standard approach: a separate search service.
// Index documents, then query them.
//
// Run: node 1-elasticsearch.js

const { Client } = require('@elastic/elasticsearch');
const { Pool } = require('pg');

const es = new Client({ node: 'http://localhost:9201' });
const pool = new Pool({
    host: 'localhost', port: 5434,
    database: 'searchtest', user: 'postgres', password: 'postgres',
});

const query = process.argv.slice(2).join(' ');

if (!query) {
    console.error('  Usage: node 1-elasticsearch.js "your search phrase"');
    process.exit(1);
}

async function main() {
    // Index all questions from PG into Elasticsearch (one-time setup)
    const exists = await es.indices.exists({ index: 'questions' });
    if (!exists) {
        process.stdout.write('  Indexing questions into Elasticsearch...');
        const { rows } = await pool.query('SELECT id, title, body FROM questions');
        const body = rows.flatMap(q => [
            { index: { _index: 'questions', _id: String(q.id) } },
            { title: q.title, body: q.body },
        ]);
        await es.bulk({ body, refresh: true });
        process.stdout.write(' done\n');
    }

    console.log(`\n  Searching for: "${query}"\n`);

    const start = process.hrtime.bigint();
    const result = await es.search({
        index: 'questions',
        body: {
            query: { multi_match: { query, fields: ['title^2', 'body'], fuzziness: 'AUTO' } },
            highlight: { fields: { body: {} } },
            size: 10,
        },
    });
    const ms = Number(process.hrtime.bigint() - start) / 1e6;

    for (const hit of result.hits.hits) {
        const headline = hit.highlight?.body?.[0] || hit._source.body.slice(0, 120);
        console.log(`  [${hit._score.toFixed(2)}] ${hit._source.title}`);
        console.log(`         ${headline}`);
        console.log();
    }

    console.log(`  ${result.hits.hits.length} results in ${ms.toFixed(2)}ms`);
    console.log();

    await pool.end();
}

main().catch(err => { console.error(err); process.exit(1); });
