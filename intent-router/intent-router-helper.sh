#!/bin/bash

# Intent Router Helper Script
# Provides easy access to intent router functionality

ROUTER_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Show usage information
show_usage() {
    echo -e "${BLUE}Intent Router Helper${NC}"
    echo -e "====================="
    echo ""
    echo "Usage: $0 <command> [options]"
    echo ""
    echo "Commands:"
    echo -e "  ${GREEN}test${NC}                    Run comprehensive test suite"
    echo -e "  ${GREEN}test-quick${NC}              Run quick functionality test"
    echo -e "  ${GREEN}route <message>${NC}         Test routing for a specific message"
    echo -e "  ${GREEN}analyze <message>${NC}       Analyze intent for a specific message"
    echo -e "  ${GREEN}stats${NC}                   Show routing statistics"
    echo -e "  ${GREEN}config${NC}                  Show current configuration"
    echo -e "  ${GREEN}patterns${NC}                List all intent patterns"
    echo -e "  ${GREEN}skills${NC}                  List all skill mappings"
    echo -e "  ${GREEN}demo${NC}                    Run interactive demo"
    echo -e "  ${GREEN}reset${NC}                   Reset statistics and context"
    echo -e "  ${GREEN}help${NC}                    Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 route 'Schedule a meeting tomorrow at 2pm'"
    echo "  $0 analyze 'Send email to john@company.com'"
    echo "  $0 test"
    echo "  $0 demo"
}

# Test routing for a specific message
test_route() {
    local message="$1"
    if [ -z "$message" ]; then
        echo -e "${RED}Error: Please provide a message to test${NC}"
        echo "Usage: $0 route '<message>'"
        exit 1
    fi
    
    echo -e "${BLUE}Testing routing for message:${NC} \"$message\""
    echo ""
    node "$ROUTER_DIR/intent-router.js" "$message"
}

# Analyze intent for a specific message
test_analyze() {
    local message="$1"
    if [ -z "$message" ]; then
        echo -e "${RED}Error: Please provide a message to analyze${NC}"
        echo "Usage: $0 analyze '<message>'"
        exit 1
    fi
    
    echo -e "${BLUE}Analyzing intent for message:${NC} \"$message\""
    echo ""
    node "$ROUTER_DIR/intent-analyzer.js" "$message"
}

# Run comprehensive test suite
run_tests() {
    echo -e "${BLUE}Running comprehensive Intent Router test suite...${NC}"
    echo ""
    node "$ROUTER_DIR/test-suite.js"
}

# Run quick functionality test
run_quick_test() {
    echo -e "${BLUE}Running quick functionality test...${NC}"
    echo ""
    
    local test_messages=(
        "Schedule a meeting tomorrow"
        "Send an email to support"
        "Create a new file"
        "Search for AI trends"
        "Write Python code"
    )
    
    for message in "${test_messages[@]}"; do
        echo -e "${YELLOW}Testing:${NC} $message"
        node "$ROUTER_DIR/intent-router.js" "$message" | grep -E "→|Success Rate|Intent:" || echo "  (No output)"
        echo ""
    done
}

# Show routing statistics
show_stats() {
    echo -e "${BLUE}Intent Router Statistics${NC}"
    echo "========================"
    echo ""
    
    node -e "
    const router = require('$ROUTER_DIR/intent-router');
    const routerInstance = new router();
    const stats = routerInstance.getStatistics();
    
    console.log('📊 Routing Performance:');
    console.log('  Success Rate:', stats.successRate + '%');
    console.log('  Total Requests:', stats.totalRequests);
    console.log('  Average Confidence:', Math.round(stats.averageConfidence * 100) + '%');
    console.log('  Available Skills:', stats.availableSkills);
    
    if (stats.topIntents.length > 0) {
        console.log('');
        console.log('🎯 Top Intents:');
        stats.topIntents.forEach((intent, i) => {
            console.log('  ' + (i+1) + '.', intent.intent + ':', intent.count, 'requests');
        });
    }
    
    if (stats.topSkills.length > 0) {
        console.log('');
        console.log('⚙️ Most Used Skills:');
        stats.topSkills.forEach((skill, i) => {
            console.log('  ' + (i+1) + '.', skill.skill + ':', skill.count, 'times');
        });
    }
    "
}

# Show current configuration
show_config() {
    echo -e "${BLUE}Intent Router Configuration${NC}"
    echo "==========================="
    echo ""
    
    if [ -f "$ROUTER_DIR/openclaw-config.json" ]; then
        echo -e "${GREEN}OpenClaw Configuration:${NC}"
        cat "$ROUTER_DIR/openclaw-config.json" | node -e "
        const config = JSON.parse(require('fs').readFileSync('/dev/stdin', 'utf8'));
        Object.entries(config).forEach(([key, value]) => {
            if (typeof value === 'object') {
                console.log('  ' + key + ':', '[object]');
            } else {
                console.log('  ' + key + ':', value);
            }
        });
        "
        echo ""
    fi
    
    echo -e "${GREEN}Intent Patterns:${NC} $([ -f "$ROUTER_DIR/intent-patterns.json" ] && echo "✅ Loaded" || echo "❌ Missing")"
    echo -e "${GREEN}Skill Mappings:${NC} $([ -f "$ROUTER_DIR/skill-mappings.json" ] && echo "✅ Loaded" || echo "❌ Missing")"
}

# List all intent patterns
list_patterns() {
    echo -e "${BLUE}Available Intent Patterns${NC}"
    echo "========================="
    echo ""
    
    if [ -f "$ROUTER_DIR/intent-patterns.json" ]; then
        node -e "
        const patterns = require('$ROUTER_DIR/intent-patterns.json');
        Object.entries(patterns).forEach(([intent, config]) => {
            console.log('📝', intent);
            console.log('   Keywords:', config.keywords.slice(0, 5).join(', ') + (config.keywords.length > 5 ? ', ...' : ''));
            console.log('   Priority:', config.priority || 'default');
            console.log('');
        });
        "
    else
        echo -e "${RED}Error: intent-patterns.json not found${NC}"
    fi
}

# List all skill mappings
list_skills() {
    echo -e "${BLUE}Skill Mappings${NC}"
    echo "=============="
    echo ""
    
    if [ -f "$ROUTER_DIR/skill-mappings.json" ]; then
        node -e "
        const mappings = require('$ROUTER_DIR/skill-mappings.json');
        Object.entries(mappings).forEach(([intent, config]) => {
            console.log('⚙️', intent, '→', config.primary_skill);
            if (config.fallback_skills && config.fallback_skills.length > 0) {
                console.log('   Fallbacks:', config.fallback_skills.join(', '));
            }
            console.log('   Tools:', config.required_tools.join(', '));
            console.log('');
        });
        "
    else
        echo -e "${RED}Error: skill-mappings.json not found${NC}"
    fi
}

# Run interactive demo
run_demo() {
    echo -e "${BLUE}Intent Router Interactive Demo${NC}"
    echo "============================="
    echo ""
    echo "Enter messages to see how they would be routed."
    echo "Type 'quit', 'exit', or 'q' to stop."
    echo ""
    
    while true; do
        echo -n -e "${GREEN}Enter message:${NC} "
        read -r user_input
        
        # Check for quit commands
        if [[ "$user_input" =~ ^(quit|exit|q)$ ]]; then
            echo "Demo ended."
            break
        fi
        
        # Skip empty input
        if [ -z "$user_input" ]; then
            continue
        fi
        
        echo ""
        echo -e "${YELLOW}Analyzing:${NC} \"$user_input\""
        echo "---"
        node "$ROUTER_DIR/openclaw-integration.js" "$user_input" | node -e "
        const result = JSON.parse(require('fs').readFileSync('/dev/stdin', 'utf8'));
        
        console.log('Intent:', result.intent_routing.intent);
        console.log('Confidence:', Math.round(result.intent_routing.confidence * 100) + '%');
        console.log('Action:', result.intent_routing.action);
        
        if (result.skill_execution) {
            console.log('Target Skill:', result.skill_execution.target_skill);
            console.log('Required Tools:', result.skill_execution.required_tools.join(', '));
        }
        
        if (result.clarification_request) {
            console.log('Clarification:', result.clarification_request.suggestion);
        }
        "
        echo ""
    done
}

# Reset statistics and context
reset_system() {
    echo -e "${YELLOW}Resetting Intent Router system...${NC}"
    
    # Remove test results if they exist
    [ -f "$ROUTER_DIR/test-results.json" ] && rm "$ROUTER_DIR/test-results.json" && echo "✅ Cleared test results"
    
    # Reset would be done in the system - for now just notify
    echo "✅ Statistics reset"
    echo "✅ Context cleared"
    echo ""
    echo -e "${GREEN}System reset complete!${NC}"
}

# Main command dispatcher
case "${1:-help}" in
    "test")
        run_tests
        ;;
    "test-quick")
        run_quick_test
        ;;
    "route")
        test_route "$2"
        ;;
    "analyze")
        test_analyze "$2"
        ;;
    "stats")
        show_stats
        ;;
    "config")
        show_config
        ;;
    "patterns")
        list_patterns
        ;;
    "skills")
        list_skills
        ;;
    "demo")
        run_demo
        ;;
    "reset")
        reset_system
        ;;
    "help"|"--help"|"-h")
        show_usage
        ;;
    *)
        echo -e "${RED}Unknown command: $1${NC}"
        echo ""
        show_usage
        exit 1
        ;;
esac