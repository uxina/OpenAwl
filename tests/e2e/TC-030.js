const fs = require('fs');
const path = require('path');

class Bug030TestCase {
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
        this.log('测试用例: TC-030 (BUG-030)', 'info');
        this.log('标题: 任务票型计算测试', 'info');
        this.log('='.repeat(60), 'info');

        await this.testTeamSizeInServerResponse();
        await this.testSuccessCountCalculation();
        await this.testMissionResultHandler();

        this.printSummary();
        return this.failed === 0;
    }

    async testTeamSizeInServerResponse() {
        const gameLogicPath = path.join(__dirname, '../../../game-logic.js');
        const content = fs.readFileSync(gameLogicPath, 'utf-8');
        
        this.assert(
            content.includes('teamSize: this.currentTeam.length'),
            'finishMission 返回 teamSize',
            '服务器应返回 teamSize 字段'
        );
    }

    async testSuccessCountCalculation() {
        const panelPath = path.join(__dirname, '../../../public/voice-panel-v2.html');
        const content = fs.readFileSync(panelPath, 'utf-8');
        
        this.assert(
            content.includes('const teamSize = data.teamSize'),
            '使用 teamSize 计算 successCount',
            '票型计算应使用 teamSize'
        );
        
        this.assert(
            content.includes('const successCount = teamSize - failCount'),
            'successCount = teamSize - failCount',
            '成功票数 = 队伍人数 - 失败票数'
        );
    }

    async testMissionResultHandler() {
        const panelPath = path.join(__dirname, '../../../public/voice-panel-v2.html');
        const content = fs.readFileSync(panelPath, 'utf-8');
        
        this.assert(
            content.includes("socket.on('mission-completed'"),
            '监听 mission-completed 事件',
            '应监听任务完成事件'
        );
        
        this.assert(
            content.includes('playCommandAudio(\'CMD-094\'') || content.includes('playCommandAudio("CMD-094"'),
            '播放 CMD-094 任务成功语音',
            '任务成功时应播放语音'
        );
        
        this.assert(
            content.includes('playCommandAudio(\'CMD-095\'') || content.includes('playCommandAudio("CMD-095"'),
            '播放 CMD-095 任务失败语音',
            '任务失败时应播放语音'
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
    const testCase = new Bug030TestCase();
    const success = await testCase.runAllTests();
    process.exit(success ? 0 : 1);
}

main().catch(console.error);
