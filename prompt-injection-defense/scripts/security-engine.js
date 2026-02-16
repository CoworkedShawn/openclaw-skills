#!/usr/bin/env node
/**
 * Security Engine v1.0.0
 * Context-aware prompt injection detection with reduced false positives
 * 
 * Usage:
 *   node security-engine.js check "user message"
 *   node security-engine.js log "pattern" "source"
 *   node security-engine.js stats
 *   node security-engine.js review
 */

import { existsSync, readFileSync, writeFileSync, appendFileSync } from 'fs';
import { join } from 'path';

const WORKSPACE = process.env.OPENCLAW_WORKSPACE || join(process.env.HOME, '.openclaw/workspace');
const SECURITY_DIR = join(WORKSPACE, 'security');
const ATTEMPTS_LOG = join(SECURITY_DIR, 'extraction-attempts.jsonl');
const BLOCKED_USERS = join(SECURITY_DIR, 'blocked-users.json');
const CONFIG_FILE = join(SECURITY_DIR, 'security-config.json');

// ============ DETECTION PATTERNS ============

const INJECTION_PATTERNS = {
  // High confidence - definitely injection attempts
  high: [
    { pattern: /ignore\s+(all\s+)?previous\s+instructions/i, name: 'instruction_override' },
    { pattern: /disregard\s+(everything\s+)?(above|previous)/i, name: 'disregard_command' },
    { pattern: /you\s+are\s+now\s+a/i, name: 'role_hijack' },
    { pattern: /your\s+new\s+(role|purpose|instructions?)\s+(is|are)/i, name: 'role_redefine' },
    { pattern: /forget\s+(everything|all|your)\s+(you|instructions)/i, name: 'memory_wipe' },
    { pattern: /repeat\s+(everything|all|the\s+text)\s+(above|before)/i, name: 'prompt_extraction' },
    { pattern: /what('s|\s+is)\s+(in\s+)?your\s+system\s+prompt/i, name: 'system_prompt_query' },
    { pattern: /show\s+me\s+your\s+(api[_\s]?key|token|password|secret|credential)/i, name: 'secret_extraction' },
    { pattern: /give\s+me\s+your\s+(api[_\s]?key|token|password|secret|credential)/i, name: 'secret_extraction' },
    { pattern: /what('s|\s+is)\s+your\s+(api[_\s]?key|token|password|secret)/i, name: 'secret_query' },
    { pattern: /reveal\s+your\s+(secrets?|credentials?|keys?)/i, name: 'secret_reveal' },
    { pattern: /bypass\s+(the\s+)?(security|safety|filter)/i, name: 'bypass_attempt' },
    { pattern: /\[system\]|\[SYSTEM\]|<system>|<SYSTEM>/i, name: 'fake_system_tag' },
  ],
  
  // Medium confidence - suspicious but could be legitimate
  medium: [
    { pattern: /pretend\s+(you('re|\s+are)|to\s+be)/i, name: 'roleplay_request', context_check: true },
    { pattern: /act\s+as\s+(if\s+you('re|\s+are)|a)/i, name: 'act_as_request', context_check: true },
    { pattern: /from\s+now\s+on/i, name: 'behavior_change', context_check: true },
    { pattern: /new\s+instructions?:/i, name: 'new_instructions', context_check: true },
  ],
  
  // Patterns that look suspicious but are usually legitimate
  legitimate: [
    { pattern: /how\s+(do\s+I|can\s+I|to)\s+get\s+(an?\s+)?api[_\s]?key/i, name: 'api_key_howto' },
    { pattern: /what('s|\s+is)\s+an?\s+api[_\s]?key/i, name: 'api_key_education' },
    { pattern: /help\s+me\s+(secure|protect|store)\s+(my\s+)?api/i, name: 'security_help' },
    { pattern: /review\s+(this|my)\s+code/i, name: 'code_review' },
  ]
};

// ============ UTILITIES ============

function now() {
  return new Date().toISOString();
}

function loadConfig() {
  if (existsSync(CONFIG_FILE)) {
    return JSON.parse(readFileSync(CONFIG_FILE, 'utf-8'));
  }
  return {
    security_mode: 'enforced',
    alert_threshold: 3,
    time_window_hours: 24
  };
}

function loadBlockedUsers() {
  if (existsSync(BLOCKED_USERS)) {
    return JSON.parse(readFileSync(BLOCKED_USERS, 'utf-8'));
  }
  return { blocked: [], stats: { total_blocks: 0, total_attempts: 0 } };
}

function saveBlockedUsers(data) {
  data.stats.last_updated = now();
  writeFileSync(BLOCKED_USERS, JSON.stringify(data, null, 2));
}

function logAttempt(pattern, source, confidence, action) {
  const entry = {
    timestamp: now(),
    pattern,
    source: source || 'unknown',
    confidence,
    action
  };
  appendFileSync(ATTEMPTS_LOG, JSON.stringify(entry) + '\n');
  return entry;
}

function getRecentAttempts(hours = 24) {
  if (!existsSync(ATTEMPTS_LOG)) return [];
  
  const cutoff = Date.now() - (hours * 60 * 60 * 1000);
  const lines = readFileSync(ATTEMPTS_LOG, 'utf-8').trim().split('\n').filter(Boolean);
  
  return lines
    .map(line => {
      try { return JSON.parse(line); } catch { return null; }
    })
    .filter(entry => entry && new Date(entry.timestamp).getTime() > cutoff);
}

// ============ DETECTION ENGINE ============

function checkMessage(message, source = 'unknown') {
  const result = {
    safe: true,
    confidence: 'none',
    patterns_matched: [],
    action: 'allow',
    reason: 'No suspicious patterns detected'
  };
  
  // First check if it matches legitimate patterns (reduces false positives)
  for (const { pattern, name } of INJECTION_PATTERNS.legitimate) {
    if (pattern.test(message)) {
      result.legitimate_match = name;
      // Continue checking but note this is likely legitimate
    }
  }
  
  // Check high confidence patterns
  for (const { pattern, name } of INJECTION_PATTERNS.high) {
    if (pattern.test(message)) {
      result.safe = false;
      result.confidence = 'high';
      result.patterns_matched.push(name);
      result.action = 'block';
      result.reason = `High-confidence injection pattern: ${name}`;
    }
  }
  
  // If already high confidence, skip medium checks
  if (result.confidence !== 'high') {
    for (const { pattern, name, context_check } of INJECTION_PATTERNS.medium) {
      if (pattern.test(message)) {
        // If it also matched a legitimate pattern, don't flag it
        if (result.legitimate_match) continue;
        
        result.patterns_matched.push(name);
        if (result.confidence === 'none') {
          result.confidence = 'medium';
          result.action = 'review';
          result.reason = `Medium-confidence pattern: ${name}`;
        }
      }
    }
  }
  
  // If patterns matched and no legitimate override, mark as unsafe
  if (result.patterns_matched.length > 0 && !result.legitimate_match) {
    result.safe = false;
    
    // Log the attempt
    logAttempt(
      result.patterns_matched.join(', '),
      source,
      result.confidence,
      result.action
    );
  }
  
  return result;
}

// ============ STATS & REVIEW ============

function getStats() {
  const attempts = getRecentAttempts(168); // Last week
  const blocked = loadBlockedUsers();
  
  const byPattern = {};
  const bySource = {};
  const byDay = {};
  
  for (const attempt of attempts) {
    // Count by pattern
    byPattern[attempt.pattern] = (byPattern[attempt.pattern] || 0) + 1;
    
    // Count by source
    bySource[attempt.source] = (bySource[attempt.source] || 0) + 1;
    
    // Count by day
    const day = attempt.timestamp.split('T')[0];
    byDay[day] = (byDay[day] || 0) + 1;
  }
  
  return {
    total_attempts_week: attempts.length,
    total_attempts_24h: getRecentAttempts(24).length,
    blocked_users: blocked.blocked.length,
    by_pattern: byPattern,
    by_source: bySource,
    by_day: byDay,
    top_sources: Object.entries(bySource).sort((a, b) => b[1] - a[1]).slice(0, 5)
  };
}

function review() {
  const recent = getRecentAttempts(24);
  const config = loadConfig();
  
  console.log('\n=== Security Review ===');
  console.log(`Time: ${now()}`);
  console.log(`Attempts (24h): ${recent.length}`);
  
  if (recent.length === 0) {
    console.log('\n✓ No injection attempts in the last 24 hours');
    return { clean: true, attempts: 0 };
  }
  
  // Group by source
  const bySource = {};
  for (const attempt of recent) {
    if (!bySource[attempt.source]) bySource[attempt.source] = [];
    bySource[attempt.source].push(attempt);
  }
  
  console.log('\n--- Attempts by Source ---');
  for (const [source, attempts] of Object.entries(bySource)) {
    console.log(`\n${source}: ${attempts.length} attempts`);
    if (attempts.length >= config.alert_threshold) {
      console.log(`  ⚠️  ALERT: Exceeds threshold (${config.alert_threshold})`);
    }
    for (const a of attempts.slice(-3)) {
      console.log(`  - ${a.timestamp}: ${a.pattern} (${a.confidence})`);
    }
  }
  
  // Check for repeat offenders
  const repeatOffenders = Object.entries(bySource)
    .filter(([_, attempts]) => attempts.length >= config.alert_threshold);
  
  if (repeatOffenders.length > 0) {
    console.log('\n🚨 REPEAT OFFENDERS (consider blocking):');
    for (const [source, attempts] of repeatOffenders) {
      console.log(`  - ${source}: ${attempts.length} attempts`);
    }
  }
  
  return {
    clean: recent.length === 0,
    attempts: recent.length,
    repeat_offenders: repeatOffenders.map(([s]) => s)
  };
}

// ============ CLI ============

const command = process.argv[2];
const args = process.argv.slice(3);

switch (command) {
  case 'check':
    const message = args.join(' ');
    if (!message) {
      console.log('Usage: node security-engine.js check "message to check"');
      process.exit(1);
    }
    const result = checkMessage(message, 'cli-test');
    console.log('\n🛡️ Security Check Result');
    console.log('='.repeat(50));
    console.log(`Message: "${message.substring(0, 100)}${message.length > 100 ? '...' : ''}"`);
    console.log(`Safe: ${result.safe}`);
    console.log(`Confidence: ${result.confidence}`);
    console.log(`Action: ${result.action}`);
    console.log(`Reason: ${result.reason}`);
    if (result.patterns_matched.length > 0) {
      console.log(`Patterns: ${result.patterns_matched.join(', ')}`);
    }
    if (result.legitimate_match) {
      console.log(`Legitimate context: ${result.legitimate_match}`);
    }
    process.exit(result.safe ? 0 : 1);
    break;
    
  case 'log':
    const pattern = args[0] || 'unknown';
    const source = args[1] || 'manual';
    const entry = logAttempt(pattern, source, 'manual', 'logged');
    console.log('✓ Logged:', JSON.stringify(entry));
    break;
    
  case 'stats':
    const stats = getStats();
    console.log('\n📊 Security Statistics');
    console.log('='.repeat(50));
    console.log(`Attempts (24h): ${stats.total_attempts_24h}`);
    console.log(`Attempts (7d): ${stats.total_attempts_week}`);
    console.log(`Blocked users: ${stats.blocked_users}`);
    if (stats.top_sources.length > 0) {
      console.log('\nTop sources:');
      stats.top_sources.forEach(([s, c]) => console.log(`  ${s}: ${c}`));
    }
    break;
    
  case 'review':
    review();
    break;
    
  default:
    console.log('Security Engine v1.0.0');
    console.log('\nCommands:');
    console.log('  check "message"    Check a message for injection attempts');
    console.log('  log "pattern" "source"  Log an injection attempt');
    console.log('  stats              Show security statistics');
    console.log('  review             Review recent attempts');
}
