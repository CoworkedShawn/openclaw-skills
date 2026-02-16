#!/usr/bin/env node
/**
 * Memory Engine v2.0.0
 * Automated memory management - decay, patterns, state, metrics, sync
 * 
 * Commands:
 *   state    - Verify memory state integrity
 *   sync     - Pull current reality into active-context
 *   stub     - Create today's daily note if missing
 *   refresh  - Full refresh (stub + sync + state check)
 *   alert    - Check for P0/P1 alerts (exit code reflects severity)
 *   decay    - Archive old notes (30+ days)
 *   metrics  - Collect and log metrics
 *   patterns - Detect recurring patterns
 *   audit    - Run full audit (all checks)
 */

import { existsSync, readFileSync, writeFileSync, readdirSync, statSync, mkdirSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

const WORKSPACE = process.env.OPENCLAW_WORKSPACE || join(process.env.HOME, '.openclaw/workspace');
const MEMORY_DIR = join(WORKSPACE, 'memory');
const ARCHIVE_DIR = join(MEMORY_DIR, 'archive');
const METRICS_DIR = join(MEMORY_DIR, 'architecture');
const ACTIVE_CONTEXT = join(MEMORY_DIR, 'active-context.md');
const MEMORY_MD = join(WORKSPACE, 'MEMORY.md');

// Ensure directories exist
[ARCHIVE_DIR, METRICS_DIR].forEach(dir => {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
});

// ============ UTILITIES ============

function now() {
  const d = new Date();
  return d.toLocaleString('en-US', { 
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit', 
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).replace(',', '') + ' EST';
}

function todayISO() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
}

function daysBetween(date1, date2) {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  return Math.floor((d2 - d1) / (1000 * 60 * 60 * 24));
}

function hoursSince(date) {
  return (Date.now() - new Date(date).getTime()) / (1000 * 60 * 60);
}

function readMarkdown(path) {
  if (!existsSync(path)) return null;
  return readFileSync(path, 'utf-8');
}

function writeMarkdown(path, content) {
  writeFileSync(path, content, 'utf-8');
}

function appendToFile(path, content) {
  const existing = existsSync(path) ? readFileSync(path, 'utf-8') : '';
  writeFileSync(path, existing + content, 'utf-8');
}

function getMemoryFiles() {
  const files = [];
  if (!existsSync(MEMORY_DIR)) return files;
  
  const entries = readdirSync(MEMORY_DIR);
  
  for (const entry of entries) {
    const fullPath = join(MEMORY_DIR, entry);
    const stat = statSync(fullPath);
    
    if (stat.isFile() && entry.endsWith('.md')) {
      const dateMatch = entry.match(/^(\d{4}-\d{2}-\d{2})\.md$/);
      files.push({
        name: entry,
        path: fullPath,
        date: dateMatch ? dateMatch[1] : null,
        size: stat.size,
        mtime: stat.mtime,
        ageInDays: daysBetween(stat.mtime, new Date())
      });
    }
  }
  
  return files;
}

function getCronJobs() {
  try {
    const result = execSync(
      `curl -s --unix-socket ~/.openclaw/gateway.sock http://localhost/api/cron/list 2>/dev/null`,
      { encoding: 'utf-8', timeout: 5000 }
    );
    const data = JSON.parse(result);
    return data.jobs || [];
  } catch {
    try {
      const cliResult = execSync('openclaw cron list --json 2>/dev/null', { encoding: 'utf-8' });
      return JSON.parse(cliResult).jobs || [];
    } catch {
      return null;
    }
  }
}

// ============ DECAY ENGINE ============

function runDecay(options = {}) {
  const dryRun = options.dryRun || false;
  const verbose = options.verbose || false;
  
  console.log(`\n=== Memory Decay Engine ===`);
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'LIVE'}`);
  console.log(`Time: ${now()}\n`);
  
  const files = getMemoryFiles();
  const datedFiles = files.filter(f => f.date);
  const today = todayISO();
  
  const stats = { scanned: datedFiles.length, archived: 0, kept: 0, errors: 0 };
  const DECAY_THRESHOLD_DAYS = 30;
  
  for (const file of datedFiles) {
    const age = daysBetween(file.date, today);
    
    if (verbose) console.log(`${file.name}: ${age} days old`);
    
    if (age > DECAY_THRESHOLD_DAYS) {
      const yearMonth = file.date.slice(0, 7);
      const archiveSubdir = join(ARCHIVE_DIR, yearMonth);
      const archivePath = join(archiveSubdir, file.name);
      
      if (!dryRun) {
        try {
          if (!existsSync(archiveSubdir)) mkdirSync(archiveSubdir, { recursive: true });
          
          const content = readMarkdown(file.path);
          const archivedContent = `<!-- ARCHIVED: ${now()} | Original: ${file.path} -->\n${content}`;
          writeMarkdown(archivePath, archivedContent);
          execSync(`mv "${file.path}" "${file.path}.archived"`);
          
          console.log(`✓ Archived: ${file.name} → ${yearMonth}/`);
          stats.archived++;
        } catch (err) {
          console.error(`✗ Error archiving ${file.name}: ${err.message}`);
          stats.errors++;
        }
      } else {
        console.log(`[DRY] Would archive: ${file.name} (${age} days old)`);
        stats.archived++;
      }
    } else {
      stats.kept++;
    }
  }
  
  console.log(`\n--- Summary ---`);
  console.log(`Scanned: ${stats.scanned}`);
  console.log(`Archived: ${stats.archived}`);
  console.log(`Kept: ${stats.kept}`);
  console.log(`Errors: ${stats.errors}`);
  
  if (!dryRun) logMetric('decay', { timestamp: new Date().toISOString(), ...stats });
  
  return stats;
}

// ============ STATE ENGINE ============

function runState(options = {}) {
  console.log(`\n=== State Verification Engine ===`);
  console.log(`Time: ${now()}\n`);
  
  const issues = { critical: [], warning: [], info: [] };
  
  // Check active-context.md
  if (!existsSync(ACTIVE_CONTEXT)) {
    issues.critical.push('active-context.md MISSING - working memory unavailable');
  } else {
    const stat = statSync(ACTIVE_CONTEXT);
    const ageHours = hoursSince(stat.mtime);
    
    if (ageHours > 48) {
      issues.critical.push(`active-context.md STALE: ${Math.floor(ageHours)} hours old (P0 violation)`);
    } else if (ageHours > 24) {
      issues.warning.push(`active-context.md needs refresh: ${Math.floor(ageHours)} hours since update`);
    } else {
      console.log(`✓ active-context.md updated ${Math.floor(ageHours)} hours ago`);
    }
  }
  
  // Check cron jobs
  const jobs = getCronJobs();
  if (jobs === null) {
    issues.warning.push('Could not verify cron jobs (API unavailable)');
  } else {
    const enabledJobs = jobs.filter(j => j.enabled !== false);
    const erroringJobs = jobs.filter(j => j.state?.consecutiveErrors > 0);
    
    console.log(`✓ ${enabledJobs.length} active cron jobs`);
    
    for (const job of erroringJobs) {
      issues.warning.push(`Cron "${job.name}" has ${job.state.consecutiveErrors} consecutive errors`);
    }
  }
  
  // Check directory structure
  const requiredDirs = ['archive', 'runbooks'];
  for (const dir of requiredDirs) {
    const dirPath = join(MEMORY_DIR, dir);
    if (existsSync(dirPath)) {
      console.log(`✓ memory/${dir}/ exists`);
    } else {
      issues.warning.push(`memory/${dir}/ directory missing`);
    }
  }
  
  // Check daily note
  const today = todayISO();
  const todayNote = join(MEMORY_DIR, `${today}.md`);
  if (existsSync(todayNote)) {
    console.log(`✓ Today's daily note exists (${today})`);
  } else {
    issues.info.push(`No daily note for ${today} - run 'stub' to create`);
  }
  
  // Check MEMORY.md
  if (existsSync(MEMORY_MD)) {
    console.log(`✓ MEMORY.md exists`);
  } else {
    issues.warning.push('MEMORY.md missing from workspace');
  }
  
  // Report
  const hasIssues = issues.critical.length + issues.warning.length + issues.info.length > 0;
  
  if (hasIssues) {
    console.log(`\n--- Issues Found ---`);
    
    if (issues.critical.length > 0) {
      console.log(`\n🚨 CRITICAL (P0):`);
      issues.critical.forEach(i => console.log(`  ✗ ${i}`));
    }
    if (issues.warning.length > 0) {
      console.log(`\n⚠️  WARNING:`);
      issues.warning.forEach(i => console.log(`  ! ${i}`));
    }
    if (issues.info.length > 0) {
      console.log(`\nℹ️  INFO:`);
      issues.info.forEach(i => console.log(`  - ${i}`));
    }
  } else {
    console.log(`\n✓ All state checks passed`);
  }
  
  return { 
    issues, 
    hasCritical: issues.critical.length > 0,
    hasWarning: issues.warning.length > 0,
    exitCode: issues.critical.length > 0 ? 2 : (issues.warning.length > 0 ? 1 : 0)
  };
}

// ============ SYNC ENGINE ============

function runSync(options = {}) {
  const dryRun = options.dryRun || false;
  
  console.log(`\n=== Memory Sync Engine ===`);
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'LIVE'}`);
  console.log(`Time: ${now()}\n`);
  
  const updates = [];
  
  // Sync cron job inventory
  console.log(`Syncing cron job inventory...`);
  const jobs = getCronJobs();
  
  if (jobs && jobs.length > 0) {
    const cronTable = ['| Job | Schedule | Status |', '|-----|----------|--------|'];
    
    for (const job of jobs) {
      const status = job.enabled === false ? '❌ Disabled' : 
                     job.state?.consecutiveErrors > 0 ? '⚠️ Erroring' : '✅ Active';
      
      let scheduleStr = '';
      if (job.schedule?.kind === 'cron') scheduleStr = job.schedule.expr;
      else if (job.schedule?.kind === 'at') scheduleStr = `Once: ${job.schedule.at}`;
      else if (job.schedule?.kind === 'every') scheduleStr = `Every ${Math.floor(job.schedule.everyMs / 60000)}m`;
      
      cronTable.push(`| ${job.name} | ${scheduleStr} | ${status} |`);
    }
    
    updates.push({ section: 'Active Cron Jobs', content: cronTable.join('\n') });
    console.log(`  ✓ Found ${jobs.length} cron jobs`);
  }
  
  // Update timestamp
  updates.push({
    section: 'Last Updated',
    content: `${now()}\n\n## Session Handoff\n_Synced automatically by memory engine._`
  });
  
  // Apply updates
  if (!dryRun && updates.length > 0) {
    let content = readMarkdown(ACTIVE_CONTEXT) || '';
    
    for (const update of updates) {
      const sectionRegex = new RegExp(`(## ${update.section}[\\s\\S]*?)(?=\\n## |$)`, 'i');
      const newSection = `## ${update.section}\n${update.content}\n\n`;
      
      if (sectionRegex.test(content)) {
        content = content.replace(sectionRegex, newSection);
      } else {
        content += `\n${newSection}`;
      }
    }
    
    writeMarkdown(ACTIVE_CONTEXT, content);
    console.log(`\n✓ Updated active-context.md`);
  } else if (dryRun) {
    console.log(`\n[DRY RUN] Would update: ${updates.map(u => u.section).join(', ')}`);
  }
  
  logMetric('sync', { timestamp: new Date().toISOString(), sectionsUpdated: updates.length, dryRun });
  
  return { updates, cronJobs: jobs };
}

// ============ STUB ENGINE ============

function runStub(options = {}) {
  const dryRun = options.dryRun || false;
  const force = options.force || false;
  
  console.log(`\n=== Daily Note Stub Generator ===`);
  console.log(`Time: ${now()}\n`);
  
  const today = todayISO();
  const todayNote = join(MEMORY_DIR, `${today}.md`);
  
  if (existsSync(todayNote) && !force) {
    console.log(`✓ Today's note already exists: ${today}.md`);
    return { created: false, path: todayNote };
  }
  
  const dayOfWeek = new Date().toLocaleDateString('en-US', { 
    timeZone: 'America/New_York', 
    weekday: 'long' 
  });
  
  const template = `# ${today} Daily Memory

## ${dayOfWeek}

_Daily note auto-generated by memory engine at ${now()}_

---

## Sessions

## Key Events

## Decisions Made

## Follow-ups

## Lessons Learned

`;
  
  if (!dryRun) {
    writeMarkdown(todayNote, template);
    console.log(`✓ Created: ${today}.md`);
  } else {
    console.log(`[DRY RUN] Would create: ${today}.md`);
  }
  
  return { created: !dryRun, path: todayNote, date: today };
}

// ============ REFRESH ENGINE ============

function runRefresh(options = {}) {
  console.log(`\n${'='.repeat(50)}`);
  console.log(`   MEMORY ENGINE REFRESH`);
  console.log(`   ${now()}`);
  console.log(`${'='.repeat(50)}`);
  
  const stubResult = runStub(options);
  const syncResult = runSync(options);
  const stateResult = runState(options);
  
  console.log(`\n${'='.repeat(50)}`);
  console.log(`   REFRESH COMPLETE`);
  
  if (stateResult.hasCritical) {
    console.log(`   ⚠️  CRITICAL ISSUES REQUIRE ATTENTION`);
  } else if (stateResult.hasWarning) {
    console.log(`   ✓ Refreshed (minor warnings present)`);
  } else {
    console.log(`   ✓ All systems nominal`);
  }
  
  console.log(`${'='.repeat(50)}\n`);
  
  return { stub: stubResult, sync: syncResult, state: stateResult };
}

// ============ ALERT ENGINE ============

function runAlert(options = {}) {
  console.log(`\n=== Memory Alert Check ===`);
  console.log(`Time: ${now()}\n`);
  
  const alerts = [];
  
  // Check active-context staleness
  if (existsSync(ACTIVE_CONTEXT)) {
    const stat = statSync(ACTIVE_CONTEXT);
    const ageHours = hoursSince(stat.mtime);
    
    if (ageHours > 48) {
      alerts.push({ level: 'P0', message: `active-context.md is ${Math.floor(ageHours)} hours stale - CRITICAL`, action: 'Run: node engine.js refresh' });
    } else if (ageHours > 24) {
      alerts.push({ level: 'P1', message: `active-context.md is ${Math.floor(ageHours)} hours since update`, action: 'Run: node engine.js sync' });
    }
  } else {
    alerts.push({ level: 'P0', message: 'active-context.md is MISSING', action: 'Recreate working memory immediately' });
  }
  
  // Check daily note
  const today = todayISO();
  const todayNote = join(MEMORY_DIR, `${today}.md`);
  if (!existsSync(todayNote)) {
    alerts.push({ level: 'P2', message: `No daily note for ${today}`, action: 'Run: node engine.js stub' });
  }
  
  // Check erroring crons
  const jobs = getCronJobs();
  if (jobs) {
    const erroring = jobs.filter(j => j.state?.consecutiveErrors > 2);
    for (const job of erroring) {
      alerts.push({ level: 'P1', message: `Cron "${job.name}" failing (${job.state.consecutiveErrors} errors)`, action: `Review job ${job.id}` });
    }
  }
  
  // Output
  if (alerts.length === 0) {
    console.log(`✓ No alerts - all systems nominal`);
    return { alerts: [], hasP0: false };
  }
  
  console.log(`Found ${alerts.length} alert(s):\n`);
  
  const p0 = alerts.filter(a => a.level === 'P0');
  const p1 = alerts.filter(a => a.level === 'P1');
  const p2 = alerts.filter(a => a.level === 'P2');
  
  if (p0.length > 0) {
    console.log(`🚨 P0 CRITICAL:`);
    p0.forEach(a => { console.log(`  ✗ ${a.message}`); console.log(`    → ${a.action}`); });
  }
  if (p1.length > 0) {
    console.log(`\n⚠️  P1 WARNING:`);
    p1.forEach(a => { console.log(`  ! ${a.message}`); console.log(`    → ${a.action}`); });
  }
  if (p2.length > 0) {
    console.log(`\nℹ️  P2 INFO:`);
    p2.forEach(a => { console.log(`  - ${a.message}`); console.log(`    → ${a.action}`); });
  }
  
  return { alerts, hasP0: p0.length > 0, hasP1: p1.length > 0 };
}

// ============ METRICS ENGINE ============

function logMetric(category, data) {
  const metricsFile = join(METRICS_DIR, 'metrics-log.jsonl');
  const entry = JSON.stringify({ category, ...data }) + '\n';
  appendToFile(metricsFile, entry);
}

function runMetrics(options = {}) {
  console.log(`\n=== Metrics Collection Engine ===`);
  console.log(`Time: ${now()}\n`);
  
  const files = getMemoryFiles();
  
  const metrics = {
    timestamp: new Date().toISOString(),
    totalFiles: files.length,
    datedNotes: files.filter(f => f.date).length,
    totalSizeBytes: files.reduce((sum, f) => sum + f.size, 0),
    oldestNote: null,
    newestNote: null
  };
  
  const datedFiles = files.filter(f => f.date).sort((a, b) => a.date.localeCompare(b.date));
  if (datedFiles.length > 0) {
    metrics.oldestNote = datedFiles[0].date;
    metrics.newestNote = datedFiles[datedFiles.length - 1].date;
  }
  
  console.log(`Total memory files: ${metrics.totalFiles}`);
  console.log(`Dated notes: ${metrics.datedNotes}`);
  console.log(`Total size: ${(metrics.totalSizeBytes / 1024).toFixed(1)} KB`);
  console.log(`Date range: ${metrics.oldestNote || 'N/A'} to ${metrics.newestNote || 'N/A'}`);
  
  logMetric('collection', metrics);
  console.log(`\n✓ Metrics logged`);
  
  return metrics;
}

// ============ PATTERNS ENGINE ============

function runPatterns(options = {}) {
  console.log(`\n=== Pattern Detection Engine ===`);
  console.log(`Time: ${now()}\n`);
  
  const files = getMemoryFiles();
  const today = todayISO();
  const recentNotes = files
    .filter(f => f.date && daysBetween(f.date, today) <= 7)
    .sort((a, b) => b.date.localeCompare(a.date));
  
  console.log(`Analyzing ${recentNotes.length} recent daily notes...`);
  
  const sectionCounts = {};
  
  for (const note of recentNotes) {
    const content = readMarkdown(note.path);
    if (!content) continue;
    
    const headings = content.match(/^## .+$/gm) || [];
    for (const heading of headings) {
      const normalized = heading.toLowerCase().trim();
      sectionCounts[normalized] = (sectionCounts[normalized] || 0) + 1;
    }
  }
  
  const patterns = Object.entries(sectionCounts)
    .filter(([_, count]) => count >= 3)
    .sort((a, b) => b[1] - a[1]);
  
  if (patterns.length > 0) {
    console.log(`\nRecurring patterns found:`);
    patterns.forEach(([p, c]) => console.log(`  ${c}x: ${p}`));
  } else {
    console.log(`\nNo recurring patterns detected yet (need more data)`);
  }
  
  return { patterns };
}

// ============ AUDIT ============

function runAudit(options = {}) {
  console.log(`\n${'='.repeat(50)}`);
  console.log(`   MEMORY ENGINE FULL AUDIT`);
  console.log(`   ${now()}`);
  console.log(`${'='.repeat(50)}`);
  
  const results = {
    state: runState(options),
    metrics: runMetrics(options),
    decay: runDecay({ ...options, dryRun: true }),
    patterns: runPatterns(options)
  };
  
  console.log(`\n${'='.repeat(50)}`);
  console.log(`   AUDIT COMPLETE`);
  console.log(`${'='.repeat(50)}\n`);
  
  return results;
}

// ============ CLI ============

const command = process.argv[2];
const flags = process.argv.slice(3);
const options = {
  dryRun: flags.includes('--dry-run') || flags.includes('-n'),
  verbose: flags.includes('--verbose') || flags.includes('-v'),
  force: flags.includes('--force') || flags.includes('-f')
};

switch (command) {
  case 'decay': runDecay(options); break;
  case 'state': process.exitCode = runState(options).exitCode; break;
  case 'metrics': runMetrics(options); break;
  case 'patterns': runPatterns(options); break;
  case 'audit': runAudit(options); break;
  case 'sync': runSync(options); break;
  case 'stub': runStub(options); break;
  case 'refresh': runRefresh(options); break;
  case 'alert':
    const alertResult = runAlert(options);
    process.exitCode = alertResult.hasP0 ? 2 : (alertResult.hasP1 ? 1 : 0);
    break;
  default:
    console.log(`Memory Engine v2.0.0`);
    console.log(`\nCommands:`);
    console.log(`  state      Verify memory state integrity`);
    console.log(`  sync       Pull current reality into active-context`);
    console.log(`  stub       Create today's daily note if missing`);
    console.log(`  refresh    Full refresh (stub + sync + state check)`);
    console.log(`  alert      Check for P0/P1 alerts (exit code reflects severity)`);
    console.log(`  decay      Archive old notes (30+ days)`);
    console.log(`  metrics    Collect and log metrics`);
    console.log(`  patterns   Detect recurring patterns`);
    console.log(`  audit      Run full audit (all checks)`);
    console.log(`\nFlags:`);
    console.log(`  --dry-run, -n   Don't make changes`);
    console.log(`  --verbose, -v   Verbose output`);
    console.log(`  --force, -f     Force operations (overwrite)`);
}
