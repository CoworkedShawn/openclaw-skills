# State Detectors - Automated Active-Context Updates

## Purpose
Detect operational state changes and trigger automatic updates to `active-context.md`.

---

## Trigger Events

### P0 - Immediate Update (within same turn)
| Event | Detection Method | Action |
|-------|------------------|--------|
| Cron created/deleted | `cron add/remove` tool call | Write job ID + schedule to active-context |
| Commitment made | Keywords: "I will", "scheduled for", "reminder set" | Log commitment + deadline |
| Config changed | `gateway config.patch/apply` call | Log change summary + timestamp |
| Model switch | `session_status model=X` call | Note current model in active-context |

### P1 - Session-End Update (before compaction)
| Event | Detection Method | Action |
|-------|------------------|--------|
| Project state change | Tool calls to project directories | Update project status section |
| New contact preferences | Email/message parsing | Add to contact notes |
| Tool config learned | TOOLS.md modifications | Cross-reference in active-context |
| Decision made | Explicit "decided", "going with", "choosing" | Log decision + rationale |

### P2 - Periodic Consolidation (heartbeat/daily)
| Event | Detection Method | Action |
|-------|------------------|--------|
| Pattern detected | 3+ similar tasks in 7 days | Create runbook candidate |
| Stale content | No reference in 14 days | Flag for decay review |
| Relationship update | Repeated contact interactions | Update USER.md or contacts |

---

## Implementation Rules

### Debouncing
- P0 events: No debounce (immediate)
- P1 events: 5-minute window (batch similar changes)
- P2 events: Daily aggregation

### Significance Threshold
Only update active-context if:
- State actually changed (not just queried)
- Change affects future actions
- Information not already captured

### Update Format
```markdown
## Auto-Updated: [YYYY-MM-DD HH:MM]
- [EVENT_TYPE]: [Description]
- Source: [Tool call / Detection method]
```

---

## Integration Points

1. **Session-memory hook**: Already enabled - extend to call state detection
2. **GP-004 (Session End Flush)**: Automate via P1 triggers
3. **GP-002 (Config Change Capture)**: Automate via P0 triggers
4. **Heartbeat checks**: Execute P2 consolidation

---

## Self-Check Protocol

Before session end, verify:
- [ ] Any cron changes reflected in active-context?
- [ ] Any commitments logged?
- [ ] Any config changes captured in TOOLS.md?
- [ ] Project states current?

If any uncaptured, update before responding.
