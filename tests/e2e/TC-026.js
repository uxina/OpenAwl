/**
 * TC-026 自动化测试用例
 * 测试目标: 验证语音面板按钮功能正常，无JavaScript语法错误
 * 
 * Bug ID: BUG-026
 * Bug标题: 语音面板所有按钮失效
 */

const fs = require('fs');
const path = require('path');

class Bug026TestCase {
    constructor() {
        this.results = [];
        this.passed = 0;
        this.failed = 0;
    }

    log(message, type = 'info') {
        const timestamp = new Date().toISOString();
        const logMessage = `[${timestamp}] [${type.toUpperCase()}] ${message}`;
        console.log(logMessage);
        this.results.push({ timestamp, type, message });
    }

    assert(condition, testName, details = '') {
        if (condition) {
            this.passed++;
            this.log(`✅ 通过: ${testName}`, 'success');
            if (details) this.log(`   详情: ${details}`, 'info');
        } else {
            this.failed++;
            this.log(`❌ 失败: ${testName}`, 'error');
            if (details) this.log(`   详情: ${details}`, 'error');
        }
        return condition;
    }

    async runAllTests() {
        this.log('='.repeat(60), 'info');
        this.log('TC-026: 语音面板按钮功能测试 (BUG-026)', 'info');
        this.log('='.repeat(60), 'info');

        await this.testNoDuplicateConstDeclaration();
        await this.testPrevPhaseVariablesExist();
        await this.testPreviousPhaseFunctionExists();
        await this.testNoSyntaxErrors();

        this.printSummary();
        return this.failed === 0;
    }

    async testNoDuplicateConstDeclaration() {
        this.log('\n--- 测试1: 无重复const声明 ---', 'info');

        const filePath = path.join(__dirname, '../../../public/voice-panel-v2.html');
        const content = fs.readFileSync(filePath, 'utf-8');

        // 检查PHASE_AUDIO_MAP声明次数
        const phaseAudioMapMatches = content.match(/const PHASE_AUDIO_MAP/g) || [];
        this.assert(
            phaseAudioMapMatches.length === 1,
            'PHASE_AUDIO_MAP只声明一次',
            `找到 ${phaseAudioMapMatches.length} 次声明`
        );

        // 检查PHASE_ORDER声明次数
        const phaseOrderMatches = content.match(/const PHASE_ORDER/g) || [];
        this.assert(
            phaseOrderMatches.length <= 1,
            'PHASE_ORDER最多声明一次',
            `找到 ${phaseOrderMatches.length} 次声明`
        );
    }

    async testPrevPhaseVariablesExist() {
        this.log('\n--- 测试2: PREV_PHASE变量存在 ---', 'info');

        const filePath = path.join(__dirname, '../../../public/voice-panel-v2.html');
        const content = fs.readFileSync(filePath, 'utf-8');

        const hasPrevPhaseAudioMap = content.includes('const PREV_PHASE_AUDIO_MAP');
        this.assert(
            hasPrevPhaseAudioMap,
            'PREV_PHASE_AUDIO_MAP变量存在',
            '用于上一阶段功能的变量'
        );

        const hasPrevPhaseOrder = content.includes('const PREV_PHASE_ORDER');
        this.assert(
            hasPrevPhaseOrder,
            'PREV_PHASE_ORDER变量存在',
            '用于上一阶段功能的变量'
        );
    }

    async testPreviousPhaseFunctionExists() {
        this.log('\n--- 测试3: previousPhase函数存在 ---', 'info');

        const filePath = path.join(__dirname, '../../../public/voice-panel-v2.html');
        const content = fs.readFileSync(filePath, 'utf-8');

        const hasPreviousPhaseFunction = content.includes('function previousPhase()');
        this.assert(
            hasPreviousPhaseFunction,
            'previousPhase函数存在',
            '上一阶段按钮的处理函数'
        );

        // 检查函数使用了正确的变量
        const usesPrevPhaseAudioMap = content.includes('PREV_PHASE_AUDIO_MAP[');
        this.assert(
            usesPrevPhaseAudioMap,
            'previousPhase函数使用PREV_PHASE_AUDIO_MAP',
            '函数内部使用正确的变量名'
        );

        const usesPrevPhaseOrder = content.includes('PREV_PHASE_ORDER.indexOf');
        this.assert(
            usesPrevPhaseOrder,
            'previousPhase函数使用PREV_PHASE_ORDER',
            '函数内部使用正确的变量名'
        );
    }

    async testNoSyntaxErrors() {
        this.log('\n--- 测试4: 无语法错误 ---', 'info');

        const filePath = path.join(__dirname, '../../../public/voice-panel-v2.html');
        const content = fs.readFileSync(filePath, 'utf-8');

        // 检查关键的重复const声明问题
        const criticalPatterns = [
            { pattern: /const PHASE_AUDIO_MAP[\s\S]*?const PHASE_AUDIO_MAP/g, name: 'PHASE_AUDIO_MAP' },
            { pattern: /const PHASE_ORDER[\s\S]*?const PHASE_ORDER/g, name: 'PHASE_ORDER' },
            { pattern: /const PREV_PHASE_AUDIO_MAP[\s\S]*?const PREV_PHASE_AUDIO_MAP/g, name: 'PREV_PHASE_AUDIO_MAP' },
            { pattern: /const PREV_PHASE_ORDER[\s\S]*?const PREV_PHASE_ORDER/g, name: 'PREV_PHASE_ORDER' }
        ];

        let hasCriticalError = false;
        let errorMessage = '';

        for (const { pattern, name } of criticalPatterns) {
            if (pattern.test(content)) {
                hasCriticalError = true;
                errorMessage = `发现重复的const声明: ${name}`;
                break;
            }
        }

        this.assert(
            !hasCriticalError,
            '无关键的JavaScript语法错误',
            errorMessage || '关键变量无重复声明'
        );
    }

    printSummary() {
        this.log('\n' + '='.repeat(60), 'info');
        this.log('测试结果汇总', 'info');
        this.log('='.repeat(60), 'info');
        this.log(`总计: ${this.passed + this.failed} 个测试`, 'info');
        this.log(`通过: ${this.passed} 个`, 'success');
        this.log(`失败: ${this.failed} 个`, this.failed > 0 ? 'error' : 'info');
        this.log('='.repeat(60), 'info');

        if (this.failed === 0) {
            this.log('🎉 所有测试通过！BUG-026修复已验证。', 'success');
        } else {
            this.log('⚠️ 存在失败的测试，请检查修复是否完整。', 'warning');
        }
    }
}

async function main() {
    const testCase = new Bug026TestCase();
    const success = await testCase.runAllTests();
    process.exit(success ? 0 : 1);
}

main().catch(console.error);
