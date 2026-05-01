/**
 * BUG-023 自动化测试用例
 * 测试目标: 验证语音面板夜晚状态同步到客户端
 * 
 * 测试场景:
 * 1. 服务器端roomId类型转换正确
 * 2. CMD-044/045指令ID不再冲突
 * 3. 夜间阶段状态正确同步
 */

const fs = require('fs');
const path = require('path');

class Bug023TestCase {
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
        this.log('BUG-023 自动化测试开始', 'info');
        this.log('='.repeat(60), 'info');

        await this.testServerRoomIdTypeConversion();
        await this.testVoicePanelConfigNoIdConflict();
        await this.testNightStepsConfiguration();

        this.printSummary();
        return this.failed === 0;
    }

    async testServerRoomIdTypeConversion() {
        this.log('\n--- 测试1: 服务器端roomId类型转换 ---', 'info');

        const serverPath = path.join(__dirname, '../../../server.js');
        const serverContent = fs.readFileSync(serverPath, 'utf-8');

        const hasRoomIdStrConversion = serverContent.includes('const roomIdStr = String(roomId)');
        const hasRoomKeyFind = serverContent.includes("Array.from(games.keys()).find(key => String(key) === roomIdStr)");
        const hasNextPhaseLog = serverContent.includes('[next-phase]');

        this.assert(
            hasRoomIdStrConversion,
            '服务器端包含roomId类型转换',
            'const roomIdStr = String(roomId)'
        );

        this.assert(
            hasRoomKeyFind,
            '服务器端使用正确的房间查找逻辑',
            'Array.from(games.keys()).find(key => String(key) === roomIdStr)'
        );

        this.assert(
            hasNextPhaseLog,
            '服务器端包含调试日志',
            '[next-phase] 日志前缀'
        );
    }

    async testVoicePanelConfigNoIdConflict() {
        this.log('\n--- 测试2: 语音面板配置ID不冲突 ---', 'info');

        const configPath = path.join(__dirname, '../../../public/js/voice-panel-config.js');
        const configContent = fs.readFileSync(configPath, 'utf-8');

        const nightCmd044 = configContent.includes("'CMD-044': { folder: 'night'");
        const nightCmd045 = configContent.includes("'CMD-045': { folder: 'night'");
        const dayCmd044d = configContent.includes("'CMD-044D': { folder: 'day'");
        const dayCmd045d = configContent.includes("'CMD-045D': { folder: 'day'");

        this.assert(
            nightCmd044,
            '夜间CMD-044定义存在且folder为night',
            "'CMD-044': { folder: 'night'"
        );

        this.assert(
            nightCmd045,
            '夜间CMD-045定义存在且folder为night',
            "'CMD-045': { folder: 'night'"
        );

        this.assert(
            dayCmd044d,
            '白天CMD-044D定义存在（使用新ID避免冲突）',
            "'CMD-044D': { folder: 'day'"
        );

        this.assert(
            dayCmd045d,
            '白天CMD-045D定义存在（使用新ID避免冲突）',
            "'CMD-045D': { folder: 'day'"
        );

        const cmd044Matches = configContent.match(/'CMD-044':/g) || [];
        const cmd045Matches = configContent.match(/'CMD-045':/g) || [];

        this.assert(
            cmd044Matches.length === 1,
            'CMD-044只定义一次（无重复）',
            `找到 ${cmd044Matches.length} 次定义`
        );

        this.assert(
            cmd045Matches.length === 1,
            'CMD-045只定义一次（无重复）',
            `找到 ${cmd045Matches.length} 次定义`
        );
    }

    async testNightStepsConfiguration() {
        this.log('\n--- 测试3: 夜间步骤配置正确 ---', 'info');

        const configPath = path.join(__dirname, '../../../public/js/voice-panel-config.js');
        const configContent = fs.readFileSync(configPath, 'utf-8');

        const expectedNightSteps = [
            { cmd: 'CMD-011', name: '闭眼' },
            { cmd: 'CMD-044', name: '坏人睁眼' },
            { cmd: 'CMD-045', name: '坏人闭眼' },
            { cmd: 'CMD-050', name: '梅林睁眼' },
            { cmd: 'CMD-051', name: '梅林闭眼' },
            { cmd: 'CMD-053', name: '派西睁眼' },
            { cmd: 'CMD-054', name: '派西闭眼' },
            { cmd: 'CMD-022', name: '天亮了' }
        ];

        for (const step of expectedNightSteps) {
            const hasStep = configContent.includes(`{ cmd: '${step.cmd}', name: '${step.name}'`);
            this.assert(
                hasStep,
                `夜间步骤包含: ${step.name} (${step.cmd})`,
                `cmd: '${step.cmd}', name: '${step.name}'`
            );
        }

        const nightStepsMatch = configContent.match(/nightSteps:\s*\{[\s\S]*?'5-7':\s*\[[\s\S]*?\]/);
        if (nightStepsMatch) {
            const nightStepsStr = nightStepsMatch[0];
            const stepCount = (nightStepsStr.match(/{ cmd:/g) || []).length;
            this.assert(
                stepCount === 8,
                '5-7人局夜间步骤数量正确',
                `共 ${stepCount} 个步骤`
            );
        }
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
            this.log('🎉 所有测试通过！BUG-023修复已验证。', 'success');
        } else {
            this.log('⚠️ 存在失败的测试，请检查修复是否完整。', 'warning');
        }
    }
}

async function main() {
    const testCase = new Bug023TestCase();
    const success = await testCase.runAllTests();
    process.exit(success ? 0 : 1);
}

main().catch(console.error);
