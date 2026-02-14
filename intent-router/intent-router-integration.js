#!/usr/bin/env node

/**
 * OpenClaw Intent Router - Main Integration Script
 * Provides a simple interface for OpenClaw to use the intent routing system
 */

const IntentRouter = require('./intent-router');

class IntentRouterIntegration {
    constructor() {
        this.router = new IntentRouter();
        this.sessionContext = new Map();
    }

    /**
     * Process message through intent routing (main entry point)
     */
    async processMessage(message, userContext = {}) {
        try {
            // Build context from user context and session
            const fullContext = {
                original_message: message,
                user_id: userContext.user_id || 'unknown',
                channel: userContext.channel || 'unknown',
                timestamp: Date.now(),
                ...this.getSessionContext(userContext.user_id)
            };

            // Route the message
            const routingResult = await this.router.routeMessage(message, fullContext);
            
            // Update session context based on routing result
            this.updateSessionContext(userContext.user_id, routingResult);
            
            // Format response for OpenClaw
            return this.formatOpenClawResponse(routingResult, message);
            
        } catch (error) {
            console.error('Intent router integration error:', error);
            return this.formatErrorResponse(error, message);
        }
    }

    /**
     * Get session context for user
     */
    getSessionContext(userId) {
        return this.sessionContext.get(userId) || {};
    }

    /**
     * Update session context for user
     */
    updateSessionContext(userId, routingResult) {
        const existingContext = this.sessionContext.get(userId) || {};
        const newContext = {
            ...existingContext,
            last_intent: routingResult.intent,
            last_success: routingResult.success,
            session_start: existingContext.session_start || Date.now(),
            last_interaction: Date.now(),
            interaction_count: (existingContext.interaction_count || 0) + 1
        };
        
        this.sessionContext.set(userId, newContext);
    }

    /**
     * Format response for OpenClaw
     */
    formatOpenClawResponse(routingResult, originalMessage) {
        if (routingResult.success) {
            // Success response
            return {
                success: true,
                type: 'intent_routed',
                intent: routingResult.intent,
                confidence: routingResult.confidence,
                response_for_user: this.buildUserResponse(routingResult),
                action_completed: routingResult.action_taken,
                skill_used: routingResult.skill_used,
                parameters_used: routingResult.parameters_used,
                next_steps: routingResult.result?.suggested_next_steps || [],
                tools_required: routingResult.context?.tools_required || [],
                openclaw_commands: this.buildOpenClawCommands(routingResult)
            };
        } else {
            // Handle various failure scenarios
            if (routingResult.action === 'clarification_needed') {
                return {
                    success: false,
                    type: 'clarification_needed',
                    confidence: routingResult.confidence,
                    response_for_user: routingResult.message,
                    suggestions: routingResult.suggestions,
                    possible_intents: routingResult.possible_intents?.map(i => ({
                        intent: i[0],
                        confidence: i[1]
                    })) || []
                };
            } else if (routingResult.action === 'request_missing_params') {
                return {
                    success: false,
                    type: 'missing_parameters',
                    missing_params: routingResult.missing_params,
                    intent: routingResult.intent,
                    response_for_user: routingResult.message
                };
            } else {
                return {
                    success: false,
                    type: 'routing_failed',
                    error: routingResult.error,
                    details: routingResult.details,
                    response_for_user: "I'm having trouble processing that request. Could you try rephrasing it?",
                    suggested_action: routingResult.suggested_action,
                    fallback_available: routingResult.fallback
                };
            }
        }
    }

    /**
     * Build user-friendly response
     */
    buildUserResponse(routingResult) {
        const skill = routingResult.skill_used;
        const action = routingResult.action_taken;
        const result = routingResult.result;
        
        if (result?.simulated_execution) {
            return `I'll help you with that ${routingResult.intent.replace('_', ' ')} task. I'll use the ${skill} to ${this.getActionDescription(action)}.`;
        }
        
        if (result?.success) {
            return `Great! I've completed your ${routingResult.intent.replace('_', ' ')} request using ${skill}. ${result.message || ''}`;
        }
        
        return `I'm working on your ${routingResult.intent.replace('_', ' ')} request. Let me get the ${skill} started.`;
    }

    /**
     * Get action description for user
     */
    getActionDescription(action) {
        const descriptions = {
            'handle_calendar_request': 'manage your calendar',
            'handle_email_request': 'handle your email',
            'handle_file_request': 'work with your files',
            'handle_search_request': 'search for information',
            'handle_coding_request': 'help with coding',
            'handle_social_request': 'post to social media',
            'handle_system_request': 'configure the system',
            'handle_crm_request': 'update your CRM',
            'handle_help_request': 'provide assistance',
            'handle_conversation': 'continue our conversation',
            'handle_general_request': 'help with your request'
        };
        
        return descriptions[action] || 'handle your request';
    }

    /**
     * Build OpenClaw commands for execution
     */
    buildOpenClawCommands(routingResult) {
        const commands = [];
        const result = routingResult.result;
        
        if (!result?.simulated_execution) {
            return commands;
        }
        
        // Build skill invocation commands
        const tools = routingResult.context?.tools_required || [];
        const skillName = routingResult.skill_used;
        const action = routingResult.action_taken;
        const params = routingResult.parameters_used || {};
        
        // Map to actual tool configurations
        const toolMappings = {
            'calendar': { tool: 'calendar', method: 'schedule' },
            'message': { tool: 'message', method: 'send' },
            'read': { tool: 'read', method: 'read' },
            'write': { tool: 'write', method: 'write' },
            'edit': { tool: 'edit', method: 'edit' },
            'web_search': { tool: 'web_search', method: 'search' },
            'web_fetch': { tool: 'web_fetch', method: 'fetch' },
            'exec': { tool: 'exec', method: 'execute' },
            'process': { tool: 'process', method: 'manage' }
        };
        
        // Generate appropriate tool calls based on intent and parameters
        switch (routingResult.intent) {
            case 'calendar_scheduling':
                if (params.title && (params.time || params.date)) {
                    commands.push({
                        type: 'tool_call',
                        tool: 'calendar',
                        action: 'schedule',
                        parameters: {
                            title: params.title,
                            time: params.time || 'TBD',
                            date: params.date || 'today'
                        }
                    });
                }
                break;
                
            case 'email_management':
                if (params.recipient) {
                    commands.push({
                        type: 'tool_call',
                        tool: 'message',
                        action: 'send',
                        parameters: {
                            recipient: params.recipient,
                            channel: 'email'
                        }
                    });
                }
                break;
                
            case 'research_web_search':
                if (params.query) {
                    commands.push({
                        type: 'tool_call',
                        tool: 'web_search',
                        action: 'search',
                        parameters: {
                            query: params.query,
                            count: params.count || 5
                        }
                    });
                }
                break;
                
            case 'file_operations':
                if (params.filename) {
                    const fileAction = params.action || 'create';
                    commands.push({
                        type: 'tool_call',
                        tool: 'write',
                        action: fileAction,
                        parameters: {
                            path: params.filename,
                            content: params.content || ''
                        }
                    });
                }
                break;
                
            case 'coding_development':
                if (params.request_type === 'write_code' && params.language) {
                    commands.push({
                        type: 'tool_call',
                        tool: 'write',
                        action: 'write',
                        parameters: {
                            path: `${params.language}_script.${this.getFileExtension(params.language)}`,
                            content: `# ${params.language} code generated based on request`
                        }
                    });
                }
                break;
        }
        
        return commands.filter(cmd => cmd.tool); // Filter out any empty commands
    }

    /**
     * Get file extension for programming language
     */
    getFileExtension(language) {
        const extensions = {
            'javascript': 'js',
            'python': 'py',
            'html': 'html',
            'css': 'css',
            'java': 'java',
            'cpp': 'cpp',
            'bash': 'sh'
        };
        return extensions[language.toLowerCase()] || 'txt';
    }

    /**
     * Format error response
     */
    formatErrorResponse(error, originalMessage) {
        return {
            success: false,
            type: 'system_error',
            error: error.message,
            response_for_user: "I'm sorry, I encountered an error processing your request. Please try again with a different phrasing.",
            original_message: originalMessage
        };
    }

    /**
     * Get router statistics
     */
    getRouterStats() {
        return {
            total_sessions: this.sessionContext.size,
            available_skills: this.router.listAvailableSkills(),
            default_routes: Object.keys(this.router.routes),
            intent_patterns_loaded: Object.keys(this.router.analyzer.intentPatterns)
        };
    }

    /**
     * Clear session context for a user
     */
    clearSessionContext(userId) {
        this.sessionContext.delete(userId);
    }

    /**
     * Clear all session contexts
     */
    clearAllSessions() {
        this.sessionContext.clear();
    }
}

// Export for use as module
module.exports = IntentRouterIntegration;

// CLI interface for testing
if (require.main === module) {
    const integration = new IntentRouterIntegration();
    const message = process.argv[2] || "What can you help me with today?";
    const userContext = {
        user_id: 'test_user',
        channel: 'cli'
    };
    
    console.log('Testing intent router integration...');
    console.log('Message:', message);
    console.log('User context:', userContext);
    console.log('='.repeat(50));
    
    integration.processMessage(message, userContext).then(result => {
        console.log('Processing result:');
        console.log(JSON.stringify(result, null, 2));
        
        console.log('\nRouter statistics:');
        console.log(JSON.stringify(integration.getRouterStats(), null, 2));
        
    }).catch(error => {
        console.error('Integration error:', error);
    });
}