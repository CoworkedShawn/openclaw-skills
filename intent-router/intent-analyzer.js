#!/usr/bin/env node

/**
 * OpenClaw Intent Analysis Engine
 * Analyzes incoming messages to determine user intent for skill routing
 */

const fs = require('fs');
const path = require('path');

class IntentAnalyzer {
    constructor() {
        this.intentPatterns = this.loadIntentPatterns();
        this.skillMappings = this.loadSkillMappings();
        this.context = new Map();
        this.confidenceThreshold = 0.6;
    }

    /**
     * Load intent patterns from configuration
     */
    loadIntentPatterns() {
        const patternsPath = path.join(__dirname, 'intent-patterns.json');
        if (fs.existsSync(patternsPath)) {
            return JSON.parse(fs.readFileSync(patternsPath, 'utf8'));
        }
        return this.getDefaultIntentPatterns();
    }

    /**
     * Load skill mappings from configuration
     */
    loadSkillMappings() {
        const mappingsPath = path.join(__dirname, 'skill-mappings.json');
        if (fs.existsSync(mappingsPath)) {
            return JSON.parse(fs.readFileSync(mappingsPath, 'utf8'));
        }
        return this.getDefaultSkillMappings();
    }

    /**
     * Default intent patterns configuration
     */
    getDefaultIntentPatterns() {
        return {
            "calendar_scheduling": {
                "keywords": ["calendar", "schedule", "meeting", "appointment", "event", "remind", "reminder", "book", "reserve"],
                "patterns": [
                    /schedule\s+(?:a\s+)?(?:meeting|appointment|event)/i,
                    /set\s+(?:up\s+)?(?:a\s+)?reminder/i,
                    /add\s+(?:to\s+)?(?:my\s+)?calendar/i,
                    /book\s+(?:an\s+)?appointment/i,
                    /when\s+(?:is|am)\s+(?:i\s+)?(?:free|available)/i,
                    /check\s+(?:my\s+)?calendar/i,
                    /create\s+(?:an\s+)?event/i
                ],
                "timeContext": ["tomorrow", "today", "next", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday", "am", "pm"],
                "priority": 0.9,
                "confidence_boost": 0.2
            },

            "email_management": {
                "keywords": ["email", "mail", "inbox", "send", "reply", "forward", "draft", "message", "compose"],
                "patterns": [
                    /send\s+(?:an\s+)?email/i,
                    /check\s+(?:my\s+)?(?:email|inbox)/i,
                    /reply\s+to/i,
                    /forward\s+(?:the\s+)?email/i,
                    /write\s+(?:an\s+)?email/i,
                    /compose\s+(?:a\s+)?message/i,
                    /email\s+(?:someone|[\w@.]+)/i
                ],
                "actionContext": ["send", "check", "reply", "forward", "compose", "draft"],
                "priority": 0.85,
                "confidence_boost": 0.15
            },

            "file_operations": {
                "keywords": ["file", "folder", "directory", "create", "edit", "save", "open", "read", "write", "delete", "move", "copy", "organize"],
                "patterns": [
                    /(?:create|make)\s+(?:a\s+)?(?:new\s+)?file/i,
                    /edit\s+(?:the\s+)?file/i,
                    /save\s+(?:the\s+)?file/i,
                    /open\s+(?:the\s+)?file/i,
                    /organize\s+(?:my\s+)?files/i,
                    /manage\s+(?:my\s+)?documents/i,
                    /delete\s+(?:the\s+)?file/i,
                    /move\s+(?:the\s+)?file/i
                ],
                "fileExtensions": [".txt", ".md", ".json", ".js", ".py", ".html", ".css", ".pdf", ".doc", ".xlsx"],
                "priority": 0.8,
                "confidence_boost": 0.1
            },

            "research_web_search": {
                "keywords": ["search", "research", "find", "look up", "google", "investigate", "explore", "discover"],
                "patterns": [
                    /search\s+(?:for\s+)?(.+)/i,
                    /look\s+up\s+(.+)/i,
                    /find\s+(?:information\s+)?(?:about\s+)?(.+)/i,
                    /research\s+(.+)/i,
                    /what\s+(?:is|are)\s+(.+)/i,
                    /tell\s+me\s+about\s+(.+)/i,
                    /investigate\s+(.+)/i
                ],
                "searchContext": ["information", "data", "facts", "details", "news", "articles"],
                "priority": 0.75,
                "confidence_boost": 0.1
            },

            "coding_development": {
                "keywords": ["code", "programming", "javascript", "python", "html", "css", "debug", "build", "test", "git", "app", "website", "function", "script"],
                "patterns": [
                    /write\s+(?:some\s+)?code/i,
                    /create\s+(?:an?\s+)?(?:app|application|website)/i,
                    /build\s+(?:a\s+)?(?:website|app|program)/i,
                    /fix\s+(?:the\s+)?(?:bug|code|error)/i,
                    /debug\s+(?:the\s+)?(?:code|program)/i,
                    /run\s+(?:the\s+)?tests/i,
                    /develop\s+(?:a\s+)?(?:feature|function)/i
                ],
                "languages": ["javascript", "python", "java", "html", "css", "react", "node"],
                "priority": 0.85,
                "confidence_boost": 0.15
            },

            "social_media_posting": {
                "keywords": ["tweet", "post", "twitter", "facebook", "linkedin", "instagram", "share", "social media", "publish"],
                "patterns": [
                    /post\s+(?:on\s+)?(?:twitter|facebook|linkedin|instagram)/i,
                    /tweet\s+(?:about\s+)?(.+)/i,
                    /share\s+(?:on\s+)?social\s+media/i,
                    /publish\s+(?:a\s+)?post/i,
                    /update\s+(?:my\s+)?status/i,
                    /social\s+media\s+post/i
                ],
                "platforms": ["twitter", "facebook", "linkedin", "instagram", "tiktok"],
                "priority": 0.7,
                "confidence_boost": 0.1
            },

            "system_configuration": {
                "keywords": ["config", "settings", "setup", "install", "configure", "system", "preferences", "options"],
                "patterns": [
                    /configure\s+(?:the\s+)?system/i,
                    /change\s+(?:my\s+)?settings/i,
                    /setup\s+(?:the\s+)?(?:environment|system)/i,
                    /install\s+(?:the\s+)?(?:software|package)/i,
                    /update\s+(?:the\s+)?(?:configuration|settings)/i,
                    /system\s+preferences/i
                ],
                "systemContext": ["environment", "configuration", "installation", "setup"],
                "priority": 0.8,
                "confidence_boost": 0.1
            },

            "sales_crm_activities": {
                "keywords": ["lead", "customer", "sales", "crm", "contact", "opportunity", "deal", "pipeline", "prospect", "client"],
                "patterns": [
                    /add\s+(?:a\s+)?(?:new\s+)?lead/i,
                    /update\s+(?:the\s+)?contact/i,
                    /create\s+(?:an?\s+)?opportunity/i,
                    /check\s+(?:my\s+)?(?:pipeline|deals)/i,
                    /follow\s+up\s+with\s+(?:the\s+)?(?:customer|client)/i,
                    /update\s+(?:the\s+)?deal/i,
                    /manage\s+(?:my\s+)?contacts/i
                ],
                "crmContext": ["pipeline", "forecast", "quota", "commission"],
                "priority": 0.75,
                "confidence_boost": 0.1
            },

            "task_management": {
                "keywords": ["task", "todo", "reminder", "deadline", "priority", "complete", "finish", "assign"],
                "patterns": [
                    /add\s+(?:a\s+)?task/i,
                    /create\s+(?:a\s+)?(?:todo|reminder)/i,
                    /mark\s+(?:as\s+)?(?:complete|done)/i,
                    /set\s+(?:a\s+)?deadline/i,
                    /assign\s+(?:a\s+)?task/i,
                    /manage\s+(?:my\s+)?tasks/i
                ],
                "taskContext": ["urgent", "important", "low priority", "high priority"],
                "priority": 0.8,
                "confidence_boost": 0.1
            },

            "general_assistance": {
                "keywords": ["help", "assist", "support", "how to", "what", "explain", "guide"],
                "patterns": [
                    /help\s+(?:me\s+)?(?:with\s+)?(.+)/i,
                    /how\s+(?:do\s+)?(?:i\s+)?(.+)/i,
                    /what\s+(?:is\s+)?(.+)/i,
                    /explain\s+(.+)/i,
                    /show\s+me\s+how\s+to\s+(.+)/i,
                    /i\s+need\s+help\s+with\s+(.+)/i
                ],
                "priority": 0.5,
                "confidence_boost": 0.0
            }
        };
    }

    /**
     * Default skill mappings configuration
     */
    getDefaultSkillMappings() {
        return {
            "calendar_scheduling": {
                "primary_skill": "calendar-manager",
                "fallback_skills": ["task-manager", "reminder-system"],
                "required_tools": ["calendar"],
                "context_preservation": true,
                "confidence_threshold": 0.7
            },
            "email_management": {
                "primary_skill": "email-assistant",
                "fallback_skills": ["message-handler", "communication-manager"],
                "required_tools": ["message"],
                "context_preservation": true,
                "confidence_threshold": 0.7
            },
            "file_operations": {
                "primary_skill": "file-manager",
                "fallback_skills": ["document-organizer"],
                "required_tools": ["read", "write", "edit"],
                "context_preservation": false,
                "confidence_threshold": 0.6
            },
            "research_web_search": {
                "primary_skill": "research-assistant",
                "fallback_skills": ["web-searcher", "information-gatherer"],
                "required_tools": ["web_search", "web_fetch"],
                "context_preservation": true,
                "confidence_threshold": 0.6
            },
            "coding_development": {
                "primary_skill": "code-assistant",
                "fallback_skills": ["development-helper"],
                "required_tools": ["exec", "read", "write"],
                "context_preservation": true,
                "confidence_threshold": 0.7
            },
            "social_media_posting": {
                "primary_skill": "social-media-manager",
                "fallback_skills": ["content-publisher"],
                "required_tools": ["message"],
                "context_preservation": false,
                "confidence_threshold": 0.7
            },
            "system_configuration": {
                "primary_skill": "system-admin",
                "fallback_skills": ["config-manager"],
                "required_tools": ["exec", "process"],
                "context_preservation": false,
                "confidence_threshold": 0.8
            },
            "sales_crm_activities": {
                "primary_skill": "crm-manager",
                "fallback_skills": ["sales-assistant"],
                "required_tools": ["read", "write"],
                "context_preservation": true,
                "confidence_threshold": 0.7
            },
            "task_management": {
                "primary_skill": "task-manager",
                "fallback_skills": ["todo-assistant"],
                "required_tools": ["read", "write"],
                "context_preservation": true,
                "confidence_threshold": 0.7
            },
            "general_assistance": {
                "primary_skill": "general-assistant",
                "fallback_skills": ["help-system"],
                "required_tools": ["read", "write"],
                "context_preservation": false,
                "confidence_threshold": 0.5
            }
        };
    }

    /**
     * Analyze message and determine intent with confidence score
     */
    analyzeIntent(message, userContext = {}) {
        const normalizedMessage = message.toLowerCase().trim();
        const results = [];

        // Analyze each intent pattern
        for (const [intentName, pattern] of Object.entries(this.intentPatterns)) {
            const score = this.calculateIntentScore(normalizedMessage, pattern, userContext);
            if (score > 0) {
                results.push({
                    intent: intentName,
                    confidence: score,
                    pattern: pattern,
                    skillMapping: this.skillMappings[intentName]
                });
            }
        }

        // Sort by confidence score
        results.sort((a, b) => b.confidence - a.confidence);

        // Extract parameters from the message
        const topIntent = results[0];
        const parameters = topIntent ? this.extractParameters(normalizedMessage, topIntent.intent, topIntent.pattern) : {};

        return {
            primaryIntent: topIntent ? topIntent.intent : 'general_assistance',
            confidence: topIntent ? topIntent.confidence : 0.1,
            allIntents: results.slice(0, 3), // Top 3 intents
            parameters: parameters,
            skillMapping: topIntent ? topIntent.skillMapping : this.skillMappings['general_assistance'],
            context: userContext,
            timestamp: Date.now()
        };
    }

    /**
     * Calculate confidence score for an intent pattern
     */
    calculateIntentScore(message, pattern, userContext) {
        let score = 0;
        let matches = 0;
        let totalWeights = 0;

        // Keyword matching (weight: 0.4)
        if (pattern.keywords) {
            const keywordMatches = pattern.keywords.filter(keyword => 
                message.includes(keyword.toLowerCase())
            ).length;
            const keywordScore = keywordMatches / pattern.keywords.length;
            score += keywordScore * 0.4;
            totalWeights += 0.4;
        }

        // Pattern matching (weight: 0.5)
        if (pattern.patterns) {
            const patternMatches = pattern.patterns.filter(patternStr => {
                const regex = new RegExp(patternStr, 'i');
                return regex.test(message);
            }).length;
            const patternScore = patternMatches / pattern.patterns.length;
            score += patternScore * 0.5;
            totalWeights += 0.5;
        }

        // Context matching (weight: 0.1)
        const contextScore = this.calculateContextScore(message, pattern, userContext);
        score += contextScore * 0.1;
        totalWeights += 0.1;

        // Normalize score
        if (totalWeights > 0) {
            score = score / totalWeights;
        }

        // Apply priority multiplier
        if (pattern.priority) {
            score *= pattern.priority;
        }

        // Apply confidence boost
        if (pattern.confidence_boost && score > 0) {
            score += pattern.confidence_boost;
        }

        return Math.min(score, 1.0); // Cap at 1.0
    }

    /**
     * Calculate context score based on additional context clues
     */
    calculateContextScore(message, pattern, userContext) {
        let contextScore = 0;
        let contextMatches = 0;

        // Time-based context (for calendar)
        if (pattern.timeContext) {
            contextMatches += pattern.timeContext.filter(timeWord => 
                message.includes(timeWord.toLowerCase())
            ).length;
        }

        // Action context (for emails)
        if (pattern.actionContext) {
            contextMatches += pattern.actionContext.filter(action => 
                message.includes(action.toLowerCase())
            ).length;
        }

        // File extension context (for files)
        if (pattern.fileExtensions) {
            contextMatches += pattern.fileExtensions.filter(ext => 
                message.includes(ext.toLowerCase())
            ).length;
        }

        // Language context (for coding)
        if (pattern.languages) {
            contextMatches += pattern.languages.filter(lang => 
                message.includes(lang.toLowerCase())
            ).length;
        }

        // Platform context (for social media)
        if (pattern.platforms) {
            contextMatches += pattern.platforms.filter(platform => 
                message.includes(platform.toLowerCase())
            ).length;
        }

        // User context consideration
        if (userContext.recentIntents) {
            const recentIntentBoost = userContext.recentIntents.includes(pattern.intent) ? 0.1 : 0;
            contextScore += recentIntentBoost;
        }

        return Math.min(contextScore + (contextMatches * 0.05), 1.0);
    }

    /**
     * Extract relevant parameters from message based on intent
     */
    extractParameters(message, intent, pattern) {
        const parameters = {};

        switch (intent) {
            case 'calendar_scheduling':
                // Extract time information
                const timeMatch = message.match(/(\d{1,2}:\d{2}(?:\s*[ap]m)?)/i);
                if (timeMatch) parameters.time = timeMatch[1];

                // Extract date information
                const dateMatch = message.match(/(tomorrow|today|next\s+\w+|monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i);
                if (dateMatch) parameters.date = dateMatch[1];

                // Extract event title
                const titleMatch = message.match(/(?:schedule|meeting|event)\s+(?:for\s+|about\s+|called\s+)?(.+?)(?:\s+(?:at|on|for)\s+|$)/i);
                if (titleMatch) parameters.title = titleMatch[1].trim();
                break;

            case 'email_management':
                // Extract recipient
                const recipientMatch = message.match(/(?:to|email)\s+([\w@.-]+)/i);
                if (recipientMatch) parameters.recipient = recipientMatch[1];

                // Extract subject
                const subjectMatch = message.match(/(?:about|subject|re:)\s+(.+)/i);
                if (subjectMatch) parameters.subject = subjectMatch[1].trim();
                break;

            case 'file_operations':
                // Extract filename
                const filenameMatch = message.match(/(?:file|document)\s+(?:called\s+|named\s+)?([^\s]+(?:\.\w+)?)/i);
                if (filenameMatch) parameters.filename = filenameMatch[1];

                // Extract action
                const actionMatch = message.match(/^(create|edit|delete|move|copy|save|open)/i);
                if (actionMatch) parameters.action = actionMatch[1].toLowerCase();
                break;

            case 'research_web_search':
                // Extract search query
                const queryMatch = message.match(/(?:search|look\s+up|find|research)\s+(?:for\s+)?(.+)/i);
                if (queryMatch) parameters.query = queryMatch[1].trim();
                break;

            case 'coding_development':
                // Extract programming language
                const langMatch = message.match(/(javascript|python|java|html|css|react|node)/i);
                if (langMatch) parameters.language = langMatch[1].toLowerCase();

                // Extract code type
                const codeTypeMatch = message.match(/(app|website|function|script|program)/i);
                if (codeTypeMatch) parameters.codeType = codeTypeMatch[1].toLowerCase();
                break;

            case 'social_media_posting':
                // Extract platform
                const platformMatch = message.match(/(twitter|facebook|linkedin|instagram)/i);
                if (platformMatch) parameters.platform = platformMatch[1].toLowerCase();

                // Extract content
                const contentMatch = message.match(/(?:post|tweet|share)\s+(?:about\s+)?(.+)/i);
                if (contentMatch) parameters.content = contentMatch[1].trim();
                break;

            case 'sales_crm_activities':
                // Extract contact name
                const contactMatch = message.match(/(?:lead|contact|customer)\s+(?:called\s+|named\s+)?(\w+)/i);
                if (contactMatch) parameters.contactName = contactMatch[1];

                // Extract action
                const crmActionMatch = message.match(/^(add|update|create|check|follow)/i);
                if (crmActionMatch) parameters.action = crmActionMatch[1].toLowerCase();
                break;
        }

        return parameters;
    }

    /**
     * Get routing recommendation based on analysis
     */
    getRoutingRecommendation(analysisResult) {
        const { primaryIntent, confidence, skillMapping, parameters } = analysisResult;
        
        if (!skillMapping) {
            return {
                success: false,
                reason: 'No skill mapping found for intent',
                fallback: this.skillMappings['general_assistance']
            };
        }

        if (confidence < skillMapping.confidence_threshold) {
            return {
                success: false,
                reason: `Confidence (${confidence.toFixed(2)}) below threshold (${skillMapping.confidence_threshold})`,
                suggestion: 'Request clarification from user',
                fallback: skillMapping
            };
        }

        return {
            success: true,
            primarySkill: skillMapping.primary_skill,
            fallbackSkills: skillMapping.fallback_skills,
            requiredTools: skillMapping.required_tools,
            contextPreservation: skillMapping.context_preservation,
            parameters: parameters,
            confidence: confidence
        };
    }

    /**
     * Update context with new interaction
     */
    updateContext(userId, intent, success = true) {
        if (!this.context.has(userId)) {
            this.context.set(userId, {
                recentIntents: [],
                lastInteraction: Date.now(),
                successfulRoutings: 0,
                totalRoutings: 0
            });
        }

        const userContext = this.context.get(userId);
        userContext.recentIntents.unshift(intent);
        userContext.recentIntents = userContext.recentIntents.slice(0, 5); // Keep last 5
        userContext.lastInteraction = Date.now();
        userContext.totalRoutings++;
        if (success) userContext.successfulRoutings++;

        this.context.set(userId, userContext);
    }

    /**
     * Get user context
     */
    getUserContext(userId) {
        return this.context.get(userId) || {};
    }

    /**
     * Save patterns to file
     */
    saveIntentPatterns() {
        const patternsPath = path.join(__dirname, 'intent-patterns.json');
        fs.writeFileSync(patternsPath, JSON.stringify(this.intentPatterns, null, 2));
    }

    /**
     * Save skill mappings to file
     */
    saveSkillMappings() {
        const mappingsPath = path.join(__dirname, 'skill-mappings.json');
        fs.writeFileSync(mappingsPath, JSON.stringify(this.skillMappings, null, 2));
    }

    /**
     * Add custom intent pattern
     */
    addIntentPattern(intentName, pattern) {
        this.intentPatterns[intentName] = pattern;
        this.saveIntentPatterns();
    }

    /**
     * Add skill mapping
     */
    addSkillMapping(intentName, mapping) {
        this.skillMappings[intentName] = mapping;
        this.saveSkillMappings();
    }
}

module.exports = IntentAnalyzer;

// CLI interface for testing
if (require.main === module) {
    const analyzer = new IntentAnalyzer();
    const message = process.argv[2] || "Schedule a meeting with John tomorrow at 2pm";
    
    console.log('Analyzing message:', message);
    const result = analyzer.analyzeIntent(message);
    console.log('\nAnalysis Result:');
    console.log(JSON.stringify(result, null, 2));
    
    const routing = analyzer.getRoutingRecommendation(result);
    console.log('\nRouting Recommendation:');
    console.log(JSON.stringify(routing, null, 2));
}