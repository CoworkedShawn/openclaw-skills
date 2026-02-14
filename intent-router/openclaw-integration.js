#!/usr/bin/env node

/**
 * OpenClaw Intent Router Integration
 * Main entry point for OpenClaw to use the intent routing system
 */

const IntentRouter = require('./intent-router');
const path = require('path');
const fs = require('fs');

class OpenClawIntentIntegration {
    constructor() {
        this.router = new IntentRouter();
        this.sessionContexts = new Map();
        this.config = this.loadConfiguration();
    }

    /**
     * Load configuration from file
     */
    loadConfiguration() {
        const configPath = path.join(__dirname, 'openclaw-config.json');
        if (fs.existsSync(configPath)) {
            return JSON.parse(fs.readFileSync(configPath, 'utf8'));
        }
        return this.getDefaultConfiguration();
    }

    /**
     * Get default configuration
     */
    getDefaultConfiguration() {
        return {
            enabled: true,
            confidence_threshold: 0.6,
            fallback_to_general: true,
            preserve_context: true,
            max_context_history: 10,
            auto_learn: false,
            debugging: false,
            skill_timeout_ms: 30000,
            retry_failed_routing: false,
            log_all_interactions: true
        };
    }

    /**
     * Main processing function for OpenClaw messages
     */
    async processMessage(message, openclawContext = {}) {
        try {
            // Extract context information
            const userId = openclawContext.userId || openclawContext.user_id || 'default';
            const sessionId = openclawContext.sessionId || openclawContext.session_id || 'default';
            const channel = openclawContext.channel || 'default';

            // Build routing context
            const routingContext = this.buildRoutingContext(message, openclawContext, userId, sessionId);

            // Perform intent routing
            const routingResult = await this.router.route(message, routingContext);

            // Enhance result for OpenClaw
            const openclawResult = this.buildOpenClawResponse(routingResult, message, openclawContext);

            // Update session context
            this.updateSessionContext(userId, sessionId, routingResult, openclawResult);

            // Log interaction if enabled
            if (this.config.log_all_interactions) {
                this.logInteraction(message, routingResult, openclawResult);
            }

            return openclawResult;

        } catch (error) {
            console.error('OpenClaw Intent Integration Error:', error);
            return this.buildErrorResponse(error, message, openclawContext);
        }
    }

    /**
     * Build routing context from OpenClaw context
     */
    buildRoutingContext(message, openclawContext, userId, sessionId) {
        const sessionContext = this.getSessionContext(userId, sessionId);
        
        return {
            originalMessage: message,
            userId: userId,
            sessionId: sessionId,
            channel: openclawContext.channel,
            userProfile: openclawContext.userProfile || {},
            recentMessages: sessionContext.messageHistory || [],
            sessionStartTime: sessionContext.startTime || Date.now(),
            interactionCount: sessionContext.interactionCount || 0,
            preferredSkills: sessionContext.preferredSkills || [],
            failedSkills: sessionContext.failedSkills || [],
            contextPreferences: openclawContext.contextPreferences || {}
        };
    }

    /**
     * Build OpenClaw-compatible response
     */
    buildOpenClawResponse(routingResult, originalMessage, openclawContext) {
        const baseResponse = {
            intent_routing: {
                success: routingResult.success,
                intent: routingResult.intent,
                confidence: routingResult.confidence,
                action: routingResult.action,
                timestamp: routingResult.timestamp
            },
            original_message: originalMessage
        };

        if (routingResult.success && routingResult.action === 'route_to_skill') {
            return {
                ...baseResponse,
                skill_execution: {
                    target_skill: routingResult.targetSkill,
                    skill_path: `skills/${routingResult.targetSkill}`,
                    required_tools: routingResult.requiredTools,
                    parameters: routingResult.parameters,
                    configuration: routingResult.skillConfiguration,
                    fallback_skills: routingResult.fallbackSkills,
                    preserve_context: routingResult.preserveContext
                },
                execution_metadata: {
                    using_fallback: routingResult.routing_metadata.using_fallback,
                    confidence_level: routingResult.routing_metadata.confidence_level,
                    estimated_execution_time: this.estimateExecutionTime(routingResult.targetSkill),
                    required_confirmations: this.getRequiredConfirmations(routingResult.targetSkill),
                    safety_level: this.getSafetyLevel(routingResult.targetSkill)
                },
                openclaw_commands: this.generateOpenClawCommands(routingResult)
            };
        }

        if (routingResult.action === 'clarification_needed') {
            return {
                ...baseResponse,
                clarification_request: {
                    reason: routingResult.reason,
                    suggestion: routingResult.suggestion,
                    alternative_intents: routingResult.alternativeIntents,
                    clarification_prompts: this.generateClarificationPrompts(routingResult),
                    fallback_available: true
                }
            };
        }

        if (routingResult.action === 'skill_unavailable') {
            return {
                ...baseResponse,
                skill_unavailable: {
                    requested_skill: routingResult.requestedSkill,
                    reason: routingResult.reason,
                    suggestion: routingResult.suggestion,
                    fallback_skill: routingResult.fallbackSkill,
                    alternative_approaches: this.getAlternativeApproaches(routingResult.requestedSkill)
                }
            };
        }

        // Error or other cases
        return {
            ...baseResponse,
            error_handling: {
                type: routingResult.action,
                reason: routingResult.reason || 'Unknown error',
                fallback_skill: routingResult.fallbackSkill || 'general-assistant',
                recovery_suggestions: this.getRecoverySuggestions(routingResult)
            }
        };
    }

    /**
     * Generate OpenClaw tool commands based on routing result
     */
    generateOpenClawCommands(routingResult) {
        const commands = [];
        const skill = routingResult.targetSkill;
        const params = routingResult.parameters;

        // Generate skill invocation command
        commands.push({
            type: 'skill_invoke',
            skill: skill,
            action: 'handle_request',
            parameters: {
                intent: routingResult.intent,
                confidence: routingResult.confidence,
                ...params
            },
            timeout: this.config.skill_timeout_ms,
            retry_on_failure: this.config.retry_failed_routing
        });

        // Add tool preparation commands based on required tools
        routingResult.requiredTools.forEach(tool => {
            switch (tool) {
                case 'calendar':
                    commands.unshift({
                        type: 'tool_prepare',
                        tool: 'calendar',
                        action: 'initialize',
                        parameters: { check_availability: true }
                    });
                    break;
                case 'message':
                    commands.unshift({
                        type: 'tool_prepare',
                        tool: 'message',
                        action: 'initialize',
                        parameters: { validate_channels: true }
                    });
                    break;
                case 'web_search':
                    commands.unshift({
                        type: 'tool_prepare',
                        tool: 'web_search',
                        action: 'initialize',
                        parameters: { check_rate_limits: true }
                    });
                    break;
            }
        });

        return commands;
    }

    /**
     * Generate clarification prompts
     */
    generateClarificationPrompts(routingResult) {
        const prompts = [];
        const intent = routingResult.intent;

        // Intent-specific clarification prompts
        switch (intent) {
            case 'calendar_scheduling':
                prompts.push(
                    "What specific event would you like to schedule?",
                    "When would you like this event to take place?",
                    "Who should be invited to this meeting?"
                );
                break;
            case 'email_management':
                prompts.push(
                    "Who would you like to send the email to?",
                    "What should the subject of the email be?",
                    "What type of email action do you need (send, check, reply)?"
                );
                break;
            case 'file_operations':
                prompts.push(
                    "What file would you like to work with?",
                    "What operation do you want to perform (create, edit, delete)?",
                    "What should the file be called?"
                );
                break;
            case 'research_web_search':
                prompts.push(
                    "What specific topic would you like me to research?",
                    "How detailed should the research be?",
                    "Are you looking for recent information or general knowledge?"
                );
                break;
            default:
                prompts.push(
                    "Could you be more specific about what you'd like me to help with?",
                    "What is the main task you're trying to accomplish?"
                );
        }

        return prompts;
    }

    /**
     * Estimate execution time for skills
     */
    estimateExecutionTime(skillName) {
        const estimates = {
            'calendar-manager': 5,
            'email-assistant': 10,
            'file-manager': 3,
            'research-assistant': 15,
            'code-assistant': 20,
            'social-media-manager': 8,
            'system-admin': 30,
            'crm-manager': 10,
            'task-manager': 5,
            'general-assistant': 5
        };
        return estimates[skillName] || 10; // seconds
    }

    /**
     * Get required confirmations for skills
     */
    getRequiredConfirmations(skillName) {
        const confirmations = {
            'system-admin': ['destructive_operations', 'system_changes'],
            'file-manager': ['file_deletion', 'overwrite_existing'],
            'email-assistant': ['send_email_confirmation'],
            'social-media-manager': ['post_confirmation'],
            'crm-manager': ['data_modification']
        };
        return confirmations[skillName] || [];
    }

    /**
     * Get safety level for skills
     */
    getSafetyLevel(skillName) {
        const safetyLevels = {
            'system-admin': 'high',
            'file-manager': 'medium',
            'email-assistant': 'medium',
            'social-media-manager': 'medium',
            'code-assistant': 'low',
            'research-assistant': 'low',
            'calendar-manager': 'low',
            'crm-manager': 'medium',
            'task-manager': 'low',
            'general-assistant': 'low'
        };
        return safetyLevels[skillName] || 'medium';
    }

    /**
     * Get alternative approaches when skill is unavailable
     */
    getAlternativeApproaches(requestedSkill) {
        const alternatives = {
            'calendar-manager': [
                'Use task-manager to create schedule reminders',
                'Use general-assistant to provide calendar guidance'
            ],
            'email-assistant': [
                'Use message tool directly for simple messages',
                'Use general-assistant for email composition help'
            ],
            'code-assistant': [
                'Use file-manager to create code files',
                'Use research-assistant to find coding solutions'
            ],
            'social-media-manager': [
                'Use message tool for direct posting',
                'Use general-assistant for content creation help'
            ]
        };
        return alternatives[requestedSkill] || [
            'Use general-assistant for basic guidance',
            'Try a more specific request'
        ];
    }

    /**
     * Get recovery suggestions
     */
    getRecoverySuggestions(routingResult) {
        return [
            'Try rephrasing your request with more specific details',
            'Break down complex requests into smaller, specific tasks',
            'Use direct skill names if you know which skill you want to use',
            'Ask for help with the specific type of task you\'re trying to accomplish'
        ];
    }

    /**
     * Update session context
     */
    updateSessionContext(userId, sessionId, routingResult, openclawResult) {
        const contextKey = `${userId}:${sessionId}`;
        let context = this.sessionContexts.get(contextKey) || {
            startTime: Date.now(),
            messageHistory: [],
            interactionCount: 0,
            preferredSkills: [],
            failedSkills: []
        };

        context.interactionCount++;
        context.messageHistory.push({
            timestamp: Date.now(),
            intent: routingResult.intent,
            confidence: routingResult.confidence,
            success: routingResult.success,
            skill_used: openclawResult.skill_execution?.target_skill
        });

        // Keep only recent history
        if (context.messageHistory.length > this.config.max_context_history) {
            context.messageHistory = context.messageHistory.slice(-this.config.max_context_history);
        }

        // Track skill preferences
        if (routingResult.success && openclawResult.skill_execution) {
            const skill = openclawResult.skill_execution.target_skill;
            if (!context.preferredSkills.includes(skill)) {
                context.preferredSkills.push(skill);
            }
        }

        // Track failed skills
        if (!routingResult.success && routingResult.requestedSkill) {
            if (!context.failedSkills.includes(routingResult.requestedSkill)) {
                context.failedSkills.push(routingResult.requestedSkill);
            }
        }

        this.sessionContexts.set(contextKey, context);
    }

    /**
     * Get session context
     */
    getSessionContext(userId, sessionId) {
        const contextKey = `${userId}:${sessionId}`;
        return this.sessionContexts.get(contextKey) || {};
    }

    /**
     * Log interaction
     */
    logInteraction(message, routingResult, openclawResult) {
        const logEntry = {
            timestamp: new Date().toISOString(),
            message: message,
            intent: routingResult.intent,
            confidence: routingResult.confidence,
            success: routingResult.success,
            action: routingResult.action,
            skill_used: openclawResult.skill_execution?.target_skill || null
        };

        // In a real implementation, this would write to a proper log file
        if (this.config.debugging) {
            console.log('[Intent Router Log]:', JSON.stringify(logEntry, null, 2));
        }
    }

    /**
     * Build error response
     */
    buildErrorResponse(error, message, openclawContext) {
        return {
            intent_routing: {
                success: false,
                intent: 'system_error',
                confidence: 0,
                action: 'system_error',
                timestamp: Date.now()
            },
            original_message: message,
            error_handling: {
                type: 'system_error',
                reason: error.message,
                fallback_skill: 'general-assistant',
                recovery_suggestions: [
                    'Please try your request again',
                    'Check if your request is properly formatted',
                    'Contact system administrator if the problem persists'
                ]
            }
        };
    }

    /**
     * Get system statistics
     */
    getSystemStatistics() {
        const routerStats = this.router.getStatistics();
        return {
            router_statistics: routerStats,
            session_statistics: {
                active_sessions: this.sessionContexts.size,
                total_interactions: Array.from(this.sessionContexts.values())
                    .reduce((sum, context) => sum + context.interactionCount, 0)
            },
            configuration: this.config,
            uptime: Date.now() - (this.startTime || Date.now())
        };
    }

    /**
     * Update configuration
     */
    updateConfiguration(newConfig) {
        this.config = { ...this.config, ...newConfig };
        this.saveConfiguration();
    }

    /**
     * Save configuration to file
     */
    saveConfiguration() {
        const configPath = path.join(__dirname, 'openclaw-config.json');
        fs.writeFileSync(configPath, JSON.stringify(this.config, null, 2));
    }

    /**
     * Clear all session contexts
     */
    clearSessionContexts() {
        this.sessionContexts.clear();
    }

    /**
     * Reset router statistics
     */
    resetStatistics() {
        this.router.resetStatistics();
    }
}

module.exports = OpenClawIntentIntegration;

// CLI interface for testing
if (require.main === module) {
    const integration = new OpenClawIntentIntegration();
    const message = process.argv[2] || "Schedule a meeting with the team tomorrow at 2pm";
    
    console.log('Testing OpenClaw Intent Integration...');
    console.log('Message:', message);
    
    integration.processMessage(message, {
        userId: 'test-user',
        sessionId: 'test-session',
        channel: 'cli'
    }).then(result => {
        console.log('\nOpenClaw Response:');
        console.log(JSON.stringify(result, null, 2));
        
        console.log('\nSystem Statistics:');
        console.log(JSON.stringify(integration.getSystemStatistics(), null, 2));
    }).catch(console.error);
}