const fs = require('fs');
const path = require('path');

class Bug031TestCase {
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
        this.log('测试用例: TC-031 (BUG-031)', 'info');
        this.log('标题: 音频冲突测试', 'info');
        this.log('='.repeat(60), 'info');

        await this.testServerDoesNotSendPhaseChangedAfterMissionCompleted();
        await this.testMissionResultHandler();
        await this.testPhaseChangedSkipsMissionResult();

        this.printSummary();
        return this.failed === 0;
    }

    async testServerDoesNotSendPhaseChangedAfterMissionCompleted() {
        const serverPath = path.join(__dirname, '../../../server.js');
        const content = fs.readFileSync(serverPath, 'utf-8');
        
        // 检查 executeMission 中是否正确处理了 phase-changed
        const executeMissionSection = this.getSection(content, "socket.on('execute-mission'");
        
        this.assert(
            executeMissionSection.includes('mission-completed'),
            '服务器发送 mission-completed 事件',
            'executeMission应发送mission-completed'
        );
        
        // 直接检查 mission-completed 后的几行代码
        const missionCompletedBlock = this.getBlockAfter(content, "emit('mission-completed'");
        const nextLines = missionCompletedBlock.substring(0, 300);
        
        // 在 mission-completed 之后只应该有注释，不应该有 phase-changed
        const hasPhaseChanged = nextLines.includes("emit('phase-changed'") || nextLines.includes("emit('controller-phase-changed'");
        
        this.assert(
            !hasPhaseChanged,
            'mission-completed 后不发送 phase-changed',
            '避免音频冲突'
        );
    }

    async testMissionResultHandler() {
        const panelPath = path.join(__dirname, '../../../public/voice-panel-v2.html');
        const content = fs.readFileSync(panelPath, 'utf-8');
        
        this.assert(
            content.includes("socket.on('mission-completed'"),
            '监听 mission-completed 事件',
            '应监听mission-completed事件'
        );
        
        this.assert(
            content.includes('playCommandAudio(\'CMD-094\'') || content.includes('playCommandAudio("CMD-094"'),
            '播放任务成功语音',
            'mission-completed时应播放CMD-094'
        );
        
        this.assert(
            content.includes('playCommandAudio(\'CMD-095\'') || content.includes('playCommandAudio("CMD-095"'),
            '播放任务失败语音',
            'mission-completed时应播放CMD-095'
        );
    }

    async testPhaseChangedSkipsMissionResult() {
        const panelPath = path.join(__dirname, '../../../public/voice-panel-v2.html');
        const content = fs.readFileSync(panelPath, 'utf-8');
        
        const phaseChangedSection = this.getSection(content, "socket.on('controller-phase-changed'");
        
        this.assert(
            phaseChangedSection.includes('mission-result'),
            'phase-changed 处理中检查 mission-result',
            'mission-result阶段应跳过自动播放'
        );
    }

    getSection(content, startPattern) {
        const lines = content.split('\n');
        let inSection = false;
        let sectionLines = [];
        
        for (const line of lines) {
            if (line.includes(startPattern)) {
                inSection = true;
            }
            if (inSection) {
                sectionLines.push(line);
            }
        }
        
        return sectionLines.join('\n');
    }

    getBlockAfter(content, startPattern) {
        const idx = content.indexOf(startPattern);
        if (idx === -1) return null;
        return content.substring(idx, idx + 500);
    }

    getLinesAfter(content, pattern) {
        const lines = content.split('\n');
        let result = [];
        let found = false;
        
        for (const line of lines) {
            if (line.includes(pattern)) {
                found = true;
            }
            if (found) {
                result.push(line);
            }
        }
        
        return result.join('\n');
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
    const testCase = new Bug031TestCase();
    const success = await testCase.runAllTests();
    process.exit(success ? 0 : 1);
}

main().catch(console.error);
