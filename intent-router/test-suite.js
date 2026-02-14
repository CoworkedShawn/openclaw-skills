#!/usr/bin/env node

/**
 * Comprehensive Test Suite for Intent Router
 * Tests all aspects of the intent routing system
 */

const IntentAnalyzer = require('./intent-analyzer');
const IntentRouter = require('./intent-router');
const OpenClawIntentIntegration = require('./openclaw-integration');

class IntentRouterTestSuite {
    constructor() {
        this.analyzer = new IntentAnalyzer();
        this.router = new IntentRouter();
        this.integration = new OpenClawIntentIntegration();
        this.testResults = {
            analyzer: [],
            router: [],
            integration: [],
            overall: {}
        };
    }

    /**
     * Run comprehensive test suite
     */
    async runAllTests() {
        console.log('🧪 Starting Intent Router Test Suite...\n');
        
        // Test the analyzer
        console.log('📊 Testing Intent Analyzer...');
        await this.testIntentAnalyzer();
        
        // Test the router
        console.log('\n🎯 Testing Intent Router...');
        await this.testIntentRouter();
        
        // Test the OpenClaw integration
        console.log('\n🔌 Testing OpenClaw Integration...');
        await this.testOpenClawIntegration();
        
        // Generate final report
        console.log('\n📋 Generating Test Report...');
        this.generateTestReport();
    }

    /**
     * Test the intent analyzer component
     */
    async testIntentAnalyzer() {
        const testCases = [
            {
                message: "Schedule a meeting with John tomorrow at 2pm",
                expectedIntent: "calendar_scheduling",
                expectedParams: ["time", "title"]
            },
            {
                message: "Send an email to sarah@company.com about the project",
                expectedIntent: "email_management",
                expectedParams: ["recipient", "subject"]
            },
            {
                message: "Create a new file called project-notes.md",
                expectedIntent: "file_operations",
                expectedParams: ["filename", "action"]
            },
            {
                message: "Search for information about artificial intelligence trends",
                expectedIntent: "research_web_search",
                expectedParams: ["query"]
            },
            {
                message: "Write a Python function to calculate fibonacci numbers",
                expectedIntent: "coding_development",
                expectedParams: ["language", "codeType"]
            },
            {
                message: "Post on Twitter about our new product launch",
                expectedIntent: "social_media_posting",
                expectedParams: ["platform", "content"]
            },
            {
                message: "Configure the development environment settings",
                expectedIntent: "system_configuration",
                expectedParams: ["action"]
            },
            {
                message: "Add a new lead named Mike Johnson to the CRM",
                expectedIntent: "sales_crm_activities",
                expectedParams: ["contactName", "action"]
            },
            {
                message: "Create a task to review the quarterly report",
                expectedIntent: "task_management",
                expectedParams: ["action"]
            },
            {
                message: "Help me understand how to use the calendar feature",
                expectedIntent: "general_assistance",
                expectedParams: []
            }
        ];

        for (const testCase of testCases) {
            try {
                const result = this.analyzer.analyzeIntent(testCase.message);
                const success = result.primaryIntent === testCase.expectedIntent;
                const confidence = result.confidence;
                const hasExpectedParams = testCase.expectedParams.every(param => 
                    Object.keys(result.parameters).includes(param)
                );

                this.testResults.analyzer.push({
                    message: testCase.message,
                    expected: testCase.expectedIntent,
                    actual: result.primaryIntent,
                    confidence: confidence,
                    success: success,
                    parametersCorrect: hasExpectedParams,
                    parameters: result.parameters
                });

                const status = success ? '✅' : '❌';
                const confidenceColor = confidence > 0.7 ? '🟢' : confidence > 0.5 ? '🟡' : '🔴';
                console.log(`  ${status} ${confidenceColor} "${testCase.message}"`);
                console.log(`     → ${result.primaryIntent} (${(confidence * 100).toFixed(1)}%)`);
                
            } catch (error) {
                this.testResults.analyzer.push({
                    message: testCase.message,
                    expected: testCase.expectedIntent,
                    actual: 'ERROR',
                    success: false,
                    error: error.message
                });
                console.log(`  ❌ ERROR: "${testCase.message}" - ${error.message}`);
            }
        }
    }

    /**
     * Test the intent router component
     */
    async testIntentRouter() {
        const testCases = [
            {
                message: "Schedule a team meeting for next Monday at 10am",
                expectedAction: "route_to_skill",
                expectedSkill: "calendar-manager"
            },
            {
                message: "I need to do something important but not sure what",
                expectedAction: "clarification_needed"
            },
            {
                message: "Send email to the entire company about policy changes",
                expectedAction: "route_to_skill",
                expectedSkill: "email-assistant"
            },
            {
                message: "Create a backup of all my important files",
                expectedAction: "route_to_skill",
                expectedSkill: "file-manager"
            }
        ];

        for (const testCase of testCases) {
            try {
                const result = await this.router.route(testCase.message);
                const success = result.action === testCase.expectedAction;
                const skillMatch = !testCase.expectedSkill || result.targetSkill === testCase.expectedSkill;

                this.testResults.router.push({
                    message: testCase.message,
                    expectedAction: testCase.expectedAction,
                    actualAction: result.action,
                    expectedSkill: testCase.expectedSkill,
                    actualSkill: result.targetSkill,
                    success: success && skillMatch,
                    confidence: result.confidence
                });

                const status = success && skillMatch ? '✅' : '❌';
                console.log(`  ${status} "${testCase.message}"`);
                console.log(`     → Action: ${result.action}, Skill: ${result.targetSkill || 'N/A'}`);
                
            } catch (error) {
                this.testResults.router.push({
                    message: testCase.message,
                    expectedAction: testCase.expectedAction,
                    actualAction: 'ERROR',
                    success: false,
                    error: error.message
                });
                console.log(`  ❌ ERROR: "${testCase.message}" - ${error.message}`);
            }
        }
    }

    /**
     * Test the OpenClaw integration component
     */
    async testOpenClawIntegration() {
        const testCases = [
            {
                message: "Book a doctor appointment for Thursday at 3pm",
                context: { userId: "test-user", sessionId: "session-1", channel: "test" },
                expectSkillExecution: true
            },
            {
                message: "Check my email for urgent messages",
                context: { userId: "test-user", sessionId: "session-1", channel: "test" },
                expectSkillExecution: true
            },
            {
                message: "Something about files but not specific",
                context: { userId: "test-user", sessionId: "session-2", channel: "test" },
                expectClarification: true
            }
        ];

        for (const testCase of testCases) {
            try {
                const result = await this.integration.processMessage(testCase.message, testCase.context);
                
                let success = false;
                if (testCase.expectSkillExecution) {
                    success = result.intent_routing.success && !!result.skill_execution;
                } else if (testCase.expectClarification) {
                    success = !result.intent_routing.success && !!result.clarification_request;
                } else {
                    success = result.intent_routing.success;
                }

                this.testResults.integration.push({
                    message: testCase.message,
                    success: success,
                    hasSkillExecution: !!result.skill_execution,
                    hasClarificationRequest: !!result.clarification_request,
                    hasErrorHandling: !!result.error_handling,
                    targetSkill: result.skill_execution?.target_skill,
                    confidence: result.intent_routing.confidence
                });

                const status = success ? '✅' : '❌';
                console.log(`  ${status} "${testCase.message}"`);
                console.log(`     → Integration: ${result.intent_routing.success ? 'SUCCESS' : 'FAIL'}`);
                if (result.skill_execution) {
                    console.log(`     → Skill: ${result.skill_execution.target_skill}`);
                }
                if (result.clarification_request) {
                    console.log(`     → Clarification requested`);
                }
                
            } catch (error) {
                this.testResults.integration.push({
                    message: testCase.message,
                    success: false,
                    error: error.message
                });
                console.log(`  ❌ ERROR: "${testCase.message}" - ${error.message}`);
            }
        }
    }

    /**
     * Generate comprehensive test report
     */
    generateTestReport() {
        // Calculate overall statistics
        const analyzerStats = this.calculateTestStats(this.testResults.analyzer);
        const routerStats = this.calculateTestStats(this.testResults.router);
        const integrationStats = this.calculateTestStats(this.testResults.integration);

        console.log('📊 TEST RESULTS SUMMARY');
        console.log('=' .repeat(50));
        
        console.log('\n🔍 Intent Analyzer:');
        console.log(`   Success Rate: ${analyzerStats.successRate}%`);
        console.log(`   Average Confidence: ${analyzerStats.averageConfidence}%`);
        console.log(`   Tests Run: ${analyzerStats.totalTests}`);
        console.log(`   Successful: ${analyzerStats.successful}`);
        console.log(`   Failed: ${analyzerStats.failed}`);

        console.log('\n🎯 Intent Router:');
        console.log(`   Success Rate: ${routerStats.successRate}%`);
        console.log(`   Average Confidence: ${routerStats.averageConfidence}%`);
        console.log(`   Tests Run: ${routerStats.totalTests}`);
        console.log(`   Successful: ${routerStats.successful}`);
        console.log(`   Failed: ${routerStats.failed}`);

        console.log('\n🔌 OpenClaw Integration:');
        console.log(`   Success Rate: ${integrationStats.successRate}%`);
        console.log(`   Average Confidence: ${integrationStats.averageConfidence}%`);
        console.log(`   Tests Run: ${integrationStats.totalTests}`);
        console.log(`   Successful: ${integrationStats.successful}`);
        console.log(`   Failed: ${integrationStats.failed}`);

        // Overall system health
        const overallSuccess = (analyzerStats.successful + routerStats.successful + integrationStats.successful);
        const overallTotal = (analyzerStats.totalTests + routerStats.totalTests + integrationStats.totalTests);
        const overallRate = Math.round((overallSuccess / overallTotal) * 100);

        console.log('\n🏆 OVERALL SYSTEM HEALTH:');
        console.log(`   Overall Success Rate: ${overallRate}%`);
        console.log(`   Total Tests: ${overallTotal}`);
        console.log(`   System Status: ${overallRate >= 80 ? '🟢 HEALTHY' : overallRate >= 60 ? '🟡 NEEDS ATTENTION' : '🔴 CRITICAL'}`);

        // Intent distribution analysis
        this.analyzeIntentDistribution();

        // Performance recommendations
        this.generateRecommendations(analyzerStats, routerStats, integrationStats);

        console.log('\n✨ Test suite completed!');
    }

    /**
     * Calculate test statistics
     */
    calculateTestStats(results) {
        const successful = results.filter(r => r.success).length;
        const failed = results.length - successful;
        const successRate = Math.round((successful / results.length) * 100);
        
        const confidences = results.filter(r => r.confidence !== undefined).map(r => r.confidence);
        const averageConfidence = confidences.length > 0 ? 
            Math.round((confidences.reduce((sum, c) => sum + c, 0) / confidences.length) * 100) : 0;

        return {
            totalTests: results.length,
            successful,
            failed,
            successRate,
            averageConfidence
        };
    }

    /**
     * Analyze intent distribution
     */
    analyzeIntentDistribution() {
        const intentCounts = {};
        this.testResults.analyzer.forEach(result => {
            const intent = result.actual;
            intentCounts[intent] = (intentCounts[intent] || 0) + 1;
        });

        console.log('\n📈 INTENT DISTRIBUTION:');
        Object.entries(intentCounts)
            .sort(([,a], [,b]) => b - a)
            .forEach(([intent, count]) => {
                console.log(`   ${intent}: ${count} tests`);
            });
    }

    /**
     * Generate performance recommendations
     */
    generateRecommendations(analyzerStats, routerStats, integrationStats) {
        console.log('\n💡 PERFORMANCE RECOMMENDATIONS:');

        if (analyzerStats.averageConfidence < 70) {
            console.log('   📝 Consider improving intent patterns for better confidence scores');
        }

        if (analyzerStats.successRate < 80) {
            console.log('   🔧 Review intent pattern definitions and keyword mappings');
        }

        if (routerStats.successRate < 90) {
            console.log('   ⚙️ Check skill availability and routing configuration');
        }

        if (integrationStats.successRate < 85) {
            console.log('   🔗 Review OpenClaw integration configuration');
        }

        if (analyzerStats.successRate >= 90 && routerStats.successRate >= 90 && integrationStats.successRate >= 90) {
            console.log('   🎉 System performance is excellent! Consider adding more test cases.');
        }
    }

    /**
     * Run specific test category
     */
    async runAnalyzerTests() {
        await this.testIntentAnalyzer();
    }

    async runRouterTests() {
        await this.testIntentRouter();
    }

    async runIntegrationTests() {
        await this.testOpenClawIntegration();
    }

    /**
     * Save test results to file
     */
    saveTestResults() {
        const results = {
            timestamp: new Date().toISOString(),
            analyzer: this.testResults.analyzer,
            router: this.testResults.router,
            integration: this.testResults.integration,
            overall: this.testResults.overall
        };

        const fs = require('fs');
        const path = require('path');
        const resultsPath = path.join(__dirname, 'test-results.json');
        fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));
        console.log(`\n💾 Test results saved to: ${resultsPath}`);
    }
}

// CLI interface
if (require.main === module) {
    const testSuite = new IntentRouterTestSuite();
    
    const command = process.argv[2] || 'all';
    
    async function runTests() {
        switch (command) {
            case 'analyzer':
                await testSuite.runAnalyzerTests();
                break;
            case 'router':
                await testSuite.runRouterTests();
                break;
            case 'integration':
                await testSuite.runIntegrationTests();
                break;
            case 'all':
            default:
                await testSuite.runAllTests();
                break;
        }
        
        testSuite.saveTestResults();
    }
    
    runTests().catch(console.error);
}

module.exports = IntentRouterTestSuite;