---
name: memory-engine
description: Cognitive control memory system based on "On Task" by David Badre. Handles input gating, output gating, hierarchical memory, and procedural runbooks.
homepage: https://mitpress.mit.edu/9780262545266/on-task/
metadata:
  openclaw:
    emoji: "🧠"
---

# Memory Engine Skill

A cognitive control memory system inspired by **David Badre's "On Task"** — applying neuroscience principles of gating, hierarchical control, and working memory to agent memory management.

## Quick Start

### 1. Copy Templates to Your Workspace

```bash
# Copy the templates directory
cp -r memory-engine/templates/* ~/.openclaw/workspace/memory/

# Rename template files
mv ~/.openclaw/workspace/memory/active-context.template.md ~/.openclaw/workspace/memory/active-context.md
mv ~/.openclaw/workspace/memory/MEMORY.template.md ~/.openclaw/workspace/MEMORY.md
```

### 2. Directory Structure

```
~/.openclaw/workspace/
├── MEMORY.md                    # Strategic: Long-term lessons (from template)
├── memory/
│   ├── ARCHITECTURE.md          # Framework documentation
│   ├── active-context.md        # Working memory (from template)
│   ├── decay-policies.md        # Content lifecycle rules
│   ├── state-detectors.md       # Automated update triggers
│   ├── YYYY-MM-DD.md           # Daily notes (create as needed)
│   ├── runbooks/
│   │   ├── README.md           # Runbook index
│   │   └── *.md                # Procedural runbooks
│   └── archive/                # Decayed content (auto-created)
```

### 3. Configure Your Agent

Add to your `AGENTS.md` or system prompt:

```markdown
## Memory Protocol

Before acting on any task:
1. Read `memory/active-context.md` (working memory)
2. If task has a runbook, read it from `memory/runbooks/`
3. Check `TOOLS.md` for domain-specific config

At session end:
1. Update `active-context.md` with any state changes
2. Write significant events to today's daily note
3. If new procedure discovered, create a runbook
```

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

## Input Gating (What Enters Memory)

Not everything is worth storing. Classify before writing:

| Priority | Type | Destination | Example |
|----------|------|-------------|---------|
| **P0** | Critical | active-context.md | Deadlines, commitments, credentials |
| **P1** | Operational | active-context.md | Project state, decisions, configs |
| **P2** | Context | YYYY-MM-DD.md | Meeting notes, conversation summaries |
| **P3** | Ephemeral | Session only | Debug steps, one-time lookups |

---

## Output Gating (When Memory Influences Action)

| Context | What Gets Loaded |
|---------|------------------|
| Session start | active-context.md (always) |
| Email task | + email config from TOOLS.md |
| Video task | + video config + platform credentials |
| Scheduling | + calendar config |
| Any complex task | + relevant runbook |

**Key insight**: Always load working memory (`active-context.md`), but only load domain-specific files when that domain is active.

---

## Gating Policies (Failure Prevention)

Learned rules that prevent repeated failures:

| Policy | Trigger | Action |
|--------|---------|--------|
| GP-001 | After creating cron jobs | Verify with `cron list`, store IDs |
| GP-002 | Config change | Update TOOLS.md immediately |
| GP-004 | Session end | Flush state to active-context.md |
| GP-005 | Before creating cron | List existing, remove duplicates first |
| GP-007 | Model switch | Read active-context.md + runbooks before acting |
| GP-008 | New procedure | Create/update runbook |

---

## Working Memory (active-context.md)

The prefrontal cortex analog. Holds:
- Active commitments and deadlines (next 7 days)
- Running project states
- Scheduled automation (cron job IDs)
- Pending decisions
- Session handoff notes

**Rules:**
- Updated at END of every significant session
- Read at START of every session
- Pruned weekly (completed items removed, lessons promoted)

---

## Runbooks (Procedural Memory)

Location: `memory/runbooks/`

Runbooks capture HOW to do things — exact commands, API endpoints, auth flows.

**Rule**: If a task requires multi-step tool use, it MUST have a runbook. When a task has a runbook, **read it before executing**.

This is critical for model switches — a new model knows conceptually how to do things but doesn't know YOUR specific setup.

---

## Retrieval Protocol

1. **Start with** `active-context.md` (working memory)
2. **If not there**, check `TOOLS.md` (domain config)
3. **If still unclear**, use `memory_search`
4. **If nothing found**, check `MEMORY.md` (long-term)
5. **If truly unknown**, ask the human

**Never guess when memory is available to check.**

---

## Session Checklists

### Session Start
```markdown
□ Read active-context.md
□ Check today's date vs Last Updated
□ If stale (>24h), scan recent daily notes
□ Identify active projects and their state
□ Load relevant runbooks for current task
```

### Session End
```markdown
□ Update active-context.md with any changed state
□ Write significant events to today's daily note
□ If new procedure discovered, create runbook
□ If lesson learned, consider promoting to MEMORY.md
```

---

## Automated Systems

### Decay Policies
See `templates/decay-policies.md`:
- Priority-based retention (P0 permanent → P3 session-only)
- Temporal decay with usage-based extension
- Archive system with searchable index
- 7-day grace period before archival

### State Detectors
See `templates/state-detectors.md`:
- P0 triggers: Immediate update on cron/config/model changes
- P1 triggers: Session-end batch updates
- P2 triggers: Periodic consolidation during heartbeats

---

## Memory Maintenance Schedule

| When | Action |
|------|--------|
| Every session | Read active-context.md |
| Session end | Update active-context.md |
| Daily | Write to YYYY-MM-DD.md |
| Weekly | Consolidate daily → active-context → MEMORY.md |
| Weekly | Execute decay audit |

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
| `templates/runbooks/README.md` | Runbook index |
| `templates/runbooks/example-api.md` | Example runbook |

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

**The goal: Never lose operational context, even across model switches or session resets.**
