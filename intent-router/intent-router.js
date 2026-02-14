#!/usr/bin/env node

/**
 * OpenClaw Intent Router - Main Routing Engine
 * Routes messages to appropriate skills based on detected intent
 */

const IntentAnalyzer = require('./intent-analyzer');
const fs = require('fs');
const path = require('path');

class IntentRouter {
    constructor() {
        this.analyzer = new IntentAnalyzer();
        this.routingStats = {
            totalRequests: 0,
            successfulRoutings: 0,
            fallbackUsed: 0,
            intentDistribution: {},
            skillUsage: {},
            averageConfidence: 0
        };
        this.availableSkills = this.loadAvailableSkills();
    }

    /**
     * Load available skills from workspace
     */
    loadAvailableSkills() {
        const skillsDir = path.resolve(__dirname, '../../');
        const skills = new Set();
        
        try {
            const skillDirs = fs.readdirSync(skillsDir, { withFileTypes: true })
                .filter(dirent => dirent.isDirectory())
                .map(dirent => dirent.name);
            
            skillDirs.forEach(skillName => {
                skills.add(skillName);
            });
        } catch (error) {
            console.warn('Could not load skills directory:', error.message);
        }

        // Add default expected skills
        const defaultSkills = [
            'calendar-manager', 'email-assistant', 'file-manager', 'research-assistant',
            'code-assistant', 'social-media-manager', 'system-admin', 'crm-manager',
            'task-manager', 'general-assistant', 'help-system'
        ];

        defaultSkills.forEach(skill => skills.add(skill));
        return Array.from(skills);
    }

    /**
     * Main routing function - processes message and returns routing decision
     */
    async route(message, context = {}) {
        try {
            this.routingStats.totalRequests++;

            // Get user context
            const userId = context.userId || 'anonymous';
            const userContext = this.analyzer.getUserContext(userId);

            // Analyze intent
            const analysis = this.analyzer.analyzeIntent(message, userContext);
            
            // Get routing recommendation
            const routing = this.analyzer.getRoutingRecommendation(analysis);

            // Update statistics
            this.updateRoutingStats(analysis, routing);

            // Check skill availability
            const availabilityCheck = this.checkSkillAvailability(routing);

            // Build final routing decision
            const routingDecision = this.buildRoutingDecision(analysis, routing, availabilityCheck, context);

            // Update user context
            this.analyzer.updateContext(userId, analysis.primaryIntent, routing.success);

            return routingDecision;

        } catch (error) {
            console.error('Routing error:', error);
            return this.buildErrorResponse(error, message, context);
        }
    }

    /**
     * Update routing statistics
     */
    updateRoutingStats(analysis, routing) {
        const intent = analysis.primaryIntent;
        
        // Update intent distribution
        this.routingStats.intentDistribution[intent] = 
            (this.routingStats.intentDistribution[intent] || 0) + 1;

        if (routing.success) {
            this.routingStats.successfulRoutings++;
            
            // Update skill usage
            const skill = routing.primarySkill;
            this.routingStats.skillUsage[skill] = 
                (this.routingStats.skillUsage[skill] || 0) + 1;
        } else {
            this.routingStats.fallbackUsed++;
        }

        // Update average confidence
        const totalConfidence = this.routingStats.averageConfidence * (this.routingStats.totalRequests - 1);
        this.routingStats.averageConfidence = 
            (totalConfidence + analysis.confidence) / this.routingStats.totalRequests;
    }

    /**
     * Check if required skills are available
     */
    checkSkillAvailability(routing) {
        if (!routing.success) {
            return { available: false, reason: 'Routing failed' };
        }

        const primarySkillAvailable = this.availableSkills.includes(routing.primarySkill);
        const fallbackSkillsAvailable = routing.fallbackSkills.filter(skill => 
            this.availableSkills.includes(skill)
        );

        return {
            available: primarySkillAvailable || fallbackSkillsAvailable.length > 0,
            primarySkillAvailable,
            availableFallbacks: fallbackSkillsAvailable,
            reason: primarySkillAvailable ? 'Primary skill available' : 
                   fallbackSkillsAvailable.length > 0 ? 'Fallback skills available' : 
                   'No skills available'
        };
    }

    /**
     * Build the final routing decision
     */
    buildRoutingDecision(analysis, routing, availability, context) {
        const baseDecision = {
            success: routing.success && availability.available,
            intent: analysis.primaryIntent,
            confidence: analysis.confidence,
            timestamp: analysis.timestamp,
            originalMessage: context.originalMessage || 'Not provided'
        };

        if (!routing.success) {
            return {
                ...baseDecision,
                success: false,
                action: 'clarification_needed',
                reason: routing.reason,
                suggestion: routing.suggestion || 'Please be more specific about what you need help with',
                alternativeIntents: analysis.allIntents.slice(1, 3).map(intent => ({
                    intent: intent.intent,
                    confidence: intent.confidence
                })),
                fallbackSkill: 'general-assistant'
            };
        }

        if (!availability.available) {
            return {
                ...baseDecision,
                success: false,
                action: 'skill_unavailable',
                reason: availability.reason,
                requestedSkill: routing.primarySkill,
                fallbackSkill: 'general-assistant',
                suggestion: 'Using general assistant as fallback'
            };
        }

        // Successful routing
        const targetSkill = availability.primarySkillAvailable ? 
            routing.primarySkill : 
            availability.availableFallbacks[0];

        return {
            ...baseDecision,
            success: true,
            action: 'route_to_skill',
            targetSkill: targetSkill,
            fallbackSkills: availability.availableFallbacks,
            requiredTools: routing.requiredTools,
            preserveContext: routing.contextPreservation,
            parameters: routing.parameters,
            skillConfiguration: this.buildSkillConfiguration(targetSkill, analysis, routing),
            routing_metadata: {
                using_fallback: !availability.primarySkillAvailable,
                confidence_level: this.getConfidenceLevel(analysis.confidence),
                intent_alternatives: analysis.allIntents.length - 1
            }
        };
    }

    /**
     * Build skill-specific configuration
     */
    buildSkillConfiguration(skillName, analysis, routing) {
        const baseConfig = {
            intent: analysis.primaryIntent,
            confidence: analysis.confidence,
            parameters: routing.parameters,
            context_preservation: routing.contextPreservation
        };

        // Skill-specific configurations
        const skillConfigs = {
            'calendar-manager': {
                ...baseConfig,
                calendar_source: 'default',
                notification_enabled: true,
                timezone: 'auto'
            },
            'email-assistant': {
                ...baseConfig,
                email_client: 'default',
                auto_draft: false,
                include_signature: true
            },
            'file-manager': {
                ...baseConfig,
                base_directory: process.env.OPENCLAW_WORKSPACE || '~/.openclaw/workspace',
                backup_enabled: true,
                auto_organize: false
            },
            'research-assistant': {
                ...baseConfig,
                search_depth: 'moderate',
                include_sources: true,
                fact_check: true
            },
            'code-assistant': {
                ...baseConfig,
                code_style: 'standard',
                include_tests: false,
                documentation_level: 'basic'
            },
            'social-media-manager': {
                ...baseConfig,
                auto_hashtags: false,
                schedule_enabled: false,
                character_limit_check: true
            },
            'system-admin': {
                ...baseConfig,
                safety_checks: true,
                require_confirmation: true,
                backup_before_changes: true
            },
            'crm-manager': {
                ...baseConfig,
                auto_sync: true,
                duplicate_check: true,
                activity_tracking: true
            },
            'task-manager': {
                ...baseConfig,
                priority_auto_assign: true,
                due_date_reminders: true,
                category_auto_assign: false
            }
        };

        return skillConfigs[skillName] || baseConfig;
    }

    /**
     * Get human-readable confidence level
     */
    getConfidenceLevel(confidence) {
        if (confidence >= 0.8) return 'high';
        if (confidence >= 0.6) return 'medium';
        if (confidence >= 0.4) return 'low';
        return 'very_low';
    }

    /**
     * Build error response
     */
    buildErrorResponse(error, message, context) {
        return {
            success: false,
            action: 'system_error',
            error: error.message,
            fallbackSkill: 'general-assistant',
            suggestion: 'The system encountered an error. Please try rephrasing your request.',
            debug: {
                originalMessage: message,
                context: context,
                timestamp: Date.now()
            }
        };
    }

    /**
     * Get routing statistics
     */
    getStatistics() {
        const successRate = this.routingStats.totalRequests > 0 ? 
            (this.routingStats.successfulRoutings / this.routingStats.totalRequests) * 100 : 0;

        return {
            ...this.routingStats,
            successRate: Math.round(successRate * 100) / 100,
            availableSkills: this.availableSkills.length,
            topIntents: this.getTopIntents(5),
            topSkills: this.getTopSkills(5)
        };
    }

    /**
     * Get top intents by usage
     */
    getTopIntents(limit = 5) {
        return Object.entries(this.routingStats.intentDistribution)
            .sort(([,a], [,b]) => b - a)
            .slice(0, limit)
            .map(([intent, count]) => ({ intent, count }));
    }

    /**
     * Get top skills by usage
     */
    getTopSkills(limit = 5) {
        return Object.entries(this.routingStats.skillUsage)
            .sort(([,a], [,b]) => b - a)
            .slice(0, limit)
            .map(([skill, count]) => ({ skill, count }));
    }

    /**
     * Test routing with a sample message
     */
    async testRouting(message, context = {}) {
        console.log(`Testing routing for: "${message}"`);
        const result = await this.route(message, { ...context, originalMessage: message });
        return result;
    }

    /**
     * Batch test multiple messages
     */
    async batchTest(messages) {
        const results = [];
        for (const message of messages) {
            const result = await this.testRouting(message);
            results.push({ message, result });
        }
        return results;
    }

    /**
     * Reset statistics
     */
    resetStatistics() {
        this.routingStats = {
            totalRequests: 0,
            successfulRoutings: 0,
            fallbackUsed: 0,
            intentDistribution: {},
            skillUsage: {},
            averageConfidence: 0
        };
    }

    /**
     * Add custom intent pattern
     */
    addCustomIntent(intentName, pattern, skillMapping) {
        this.analyzer.addIntentPattern(intentName, pattern);
        if (skillMapping) {
            this.analyzer.addSkillMapping(intentName, skillMapping);
        }
    }

    /**
     * Export configuration
     */
    exportConfiguration() {
        return {
            intentPatterns: this.analyzer.intentPatterns,
            skillMappings: this.analyzer.skillMappings,
            availableSkills: this.availableSkills,
            statistics: this.getStatistics()
        };
    }
}

module.exports = IntentRouter;

// CLI interface for testing
if (require.main === module) {
    const router = new IntentRouter();
    
    const testMessages = [
        "Schedule a meeting with Sarah tomorrow at 2pm",
        "Send an email to john@company.com about the project update",
        "Create a new file called project-notes.md",
        "Search for information about AI trends in 2024",
        "Write a Python function to calculate fibonacci numbers",
        "Post on Twitter about our new product launch",
        "Configure system settings for development environment",
        "Add a new lead named Mike Johnson to CRM",
        "Help me understand how to use the calendar feature"
    ];
    
    async function runTests() {
        console.log('🧪 Running Intent Router Tests...\n');
        
        for (let i = 0; i < testMessages.length; i++) {
            const message = testMessages[i];
            const result = await router.testRouting(message);
            
            console.log(`Test ${i + 1}: "${message}"`);
            console.log(`→ Intent: ${result.intent} (${(result.confidence * 100).toFixed(1)}%)`);
            console.log(`→ Action: ${result.action}`);
            
            if (result.success) {
                console.log(`→ Target Skill: ${result.targetSkill}`);
                console.log(`→ Required Tools: ${result.requiredTools.join(', ')}`);
            } else {
                console.log(`→ Reason: ${result.reason}`);
                console.log(`→ Fallback: ${result.fallbackSkill}`);
            }
            console.log('');
        }
        
        console.log('📊 Statistics:');
        const stats = router.getStatistics();
        console.log(`→ Success Rate: ${stats.successRate}%`);
        console.log(`→ Total Requests: ${stats.totalRequests}`);
        console.log(`→ Available Skills: ${stats.availableSkills}`);
        console.log(`→ Average Confidence: ${(stats.averageConfidence * 100).toFixed(1)}%`);
    }
    
    runTests().catch(console.error);
}