CREATE FUNCTION claude_describe(talk_id int) RETURNS text AS $$
import json, urllib.request, os

-- Fetch the talk from the FDW table
row = plpy.execute("SELECT title, speaker, room, time FROM talks WHERE id = %d" % talk_id)
talk = row[0]

body = json.dumps({
    "model": "claude-haiku-4-5-20251001",
    "max_tokens": 150,
    "messages": [{
        "role": "user",
        "content": f"Write a one-sentence conference teaser for this talk.\n\n"
                   f"Title: {talk['title']}\nSpeaker: {talk['speaker']}"
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


-- Call it from SQL — merges FDW data with AI
SELECT title, speaker, claude_describe(id) AS teaser
FROM talks WHERE id = 1;
