# Example API Integration Runbook

## Prerequisites
- API credentials stored in macOS Keychain
- Python 3 with `requests` library

## Steps

### Step 1: Get Credentials from Keychain
```python
import json
import subprocess

result = subprocess.run(
    ['security', 'find-generic-password', '-s', 'service-name', '-w'],
    capture_output=True, text=True
)
creds = json.loads(result.stdout.strip())
```

### Step 2: Authenticate
```python
import requests

token_response = requests.post(
    'https://api.example.com/oauth/token',
    data={
        'grant_type': 'client_credentials',
        'client_id': creds['client_id'],
        'client_secret': creds['client_secret']
    }
)
access_token = token_response.json()['access_token']
```

### Step 3: Make API Call
```python
headers = {'Authorization': f'Bearer {access_token}'}

response = requests.get(
    'https://api.example.com/v1/resource',
    headers=headers
)
data = response.json()
```

## Error Handling

| Error | Cause | Fix |
|-------|-------|-----|
| 401 | Token expired | Re-authenticate |
| 403 | Insufficient permissions | Check API scopes |
| 429 | Rate limited | Wait and retry |

## Verification
- Response status code should be 200
- Response should contain expected data structure
