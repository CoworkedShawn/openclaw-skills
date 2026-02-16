---
name: memory-engine
description: Cognitive control memory system based on "On Task" by David Badre. Handles input gating, output gating, hierarchical memory, and procedural runbooks.
homepage: https://mitpress.mit.edu/9780262545266/on-task/
version: 2.0.0
metadata:
  openclaw:
    emoji: "🧠"
---

# Memory Engine Skill v2.0

A cognitive control memory system inspired by **David Badre's "On Task"** — applying neuroscience principles of gating, hierarchical control, and working memory to agent memory management.

## What's New in v2.0

- **`sync`** - Pulls current cron inventory into active-context.md
- **`stub`** - Creates today's daily note from template
- **`refresh`** - Full refresh (stub + sync + state check)
- **`alert`** - P0/P1/P2 severity-based alerts with exit codes
- **Heartbeat integration** - Memory check as first step of every heartbeat
- **Model switch protocol** - Explicit continuity for model changes

## Quick Start

### 1. Install the Engine

```bash
# Copy scripts to your workspace
mkdir -p ~/.openclaw/workspace/memory-engine/scripts
cp memory-engine/scripts/engine.js ~/.openclaw/workspace/memory-engine/scripts/

# Copy templates
cp -r memory-engine/templates/* ~/.openclaw/workspace/memory/
```

### 2. Basic Commands

```bash
cd ~/.openclaw/workspace

# Full refresh (recommended daily)
node memory-engine/scripts/engine.js refresh

# Check for alerts
node memory-engine/scripts/engine.js alert

# Sync state to active-context.md
node memory-engine/scripts/engine.js sync

# Create today's daily note
node memory-engine/scripts/engine.js stub

# Full audit
node memory-engine/scripts/engine.js audit

# Archive old notes (30+ days)
node memory-engine/scripts/engine.js decay
```

### 3. Directory Structure

```
~/.openclaw/workspace/
├── MEMORY.md                    # Strategic: Long-term lessons
├── memory/
│   ├── ARCHITECTURE.md          # Framework documentation
│   ├── active-context.md        # Working memory (ALWAYS READ)
│   ├── decay-policies.md        # Content lifecycle rules
│   ├── state-detectors.md       # Automated update triggers
│   ├── YYYY-MM-DD.md           # Daily notes
│   ├── runbooks/
│   │   ├── README.md           # Runbook index
│   │   └── *.md                # Procedural runbooks
│   └── archive/                # Archived old notes
├── memory-engine/
│   └── scripts/
│       └── engine.js           # Memory engine CLI
```

---

## Alert Severity Levels

| Level | Meaning | Exit Code | Action Required |
|-------|---------|-----------|-----------------|
| **P0** | CRITICAL | 2 | Fix immediately |
| **P1** | WARNING | 1 | Note for attention |
| **P2** | INFO | 0 | Informational |

**P0 Triggers:**
- `active-context.md` missing
- `active-context.md` >48 hours stale

**P1 Triggers:**
- `active-context.md` >24 hours stale
- Cron job with 3+ consecutive errors

**P2 Triggers:**
- Today's daily note missing

---

## Core Architecture

```
MEMORY.md           ← Strategic: Identity, relationships, long-term lessons
  active-context.md ← Operational: Current projects, deadlines, commitments
    YYYY-MM-DD.md   ← Tactical: Daily events, raw notes, session logs
```

**Information flows UP** through consolidation (daily notes → active context → strategic memory).
**Information flows DOWN** through decomposition (goals → tasks → actions).

---

## Session Protocols

### Session Start
```markdown
□ Read active-context.md (working memory)
□ Check staleness (Last Updated timestamp)
□ If stale (>24h), run `node engine.js refresh`
□ Load relevant runbooks for current task
```

### Session End
```markdown
□ Run `node engine.js sync`
□ Update today's daily note if significant events
□ If new procedure discovered, create runbook
□ If lesson learned, consider promoting to MEMORY.md
```

### Model Switch (GP-007)
When you're a different model than the previous turn:
1. **MANDATORY**: Read `memory/active-context.md` FIRST
2. Check "Session Handoff" section for in-progress work
3. Load relevant runbooks
4. If stale, run refresh

---

## Input Gating (What Enters Memory)

| Priority | Type | Destination | Example |
|----------|------|-------------|---------|
| **P0** | Critical | active-context.md | Deadlines, commitments, credentials |
| **P1** | Operational | active-context.md | Project state, decisions, configs |
| **P2** | Context | YYYY-MM-DD.md | Meeting notes, conversation summaries |
| **P3** | Ephemeral | Session only | Debug steps, one-time lookups |

---

## Gating Policies (Failure Prevention)

| Policy | Trigger | Action |
|--------|---------|--------|
| GP-001 | After cron create | Verify with `cron list`, store IDs |
| GP-002 | Config change | Update TOOLS.md immediately |
| GP-004 | Session end | Run `node engine.js sync` |
| GP-005 | Before cron create | List existing, remove duplicates |
| GP-007 | Model switch | Read active-context.md + runbooks |
| GP-008 | New procedure | Create/update runbook |
| GP-009 | P0 event | Immediately update active-context.md |
| GP-010 | Weekly | Execute decay audit |

---

## Heartbeat Integration

Add to your `HEARTBEAT.md`:

```markdown
## 🧠 Memory Check (ALWAYS FIRST)
Run memory engine alert check before anything else:

node ~/.openclaw/workspace/memory-engine/scripts/engine.js alert

**If P0 alerts**: Fix immediately before proceeding
**If P1 alerts**: Note for attention, continue
**If no alerts**: Proceed with other checks
```

---

## Cron Jobs (Optional)

### Daily Alert Check (Midnight)
```json
{
  "name": "Memory Engine - Daily Alert Check",
  "schedule": { "kind": "cron", "expr": "0 0 * * *", "tz": "America/New_York" },
  "sessionTarget": "isolated",
  "payload": {
    "kind": "agentTurn",
    "message": "Run: node ~/.openclaw/workspace/memory-engine/scripts/engine.js alert\n\nIf P0 alerts, run refresh and notify user.",
    "model": "haiku"
  }
}
```

### Weekly Maintenance (Saturday 3AM)
```json
{
  "name": "Memory Engine - Weekly Maintenance",
  "schedule": { "kind": "cron", "expr": "0 3 * * 6", "tz": "America/New_York" },
  "sessionTarget": "isolated",
  "payload": {
    "kind": "agentTurn",
    "message": "Run: node ~/.openclaw/workspace/memory-engine/scripts/engine.js audit\nThen: node engine.js decay\n\nReport results.",
    "model": "haiku"
  }
}
```

---

## Retrieval Protocol

1. **Start with** `active-context.md` (working memory)
2. **If not there**, check `TOOLS.md` (domain config)
3. **If still unclear**, use `memory_search`
4. **If nothing found**, check `MEMORY.md` (long-term)
5. **If truly unknown**, ask the human

**Never guess when memory is available to check.**

---

## Template Files Included

| File | Purpose |
|------|---------|
| `templates/ARCHITECTURE.md` | Full framework documentation |
| `templates/active-context.template.md` | Working memory template |
| `templates/MEMORY.template.md` | Long-term memory template |
| `templates/daily-note.template.md` | Daily notes template |
| `templates/decay-policies.md` | Content lifecycle rules |
| `templates/state-detectors.md` | Automated update triggers |
| `scripts/engine.js` | Memory engine CLI (v2.0) |

---

## Why This Matters

From Badre's "On Task": The brain doesn't just store information — it **gates** what enters memory, **retrieves** selectively based on context, and **monitors** for relevance.

This system applies those principles:

1. **Input gating** prevents noise from cluttering memory
2. **Output gating** ensures relevant context is loaded
3. **Hierarchical control** maintains abstraction levels
4. **Working memory** provides session continuity
5. **Gating policies** prevent repeated failures
6. **Runbooks** externalize procedural knowledge
7. **Alerts** surface critical issues before they cause failures

**The goal: Never lose operational context, even across model switches or session resets.**
