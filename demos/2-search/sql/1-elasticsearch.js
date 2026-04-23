const { Client } = require('@elastic/elasticsearch');
const es = new Client({ node: 'http://localhost:9200' });


// Create index with English analyzer
await es.indices.create({
    index: 'questions',
    body: {
        mappings: {
            properties: {
                title: { type: 'text', analyzer: 'english' },
                body:  { type: 'text', analyzer: 'english' },
            }
        }
    }
});


// Index a document
await es.index({
    index: 'questions',
    id: '42',
    document: {
        title: 'How does PostgreSQL full-text search work?',
        body:  'PostgreSQL has built-in tsvector and tsquery types...',
    }
});


// Search with ranking and highlighting
const result = await es.search({
    index: 'questions',
    body: {
        query: {
            multi_match: {
                query: 'full-text search',
                fields: ['title^2', 'body'],
                fuzziness: 'AUTO',
            }
        },
        highlight: {
            fields: { body: {} }
        }
    }
});
