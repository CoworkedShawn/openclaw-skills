# Memory Decay Policies

## Purpose
Prevent unbounded memory growth while preserving valuable information through intelligent decay.

---

## Priority-Based Retention

### P0 - Critical (No Decay)
- Active commitments until fulfilled
- Scheduled actions until executed
- Credentials/config (permanent in TOOLS.md)
- Active deadlines until passed + 7 days

### P1 - Operational (1 year retention)
- Project states (archive when project closes)
- Decisions made (permanent in MEMORY.md if significant)
- Contact preferences (permanent)
- Tool configs (permanent in TOOLS.md)

### P2 - Context (30 days active, then archive)
- Meeting notes → archive after 30 days
- Conversation summaries → archive after 30 days
- Background research → archive after 14 days if unreferenced

### P3 - Ephemeral (Session only)
- Debugging steps → discard at session end
- One-time lookups → discard at session end
- Transient status checks → discard at session end

---

## Decay Algorithms

### Temporal Decay
```
retention_score = base_priority_days - days_since_creation
if retention_score <= 0 AND reference_count == 0:
    archive()
```

Base priority days:
- P0: ∞ (never auto-decay)
- P1: 365
- P2: 30
- P3: 0 (session-scoped)

### Usage-Based Retention Extension
```
if memory_search hit in last 14 days:
    retention_score += 30  # Extend by 30 days
if directly referenced in conversation:
    retention_score += 60  # Extend by 60 days
```

### Relevance Scoring
Content remains active if:
- Semantic similarity > 0.7 to current active projects
- Contains entities mentioned in last 7 days
- Part of an active runbook or workflow

---

## Archive System

### Structure
```
memory/
  archive/
    2026-01/
      meetings.md
      research.md
      decisions.md
    2026-02/
      ...
    index.md  # Searchable summary of archived content
```

### Archive Format
```markdown
## Archived: [Original Date]
**Source**: [Original file path]
**Reason**: [Age/Unused/Superseded]
**Summary**: [One-line description]
**Full Content**: [Collapsed or linked]
```

### Retrieval Protocol
1. memory_search checks active memory first
2. If confidence < 0.5, extend search to archive/index.md
3. If match found in archive, retrieve specific file

---

## Grace Period Rules

Before archiving:
1. Flag content as "decay candidate" 
2. Wait 7-day grace period
3. If referenced during grace period → reset retention
4. If unreferenced → archive with full content preserved

---

## Decay Audit (Weekly)

During memory maintenance heartbeat:
1. Scan daily notes older than 30 days
2. Identify unreferenced P2 content
3. Check for decay candidates past grace period
4. Execute archival with index update
5. Log decay actions in active-context.md

---

## Anti-Decay Markers

Content marked with these is protected:
- `<!-- RETAIN: reason -->` - Manual retention override
- `<!-- PROMOTE -->` - Candidate for MEMORY.md promotion
- `<!-- ACTIVE -->` - Currently in use, reset decay timer
