-- PL/Python: make HTTP requests from PostgreSQL
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

resp = urllib.request.urlopen(req)
return json.dumps(json.loads(resp.read()))
$$ LANGUAGE plpython3u;


-- Call it from SQL
SELECT notion_post('Hello from PostgreSQL!');

-- Or via PostgREST
-- curl -X POST http://localhost:8090/rpc/post_to_notion \
--   -H "Content-Type: application/json" \
--   -d '{"title": "Hello from the audience!"}'
