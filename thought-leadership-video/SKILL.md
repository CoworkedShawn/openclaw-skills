---
name: thought-leadership-video
description: Generate and post thought leadership videos using HeyGen and distribute to multiple platforms.
---

# Thought Leadership Video Pipeline

A complete pipeline for generating AI avatar videos and distributing them across social platforms.

## Overview

1. **Script** → Extract from your content source
2. **Generate** → HeyGen API (streaming avatar)
3. **Captions** → Use HeyGen's caption feature or post-process with CapCut
4. **Host** → Upload to CDN (Cloudflare R2, S3, etc.)
5. **Distribute** → YouTube, Facebook, Instagram, Threads, LinkedIn

---

## Pipeline Steps

### 1. Prepare Script

Keep scripts TTS-optimized:
- Short sentences
- No complex punctuation
- Natural speech patterns

### 2. Generate Video (HeyGen)

Store HeyGen credentials in keychain:
```bash
security add-generic-password -s "openclaw-heygen" -a "heygen" \
  -w '{"api_key":"your_api_key","avatar_id":"your_avatar_id","voice_id":"your_voice_id"}' -U
```

**API Call:**
```python
import requests, json, subprocess

# Get credentials
result = subprocess.run(['security', 'find-generic-password', '-s', 'openclaw-heygen', '-w'], capture_output=True, text=True)
creds = json.loads(result.stdout.strip())

# Generate video
response = requests.post(
    'https://api.heygen.com/v2/video/generate',
    headers={'X-Api-Key': creds['api_key'], 'Content-Type': 'application/json'},
    json={
        'video_inputs': [{
            'character': {'type': 'avatar', 'avatar_id': creds['avatar_id']},
            'voice': {'type': 'audio', 'voice_id': creds['voice_id']},
            'script': {'type': 'text', 'input': 'Your script here'}
        }],
        'dimension': {'width': 1080, 'height': 1920},
        'caption': True  # Bakes captions into video
    }
)
video_id = response.json()['data']['video_id']
```

### 3. Download Video

Poll for completion, then use `video_url_caption` (not `video_url`) for baked-in captions:

```python
# Poll status
status = requests.get(
    f'https://api.heygen.com/v1/video_status.get?video_id={video_id}',
    headers={'X-Api-Key': creds['api_key']}
).json()

if status['data']['status'] == 'completed':
    video_url = status['data']['video_url_caption']  # With captions
```

### 4. Upload to CDN

**Cloudflare R2 example:**
```bash
wrangler r2 object put your-bucket/video.mp4 \
  --file=video.mp4 \
  --content-type=video/mp4 \
  --remote
```

Instagram and Threads require public URLs (not local files).

### 5. Post to Platforms

---

## Platform Credentials

### YouTube
```json
{
  "client_id": "your_client_id.apps.googleusercontent.com",
  "client_secret": "your_client_secret",
  "refresh_token": "your_refresh_token"
}
```

⚠️ **Tokens expire** — refresh before EVERY upload:
```python
requests.post('https://oauth2.googleapis.com/token', data={
    'client_id': creds['client_id'],
    'client_secret': creds['client_secret'],
    'refresh_token': creds['refresh_token'],
    'grant_type': 'refresh_token'
})
```

### LinkedIn
**Keychain:** `openclaw-linkedin`

⚠️ **Uses camelCase keys:**
- `accessToken` (not `access_token`)
- `linkedinId` (not `linkedin_id`)

**Person URN:** `urn:li:person:{linkedinId}`

### Facebook
```json
{
  "PAGE_ID": "your_page_id",
  "PAGE_ACCESS_TOKEN": "your_page_token"
}
```

Native chunked upload (start → transfer → finish).

### Instagram
Same credentials as Facebook:
- `IG_USER_ID`
- `PAGE_ACCESS_TOKEN`

⚠️ **Requires public URL** (not local file)
- Wait 30s after container creation before publish

### Threads
```json
{
  "THREADS_USER_ID": "your_threads_id",
  "THREADS_ACCESS_TOKEN": "your_threads_token"
}
```

⚠️ **Requires public URL** (not local file)
⚠️ **Wait 45+ seconds** for video processing (20s will fail)

---

## Platform Configuration

Store your platform IDs in a config file or TOOLS.md:

```yaml
platforms:
  youtube:
    channel_id: "your_channel_id"
  facebook:
    page_id: "your_page_id"
  instagram:
    user_id: "your_ig_user_id"
  threads:
    user_id: "your_threads_user_id"
  linkedin:
    person_id: "your_linkedin_id"
```

---

## Posting Schedule

Establish a consistent schedule:
- **Tuesday**: Episode 1
- **Thursday**: Episode 2

Stagger posts across platforms:
- 7:00 AM → YouTube
- 7:30 AM → Instagram Reel
- 8:00 AM → LinkedIn + Facebook
- 8:15 AM → Threads

---

## Checklist Before Posting

- [ ] Script is TTS-optimized
- [ ] Video downloaded with captions (`video_url_caption`)
- [ ] Video uploaded to CDN with public URL
- [ ] YouTube token refreshed
- [ ] LinkedIn using camelCase keys
- [ ] Threads wait time ≥45s

---

## Tips

1. **HeyGen captions** — Use `caption: true` to bake captions into the video
2. **Instagram/Threads** — Must use public CDN URLs, not local files
3. **LinkedIn video** — Use native upload, not URL embedding
4. **Facebook** — Chunked upload works best for larger files
5. **YouTube** — Always refresh token before upload
