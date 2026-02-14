#!/usr/bin/env node

/**
 * Prompt Injection Sanitizer
 * Pre-processing layer to detect and neutralize injection attempts
 */

const fs = require('fs');
const path = require('path');

class PromptSanitizer {
  constructor() {
    this.dangerPatterns = [
      // System prompt manipulation
      /system prompt/i,
      /ignore previous instructions/i,
      /disregard above/i,
      /you are now/i,
      /your new role is/i,
      /forget everything/i,
      
      // Command injection
      /execute.*command/i,
      /run.*code/i,
      /eval\(/i,
      /exec\(/i,
      /import.*os/i,
      /subprocess/i,
      
      // Secret extraction
      /api.*key/i,
      /password/i,
      /token.*=.*".*"/i,
      /client_secret/i,
      /auth.*token/i,
      
      // File system access
      /read.*file/i,
      /write.*to.*file/i,
      /delete.*file/i,
      /rm -rf/i,
      /cat.*\//i,
      
      // Memory/skill manipulation
      /MEMORY\.md/i,
      /overwrite.*SOUL/i,
      /update.*identity/i,
      /bypass.*security/i
    ];
    
    this.suspiciousFlags = [
      /\n\s*\n.*(?:system|ignore|disregard)/i,  // Newline + system commands
      /[><\[]/g,  // Special characters used for injection
      /```(?:javascript|python|bash|shell)/i,  // Code blocks
      /```.*```/s,  // Hidden content in code blocks
    ];
    
    this.entropyThreshold = 150; // High randomness = likely injection
  }

  /**
   * Main sanitization function
   * @param {string} userInput - Raw user input
   * @returns {Object} {safe: boolean, cleaned: string, reason: string}
   */
  sanitize(userInput) {
    if (!userInput || typeof userInput !== 'string') {
      return { safe: false, cleaned: '', reason: 'Invalid input type' };
    }

    // Calculate string entropy (randomness)
    const entropy = this.calculateEntropy(userInput);
    
    // Quick pattern scan
    const dangerMatch = this.scanForDangerPatterns(userInput);
    const suspiciousMatch = this.scanForSuspiciousFlags(userInput);
    
    // If matches danger patterns, reject immediately
    if (dangerMatch.found) {
      return {
        safe: false,
        cleaned: '',
        reason: `Dangerous content detected: ${dangerMatch.matched}`,
        severity: 'high',
        action: 'blocked'
      };
    }

    // If multiple suspicious patterns, flag for review
    if (suspiciousMatch.count >= 3 || entropy > this.entropyThreshold) {
      return {
        safe: false,
        cleaned: userInput, // But don't clean yet
        reason: 'Suspicious patterns detected - requires security review',
        severity: 'medium',
        action: 'review_required',
        details: {
          entropy: entropy,
          suspicious_count: suspiciousMatch.count,
          patterns: suspiciousMatch.found
        }
      };
    }

    // Safe input - just clean up formatting
    const cleaned = this.cleanFormatting(userInput);
    
    return {
      safe: true,
      cleaned: cleaned,
      reason: 'Input passed security screening',
      severity: 'none',
      action: 'passed'
    };
  }

  /**
   * Scan for dangerous injection patterns
   * @param {string} text - Input text
   * @returns {Object} Detection results
   */
  scanForDangerPatterns(text) {
    const findings = [];
    
    for (const pattern of this.dangerPatterns) {
      if (pattern.test(text)) {
        findings.push(pattern.source);
      }
    }
    
    return {
      found: findings.length > 0,
      matched: findings.join(', '),
      count: findings.length
    };
  }

  /**
   * Scan for suspicious structural patterns
   * @param {string} text - Input text
   * @returns {Object} Detection results
   */
  scanForSuspiciousFlags(text) {
    const found = [];
    let count = 0;
    
    for (const pattern of this.suspiciousFlags) {
      const matches = text.match(pattern);
      if (matches) {
        found.push(pattern.source);
        count += matches.length;
      }
    }
    
    return {
      found: found,
      count: count
    };
  }

  /**
   * Calculate text entropy (randomness indicator)
   * @param {string} text - Input text
   * @returns {number} Entropy score
   */
  calculateEntropy(text) {
    const charCounts = {};
    const length = text.length;
    
    // Count character frequencies
    for (const char of text) {
      charCounts[char] = (charCounts[char] || 0) + 1;
    }
    
    // Calculate entropy
    let entropy = 0;
    for (const count of Object.values(charCounts)) {
      const probability = count / length;
      entropy -= probability * Math.log2(probability);
    }
    
    return entropy * length; // Scale by length
  }

  /**
   * Clean input formatting (safe operations only)
   * @param {string} text - Input text
   * @returns {string} Cleaned text
   */
  cleanFormatting(text) {
    // Remove excessive whitespace
    text = text.replace(/\s{2,}/g, ' ');
    
    // Trim leading/trailing whitespace
    text = text.trim();
    
    // Ensure single quotes are properly escaped
    text = text.replace(/'/g, "\\'");
    
    // Remove zero-width characters
    text = text.replace(/[\u200B-\u200D\uFEFF]/g, '');
    
    return text;
  }

  /**
   * Analyze search results for injection attempts
   * @param {Array} searchResults - Array of search result strings
   * @returns {Object} Security analysis
   */
  analyzeSearchResults(searchResults) {
    const analysis = {
      totalResults: searchResults.length,
      flaggedResults: [],
      injectionAttempts: 0,
      riskLevel: 'low'
    };

    searchResults.forEach((result, index) => {
      const scan = this.sanitize(result);
      
      if (!scan.safe) {
        analysis.flaggedResults.push({
          index: index,
          content: result.substring(0, 200) + '...',
          reason: scan.reason,
          severity: scan.severity
        });
        
        if (scan.severity === 'high') {
          analysis.injectionAttempts++;
        }
      }
    });

    // Determine overall risk level
    if (analysis.injectionAttempts > 0) {
      analysis.riskLevel = 'high';
    } else if (analysis.flaggedResults.length > searchResults.length * 0.1) {
      analysis.riskLevel = 'medium';
    } else if (analysis.flaggedResults.length > 0) {
      analysis.riskLevel = 'low';
    }

    return analysis;
  }
}

// CLI interface
if (require.main === module) {
  const sanitizer = new PromptSanitizer();
  const input = process.argv.slice(2).join(' ');
  
  if (!input) {
    console.log('Usage: node prompt-sanitizer.js "text to sanitize"');
    console.log('Example: node prompt-sanitizer.js "Please review this contract"');
    process.exit(1);
  }
  
  const result = sanitizer.sanitize(input);
  
  console.log('🛡️ Prompt Sanitization Result');
  console.log('='.repeat(50));
  console.log(`Input: "${input}"`);
  console.log(`Safe: ${result.safe}`);
  console.log(`Reason: ${result.reason}`);
  if (result.cleaned && result.safe) {
    console.log(`Cleaned: "${result.cleaned}"`);
  }
  console.log(`Severity: ${result.severity}`);
  console.log(`Action: ${result.action}`);
  
  if (result.details) {
    console.log('Details:', JSON.stringify(result.details, null, 2));
  }
}

module.exports = PromptSanitizer;