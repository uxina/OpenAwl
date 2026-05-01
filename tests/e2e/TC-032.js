const fs = require('fs');
const path = require('path');

class Bug032TestCase {
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
        this.log('测试用例: TC-032 (BUG-032)', 'info');
        this.log('标题: 客户端掉线重连测试', 'info');
        this.log('='.repeat(60), 'info');

        await this.testOnlinePlayerCountExcludesOffline();
        await this.testOfflinePlayerReconnect();
        await this.testNumberNamePlayerReconnect();

        this.printSummary();
        return this.failed === 0;
    }

    async testOnlinePlayerCountExcludesOffline() {
        const serverPath = path.join(__dirname, '../../../server.js');
        const content = fs.readFileSync(serverPath, 'utf-8');
        
        this.assert(
            content.includes('const onlinePlayerCount = game.players.filter(p => !game.offlinePlayers[p.id]).length'),
            '房间满检查排除离线玩家',
            '应使用 onlinePlayerCount 而非 game.players.length'
        );
        
        this.assert(
            content.includes('if (onlinePlayerCount >= configuredCount)'),
            '使用 onlinePlayerCount 检查房间满',
            '应使用在线玩家数量检查房间是否已满'
        );
    }

    async testOfflinePlayerReconnect() {
        const serverPath = path.join(__dirname, '../../../server.js');
        const content = fs.readFileSync(serverPath, 'utf-8');
        
        this.assert(
            content.includes('const isOfflinePlayer = sameNamePlayer && game.offlinePlayers[sameNamePlayer.id]'),
            '检查离线玩家',
            '应检查是否有离线的同名玩家'
        );
        
        this.assert(
            content.includes('if (sameNamePlayer && isOfflinePlayer)'),
            '离线玩家继承逻辑',
            '离线玩家应能继承之前的游戏状态'
        );
        
        this.assert(
            content.includes('delete game.offlinePlayers[oldPlayerId]'),
            '重连后移除离线标记',
            '玩家重连后应从离线列表中移除'
        );
    }

    async testNumberNamePlayerReconnect() {
        const serverPath = path.join(__dirname, '../../../server.js');
        const content = fs.readFileSync(serverPath, 'utf-8');
        
        // 检查编号名字玩家的离线继承检查在非编号名字检查之前
        const offlineCheckIndex = content.indexOf('const isOfflinePlayer = sameNamePlayer && game.offlinePlayers[sameNamePlayer.id]');
        const numberNameCheckIndex = content.indexOf('if (!isNumberName)');
        
        this.assert(
            offlineCheckIndex > 0 && numberNameCheckIndex > 0 && offlineCheckIndex < numberNameCheckIndex,
            '编号名字玩家离线检查优先',
            '离线玩家检查应在编号名字检查之前'
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
    const testCase = new Bug032TestCase();
    const success = await testCase.runAllTests();
    process.exit(success ? 0 : 1);
}

main().catch(console.error);
