# Intent Router Skill

An intelligent intent-based routing system for OpenClaw that analyzes incoming messages and routes them to appropriate skills and workflows based on detected user intent.

## Overview

The Intent Router automatically detects what users want to accomplish and routes their requests to the most appropriate OpenClaw skill. It uses advanced pattern matching, keyword analysis, and context understanding to achieve high accuracy routing with confidence scoring.

### Key Features

- **Intelligent Intent Detection**: Advanced pattern matching and NLP techniques
- **Skill Routing**: Automatic routing to appropriate OpenClaw skills
- **Context Preservation**: Maintains conversation context across skill switches
- **Fallback Handling**: Graceful degradation when primary skills are unavailable
- **Confidence Scoring**: Transparent confidence levels for all routing decisions
- **Performance Tracking**: Comprehensive analytics and success metrics
- **Customizable Patterns**: Easy to extend with new intents and mappings

## Supported Intent Categories

### 1. Calendar & Scheduling
**Intent**: `calendar_scheduling`
**Target Skills**: `calendar-manager`, `task-manager`
**Examples**:
- "Schedule a meeting with John tomorrow at 2pm"
- "Check my calendar for next week"
- "Set a reminder to call Mom on Sunday"
- "Book a doctor appointment for Thursday"

**Parameters Extracted**:
- `time`: Specific time (e.g., "2pm", "10:30am")
- `date`: Date references (e.g., "tomorrow", "next Monday")
- `title`: Event title or description

### 2. Email Management
**Intent**: `email_management`
**Target Skills**: `email-assistant`, `message-handler`
**Examples**:
- "Send an email to sarah@company.com about the project"
- "Check my inbox for unread messages"
- "Reply to that email from the client"
- "Compose a draft email for the team"

**Parameters Extracted**:
- `recipient`: Email addresses or names
- `subject`: Email subject line
- `action`: Type of email operation (send, check, reply)

### 3. File Operations
**Intent**: `file_operations`
**Target Skills**: `file-manager`, `document-organizer`
**Examples**:
- "Create a new file called project-notes.md"
- "Edit the documentation file"
- "Organize my files in the workspace"
- "Delete the temporary backup files"

**Parameters Extracted**:
- `filename`: Specific file names
- `action`: File operation (create, edit, delete, move)
- `path`: Directory or file path

### 4. Research & Web Search
**Intent**: `research_web_search`
**Target Skills**: `research-assistant`, `web-searcher`
**Examples**:
- "Search for information about AI trends in 2024"
- "Find the latest news about climate change"
- "Research web development best practices"
- "Look up the company's financial reports"

**Parameters Extracted**:
- `query`: Search terms or research topic
- `scope`: Type of information needed

### 5. Coding & Development
**Intent**: `coding_development`
**Target Skills**: `code-assistant`, `development-helper`
**Examples**:
- "Write a Python function to calculate fibonacci numbers"
- "Create a simple HTML webpage"
- "Debug the JavaScript code in my project"
- "Build a React component for user login"

**Parameters Extracted**:
- `language`: Programming language
- `codeType`: Type of code (function, app, website, script)
- `requirements`: Specific functionality needed

### 6. Social Media Posting
**Intent**: `social_media_posting`
**Target Skills**: `social-media-manager`, `content-publisher`
**Examples**:
- "Post on Twitter about our new product launch"
- "Share this article on LinkedIn"
- "Update my Facebook status with the company news"
- "Schedule a tweet for tomorrow morning"

**Parameters Extracted**:
- `platform`: Social media platform
- `content`: Post content or topic
- `timing`: Scheduling information

### 7. System Configuration
**Intent**: `system_configuration`
**Target Skills**: `system-admin`, `config-manager`
**Examples**:
- "Configure the development environment settings"
- "Install the required software packages"
- "Setup environment variables for the project"
- "Update the system configuration files"

**Parameters Extracted**:
- `action`: Configuration action
- `target`: System or component to configure
- `settings`: Specific settings to change

### 8. Sales & CRM Activities
**Intent**: `sales_crm_activities`
**Target Skills**: `crm-manager`, `sales-assistant`
**Examples**:
- "Add a new lead named Mike Johnson to the CRM"
- "Update the customer contact information"
- "Check my sales pipeline status"
- "Follow up with the client about the proposal"

**Parameters Extracted**:
- `contactName`: Contact or lead name
- `action`: CRM action (add, update, check, follow-up)
- `details`: Additional information

### 9. Task Management
**Intent**: `task_management`
**Target Skills**: `task-manager`, `todo-assistant`
**Examples**:
- "Create a task to review the quarterly report"
- "Mark the project milestone as complete"
- "Set a deadline for the presentation"
- "Assign the research task to the team"

**Parameters Extracted**:
- `action`: Task action (create, complete, assign)
- `title`: Task description
- `deadline`: Due date or deadline

### 10. General Assistance
**Intent**: `general_assistance`
**Target Skills**: `general-assistant`, `help-system`
**Examples**:
- "Help me understand how to use the calendar feature"
- "What can you help me with today?"
- "Explain the difference between these tools"
- "I need assistance with my workflow"

## Architecture

### Core Components

#### 1. Intent Analyzer (`intent-analyzer.js`)
- **Pattern Matching**: Regex and keyword-based intent detection
- **Context Analysis**: Considers conversation history and user patterns
- **Parameter Extraction**: Extracts relevant parameters from messages
- **Confidence Scoring**: Provides confidence levels for routing decisions

#### 2. Intent Router (`intent-router.js`)
- **Skill Selection**: Determines the best skill for each intent
- **Availability Checking**: Verifies skill availability before routing
- **Fallback Management**: Handles unavailable skills gracefully
- **Performance Tracking**: Monitors routing success and patterns

#### 3. OpenClaw Integration (`openclaw-integration.js`)
- **Context Preservation**: Maintains session context across interactions
- **Command Generation**: Creates OpenClaw-compatible tool commands
- **Error Handling**: Manages errors and provides recovery options
- **Session Management**: Tracks user sessions and preferences

### Configuration Files

#### Intent Patterns (`intent-patterns.json`)
Defines the patterns, keywords, and context clues used to detect each intent:

```json
{
  "calendar_scheduling": {
    "keywords": ["calendar", "schedule", "meeting", "appointment"],
    "patterns": ["schedule\\s+(?:a\\s+)?(?:meeting|appointment)"],
    "timeContext": ["tomorrow", "today", "next", "monday"],
    "priority": 0.9,
    "confidence_boost": 0.2
  }
}
```

#### Skill Mappings (`skill-mappings.json`)
Maps each intent to appropriate OpenClaw skills:

```json
{
  "calendar_scheduling": {
    "primary_skill": "calendar-manager",
    "fallback_skills": ["task-manager"],
    "required_tools": ["calendar"],
    "context_preservation": true,
    "confidence_threshold": 0.7
  }
}
```

#### OpenClaw Configuration (`openclaw-config.json`)
Controls integration behavior and performance settings:

```json
{
  "enabled": true,
  "confidence_threshold": 0.6,
  "fallback_to_general": true,
  "preserve_context": true,
  "max_context_history": 10
}
```

## Usage

### Basic Usage

```javascript
const IntentRouter = require('./intent-router');
const router = new IntentRouter();

// Route a message
const result = await router.route("Schedule a meeting tomorrow at 2pm");

if (result.success) {
    console.log(`Routing to: ${result.targetSkill}`);
    console.log(`Confidence: ${result.confidence}`);
    console.log(`Parameters:`, result.parameters);
}
```

### OpenClaw Integration

```javascript
const OpenClawIntentIntegration = require('./openclaw-integration');
const integration = new OpenClawIntentIntegration();

// Process a message with full OpenClaw context
const result = await integration.processMessage(
    "Send an email to john@company.com about the meeting",
    {
        userId: "user123",
        sessionId: "session456",
        channel: "whatsapp"
    }
);

// Result includes skill execution details and OpenClaw commands
console.log(result.skill_execution.target_skill); // "email-assistant"
console.log(result.openclaw_commands); // Array of tool commands
```

### Command Line Testing

Run comprehensive tests:
```bash
node test-suite.js
```

Run specific component tests:
```bash
node test-suite.js analyzer    # Test intent analysis only
node test-suite.js router      # Test routing logic only  
node test-suite.js integration # Test OpenClaw integration only
```

Test individual messages:
```bash
node intent-router.js "Schedule a meeting tomorrow"
node openclaw-integration.js "Create a new project file"
```

## Response Format

### Successful Routing
```json
{
  "intent_routing": {
    "success": true,
    "intent": "calendar_scheduling",
    "confidence": 0.87,
    "action": "route_to_skill",
    "timestamp": 1708617840000
  },
  "skill_execution": {
    "target_skill": "calendar-manager",
    "required_tools": ["calendar"],
    "parameters": {
      "time": "2pm",
      "title": "meeting",
      "date": "tomorrow"
    },
    "fallback_skills": ["task-manager"],
    "preserve_context": true
  },
  "execution_metadata": {
    "confidence_level": "high",
    "estimated_execution_time": 5,
    "safety_level": "low"
  },
  "openclaw_commands": [
    {
      "type": "skill_invoke",
      "skill": "calendar-manager",
      "action": "handle_request",
      "parameters": { ... }
    }
  ]
}
```

### Clarification Needed
```json
{
  "intent_routing": {
    "success": false,
    "intent": "calendar_scheduling",
    "confidence": 0.45,
    "action": "clarification_needed"
  },
  "clarification_request": {
    "reason": "Low confidence in intent detection",
    "suggestion": "Please be more specific about the meeting details",
    "clarification_prompts": [
      "What specific event would you like to schedule?",
      "When would you like this event to take place?"
    ]
  }
}
```

### Skill Unavailable
```json
{
  "intent_routing": {
    "success": false,
    "intent": "calendar_scheduling",
    "confidence": 0.85,
    "action": "skill_unavailable"
  },
  "skill_unavailable": {
    "requested_skill": "calendar-manager",
    "reason": "Skill not available",
    "fallback_skill": "general-assistant",
    "alternative_approaches": [
      "Use task-manager to create schedule reminders"
    ]
  }
}
```

## Performance & Analytics

### Routing Statistics
The system tracks comprehensive metrics:

- **Success Rate**: Percentage of successful routings
- **Intent Distribution**: Most common intents
- **Skill Usage**: Most utilized skills
- **Average Confidence**: Overall confidence levels
- **Fallback Usage**: How often fallbacks are needed

Access statistics:
```javascript
const stats = router.getStatistics();
console.log(`Success Rate: ${stats.successRate}%`);
console.log(`Top Intents:`, stats.topIntents);
console.log(`Average Confidence: ${stats.averageConfidence}`);
```

### Context Tracking
The system maintains user context including:

- Recent intent patterns
- Preferred skills
- Failed routing attempts
- Session duration and activity

## Customization & Extension

### Adding New Intents

1. **Define Intent Patterns**:
```javascript
router.addCustomIntent('document_editing', {
    keywords: ['edit', 'document', 'word', 'modify'],
    patterns: [/edit\s+(?:the\s+)?document/i],
    priority: 0.8,
    confidence_boost: 0.1
});
```

2. **Add Skill Mapping**:
```javascript
router.analyzer.addSkillMapping('document_editing', {
    primary_skill: 'document-editor',
    fallback_skills: ['file-manager'],
    required_tools: ['read', 'write'],
    confidence_threshold: 0.7
});
```

### Adjusting Confidence Thresholds

Modify confidence thresholds for specific intents:
```javascript
// Lower threshold for experimental intents
skillMappings.new_intent.confidence_threshold = 0.5;

// Higher threshold for destructive operations
skillMappings.system_configuration.confidence_threshold = 0.9;
```

### Custom Context Boosting

Add context-aware boosting for specific scenarios:
```javascript
// Boost calendar intents during work hours
if (isWorkHours() && intent === 'calendar_scheduling') {
    confidence += 0.1;
}
```

## Error Handling & Debugging

### Debug Mode
Enable detailed logging:
```javascript
integration.updateConfiguration({
    debugging: true,
    log_all_interactions: true
});
```

### Common Issues & Solutions

1. **Low Confidence Scores**:
   - Review intent patterns
   - Add more specific keywords
   - Increase context word coverage

2. **Wrong Intent Detection**:
   - Check for conflicting patterns
   - Adjust pattern priorities
   - Add negative patterns to exclude

3. **Skill Availability Issues**:
   - Verify skill directory structure
   - Check skill registry configuration
   - Ensure required tools are available

4. **Context Not Preserved**:
   - Enable context preservation in skill mappings
   - Check session management settings
   - Verify user ID consistency

## Security Considerations

### Safe Defaults
- **Confirmation Required**: Destructive operations require confirmation
- **Skill Isolation**: Skills run in isolated contexts
- **Permission Checking**: Validates tool access permissions
- **Rate Limiting**: Prevents abuse of routing system

### Best Practices
- Always validate extracted parameters
- Use fallback skills for safety-critical operations
- Implement proper error boundaries
- Log security-relevant events

## Performance Optimization

### Caching
- Intent analysis results are cached for repeated queries
- Skill availability is cached with TTL
- Context data is efficiently managed

### Load Balancing
- Multiple instances can share routing load
- Session affinity maintains context consistency
- Fallback chains prevent cascading failures

### Monitoring
- Built-in performance metrics
- Configurable alerting thresholds
- Automatic failure detection and recovery

## Testing

### Comprehensive Test Suite
Run the full test suite to verify system health:

```bash
node test-suite.js
```

The test suite includes:
- **Intent Analysis Tests**: Verify correct intent detection
- **Routing Logic Tests**: Confirm proper skill selection  
- **Integration Tests**: Validate OpenClaw compatibility
- **Performance Tests**: Check response times and accuracy
- **Edge Case Tests**: Handle unusual inputs gracefully

### Test Coverage
- 10+ intent categories
- 40+ test cases
- Edge cases and error scenarios
- Performance benchmarks
- Context preservation validation

## API Reference

### IntentAnalyzer Class

#### `analyzeIntent(message, userContext)`
Analyzes a message to determine intent and extract parameters.

**Parameters**:
- `message` (string): The user message to analyze
- `userContext` (object): User context including history and preferences

**Returns**: Analysis result with intent, confidence, and parameters

#### `updateContext(userId, intent, success)`
Updates user context with interaction results.

#### `addIntentPattern(intentName, pattern)`
Adds a custom intent pattern to the analyzer.

### IntentRouter Class

#### `route(message, context)`
Routes a message to the appropriate skill based on intent analysis.

**Parameters**:
- `message` (string): User message
- `context` (object): Routing context

**Returns**: Routing decision with skill selection and configuration

#### `getStatistics()`
Returns comprehensive routing statistics and metrics.

#### `testRouting(message, context)`
Tests routing for a specific message without execution.

### OpenClawIntentIntegration Class

#### `processMessage(message, openclawContext)`
Main entry point for processing messages in OpenClaw context.

**Parameters**:
- `message` (string): User message
- `openclawContext` (object): OpenClaw-specific context

**Returns**: Complete OpenClaw-compatible response

#### `updateConfiguration(newConfig)`
Updates integration configuration settings.

#### `getSystemStatistics()`
Returns comprehensive system statistics including routing and session data.

## Troubleshooting

### Common Problems

#### Intent Not Detected
**Symptoms**: Messages consistently route to general_assistance
**Solutions**: 
- Check if keywords exist in intent patterns
- Verify message format matches expected patterns
- Add more specific keywords or patterns
- Check confidence thresholds

#### Wrong Skill Selected  
**Symptoms**: Messages route to unexpected skills
**Solutions**:
- Review skill mappings configuration
- Check for overlapping intent patterns
- Adjust pattern priorities
- Verify skill availability

#### Low Confidence Scores
**Symptoms**: High clarification request rates
**Solutions**:
- Add more pattern variations
- Include context words for boosting
- Review and optimize keyword lists
- Consider lowering confidence thresholds

#### Context Not Maintained
**Symptoms**: Loss of conversation context
**Solutions**:
- Enable context preservation in skill mappings
- Check session ID consistency
- Verify context cleanup settings
- Review session timeout configuration

### Debug Commands

Enable verbose logging:
```javascript
process.env.DEBUG = 'intent-router:*';
```

Test specific intent patterns:
```javascript
node -e "
const analyzer = require('./intent-analyzer');
const result = analyzer.analyzeIntent('your test message here');
console.log(JSON.stringify(result, null, 2));
"
```

Check skill availability:
```javascript
const router = require('./intent-router');
console.log('Available skills:', router.availableSkills);
```

## Contributing

### Adding New Intent Categories

1. Update `intent-patterns.json` with new pattern definitions
2. Add corresponding entries in `skill-mappings.json`
3. Create test cases in `test-suite.js`
4. Update this documentation

### Improving Pattern Recognition

1. Analyze failed routing cases from logs
2. Identify missing keywords or patterns
3. Test improvements with existing test suite
4. Submit changes with test evidence

### Performance Improvements

1. Profile routing performance with large message sets
2. Identify bottlenecks in analysis or routing logic
3. Implement optimizations with benchmarks
4. Ensure backward compatibility

## Changelog

### Version 1.0.0
- Initial release with 10 intent categories
- Full OpenClaw integration
- Comprehensive test suite
- Performance tracking and analytics
- Context preservation and session management
- Fallback handling and error recovery

---

**License**: MIT
**Author**: OpenClaw Intent Router Team  
**Last Updated**: February 2026

For support and questions, please check the test suite output and system statistics first. The intent router includes comprehensive debugging and monitoring capabilities to help diagnose and resolve issues quickly.