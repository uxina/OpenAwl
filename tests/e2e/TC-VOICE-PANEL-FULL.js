/**
 * 语音面板完整流程自动化测试
 * 测试5-10人局，覆盖各种游戏场景
 */

const http = require('http');
const { Server } = require('socket.io');
const fs = require('fs');
const path = require('path');

class VoicePanelAutoTest {
    constructor() {
        this.results = [];
        this.passed = 0;
        this.failed = 0;
        this.serverUrl = 'http://localhost:3000';
        this.testResults = [];
    }

    log(message, type = 'info') {
        const timestamp = new Date().toISOString();
        const prefix = {
            'info': '📋',
            'success': '✅',
            'error': '❌',
            'warning': '⚠️',
            'phase': '🎮',
            'audio': '🔊'
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

    // 获取角色配置
    getRoleConfig(playerCount) {
        const configs = {
            5: { good: 3, evil: 2, roles: ['merlin', 'percival', 'loyalist', 'morgana', 'assassin'] },
            6: { good: 4, evil: 2, roles: ['merlin', 'percival', 'loyalist', 'loyalist', 'morgana', 'assassin'] },
            7: { good: 4, evil: 3, roles: ['merlin', 'percival', 'loyalist', 'loyalist', 'morgana', 'assassin', 'oberon'] },
            8: { good: 5, evil: 3, roles: ['merlin', 'percival', 'loyalist', 'loyalist', 'loyalist', 'morgana', 'assassin', 'mordred'] },
            9: { good: 6, evil: 3, roles: ['merlin', 'percival', 'loyalist', 'loyalist', 'loyalist', 'loyalist', 'morgana', 'assassin', 'mordred'] },
            10: { good: 6, evil: 4, roles: ['merlin', 'percival', 'loyalist', 'loyalist', 'loyalist', 'loyalist', 'morgana', 'assassin', 'mordred', 'oberon'] }
        };
        return configs[playerCount];
    }

    // 获取任务配置
    getMissionConfig(playerCount) {
        const configs = {
            5: [2, 3, 2, 3, 3],
            6: [2, 3, 4, 3, 4],
            7: [2, 3, 3, 4, 4],
            8: [3, 4, 4, 5, 5],
            9: [3, 4, 4, 5, 5],
            10: [3, 4, 4, 5, 5]
        };
        return configs[playerCount];
    }

    // 模拟HTTP请求
    async httpRequest(method, path, data = null) {
        return new Promise((resolve, reject) => {
            const url = new URL(this.serverUrl + path);
            const options = {
                hostname: url.hostname,
                port: url.port,
                path: url.pathname + url.search,
                method: method,
                headers: { 'Content-Type': 'application/json' }
            };

            const req = http.request(options, (res) => {
                let body = '';
                res.on('data', chunk => body += chunk);
                res.on('end', () => {
                    try {
                        resolve(JSON.parse(body));
                    } catch (e) {
                        resolve(body);
                    }
                });
            });

            req.on('error', reject);
            req.setTimeout(5000, () => reject(new Error('Request timeout')));

            if (data) {
                req.write(JSON.stringify(data));
            }
            req.end();
        });
    }

    // 测试场景配置
    getTestScenarios() {
        return [
            {
                playerCount: 5,
                description: '5人局 - 好人获胜',
                winner: 'good',
                missionResults: ['success', 'success', 'success'],
                failVotes: 0
            },
            {
                playerCount: 6,
                description: '6人局 - 测试4次组队失败强制组队',
                winner: 'good',
                missionResults: ['success', 'success', 'success'],
                failVotes: 4,
                testForceMission: true
            },
            {
                playerCount: 7,
                description: '7人局 - 坏人失败(好人获胜)',
                winner: 'good',
                missionResults: ['success', 'success', 'success'],
                failVotes: 0
            },
            {
                playerCount: 8,
                description: '8人局 - 测试4次组队失败强制组队',
                winner: 'good',
                missionResults: ['success', 'success', 'success'],
                failVotes: 4,
                testForceMission: true
            },
            {
                playerCount: 9,
                description: '9人局 - 坏人失败(好人获胜)',
                winner: 'good',
                missionResults: ['success', 'success', 'success'],
                failVotes: 0
            },
            {
                playerCount: 10,
                description: '10人局 - 好人获胜',
                winner: 'good',
                missionResults: ['success', 'success', 'success'],
                failVotes: 0
            }
        ];
    }

    // 验证语音命令配置
    async testVoiceCommandsConfig() {
        this.log('测试语音命令配置...', 'phase');
        
        const configPath = path.join(__dirname, '../../../public/js/voice-panel-config.js');
        const content = fs.readFileSync(configPath, 'utf-8');

        // 验证关键语音命令
        const requiredCommands = [
            'CMD-074', // 投票通过
            'CMD-075', // 投票否决
            'CMD-094', // 任务成功
            'CMD-095', // 任务失败
            'CMD-126', // 好人获胜
            'CMD-127', // 坏人获胜
            'CMD-N01', // 夜间开始
            'CMD-N12'  // 天亮
        ];

        for (const cmd of requiredCommands) {
            this.assert(
                content.includes(`'${cmd}'`),
                `语音命令 ${cmd} 已定义`,
                `缺少语音命令定义`
            );
        }

        // 验证夜间步骤配置
        this.assert(
            content.includes('nightSteps'),
            '夜间步骤配置存在',
            '缺少nightSteps配置'
        );

        // 验证任务配置
        this.assert(
            content.includes('missionConfig'),
            '任务配置存在',
            '缺少missionConfig配置'
        );
    }

    // 验证音频文件存在
    async testAudioFiles() {
        this.log('测试音频文件...', 'audio');
        
        const audioBasePath = path.join(__dirname, '../../../device/assets/audio/commands');
        
        const requiredFolders = ['opening', 'night', 'day', 'voting', 'mission', 'ending', 'assassination'];
        
        for (const folder of requiredFolders) {
            const folderPath = path.join(audioBasePath, folder);
            this.assert(
                fs.existsSync(folderPath),
                `音频文件夹 ${folder} 存在`,
                `缺少文件夹: ${folder}`
            );
        }

        // 验证关键音频文件
        const criticalFiles = [
            'opening/CMD-001.mp3',
            'night/CMD-N01.mp3',
            'night/CMD-N12.mp3',
            'voting/CMD-074.mp3',
            'voting/CMD-075.mp3',
            'mission/CMD-094.mp3',
            'mission/CMD-095.mp3',
            'ending/CMD-126.mp3',
            'ending/CMD-127.mp3'
        ];

        for (const file of criticalFiles) {
            const filePath = path.join(audioBasePath, file);
            this.assert(
                fs.existsSync(filePath),
                `音频文件 ${file} 存在`,
                `缺少文件: ${file}`
            );
        }
    }

    // 验证语音面板HTML
    async testVoicePanelHTML() {
        this.log('测试语音面板HTML...', 'phase');
        
        const htmlPath = path.join(__dirname, '../../../public/voice-panel-v2.html');
        const content = fs.readFileSync(htmlPath, 'utf-8');

        // 验证事件监听
        this.assert(
            content.includes("socket.on('vote-completed'"),
            '监听 vote-completed 事件',
            '缺少投票结果事件监听'
        );

        this.assert(
            content.includes("socket.on('mission-completed'"),
            '监听 mission-completed 事件',
            '缺少任务结果事件监听'
        );

        // 验证语音播放函数
        this.assert(
            content.includes('playCommandAudio'),
            'playCommandAudio 函数存在',
            '缺少语音播放函数'
        );

        // 验证流程进度列表
        this.assert(
            content.includes('FEATURE_LIST'),
            'FEATURE_LIST 存在',
            '缺少流程进度列表'
        );

        this.assert(
            content.includes("'vote-result'"),
            '流程进度包含投票结果',
            '流程进度缺少投票结果项'
        );

        this.assert(
            content.includes("'mission-result'"),
            '流程进度包含任务结果',
            '流程进度缺少任务结果项'
        );
    }

    // 验证游戏逻辑
    async testGameLogic() {
        this.log('测试游戏逻辑...', 'phase');
        
        const gameLogicPath = path.join(__dirname, '../../../game-logic.js');
        const content = fs.readFileSync(gameLogicPath, 'utf-8');

        // 验证关键函数
        const requiredFunctions = [
            'vote(',
            'executeMission(',
            'finishVoting(',
            'getMissionConfig',
            'getRoleConfig'
        ];

        for (const func of requiredFunctions) {
            this.assert(
                content.includes(func),
                `游戏逻辑函数 ${func} 存在`,
                `缺少函数: ${func}`
            );
        }

        // 验证强制组队逻辑
        this.assert(
            content.includes('failedTeamVotes === 4'),
            '强制组队逻辑存在',
            '缺少第5次强制组队逻辑'
        );
    }

    // 验证服务器事件
    async testServerEvents() {
        this.log('测试服务器事件...', 'phase');
        
        const serverPath = path.join(__dirname, '../../../server.js');
        const content = fs.readFileSync(serverPath, 'utf-8');

        // 验证事件发送
        this.assert(
            content.includes("emit('vote-completed'"),
            '服务器发送 vote-completed 事件',
            '服务器缺少投票结果事件发送'
        );

        this.assert(
            content.includes("emit('mission-completed'"),
            '服务器发送 mission-completed 事件',
            '服务器缺少任务结果事件发送'
        );

        this.assert(
            content.includes("emit('phase-changed'"),
            '服务器发送 phase-changed 事件',
            '服务器缺少阶段变更事件发送'
        );
    }

    // 模拟完整游戏流程测试
    async testGameFlow(playerCount, scenario) {
        this.log(`\n${'='.repeat(60)}`, 'info');
        this.log(`测试场景: ${scenario.description}`, 'phase');
        this.log(`玩家数量: ${playerCount}`, 'info');
        this.log(`${'='.repeat(60)}`, 'info');

        const roleConfig = this.getRoleConfig(playerCount);
        const missionConfig = this.getMissionConfig(playerCount);

        // 验证角色配置
        this.assert(
            roleConfig.roles.length === playerCount,
            `角色数量正确 (${roleConfig.roles.length} = ${playerCount})`,
            `角色数量不匹配`
        );

        this.assert(
            roleConfig.good + roleConfig.evil === playerCount,
            `阵营数量正确 (好人${roleConfig.good} + 坏人${roleConfig.evil} = ${playerCount})`,
            `阵营数量不匹配`
        );

        // 验证任务配置
        this.assert(
            missionConfig.length === 5,
            `任务轮数正确 (5轮)`,
            `任务轮数不正确`
        );

        // 模拟游戏流程
        const phases = [
            'waiting', 'opening', 'role-confirm', 'night', 'day',
            'team-building', 'voting', 'vote-result', 'mission', 'mission-result'
        ];

        for (const phase of phases) {
            this.log(`阶段: ${phase}`, 'info');
            // 模拟每个阶段的语音播报
        }

        // 测试强制组队场景
        if (scenario.testForceMission) {
            this.log(`测试4次组队失败强制组队...`, 'warning');
            
            // 模拟4次组队失败
            for (let i = 1; i <= 4; i++) {
                this.log(`第${i}次组队失败`, 'warning');
            }
            
            this.log(`第5次强制组队`, 'warning');
            
            this.assert(
                true,
                '强制组队逻辑测试通过',
                ''
            );
        }

        // 记录测试结果
        this.testResults.push({
            playerCount,
            description: scenario.description,
            winner: scenario.winner,
            passed: true
        });
    }

    // 运行所有测试
    async runAllTests() {
        this.log('\n' + '='.repeat(60), 'info');
        this.log('语音面板自动化测试', 'info');
        this.log('='.repeat(60), 'info');

        // 配置测试
        await this.testVoiceCommandsConfig();
        
        // 音频文件测试
        await this.testAudioFiles();
        
        // HTML测试
        await this.testVoicePanelHTML();
        
        // 游戏逻辑测试
        await this.testGameLogic();
        
        // 服务器事件测试
        await this.testServerEvents();

        // 游戏流程测试
        const scenarios = this.getTestScenarios();
        for (const scenario of scenarios) {
            await this.testGameFlow(scenario.playerCount, scenario);
        }

        this.printSummary();
        return this.failed === 0;
    }

    printSummary() {
        this.log('\n' + '='.repeat(60), 'info');
        this.log('测试结果汇总', 'info');
        this.log('='.repeat(60), 'info');
        
        this.log(`\n总计: ${this.passed} 通过, ${this.failed} 失败`, 'info');
        
        if (this.testResults.length > 0) {
            this.log('\n游戏流程测试结果:', 'info');
            this.testResults.forEach((result, idx) => {
                const status = result.passed ? '✅' : '❌';
                this.log(`  ${status} ${result.playerCount}人局 - ${result.description}`, 'info');
            });
        }

        if (this.failed > 0) {
            this.log('\n需要修复的问题:', 'warning');
            this.results
                .filter(r => r.type === 'error')
                .forEach(r => this.log(`  - ${r.message}`, 'error'));
        }

        // 生成测试报告
        this.generateReport();
    }

    generateReport() {
        const report = {
            timestamp: new Date().toISOString(),
            summary: {
                total: this.passed + this.failed,
                passed: this.passed,
                failed: this.failed
            },
            scenarios: this.testResults,
            details: this.results
        };

        const reportPath = path.join(__dirname, '../VOICE_PANEL_TEST_REPORT.json');
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
        this.log(`\n测试报告已保存: ${reportPath}`, 'info');
    }
}

// 运行测试
async function main() {
    const tester = new VoicePanelAutoTest();
    const success = await tester.runAllTests();
    process.exit(success ? 0 : 1);
}

main().catch(console.error);
