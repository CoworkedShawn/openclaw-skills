---
name: meta-social
description: Manage Facebook Pages and Instagram Business via Meta Graph API. Post content (text, photos, videos, reels), list posts, manage comments. Use for social media publishing.
---

# Meta Social (Facebook + Instagram)

Unified skill for Facebook Page and Instagram Business posting via Meta Graph API.

## Features

**Facebook:**
- List Pages you manage
- Post content (text, photos, links)
- List Page posts
- Manage comments (list/reply/hide/delete)

**Instagram:**
- List linked Instagram Business accounts
- Post photos with captions
- Post videos/Reels
- View account insights

## Setup (một lần)

### 1. Tạo Meta App
1. Vào https://developers.facebook.com/apps/ → Create App
2. Chọn **"Other"** → **"Business"** (hoặc Consumer tuỳ use-case)
3. Điền tên app, email
4. Vào **App settings > Basic**: lấy **App ID** và **App Secret**

### 2. Cấu hình OAuth
1. Vào **Add Product** → thêm **Facebook Login**
2. Trong **Facebook Login > Settings**:
   - Valid OAuth Redirect URIs: để trống (dùng manual code flow)
3. Vào **App Roles > Roles** → thêm account làm Admin/Developer

### 3. Cấu hình .env
```bash
cd skills/facebook-page
cp .env.example .env
# Edit .env với App ID và Secret
```

### 4. Cài dependencies và lấy token
```bash
cd scripts
npm install
node auth.js login
```
Script sẽ:
1. In ra URL để user mở browser, đăng nhập, approve permissions
2. User copy URL sau khi approve (chứa `code=...`)
3. Paste URL vào terminal
4. Script exchange code → long-lived token → page tokens
5. Lưu tokens vào `~/.config/fbpage/tokens.json`

## Commands

### List pages
```bash
node cli.js pages
```

### Đăng bài text
```bash
node cli.js post create --page PAGE_ID --message "Hello world"
```

### Đăng bài có ảnh
```bash
node cli.js post create --page PAGE_ID --message "Caption" --photo /path/to/image.jpg
```

### Đăng bài có link
```bash
node cli.js post create --page PAGE_ID --message "Check this out" --link "https://example.com"
```

### List posts
```bash
node cli.js post list --page PAGE_ID --limit 10
```

### List comments của post
```bash
node cli.js comments list --post POST_ID
```

### Reply comment
```bash
node cli.js comments reply --comment COMMENT_ID --message "Thanks!"
```

### Hide comment
```bash
node cli.js comments hide --comment COMMENT_ID
```

### Delete comment
```bash
node cli.js comments delete --comment COMMENT_ID
```

## Instagram Commands

### List Instagram accounts
```bash
node cli.js ig list
```

### Post photo to Instagram
```bash
node cli.js ig post --account @youraccount --image "https://example.com/image.jpg" --caption "Your caption here #hashtags"
```
Note: Image must be a PUBLIC URL accessible by Meta servers.

### Post video/Reel to Instagram
```bash
node cli.js ig video --account @youraccount --video "https://example.com/video.mp4" --caption "Caption" --reel
```

### View Instagram insights
```bash
node cli.js ig insights --account @youraccount
```

## Required Permissions

**Facebook:**
- `pages_show_list` - list pages
- `pages_read_engagement` - read posts/comments
- `pages_manage_posts` - create/edit/delete posts

**Instagram:**
- `instagram_basic` - basic account access
- `instagram_content_publish` - post content
- `instagram_manage_comments` - manage comments
- `instagram_manage_insights` - view analytics

## Notes
- Page tokens don't expire (when derived from long-lived user token)
- Never log/print tokens to output
- App in Testing mode only works with accounts in Roles
- Instagram images/videos must be hosted on public URLs (not local files)
