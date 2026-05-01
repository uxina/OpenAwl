const fs = require('fs');
const path = require('path');

class Bug029TestCase {
    constructor() {
        this.results = [];
        this.passed = 0;
        this.failed = 0;
    }

    log(message, type = 'info') {
        const timestamp = new Date().toISOString();
        const prefix = {
            'info': '📋',
            'success': '✅',
            'error': '❌',
            'warning': '⚠️'
        }[type] || '📋';
        console.log(`[${timestamp}] ${prefix} ${message}`);
        this.results.push({ timestamp, type, message });
    }

    assert(condition, testName, details = '') {
        if (condition) {
            this.passed++;
            this.log(`${testName}`, 'success');
        } else {
            this.failed++;
            this.log(`${testName} - ${details}`, 'error');
        }
        return condition;
    }

    async runAllTests() {
        this.log('='.repeat(60), 'info');
        this.log('测试用例: TC-029 (BUG-029)', 'info');
        this.log('标题: 组队成功后任务玩家号码播报、任务完成票型播报', 'info');
        this.log('='.repeat(60), 'info');

        await this.testVoiceCommandTeamMembers();
        await this.testVoiceCommandMissionResult();
        await this.testVoteCompletedHandler();
        await this.testMissionCompletedHandler();

        this.printSummary();
        return this.failed === 0;
    }

    async testVoiceCommandTeamMembers() {
        const configPath = path.join(__dirname, '../../../public/js/voice-panel-config.js');
        const content = fs.readFileSync(configPath, 'utf-8');
        
        this.assert(
            content.includes("'CMD-091'"),
            'CMD-091 任务开始命令已定义',
            'voiceCommands中应包含CMD-091'
        );
        
        this.assert(
            content.includes('teamMembers'),
            'CMD-091 包含 teamMembers 占位符',
            '任务开始命令应包含队伍成员占位符'
        );
    }

    async testVoiceCommandMissionResult() {
        const configPath = path.join(__dirname, '../../../public/js/voice-panel-config.js');
        const content = fs.readFileSync(configPath, 'utf-8');
        
        this.assert(
            content.includes("'CMD-094'"),
            'CMD-094 任务成功命令已定义',
            'voiceCommands中应包含CMD-094'
        );
        
        this.assert(
            content.includes("'CMD-095'"),
            'CMD-095 任务失败命令已定义',
            'voiceCommands中应包含CMD-095'
        );
        
        this.assert(
            content.includes('failCount'),
            'CMD-094/095 包含 failCount 占位符',
            '任务结果命令应包含失败票数占位符'
        );
    }

    async testVoteCompletedHandler() {
        const panelPath = path.join(__dirname, '../../../public/voice-panel-v2.html');
        const content = fs.readFileSync(panelPath, 'utf-8');
        
        this.assert(
            content.includes("socket.on('vote-completed'"),
            '监听 vote-completed 事件',
            '应监听vote-completed事件'
        );
        
        this.assert(
            content.includes('CMD-091') || content.includes('teamMembers'),
            'vote-completed 处理中包含任务玩家播报',
            '应播报任务玩家号码'
        );
        
        this.assert(
            content.includes('currentTeam'),
            'vote-completed 处理中引用 currentTeam',
            '应获取当前队伍成员信息'
        );
    }

    async testMissionCompletedHandler() {
        const panelPath = path.join(__dirname, '../../../public/voice-panel-v2.html');
        const content = fs.readFileSync(panelPath, 'utf-8');
        
        this.assert(
            content.includes("socket.on('mission-completed'"),
            '监听 mission-completed 事件',
            '应监听mission-completed事件'
        );
        
        this.assert(
            content.includes('failCount'),
            'mission-completed 处理中引用 failCount',
            '应获取失败票数'
        );
        
        this.assert(
            content.includes('CMD-094') && content.includes('CMD-095'),
            'mission-completed 处理中包含任务结果语音',
            '应播放任务成功/失败语音'
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
    const testCase = new Bug029TestCase();
    const success = await testCase.runAllTests();
    process.exit(success ? 0 : 1);
}

main().catch(console.error);
