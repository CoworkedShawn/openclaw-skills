#!/usr/bin/env node

/**
 * Test script for intent router functionality
 */

const IntentRouterIntegration = require('./intent-router-integration');

async function runTests() {
    const integration = new IntentRouterIntegration();
    
    const testMessages = [
        // Calendar/scheduling
        "Schedule a meeting with John for tomorrow at 2pm",
        "Check my calendar for next week",
        "Set a reminder to call Mom on Sunday",
        
        // Email management
        "Send an email to Sarah about the project",
        "Check my inbox for unread messages",
        "Reply to that email from the client",
        
        // File operations
        "Create a new file called notes.txt",
        "Edit the project documentation",
        "Organize my files in the workspace",
        
        // Research/web search
        "Search for information about AI trends in 2024",
        "Find the latest news about climate change",
        "Research web development best practices",
        
        // Coding/development
        "Write a Python script to sort data by date",
        "Create a simple HTML webpage",
        "Debug the JavaScript code in my project",
        
        // Social media posting
        "Post on Twitter about our new product launch",
        "Share this article on LinkedIn",
        "Update my Facebook status",
        
        // System configuration
        "Configure the system settings for development",
        "Install the required software packages",
        "Setup the environment variables",
        
        // Sales/CRM activities
        "Add a new lead to the CRM system",
        "Update the customer contact information",
        "Check my sales pipeline status",
        
        // Help/assistance
        "Help me understand how to use this feature",
        "How do I create a new project?",
        "Explain the difference between these tools",
        
        // General conversation
        "Hello, how are you doing today?",
        "Thanks for your help!",
        "What's new with you?",
        
        // Ambiguous/fallback
        "I need to do something important",
        "Can you assist me with a task?",
        "What's the weather like?"
    ];
    
    console.log('🧪 Testing Intent Router with sample messages...\n');
    
    let successCount = 0;
    let clarificationCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < testMessages.length; i++) {
        const message = testMessages[i];
        console.log(`\n${'='.repeat(60)}`);
        console.log(`Test ${i + 1}/${testMessages.length}: "${message}"`);
        console.log('='.repeat(60));
        
        try {
            const result = await integration.processMessage(message, {
                user_id: 'test_user',
                channel: 'test'
            });
            
            console.log('✅ Result:');
            console.log(`   Intent: ${result.intent || 'unknown'}`);
            console.log(`   Confidence: ${result.type === 'intent_routed' ? 'High' : 'Low/Clarification'}`);
            console.log(`   Type: ${result.type}`);
            console.log(`   Response: ${result.response_for_user}`);
            
            if (result.type === 'intent_routed') {
                successCount++;
            } else if (result.type === 'clarification_needed' || result.type === 'missing_parameters') {
                clarificationCount++;
            }
            
            if (result.openclaw_commands && result.openclaw_commands.length > 0) {
                console.log('\n🔧 Suggested OpenClaw Commands:');
                result.openclaw_commands.forEach((cmd, idx) => {
                    console.log(`   ${idx + 1}. ${cmd.tool}.${cmd.action}(${JSON.stringify(cmd.parameters)})`);
                });
            }
            
        } catch (error) {
            console.log('❌ Error:', error.message);
            errorCount++;
        }
        
        // Add small delay between tests
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Summary
    console.log(`\n${'='.repeat(60)}`);
    console.log('📊 TEST RESULTS SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Successful routings: ${successCount}`);
    console.log(`🤔 Clarifications needed: ${clarificationCount}`);
    console.log(`❌ Errors: ${errorCount}`);
    console.log(`📈 Total messages: ${testMessages.length}`);
    console.log(`🎯 Success rate: ${Math.round((successCount / testMessages.length) * 100)}%`);
    
    // Show router statistics
    console.log('\n🔍 Router Statistics:');
    const stats = integration.getRouterStats();
    console.log(`   Available skills: ${stats.available_skills.length}`);
    console.log(`   Intent patterns: ${stats.intent_patterns_loaded}`);
    console.log(`   Default routes: ${stats.default_routes}`);
    
    console.log('\n✨ Test completed!');
}

// Run tests if called directly
if (require.main === module) {
    runTests().catch(console.error);
}

module.exports = runTests;