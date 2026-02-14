---
name: ms-graph-email
description: Microsoft Graph API email access for Microsoft 365 accounts via direct API calls.
homepage: https://docs.microsoft.com/en-us/graph/
metadata:
  openclaw:
    emoji: "📧"
    requires:
      bins: ["python3", "security"]
    install:
      - id: native
        kind: native
        bins: ["python3"]
        label: "Python 3 required for MS Graph API scripts"
---

# MS Graph Email Skill

Access Microsoft 365 email via Microsoft Graph API.

## Authentication

Credentials are stored in macOS Keychain:
- **Service**: `openclaw-microsoft365`

Store credentials as JSON:
```json
{
  "tenant_id": "your-tenant-id",
  "client_id": "your-client-id",
  "client_secret": "your-client-secret"
}
```

### Store in Keychain
```bash
security add-generic-password -s "openclaw-microsoft365" -a "graph" \
  -w '{"tenant_id":"xxx","client_id":"xxx","client_secret":"xxx"}' -U
```

### Get Token
```python
import json, subprocess, requests

result = subprocess.run(
    ['security', 'find-generic-password', '-s', 'openclaw-microsoft365', '-w'],
    capture_output=True, text=True
)
creds = json.loads(result.stdout.strip())

token_response = requests.post(
    f"https://login.microsoftonline.com/{creds['tenant_id']}/oauth2/v2.0/token",
    data={
        'grant_type': 'client_credentials',
        'client_id': creds['client_id'],
        'client_secret': creds['client_secret'],
        'scope': 'https://graph.microsoft.com/.default'
    }
)
token = token_response.json()['access_token']
```

## Configuration

Set your mailbox in scripts or as environment variable:
```python
MAILBOX = "user@yourdomain.com"
```

## Read Operations

### List Recent Emails
```python
response = requests.get(
    f'https://graph.microsoft.com/v1.0/users/{MAILBOX}/messages',
    headers={'Authorization': f'Bearer {token}'},
    params={
        '$top': 10,
        '$orderby': 'receivedDateTime desc',
        '$select': 'id,subject,from,receivedDateTime,bodyPreview,isRead'
    }
)
emails = response.json().get('value', [])
```

### Get Unread Emails
```python
params={
    '$filter': 'isRead eq false',
    '$orderby': 'receivedDateTime desc',
    '$top': 20
}
```

### Search Emails
```python
# Search by sender, subject, or body content
params={
    '$search': '"from:sender@example.com" OR "keyword"',
    '$top': 20
}

# Search with date filter
from datetime import datetime, timedelta
last_week = (datetime.utcnow() - timedelta(days=7)).strftime('%Y-%m-%dT%H:%M:%SZ')
params={
    '$filter': f'receivedDateTime ge {last_week}',
    '$search': '"important" OR "urgent"'
}
```

### Get Full Email Body
```python
response = requests.get(
    f'https://graph.microsoft.com/v1.0/users/{MAILBOX}/messages/{message_id}',
    headers={'Authorization': f'Bearer {token}'},
    params={'$select': 'subject,from,body,toRecipients,ccRecipients'}
)
email = response.json()
body_content = email['body']['content']
```

## Write Operations

### Send Email
```python
requests.post(
    f'https://graph.microsoft.com/v1.0/users/{MAILBOX}/sendMail',
    headers={'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'},
    json={
        'message': {
            'subject': 'Subject Line',
            'body': {'contentType': 'Text', 'content': 'Email body'},
            'toRecipients': [{'emailAddress': {'address': 'recipient@example.com'}}]
        }
    }
)
```

### Reply to Email
```python
requests.post(
    f'https://graph.microsoft.com/v1.0/users/{MAILBOX}/messages/{message_id}/reply',
    headers={'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'},
    json={
        'message': {
            'body': {'contentType': 'Text', 'content': 'Reply content'}
        }
    }
)
```

### Create Draft
```python
response = requests.post(
    f'https://graph.microsoft.com/v1.0/users/{MAILBOX}/messages',
    headers={'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'},
    json={
        'subject': 'Draft Subject',
        'body': {'contentType': 'Text', 'content': 'Draft body'},
        'toRecipients': [{'emailAddress': {'address': 'recipient@example.com'}}],
        'isDraft': True
    }
)
draft_id = response.json()['id']
```

### Mark as Read
```python
requests.patch(
    f'https://graph.microsoft.com/v1.0/users/{MAILBOX}/messages/{message_id}',
    headers={'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'},
    json={'isRead': True}
)
```

### Delete Email
```python
requests.delete(
    f'https://graph.microsoft.com/v1.0/users/{MAILBOX}/messages/{message_id}',
    headers={'Authorization': f'Bearer {token}'}
)
```

## Quick Reference

```python
# Full working example - search and read
import json, subprocess, requests

MAILBOX = "user@yourdomain.com"

# Auth
result = subprocess.run(['security', 'find-generic-password', '-s', 'openclaw-microsoft365', '-w'], capture_output=True, text=True)
creds = json.loads(result.stdout.strip())
token = requests.post(
    f"https://login.microsoftonline.com/{creds['tenant_id']}/oauth2/v2.0/token",
    data={'grant_type': 'client_credentials', 'client_id': creds['client_id'], 
          'client_secret': creds['client_secret'], 'scope': 'https://graph.microsoft.com/.default'}
).json()['access_token']

headers = {'Authorization': f'Bearer {token}'}

# Search for emails
response = requests.get(
    f'https://graph.microsoft.com/v1.0/users/{MAILBOX}/messages',
    headers=headers,
    params={'$search': '"project update"', '$top': 10, 
            '$select': 'subject,from,receivedDateTime,bodyPreview'}
)
for email in response.json().get('value', []):
    sender = email['from']['emailAddress']
    print(f"{email['receivedDateTime']}: {sender['name']} - {email['subject']}")
```

## Important Notes

- **Credentials in Keychain** — no hardcoded secrets
- **Rate limits**: 10,000 requests per 10 minutes per app
- **Permissions needed**: `Mail.Read`, `Mail.Send`, `Mail.ReadWrite` (delegated or application)
- **App registration**: Create in Azure Portal → App registrations
