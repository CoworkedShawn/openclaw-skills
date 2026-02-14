# Memory Architecture
## Inspired by David Badre's "On Task" (Cognitive Control Framework)

The brain doesn't just store - it gates, retrieves, and monitors. This system applies
Badre's cognitive control principles to agent memory management.

---

## Core Principles

### 1. Input Gating (What enters memory)
Not everything is worth storing. Before writing to memory, classify:
- **P0 (Critical)**: Commitments to humans, scheduled actions, credentials/config, active deadlines
- **P1 (Operational)**: Project state, decisions made, contact preferences, tool configs
- **P2 (Context)**: Meeting notes, conversation summaries, background info
- **P3 (Ephemeral)**: Debugging steps, one-time lookups, transient status

Rule: P0 and P1 go to `active-context.md`. P2 goes to daily notes. P3 stays in session only.

### 2. Output Gating (When memory influences action)
Different contexts trigger different retrieval:
- **Session start** -> Read active-context.md (working memory reload)
- **Morning briefing** -> Read active-context.md + calendar config + email config
- **Video task** -> Read active-context.md + HeyGen config from TOOLS.md
- **Email task** -> Read active-context.md + email rules from TOOLS.md
- **Scheduling** -> Read active-context.md + Calendly config + calendar access

Rule: Always load active-context.md. Load domain-specific files only when that domain is active.

### 3. Hierarchical Control (Nested abstraction levels)
```
MEMORY.md           <- Strategic: Identity, relationships, long-term lessons
  active-context.md <- Operational: Current projects, deadlines, commitments, cron states
    YYYY-MM-DD.md   <- Tactical: Daily events, raw notes, session logs
```

Information flows UP through consolidation (daily -> active -> strategic).
Information flows DOWN through decomposition (goals -> tasks -> actions).

### 4. Working Memory (active-context.md)
This is the prefrontal cortex analog. It holds:
- Active commitments and deadlines (next 7 days)
- Running project states (video pipeline, email monitoring, etc.)
- Cron job inventory (what's scheduled, IDs)
- Pending approvals or decisions
- Recently changed configurations

Rules:
- Updated at END of every significant session
- Read at START of every session
- Pruned weekly (completed items removed, lessons promoted to MEMORY.md)

### 5. Stability-Flexibility Balance
- **Stable** (rarely changes): MEMORY.md, TOOLS.md, SOUL.md
- **Flexible** (changes often): active-context.md, daily notes
- **Protected** (input gate closed): Don't overwrite stable files during routine operations

### 6. Monitoring and Audit
- Every session: Verify active-context.md matches reality (check crons exist, files exist)
- Weekly: Consolidate daily notes into active-context.md and MEMORY.md
- On failure: Document what went wrong and add a gating policy to prevent repeat

---

## Gating Policies (Failure Prevention Rules)

These are learned from incidents. Each policy prevents a specific failure mode.

### GP-001: Cron Verification
**Trigger**: After creating or expecting cron jobs
**Action**: Verify with `cron list` that jobs exist. Store job IDs in active-context.md.
**Reason**: Cron jobs were lost overnight (2026-02-05). No record of IDs meant no ability to verify.

### GP-002: Config Change Capture
**Trigger**: Any tool config, avatar ID, API parameter, or credential changes
**Action**: Immediately update TOOLS.md with the new value and date.
**Reason**: Avatar ID and subtitle format were not persisted, causing repeated regeneration.

### GP-003: Script Source Tracking
**Trigger**: When the source of truth for content changes
**Action**: Update active-context.md with the canonical source path.
**Reason**: Used old phonetic scripts instead of new SCRIPTS.md.

### GP-005: Cron Sprawl Prevention
**Trigger**: Before creating a new cron job
**Action**: List existing jobs (includeDisabled:true). Remove duplicates before adding new ones.
**Reason**: 13 stale duplicate crons accumulated from old sessions (found 2026-02-05).

### GP-006: Cron List Requires includeDisabled
**Trigger**: Any cron audit or verification
**Action**: Always use `includeDisabled: true` when listing crons. Default list may return empty.
**Reason**: `cron list` without flag returned empty despite 17 jobs existing.

### GP-004: Session End Flush
**Trigger**: End of every session or before compaction
**Action**: Update active-context.md with any changed state.
**Reason**: Context compaction loses operational details not written to files.

---

## Runbooks (Procedural Memory)

Location: `memory/runbooks/`

Runbooks capture HOW to do things - exact commands, endpoints, auth flows. They bridge the gap between knowing WHAT state you're in (active-context.md) and knowing HOW to act on it.

**Rule**: If a task requires multi-step tool use (API calls, auth flows, CLI sequences), it MUST have a runbook. When a task has a runbook, read it before executing.

**Index**: See `memory/runbooks/README.md`

### GP-007: Model Switch Continuity
**Trigger**: After any model change (config, /new, /reset)
**Action**: New model MUST read active-context.md + relevant runbooks before taking action. If a task was in progress, active-context.md should have a "Session Handoff" section describing it.
**Reason**: GPT-OSS-120b switch (2026-02-05) lost all operational knowledge. Model didn't know how to authenticate with Graph API despite credentials being in keychain.

### GP-008: Procedural Knowledge Capture
**Trigger**: After debugging or discovering a multi-step procedure
**Action**: Create or update a runbook in `memory/runbooks/` with exact steps.
**Reason**: Operational procedures stored only in context window are lost on model switch or compaction.

---

## Retrieval Protocol (How to search memory)

1. Always start with `active-context.md` (working memory)
2. If the answer isn't there, check `TOOLS.md` (domain config)
3. If still unclear, search `memory/` with memory_search
4. If nothing found, check `MEMORY.md` (long-term)
5. If truly unknown, ask the human

Never guess when memory is available to check.

---

## Automated Memory Management

### State Detection (Implemented)
See `memory/state-detectors.md` for automated active-context updates:
- P0 triggers: Immediate update on cron/config/model changes
- P1 triggers: Session-end batch updates for project/decision state
- P2 triggers: Periodic consolidation during heartbeats
- Debouncing and significance thresholds prevent noise

### Decay Policies (Implemented)
See `memory/decay-policies.md` for content lifecycle management:
- Priority-based retention (P0 permanent → P3 session-only)
- Temporal decay with usage-based extension
- Archive system at `memory/archive/` with searchable index
- 7-day grace period before archival
- Anti-decay markers for manual retention control

### Pattern Compression (Implemented)
See `memory/runbooks/auto-generated/README.md` for cross-session learning:
- Automatic runbook generation from repeated patterns
- Cluster detection via semantic similarity
- Template extraction with variable placeholders
- Promotion path to human-curated runbooks

### GP-009: Automated State Capture
**Trigger**: Any P0 event (cron change, config change, commitment made)
**Action**: Immediately update active-context.md per state-detectors.md rules
**Reason**: Manual updates were inconsistent - automation ensures continuity

### GP-010: Decay Audit
**Trigger**: Weekly during memory maintenance heartbeat
**Action**: Execute decay-policies.md audit procedure
**Reason**: Prevents unbounded memory growth while preserving value
