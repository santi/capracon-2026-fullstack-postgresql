// Part 2: Search with PostgreSQL
// No separate service. Just a column, an index, and a query.
// tsvector + GIN index + websearch_to_tsquery.
//
// Run: node 2-pg-search.js "your search phrase"

const { Pool } = require('pg');

const pool = new Pool({
    host: 'localhost', port: 5434,
    database: 'searchtest', user: 'postgres', password: 'postgres',
});

const query = process.argv.slice(2).join(' ');

if (!query) {
    console.error('  Usage: node 2-pg-search.js "your search phrase"');
    process.exit(1);
}

async function main() {
    console.log(`\n  Searching for: "${query}"\n`);

    const start = process.hrtime.bigint();
    const result = await pool.query(`
        SELECT id, title,
               ts_rank(search_vector, websearch_to_tsquery('english', $1)) AS rank,
               ts_headline('english', body, websearch_to_tsquery('english', $1),
                   'StartSel=**, StopSel=**, MaxFragments=2, MaxWords=30') AS headline
        FROM questions
        WHERE search_vector @@ websearch_to_tsquery('english', $1)
        ORDER BY rank DESC
        LIMIT 10
    `, [query]);
    const ms = Number(process.hrtime.bigint() - start) / 1e6;

    for (const row of result.rows) {
        console.log(`  [${parseFloat(row.rank).toFixed(2)}] ${row.title}`);
        console.log(`         ${row.headline}`);
        console.log();
    }

    console.log(`  ${result.rows.length} results in ${ms.toFixed(2)}ms`);
    console.log();

    await pool.end();
}

main().catch(err => { console.error(err); process.exit(1); });
