-- Extensions
CREATE EXTENSION plv8;
CREATE EXTENSION plpython3u;
CREATE EXTENSION file_fdw;

-- ============================================================
-- FDW: read a CSV file as a table
-- ============================================================
CREATE SERVER csv_server FOREIGN DATA WRAPPER file_fdw;

CREATE FOREIGN TABLE talks (
    id int,
    title text,
    speaker text,
    room text,
    time text
) SERVER csv_server OPTIONS (filename '/data/talks.csv', format 'csv', header 'true');

-- ============================================================
-- PostgREST: API schema and anon role
-- ============================================================
CREATE SCHEMA api;
CREATE ROLE anon NOLOGIN;
GRANT USAGE ON SCHEMA api TO anon;

-- Expose talks via PostgREST
CREATE VIEW api.talks AS SELECT * FROM talks;
GRANT SELECT ON api.talks TO anon;

-- ============================================================
-- PL/Python: HTTP POST to Notion
-- ============================================================
CREATE FUNCTION notion_post(title text) RETURNS json AS $$
import json, urllib.request, os

token = os.environ['NOTION_TOKEN']
page_id = os.environ['NOTION_DB_ID']

body = json.dumps({
    "properties": {
        "title": {
            "title": [{"text": {"content": title}}]
        }
    }
}).encode()

req = urllib.request.Request(
    'https://api.notion.com/v1/pages/' + page_id,
    data=body,
    method='PATCH',
    headers={
        'Authorization': f'Bearer {token}',
        'Content-Type': 'application/json',
        'Notion-Version': '2022-06-28',
    },
)

try:
    resp = urllib.request.urlopen(req)
    result = json.loads(resp.read())
    return json.dumps({"id": result["id"], "url": result["url"]})
except urllib.error.HTTPError as e:
    error = json.loads(e.read())
    return json.dumps({"error": error.get("message", str(e))})
$$ LANGUAGE plpython3u;

-- ============================================================
-- PL/V8: server logic — validates and calls Notion
-- ============================================================
CREATE FUNCTION api.post_to_notion(title text) RETURNS json AS $$
    if (!title || title.trim().length === 0) {
        return { error: 'Title cannot be empty' };
    }

    var result = plv8.execute(
        "SELECT notion_post($1) as response",
        [title.trim()]
    );

    return result[0].response;
$$ LANGUAGE plv8;

GRANT EXECUTE ON FUNCTION api.post_to_notion(text) TO anon;

-- ============================================================
-- PL/Python: Call Claude API with talk data
-- ============================================================
CREATE FUNCTION claude_describe(talk_id int) RETURNS text AS $$
import json, urllib.request, os

# Fetch the talk from the FDW table
row = plpy.execute("SELECT title, speaker, room, time FROM talks WHERE id = %d" % talk_id)
if len(row) == 0:
    return "Talk not found"

talk = row[0]

body = json.dumps({
    "model": "claude-haiku-4-5-20251001",
    "max_tokens": 150,
    "messages": [{
        "role": "user",
        "content": f"Write a one-sentence conference teaser for this talk. Be witty and enthusiastic.\n\nTitle: {talk['title']}\nSpeaker: {talk['speaker']}\nRoom: {talk['room']}\nTime: {talk['time']}"
    }]
}).encode()

req = urllib.request.Request(
    'https://api.anthropic.com/v1/messages',
    data=body,
    headers={
        'x-api-key': os.environ['ANTHROPIC_API_KEY'],
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01',
    },
)

resp = urllib.request.urlopen(req)
result = json.loads(resp.read())
return result['content'][0]['text']
$$ LANGUAGE plpython3u;

-- ============================================================
-- PL/V8: PostgREST wrapper for Claude
-- ============================================================
CREATE FUNCTION api.describe_talk(talk_id int) RETURNS json AS $$
    var result = plv8.execute(
        "SELECT claude_describe($1) as description",
        [talk_id]
    );
    return { description: result[0].description };
$$ LANGUAGE plv8;

GRANT EXECUTE ON FUNCTION api.describe_talk(int) TO anon;
