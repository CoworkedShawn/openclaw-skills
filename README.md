# 🧠 OpenClaw Skills

Custom skills for [OpenClaw](https://github.com/openclaw/openclaw) AI agents — extending capabilities with cognitive memory systems, security, platform integrations, and intelligent routing.

[![OpenClaw](https://img.shields.io/badge/OpenClaw-Skills-blue)](https://github.com/openclaw/openclaw)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## 📖 Background

These skills were built to solve real problems with AI agents:
- **Memory that actually works** — not just "save everything to a file"
- **Security that doesn't get bypassed** — defense-in-depth against prompt injection
- **Cost-efficient model routing** — match capability to task complexity

Read the full implementation story: [Building a Cognitive Architecture for Your OpenClaw Agent](https://shawnharris.com/building-a-cognitive-architecture-for-your-openclaw-agent/)

## 🛠️ Skills Included

### Core Architecture

| Skill | Description |
|-------|-------------|
| [memory-engine](./memory-engine/) | 🧠 Cognitive control memory system based on "On Task" by David Badre. Input/output gating, hierarchical memory, runbooks. |
| [prompt-injection-defense](./prompt-injection-defense/) | 🛡️ Multi-layered security against prompt injection attacks. 99% threat blocking, <3% false positives. |
| [intent-router](./intent-router/) | 🎯 Intent-based model selection and skill routing. 10 intent categories with confidence scoring. |

### Platform Integrations

| Skill | Description |
|-------|-------------|
| [ms-graph-email](./ms-graph-email/) | 📧 Microsoft Graph API email access for M365 accounts |
| [wordpress](./wordpress/) | 📝 WordPress REST API for publishing and managing posts |
| [meta-social](./meta-social/) | 📱 Facebook Pages, Instagram Business, Threads, and YouTube posting |
| [thought-leadership-video](./thought-leadership-video/) | 🎬 HeyGen video generation and multi-platform distribution |

## 🚀 Installation

### Option 1: Copy individual skills

```bash
# Clone the repo
git clone https://github.com/CoworkedShawn/openclaw-skills.git

# Copy the skill you need
cp -r openclaw-skills/memory-engine ~/.openclaw/workspace/skills/
```

### Option 2: Symlink all skills

```bash
git clone https://github.com/CoworkedShawn/openclaw-skills.git ~/openclaw-skills

# Symlink each skill
for skill in ~/openclaw-skills/*/; do
  ln -s "$skill" ~/.openclaw/workspace/skills/$(basename "$skill")
done
```

## 📚 Usage

Each skill contains a `SKILL.md` file with:
- Setup instructions and dependencies
- API patterns and code examples  
- Credential storage (typically macOS Keychain)
- Common operations and troubleshooting

OpenClaw automatically discovers skills from the `skills/` directory.

## 🏗️ Architecture

### Memory Engine (Based on Cognitive Science)

```
MEMORY.md           ← Strategic: Identity, relationships, long-term lessons
  active-context.md ← Operational: Current projects, deadlines, commitments  
    YYYY-MM-DD.md   ← Tactical: Daily events, raw notes, session logs
```

**Key concepts:**
- **Input gating** — Classify before storing (P0-P3 priority)
- **Output gating** — Load context based on current task
- **Gating policies** — Rules learned from operational failures
- **Runbooks** — Externalized procedural memory

### Prompt Injection Defense (4 Layers)

```
User Input → Prompt Sanitizer → Context Routing → [Security Gate] → Output Sanitization
                           ↓
                   External Sources → Search Analyzer → Content Review → Filtered Content
```

### Intent Router (Cost Optimization)

- Simple queries → Fast, cheap model (Haiku)
- Complex reasoning → Frontier model (Opus)
- Default balanced → Mid-tier (Sonnet)

**Results:** ~35% cost reduction, improved response quality

## 📊 Results

After implementing these skills:

| Metric | Improvement |
|--------|-------------|
| Context window usage | -40% |
| Cross-session continuity | ✅ Works |
| Model switch amnesia | ✅ Solved |
| API costs | -35% |
| Threat blocking | 99% |
| False positives | <3% |

## 🔐 Security Notes

- All credential files are `.gitignore`d
- Example credential files provided (`.example.json`)
- Secrets should be stored in macOS Keychain
- Never commit tokens or API keys

## 🤝 Contributing

Feel free to fork, adapt, and improve these skills for your own use case. PRs welcome!

**To add a new skill:**
1. Create a folder with `SKILL.md`
2. Include setup instructions and examples
3. Add credential examples (not actual credentials)
4. Update this README

## 📄 License

MIT — use freely, attribution appreciated.

---

Built with [OpenClaw](https://github.com/openclaw/openclaw) 🦞
