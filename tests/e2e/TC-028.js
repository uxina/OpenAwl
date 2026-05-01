const fs = require('fs');
const path = require('path');

class Bug028TestCase {
    constructor() {
        this.results = [];
        this.passed = 0;
        this.failed = 0;
    }

    log(message, type = 'info') {
        const timestamp = new Date().toISOString();
        console.log(`[${timestamp}] [${type.toUpperCase()}] ${message}`);
        this.results.push({ timestamp, type, message });
    }

    assert(condition, testName, details = '') {
        if (condition) {
            this.passed++;
            this.log(`✅ 通过: ${testName}`, 'success');
        } else {
            this.failed++;
            this.log(`❌ 失败: ${testName} - ${details}`, 'error');
        }
        return condition;
    }

    async runAllTests() {
        this.log('='.repeat(60), 'info');
        this.log(`测试用例: TC-028 (BUG-028)`, 'info');
        this.log('标题: 组队和任务结果缺少语音播报', 'info');
        this.log('='.repeat(60), 'info');

        await this.testVoiceCommandsDefined();
        await this.testVoteResultListener();
        await this.testMissionResultListener();
        await this.testVoicePlaybackLogic();

        this.printSummary();
        return this.failed === 0;
    }

    async testVoiceCommandsDefined() {
        const configPath = path.join(__dirname, '../../../public/js/voice-panel-config.js');
        const content = fs.readFileSync(configPath, 'utf-8');
        
        this.assert(
            content.includes('CMD-074'),
            '投票通过语音命令已定义 (CMD-074)',
            'voiceCommands中应包含CMD-074'
        );
        
        this.assert(
            content.includes('CMD-075'),
            '投票否决语音命令已定义 (CMD-075)',
            'voiceCommands中应包含CMD-075'
        );
        
        this.assert(
            content.includes('CMD-094'),
            '任务成功语音命令已定义 (CMD-094)',
            'voiceCommands中应包含CMD-094'
        );
        
        this.assert(
            content.includes('CMD-095'),
            '任务失败语音命令已定义 (CMD-095)',
            'voiceCommands中应包含CMD-095'
        );
    }

    async testVoteResultListener() {
        const panelPath = path.join(__dirname, '../../../public/voice-panel-v2.html');
        const content = fs.readFileSync(panelPath, 'utf-8');
        
        this.assert(
            content.includes('vote-completed'),
            '语音面板监听投票结果事件 (vote-completed)',
            '应监听vote-completed事件'
        );
    }

    async testMissionResultListener() {
        const panelPath = path.join(__dirname, '../../../public/voice-panel-v2.html');
        const content = fs.readFileSync(panelPath, 'utf-8');
        
        this.assert(
            content.includes('mission-completed'),
            '语音面板监听任务结果事件 (mission-completed)',
            '应监听mission-completed事件'
        );
    }

    async testVoicePlaybackLogic() {
        const panelPath = path.join(__dirname, '../../../public/voice-panel-v2.html');
        const content = fs.readFileSync(panelPath, 'utf-8');
        
        this.assert(
            content.includes('CMD-074') && content.includes('CMD-075'),
            '投票结果语音播放逻辑存在',
            '应包含投票通过/否决的播放逻辑'
        );
        
        this.assert(
            content.includes('CMD-094') && content.includes('CMD-095'),
            '任务结果语音播放逻辑存在',
            '应包含任务成功/失败的播放逻辑'
        );
    }

    printSummary() {
        this.log('\n' + '='.repeat(60), 'info');
        this.log(`测试结果: ${this.passed} 通过, ${this.failed} 失败`, 'info');
        this.log('='.repeat(60), 'info');
        
        if (this.failed > 0) {
            this.log('\n需要修复的问题:', 'warning');
            this.results
                .filter(r => r.type === 'error')
                .forEach(r => this.log(`  - ${r.message}`, 'error'));
        }
    }
}

async function main() {
    const testCase = new Bug028TestCase();
    const success = await testCase.runAllTests();
    process.exit(success ? 0 : 1);
}

main().catch(console.error);
