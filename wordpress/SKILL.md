---
name: wordpress
description: Publish and manage blog posts on WordPress sites via REST API. Supports creating posts, drafts, uploading media, and managing categories/tags.
metadata:
  openclaw:
    emoji: "📝"
    requires:
      bins: ["python3", "security"]
---

# WordPress Skill

Manage WordPress sites via the REST API using Application Passwords.

## Setup

### 1. Create Application Password in WordPress

1. Log into WordPress admin (`/wp-admin`)
2. Go to **Users → Profile**
3. Scroll to **Application Passwords**
4. Enter name (e.g., "OpenClaw Agent")
5. Click **Add New Application Password**
6. Copy the generated password (shows only once)

### 2. Store in Keychain

```bash
security add-generic-password -s "openclaw-wordpress-yoursite" -a "username" \
  -w '{"username":"your_username","app_password":"xxxx xxxx xxxx xxxx","site_url":"https://yoursite.com"}' -U
```

## Authentication

```python
import json, subprocess, base64

# Get credentials
result = subprocess.run(
    ['security', 'find-generic-password', '-s', 'openclaw-wordpress-yoursite', '-w'],
    capture_output=True, text=True
)
creds = json.loads(result.stdout.strip())

# Create auth header
credentials = f"{creds['username']}:{creds['app_password']}"
token = base64.b64encode(credentials.encode()).decode()
headers = {
    'Authorization': f'Basic {token}',
    'Content-Type': 'application/json'
}
```

## Operations

### Create Post
```python
import requests

post_data = {
    'title': 'Post Title',
    'content': '<p>HTML content here</p>',
    'status': 'publish',  # or 'draft'
    'categories': [1],    # Category IDs
    'tags': [5, 6],       # Tag IDs
    'excerpt': 'Short description for previews'
}

response = requests.post(
    f"{creds['site_url']}/wp-json/wp/v2/posts",
    headers=headers,
    json=post_data
)

if response.status_code == 201:
    post = response.json()
    print(f"URL: {post['link']}")
    print(f"ID: {post['id']}")
```

### Update Post
```python
post_id = 123
update_data = {
    'title': 'Updated Title',
    'content': '<p>Updated content</p>'
}

response = requests.post(
    f"{creds['site_url']}/wp-json/wp/v2/posts/{post_id}",
    headers=headers,
    json=update_data
)
```

### List Posts
```python
response = requests.get(
    f"{creds['site_url']}/wp-json/wp/v2/posts",
    headers=headers,
    params={'per_page': 10, 'status': 'publish'}
)
posts = response.json()
for p in posts:
    print(f"{p['id']}: {p['title']['rendered']}")
```

### Get Categories
```python
response = requests.get(
    f"{creds['site_url']}/wp-json/wp/v2/categories",
    headers=headers
)
for cat in response.json():
    print(f"{cat['id']}: {cat['name']}")
```

### Get Tags
```python
response = requests.get(
    f"{creds['site_url']}/wp-json/wp/v2/tags",
    headers=headers,
    params={'per_page': 50}
)
for tag in response.json():
    print(f"{tag['id']}: {tag['name']}")
```

### Create Tag
```python
response = requests.post(
    f"{creds['site_url']}/wp-json/wp/v2/tags",
    headers=headers,
    json={'name': 'NewTag'}
)
new_tag = response.json()
print(f"Created tag ID: {new_tag['id']}")
```

### Upload Media (Featured Image)
```python
import os

image_path = '/path/to/image.jpg'
filename = os.path.basename(image_path)

with open(image_path, 'rb') as f:
    media_headers = {
        'Authorization': f'Basic {token}',
        'Content-Disposition': f'attachment; filename="{filename}"',
        'Content-Type': 'image/jpeg'
    }
    response = requests.post(
        f"{creds['site_url']}/wp-json/wp/v2/media",
        headers=media_headers,
        data=f.read()
    )

if response.status_code == 201:
    media = response.json()
    print(f"Media ID: {media['id']}")
    print(f"URL: {media['source_url']}")
    
    # Set as featured image
    requests.post(
        f"{creds['site_url']}/wp-json/wp/v2/posts/{post_id}",
        headers=headers,
        json={'featured_media': media['id']}
    )
```

### Delete Post
```python
# Move to trash
response = requests.delete(
    f"{creds['site_url']}/wp-json/wp/v2/posts/{post_id}",
    headers=headers
)

# Permanently delete (add force=true)
response = requests.delete(
    f"{creds['site_url']}/wp-json/wp/v2/posts/{post_id}",
    headers=headers,
    params={'force': True}
)
```

## Markdown to HTML

WordPress accepts HTML content. Basic markdown conversion:

```python
import re

def md_to_html(md):
    html = md
    
    # Code blocks first
    html = re.sub(
        r'```(\w+)?\n(.*?)```',
        lambda m: f'<pre><code class="language-{m.group(1) or ""}">{m.group(2)}</code></pre>',
        html, flags=re.DOTALL
    )
    
    # Headers
    html = re.sub(r'^### (.+)$', r'<h3>\1</h3>', html, flags=re.MULTILINE)
    html = re.sub(r'^## (.+)$', r'<h2>\1</h2>', html, flags=re.MULTILINE)
    html = re.sub(r'^# (.+)$', r'<h1>\1</h1>', html, flags=re.MULTILINE)
    
    # Bold/italic
    html = re.sub(r'\*\*(.+?)\*\*', r'<strong>\1</strong>', html)
    html = re.sub(r'\*(.+?)\*', r'<em>\1</em>', html)
    
    # Inline code
    html = re.sub(r'`([^`]+)`', r'<code>\1</code>', html)
    
    # Links
    html = re.sub(r'\[([^\]]+)\]\(([^)]+)\)', r'<a href="\2">\1</a>', html)
    
    return html
```

## Adding Multiple Sites

Store each site with a unique keychain service name:

```bash
# Site 1
security add-generic-password -s "openclaw-wordpress-blog" -a "admin" \
  -w '{"username":"admin","app_password":"xxxx","site_url":"https://blog.example.com"}' -U

# Site 2  
security add-generic-password -s "openclaw-wordpress-company" -a "editor" \
  -w '{"username":"editor","app_password":"yyyy","site_url":"https://company.example.com"}' -U
```

## Error Handling

| Status | Meaning | Action |
|--------|---------|--------|
| 201 | Created successfully | ✅ |
| 200 | Updated successfully | ✅ |
| 401 | Auth failed | Check app password |
| 403 | Forbidden | Check user permissions |
| 404 | Not found | Check post ID or endpoint |
| 500 | Server error | Check WordPress logs |

## Notes

- Application passwords have spaces (e.g., `Tt4Y 7gGX YCzV`) — this is normal
- Posts default to draft if status not specified
- Categories/tags use IDs, not names
- Media must be uploaded separately, then linked to posts
- Gutenberg blocks work best with clean HTML
