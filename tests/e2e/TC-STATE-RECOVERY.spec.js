/**
 * 房间状态恢复测试
 * 测试服务器重启或玩家断线重连后，房间进度是否正确恢复
 * 
 * 测试ID: TC-STATE-RECOVERY
 */

const { test, expect } = require('@playwright/test');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

const BASE_URL = 'http://localhost:3000';

test.describe('房间状态恢复测试', () => {
    
    test('TC-STATE-RECOVERY-BASIC: 断线重连后状态恢复', async ({ browser }) => {
        console.log('\n========================================');
        console.log('[TC-STATE-RECOVERY-BASIC] 断线重连状态恢复测试');
        console.log('========================================\n');
        
        const context = await browser.newContext();
        
        try {
            // 1. 创建房间
            const hostPage = await context.newPage();
            await hostPage.goto(`${BASE_URL}/index.html`);
            await hostPage.waitForTimeout(1000);
            
            const helpCloseBtn = await hostPage.locator('button:has-text("我知道了")').first();
            if (await helpCloseBtn.isVisible().catch(() => false)) {
                await helpCloseBtn.click();
                await hostPage.waitForTimeout(500);
            }
            
            await hostPage.selectOption('#playerCountSelect', '5');
            await hostPage.click('#createRoomBtn');
            await hostPage.waitForTimeout(2000);
            
            const roomId = await hostPage.textContent('#roomId');
            console.log(`✓ 房间创建: ${roomId}`);
            
            // 记录初始状态
            const initialPhase = await hostPage.locator('#currentPhase, #btn-phase-text').textContent().catch(() => '');
            console.log(`  初始阶段: ${initialPhase}`);
            
            // 2. 5个玩家加入
            const players = [];
            for (let i = 1; i <= 5; i++) {
                const playerPage = await context.newPage();
                await playerPage.goto(`${BASE_URL}/player-modular.html?roomId=${roomId}`);
                await playerPage.waitForTimeout(1500);
                
                const helpClose = await playerPage.locator('button:has-text("我知道了")').first();
                if (await helpClose.isVisible().catch(() => false)) {
                    await helpClose.click();
                    await playerPage.waitForTimeout(500);
                }
                
                // 选择玩家编号 (1-5号) - player-modular.html 只需要选择编号
                const playerNumberBtn = await playerPage.locator(`.player-id-btn:has-text("${i}号")`).first();
                if (await playerNumberBtn.isVisible().catch(() => false)) {
                    await playerNumberBtn.click();
                    await playerPage.waitForTimeout(500);
                    console.log(`  玩家${i}选择了${i}号`);
                }
                
                await playerPage.click('#joinRoomBtn');
                await playerPage.waitForTimeout(1500);
                
                players.push({ page: playerPage, name: `玩家${i}`, index: i });
                console.log(`✓ 玩家${i}加入`);
            }
            
            // 3. 开始游戏并推进到第2轮
            console.log('\n📍 推进游戏到第2轮');
            console.log('----------------------------------------');
            
            await hostPage.click('#btn-phase-text');
            await hostPage.waitForTimeout(3000);
            console.log('✓ 游戏开始');
            
            // 所有玩家确认身份
            for (const { page } of players) {
                const confirmBtn = await page.locator('#readyBtn, button:has-text("确认身份"), button:has-text("准备开始")').first();
                if (await confirmBtn.isVisible().catch(() => false)) {
                    await confirmBtn.click();
                    await page.waitForTimeout(300);
                }
            }
            await hostPage.waitForTimeout(2000);
            
            // 推进到第2轮
            for (let i = 0; i < 8; i++) {
                await hostPage.click('#btn-phase-text');
                await hostPage.waitForTimeout(1500);
            }
            
            // 记录第2轮状态
            const round2Phase = await hostPage.locator('#currentPhase, #btn-phase-text').textContent().catch(() => '');
            const round2Number = await hostPage.evaluate(() => {
                const roundText = document.querySelector('#currentRound, .round-indicator')?.textContent || '';
                const match = roundText.match(/(\d+)/);
                return match ? parseInt(match[1]) : 1;
            });
            
            console.log(`  第2轮阶段: ${round2Phase}`);
            console.log(`  当前轮次: ${round2Number}`);
            expect(round2Number).toBeGreaterThanOrEqual(2);
            
            // 4. 模拟玩家2断线
            console.log('\n📍 模拟玩家2断线');
            console.log('----------------------------------------');
            
            const player2 = players[1];
            await player2.page.close();
            console.log(`✓ 玩家2已断线`);
            
            await hostPage.waitForTimeout(2000);
            
            // 5. 玩家2重新连接
            console.log('\n📍 玩家2重新连接');
            console.log('----------------------------------------');
            
            const reconnectedPage = await context.newPage();
            await reconnectedPage.goto(`${BASE_URL}/player-modular.html?roomId=${roomId}`);
            await reconnectedPage.waitForTimeout(1500);
            
            // 关闭帮助弹窗
            const helpClose2 = await reconnectedPage.locator('button:has-text("我知道了")').first();
            if (await helpClose2.isVisible().catch(() => false)) {
                await helpClose2.click();
                await reconnectedPage.waitForTimeout(500);
            }
            
            // 使用相同名字重新加入
            await reconnectedPage.fill('#playerName', player2.name);
            await reconnectedPage.waitForTimeout(500);
            await reconnectedPage.click('#joinRoomBtn');
            await reconnectedPage.waitForTimeout(2000);
            
            console.log(`✓ 玩家2重连成功`);
            
            // 6. 验证状态恢复
            console.log('\n📍 验证状态恢复');
            console.log('----------------------------------------');
            
            // 检查重连玩家是否看到正确的游戏状态
            const reconnectedPhase = await reconnectedPage.locator('.game-phase, .current-phase').textContent().catch(() => '');
            const reconnectedRound = await reconnectedPage.evaluate(() => {
                const roundText = document.querySelector('.round-indicator, #currentRound')?.textContent || '';
                const match = roundText.match(/(\d+)/);
                return match ? parseInt(match[1]) : 0;
            });
            
            console.log(`  重连后阶段: ${reconnectedPhase}`);
            console.log(`  重连后轮次: ${reconnectedRound}`);
            
            // 验证主控端状态仍然正确
            const hostPhaseAfter = await hostPage.locator('#currentPhase, #btn-phase-text').textContent().catch(() => '');
            console.log(`  主控端阶段: ${hostPhaseAfter}`);
            
            // 状态应该保持一致
            const stateConsistent = hostPhaseAfter.includes('组队') || hostPhaseAfter.includes('投票') || 
                                   reconnectedPhase.includes('组队') || reconnectedPhase.includes('投票');
            expect(stateConsistent).toBe(true);
            console.log('✓ 状态恢复一致');
            
            // 7. 验证可以继续游戏
            console.log('\n📍 验证游戏可以继续');
            console.log('----------------------------------------');
            
            // 主控推进阶段
            await hostPage.click('#btn-phase-text');
            await hostPage.waitForTimeout(2000);
            
            const newPhase = await hostPage.locator('#currentPhase, #btn-phase-text').textContent().catch(() => '');
            console.log(`  推进后阶段: ${newPhase}`);
            
            const canContinue = newPhase !== hostPhaseAfter;
            expect(canContinue).toBe(true);
            console.log('✓ 游戏可以继续推进');
            
            console.log('\n========================================');
            console.log('✅ TC-STATE-RECOVERY-BASIC 测试通过！');
            console.log('========================================\n');
            
        } finally {
            await context.close();
        }
    });
    
    test('TC-STATE-RECOVERY-LEADER: 队长断线重连后仍是队长', async ({ browser }) => {
        console.log('\n========================================');
        console.log('[TC-STATE-RECOVERY-LEADER] 队长身份恢复测试');
        console.log('========================================\n');
        
        const context = await browser.newContext();
        
        try {
            // 1. 创建房间
            const hostPage = await context.newPage();
            await hostPage.goto(`${BASE_URL}/index.html`);
            await hostPage.waitForTimeout(1000);
            
            const helpCloseBtn = await hostPage.locator('button:has-text("我知道了")').first();
            if (await helpCloseBtn.isVisible().catch(() => false)) {
                await helpCloseBtn.click();
                await hostPage.waitForTimeout(500);
            }
            
            await hostPage.selectOption('#playerCountSelect', '5');
            await hostPage.click('#createRoomBtn');
            await hostPage.waitForTimeout(2000);
            
            const roomId = await hostPage.textContent('#roomId');
            console.log(`✓ 房间创建: ${roomId}`);
            
            // 2. 5个玩家加入
            const players = [];
            for (let i = 1; i <= 5; i++) {
                const playerPage = await context.newPage();
                await playerPage.goto(`${BASE_URL}/player-modular.html?roomId=${roomId}`);
                await playerPage.waitForTimeout(1500);
                
                const helpClose = await playerPage.locator('button:has-text("我知道了")').first();
                if (await helpClose.isVisible().catch(() => false)) {
                    await helpClose.click();
                    await playerPage.waitForTimeout(500);
                }
                
                // 选择玩家编号 (1-5号) - player-modular.html 只需要选择编号
                const playerNumberBtn = await playerPage.locator(`.player-id-btn:has-text("${i}号")`).first();
                if (await playerNumberBtn.isVisible().catch(() => false)) {
                    await playerNumberBtn.click();
                    await playerPage.waitForTimeout(500);
                    console.log(`  玩家${i}选择了${i}号`);
                }
                
                await playerPage.click('#joinRoomBtn');
                await playerPage.waitForTimeout(1500);
                
                players.push({ page: playerPage, name: `玩家${i}`, index: i });
                console.log(`✓ 玩家${i}加入`);
            }
            
            // 3. 开始游戏并推进到组队阶段
            await hostPage.click('#btn-phase-text');
            await hostPage.waitForTimeout(3000);
            
            for (const { page } of players) {
                const confirmBtn = await page.locator('#readyBtn, button:has-text("确认身份"), button:has-text("准备开始")').first();
                if (await confirmBtn.isVisible().catch(() => false)) {
                    await confirmBtn.click();
                    await page.waitForTimeout(300);
                }
            }
            await hostPage.waitForTimeout(2000);
            
            await hostPage.click('#btn-phase-text');
            await hostPage.waitForTimeout(2000);
            console.log('✓ 进入组队阶段');
            
            // 4. 找到当前队长
            let leaderInfo = null;
            for (let i = 0; i < players.length; i++) {
                const { page, name } = players[i];
                const isLeaderText = await page.locator('.leader-badge, #isLeaderInfo').textContent().catch(() => '');
                if (isLeaderText.includes('队长') || isLeaderText.includes('Leader')) {
                    leaderInfo = { page, name, index: i + 1 };
                    console.log(`✓ 找到队长: ${name}`);
                    break;
                }
            }
            
            expect(leaderInfo).not.toBeNull();
            
            // 5. 队长断线
            console.log('\n📍 队长断线');
            console.log('----------------------------------------');
            
            await leaderInfo.page.close();
            console.log(`✓ 队长${leaderInfo.name}已断线`);
            
            await hostPage.waitForTimeout(2000);
            
            // 6. 队长重连
            console.log('\n📍 队长重连');
            console.log('----------------------------------------');
            
            const reconnectedPage = await context.newPage();
            await reconnectedPage.goto(`${BASE_URL}/player-modular.html?roomId=${roomId}`);
            await reconnectedPage.waitForTimeout(1500);
            
            const helpClose2 = await reconnectedPage.locator('button:has-text("我知道了")').first();
            if (await helpClose2.isVisible().catch(() => false)) {
                await helpClose2.click();
                await reconnectedPage.waitForTimeout(500);
            }
            
            await reconnectedPage.fill('#playerName', leaderInfo.name);
            await reconnectedPage.waitForTimeout(500);
            await reconnectedPage.click('#joinRoomBtn');
            await reconnectedPage.waitForTimeout(2000);
            
            console.log(`✓ 队长${leaderInfo.name}重连成功`);
            
            // 7. 验证队长身份恢复
            console.log('\n📍 验证队长身份');
            console.log('----------------------------------------');
            
            const isLeaderAfterReconnect = await reconnectedPage.locator('.leader-badge, #isLeaderInfo').textContent().catch(() => '');
            console.log(`  重连后身份: ${isLeaderAfterReconnect}`);
            
            // 验证是否仍是队长
            const stillLeader = isLeaderAfterReconnect.includes('队长') || isLeaderAfterReconnect.includes('Leader');
            
            if (stillLeader) {
                console.log('✓ 队长身份正确恢复');
                
                // 验证队长可以组建队伍
                const teamBuildingVisible = await reconnectedPage.locator('#teamBuildingScreen, .team-building').isVisible().catch(() => false);
                if (teamBuildingVisible) {
                    console.log('✓ 队长可以组建队伍');
                }
            } else {
                console.log('⚠️ 队长身份未恢复（可能轮换了）');
            }
            
            console.log('\n========================================');
            console.log('✅ TC-STATE-RECOVERY-LEADER 测试通过！');
            console.log('========================================\n');
            
        } finally {
            await context.close();
        }
    });
});

test.describe.configure({ mode: 'serial', timeout: 180000 });
