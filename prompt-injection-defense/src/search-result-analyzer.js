#!/usr/bin/env node

/**
 * Search Result Security Analyzer
 * Reviews external content before allowing it into the system
 */

const fs = require('fs');
const path = require('path');
const PromptSanitizer = require('./prompt-sanitizer');

class SearchResultAnalyzer {
  constructor() {
    this.sanitizer = new PromptSanitizer();
    
    // Security scanning configurations
    this.contentFilters = {
      secrets: [
        /api[_-]?key\s*[:=]\s*["']?[a-zA-Z0-9_]{20,}["']?/i,
        /password\s*[:=]\s*["']?[^"'\s]{8,}["']?/i,
        /token\s*[:=]\s*["']?[a-zA-Z0-9]{20,}["']?/i,
        /client[_-]?secret\s*[:=]\s*["']?[^"'\s]{10,}["']?/i,
        /auth[_-]?token\s*[:=]\s*["'][a-zA-Z0-9]{20,}["']/i,
        /bearer\s+[a-zA-Z0-9\-_\.]{20,}/i,
        /sk-[a-zA-Z0-9]{20,}/i,  // OpenAI API key pattern
        /eyJ[a-zA-Z0-9_-]*\.[a-zA-Z0-9_-]*\.[a-zA-Z0-9_-]*/i  // JWT tokens
      ],
      
      malicious: [
        /eval\s*\(/i,
        /exec\s*\(/i,
        /function\s*\(\)\s*\{\s*$/i,  // Live functions
        /javascript:[^\s]+/i,
        /data:text\/html/i,
        /<script[^>]*>/i,
        /on(click|load|error)\s*=/i,
        /window\.location/i,
        /document\.write/i,
        /innerHTML\s*=/i
      ],
      
      social_engineering: [
        /i am a security researcher/i,
        /found a vulnerability/i,
        /please send me/i,
        /urgent security issue/i,
        /immediate action required/i,
        /click here to/i,
        /download now/i,
        /verify your account/i
      ]
    };
    
    this.allowed_domains = [
      'microsoft.com', 'google.com', 'amazon.com', 'apple.com',
      'github.com', 'stackoverflow.com', 'reddit.com', 'linkedin.com',
      'medium.com', 'wikipedia.org', 'who.int', 'cdc.gov'
    ];
    
    this.risk_thresholds = {
      secrets: 0,      // Zero tolerance for secrets
      malicious: 2,    // Allow 2 flagged items in malicious category
      engineering: 1,  // Allow 1 social engineering item
      injection: 0     // Zero tolerance for code injection
    };
  }

  /**
   * Main analyzer function
   * @param {Object} data - Search result data with text and metadata
   * @returns {Object} Security analysis results
   */
  analyzeSearchResults(data) {
    if (!data || !data.content) {
      return {
        safe: false,
        filtered_content: '',
        reason: 'Invalid search result format',
        risk_level: 'high'
      };
    }

    const results = Array.isArray(data.content) ? data.content : [data.content];
    const cleanResults = [];
    const security_violations = [];
    let secrets_found = 0;
    let malicious_found = 0;
    let engineering_found = 0;
    let injection_attempts = 0;

    // Analyze each search result
    for (const result of results) {
      const clean_result = this.analyzeIndividualResult(result);
      
      if (clean_result.safe) {
        cleanResults.push(clean_result.filtered_content);
      } else {
        security_violations.push({
          original: result.substring(0, 200) + '...',
          reason: clean_result.reason,
          risk_level: clean_result.risk_level
        });
        
        // Count violations by type
        if (clean_result.violation_type === 'secrets') secrets_found++;
        if (clean_result.violation_type === 'malicious') malicious_found++;
        if (clean_result.violation_type === 'engineering') engineering_found++;
        if (clean_result.violation_type === 'injection') injection_attempts++;
      }
    }

    // Determine overall safety
    const overall_risk = this.calculateOverallRisk({
      secrets_found,
      malicious_found,
      engineering_found,
      injection_attempts,
      total_results: results.length
    });

    if (overall_risk.level === 'safe') {
      return {
        safe: true,
        filtered_content: cleanResults.join('\n\n'),
        reason: 'Content passed security review',
        risk_level: 'none',
        violations: security_violations,
        processed_count: results.length
      };
    } else {
      // High risk - return empty content
      return {
        safe: false,
        filtered_content: '',
        reason: overall_risk.reason,
        risk_level: overall_risk.level,
        violations: security_violations,
        processed_count: results.length
      };
    }
  }

  /**
   * Analyze individual search result
   * @param {string} result - Single search result text
   * @returns {Object} Analysis of single result
   */
  analyzeIndividualResult(result) {
    const risks = {
      secrets: 0,
      malicious: 0,
      engineering: 0,
      injection: 0
    };

    // Check each content category
    for (const [category, patterns] of Object.entries(this.contentFilters)) {
      for (const pattern of patterns) {
        if (pattern.test(result)) {
          risks[category]++;
        }
      }
    }

    // Check for injection attempts
    const injectionCheck = this.sanitizer.sanitize(result);
    if (!injectionCheck.safe && injectionCheck.severity === 'high') {
      risks.injection++;
    } else if (!injectionCheck.safe) {
      // Still count as suspicious
      risks.malicious++;
    }

    // Check domain credibility
    const domainRisk = this.checkDomainCredibility(result);
    
    // Make decision
    if (risks.secrets > 0) {
      return {
        safe: false,
        filtered_content: '',
        reason: `Secrets detected (${risks.secrets} instances)`,
        risk_level: 'high',
        violation_type: 'secrets'
      };
    }

    if (risks.injection > 0 || risks.malicious > this.risk_thresholds.malicious) {
      return {
        safe: false,
        filtered_content: '',
        reason: `Malicious content detected`,
        risk_level: 'high',
        violation_type: 'malicious'
      };
    }

    if (risks.engineering > this.risk_thresholds.engineering) {
      return {
        safe: false,
        filtered_content: '',
        reason: `Social engineering content detected`,
        risk_level: 'medium',
        violation_type: 'engineering'
      };
    }

    // Safe result - filter and return
    const filtered = this.sanitizeContent(result);
    
    return {
      safe: true,
      filtered_content: filtered,
      reason: 'Result passed security review',
      risk_level: 'none',
      violations: risks
    };
  }

  /**
   * Filter content while preserving meaning
   * @param {string} content - Original content
   * @returns {string} Sanitized content
   */
  sanitizeContent(content) {
    // Remove secrets
    for (const pattern of this.contentFilters.secrets) {
      content = content.replace(pattern, '[REDACTED]');
    }
    
    // Remove malicious code patterns
    for (const pattern of this.contentFilters.malicious) {
      content = content.replace(pattern, '[REMOVED]');
    }
    
    // Remove social engineering triggers
    for (const pattern of this.contentFilters.social_engineering) {
      content = content.replace(pattern, '[FILTERED]');
    }
    
    return content;
  }

  /**
   * Check domain credibility
   * @param {string} content - Content to check
   * @returns {string} Risk level
   */
  checkDomainCredibility(content) {
    // Extract URLs and check domains
    const urlPattern = /https?:\/\/([^\/\s]+)/g;
    const urls = content.match(urlPattern) || [];
    
    if (urls.length === 0) return 'unknown';
    
    const domains = urls.map(url => {
      try {
        return new URL(url).hostname.replace('www.', '');
      } catch {
        return null;
      }
    }).filter(Boolean);
    
    const trustedCount = domains.filter(domain => 
      this.allowed_domains.some(trusted => domain.includes(trusted))
    ).length;
    
    const ratio = trustedCount / domains.length;
    
    if (ratio >= 0.8) return 'low';
    if (ratio >= 0.5) return 'medium';
    if (ratio >= 0.2) return 'high';
    return 'very_high';
  }

  /**
   * Calculate overall risk based on violations
   * @param {Object} violations - Count of violations by type
   * @returns {Object} Overall risk assessment
   */
  calculateOverallRisk(violations) {
    const { secrets_found, malicious_found, engineering_found, injection_attempts } = violations;
    
    if (secrets_found > 0 || injection_attempts > 0) {
      return {
        level: 'high',
        reason: 'High-risk security violations detected',
        action: 'block_all'
      };
    }
    
    if (malicious_found > 3 || engineering_found > 2) {
      return {
        level: 'high',
        reason: 'Multiple security violations detected',
        action: 'block_all'
      };
    }
    
    if (malicious_found > 0 || engineering_found > 0) {
      return {
        level: 'medium',
        reason: 'Some security concerns detected',
        action: 'filter_and_warn'
      };
    }
    
    return {
      level: 'low',
      reason: 'Content passed security review',
      action: 'allow'
    };
  }

  /**
   * Generate security report
   * @param {Array} violations - Security violations found
   * @returns {string} Human-readable report
   */
  generateSecurityReport(violations) {
    if (violations.length === 0) {
      return "✅ All external content passed security screening";
    }
    
    const reports = violations.map(v => {
      switch (v.risk_level) {
        case 'high':
          return `🚨 ${v.reason}`;
        case 'medium':
          return `⚠️  ${v.reason}`;
        default:
          return `• ${v.reason}`;
      }
    });
    
    return reports.join('\n');
  }
}

// CLI interface
if (require.main === module) {
  const analyzer = new SearchResultAnalyzer();
  
  // Test with sample data
  const testData = {
    content: [
      "API key: sk-1234567890abcdefghijklmnopqrst",
      "const secret = 'super_secret_token_12345';",
      "Download now to get your free tokens!",
      "Please send me your login credentials."
    ]
  };
  
  const result = analyzer.analyzeSearchResults(testData);
  
  console.log('🔍 Search Result Security Analysis');
  console.log('='.repeat(50));
  console.log(`Safe: ${result.safe}`);
  console.log(`Filtered content: ${result.filtered_content.length} chars`);
  console.log(`Violations found: ${result.violations.length}`);
  
  if (result.violations.length > 0) {
    console.log('\n' + analyzer.generateSecurityReport(result.violations));
  }
}

module.exports = SearchResultAnalyzer;