/**
 * TC-027 自动化测试用例
 * 测试目标: 验证语音面板夜间步骤语音配置正确
 * 
 * Bug ID: BUG-027
 * Bug标题: 语音面板夜间步骤语音播放错误
 */

const fs = require('fs');
const path = require('path');

class Bug027TestCase {
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
        this.log('TC-027: 语音面板夜间步骤语音配置测试 (BUG-027)', 'info');
        this.log('='.repeat(60), 'info');

        await this.testCMD053SingleDefinition();
        await this.testCMD053DExists();
        await this.testNightStepsCorrect();
        await this.testNoOtherConflicts();

        this.printSummary();
        return this.failed === 0;
    }

    async testCMD053SingleDefinition() {
        this.log('\n--- 测试1: CMD-053只定义一次 ---', 'info');

        const filePath = path.join(__dirname, '../../../public/js/voice-panel-config.js');
        const content = fs.readFileSync(filePath, 'utf-8');

        // 检查CMD-053声明次数
        const cmd053Matches = content.match(/'CMD-053':/g) || [];
        this.assert(
            cmd053Matches.length === 1,
            'CMD-053只定义一次',
            `找到 ${cmd053Matches.length} 次声明`
        );

        // 检查CMD-053是夜间版本
        const cmd053NightMatch = content.match(/'CMD-053':\s*\{\s*folder:\s*'night'/);
        this.assert(
            cmd053NightMatch !== null,
            'CMD-053是夜间版本',
            cmd053NightMatch ? 'folder: night' : 'folder不是night'
        );
    }

    async testCMD053DExists() {
        this.log('\n--- 测试2: CMD-053D存在（白天版本）---', 'info');

        const filePath = path.join(__dirname, '../../../public/js/voice-panel-config.js');
        const content = fs.readFileSync(filePath, 'utf-8');

        const hasCMD053D = content.includes("'CMD-053D':");
        this.assert(
            hasCMD053D,
            'CMD-053D存在',
            '白天版本的催促选择指令'
        );

        // 检查CMD-053D是白天版本
        const cmd053dDayMatch = content.match(/'CMD-053D':\s*\{\s*folder:\s*'day'/);
        this.assert(
            cmd053dDayMatch !== null,
            'CMD-053D是白天版本',
            cmd053dDayMatch ? 'folder: day' : 'folder不是day'
        );
    }

    async testNightStepsCorrect() {
        this.log('\n--- 测试3: 夜间步骤配置正确 ---', 'info');

        const filePath = path.join(__dirname, '../../../public/js/voice-panel-config.js');
        const content = fs.readFileSync(filePath, 'utf-8');

        // 检查夜间步骤使用CMD-053（不是CMD-053D）
        const nightStepsMatch = content.match(/nightSteps:\s*\{[\s\S]*?'5-7':\s*\[[\s\S]*?\]/);
        if (nightStepsMatch) {
            const nightStepsStr = nightStepsMatch[0];
            
            // 检查包含CMD-053
            const hasCMD053 = nightStepsStr.includes("cmd: 'CMD-053'");
            this.assert(
                hasCMD053,
                '夜间步骤使用CMD-053',
                '派西维尔睁眼步骤'
            );

            // 检查不包含CMD-053D
            const hasCMD053D = nightStepsStr.includes("cmd: 'CMD-053D'");
            this.assert(
                !hasCMD053D,
                '夜间步骤不使用CMD-053D',
                hasCMD053D ? '错误：使用了白天版本' : '正确'
            );
        } else {
            this.assert(false, '夜间步骤配置存在', '未找到nightSteps配置');
        }
    }

    async testNoOtherConflicts() {
        this.log('\n--- 测试4: 无其他指令ID冲突 ---', 'info');

        const filePath = path.join(__dirname, '../../../public/js/voice-panel-config.js');
        const content = fs.readFileSync(filePath, 'utf-8');

        // 检查其他可能冲突的指令
        const potentialConflicts = [
            'CMD-044', 'CMD-045', 'CMD-050', 'CMD-051', 'CMD-054'
        ];

        let hasConflict = false;
        let conflictDetails = '';

        for (const cmd of potentialConflicts) {
            const matches = content.match(new RegExp(`'${cmd}':`, 'g')) || [];
            if (matches.length > 1) {
                hasConflict = true;
                conflictDetails += `${cmd}(${matches.length}次) `;
            }
        }

        this.assert(
            !hasConflict,
            '无其他指令ID冲突',
            hasConflict ? `冲突: ${conflictDetails}` : '所有指令ID唯一'
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
            this.log('🎉 所有测试通过！BUG-027修复已验证。', 'success');
        } else {
            this.log('⚠️ 存在失败的测试，请检查修复是否完整。', 'warning');
        }
    }
}

async function main() {
    const testCase = new Bug027TestCase();
    const success = await testCase.runAllTests();
    process.exit(success ? 0 : 1);
}

main().catch(console.error);
