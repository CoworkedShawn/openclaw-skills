#!/usr/bin/env python3
"""
Microsoft Graph Email Checker
Check for unread emails in a Microsoft 365 mailbox.

Usage:
    python3 email-check.py                    # Check default mailbox
    python3 email-check.py user@domain.com    # Check specific mailbox
"""

import json
import subprocess
import sys
import requests


def get_credentials():
    """Get MS Graph credentials from macOS Keychain."""
    result = subprocess.run(
        ['security', 'find-generic-password', '-s', 'openclaw-microsoft365', '-w'],
        capture_output=True, text=True
    )
    if result.returncode != 0:
        print("❌ No credentials found in keychain")
        print("   Store credentials with:")
        print('   security add-generic-password -s "openclaw-microsoft365" -a "graph" \\')
        print('     -w \'{"tenant_id":"xxx","client_id":"xxx","client_secret":"xxx"}\' -U')
        sys.exit(1)
    return json.loads(result.stdout.strip())


def get_token(creds):
    """Get access token from Microsoft."""
    response = requests.post(
        f"https://login.microsoftonline.com/{creds['tenant_id']}/oauth2/v2.0/token",
        data={
            'grant_type': 'client_credentials',
            'client_id': creds['client_id'],
            'client_secret': creds['client_secret'],
            'scope': 'https://graph.microsoft.com/.default'
        }
    )
    if response.status_code != 200:
        print(f"❌ Auth failed: {response.text}")
        sys.exit(1)
    return response.json()['access_token']


def check_emails(mailbox, token, unread_only=True, limit=10):
    """Check emails in the specified mailbox."""
    headers = {'Authorization': f'Bearer {token}'}
    
    params = {
        '$top': limit,
        '$orderby': 'receivedDateTime desc',
        '$select': 'subject,from,receivedDateTime,isRead,bodyPreview'
    }
    
    if unread_only:
        params['$filter'] = 'isRead eq false'
    
    response = requests.get(
        f'https://graph.microsoft.com/v1.0/users/{mailbox}/messages',
        headers=headers,
        params=params
    )
    
    if response.status_code != 200:
        print(f"❌ Failed to get emails: {response.text}")
        sys.exit(1)
    
    return response.json().get('value', [])


def main():
    # Get mailbox from args or use default
    mailbox = sys.argv[1] if len(sys.argv) > 1 else None
    
    if not mailbox:
        print("Usage: python3 email-check.py user@domain.com")
        print("Set your mailbox as the first argument")
        sys.exit(1)
    
    print(f"📧 Checking {mailbox}...")
    
    creds = get_credentials()
    token = get_token(creds)
    emails = check_emails(mailbox, token)
    
    if not emails:
        print("✅ No unread emails")
        return
    
    print(f"\n📬 {len(emails)} unread email(s):\n")
    
    for email in emails:
        sender = email['from']['emailAddress']
        name = sender.get('name', sender['address'])
        subject = email.get('subject', '(no subject)')
        received = email['receivedDateTime'][:16].replace('T', ' ')
        preview = email.get('bodyPreview', '')[:80]
        
        print(f"From: {name}")
        print(f"Subject: {subject}")
        print(f"Received: {received}")
        print(f"Preview: {preview}...")
        print("-" * 50)


if __name__ == '__main__':
    main()
