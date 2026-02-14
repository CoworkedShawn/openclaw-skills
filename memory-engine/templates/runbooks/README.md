# Runbooks - Procedural Memory

Runbooks capture **HOW** to do things — exact commands, API endpoints, authentication flows, and multi-step procedures.

## Purpose

When you know WHAT state you're in (`active-context.md`) but need to know HOW to act on it, runbooks provide the procedural knowledge.

## When to Create a Runbook

Create a runbook if a task requires:
- Multi-step tool use
- API calls with specific auth flows
- CLI sequences with specific flags
- Any procedure you've debugged once and don't want to figure out again

## Runbook Format

```markdown
# [Task Name] Runbook

## Prerequisites
- Required tools/credentials
- Environment setup

## Steps

### Step 1: [Name]
```bash
# Exact command
```

### Step 2: [Name]
```python
# Exact code
```

## Error Handling
- If X happens, do Y
- Common issues and fixes

## Verification
How to confirm the task succeeded.
```

## Index

| Runbook | Purpose |
|---------|---------|
| `example-api.md` | Example API integration |

## Auto-Generated Runbooks

When the system detects repeated patterns (3+ similar tasks in 7 days), it creates candidate runbooks in `auto-generated/`. Review and promote useful ones to curated runbooks.

## Usage Rule

**Before executing any task with a runbook, READ IT FIRST.**

This is especially critical after model switches, when procedural knowledge in the context window is lost.
