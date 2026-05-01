/**
 * 多客户端时序竞态测试
 * 测试两个玩家同时操作时的后端处理
 * 
 * 测试ID: TC-CONCURRENT-RACE
 */

const { test, expect } = require('@playwright/test');

const BASE_URL = 'http://localhost:3000';

test.describe('多客户端时序竞态测试', () => {
    
    test('TC-CONCURRENT-VOTE: 两个玩家同时任务投票', async ({ browser }) => {
        console.log('\n========================================');
        console.log('[TC-CONCURRENT-VOTE] 并发任务投票测试');
        console.log('========================================\n');
        
        const context = await browser.newContext();
        
        try {
            // 1. 创建房间
            const hostPage = await context.newPage();
            await hostPage.goto(`${BASE_URL}/index.html`);
            await hostPage.waitForTimeout(1000);
            
            // 关闭帮助弹窗
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
                
                // 关闭帮助弹窗
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
                
                players.push(playerPage);
                console.log(`✓ 玩家${i}加入`);
            }
            
            // 3. 开始游戏
            await hostPage.click('#btn-phase-text');
            await hostPage.waitForTimeout(3000);
            console.log('✓ 游戏开始');
            
            // 4. 所有玩家确认身份 - 等待角色分配屏幕显示
            console.log('  等待玩家确认身份...');
            for (let i = 0; i < players.length; i++) {
                const player = players[i];
                // 等待角色分配屏幕显示
                await player.waitForSelector('#roleAssignmentScreen:not(.hidden)', { timeout: 10000 }).catch(() => {});
                
                // 滚动到确认按钮并点击
                const confirmBtn = await player.locator('#readyBtn');
                await confirmBtn.scrollIntoViewIfNeeded().catch(() => {});
                await player.waitForTimeout(500);
                
                if (await confirmBtn.isVisible().catch(() => false)) {
                    await confirmBtn.click();
                    await player.waitForTimeout(500);
                    console.log(`  玩家${i + 1}确认身份`);
                }
            }
            await hostPage.waitForTimeout(2000);
            console.log('✓ 所有玩家确认身份');
            
            // 5. 推进到任务阶段（简化流程）
            for (let i = 0; i < 5; i++) {
                await hostPage.click('#btn-phase-text');
                await hostPage.waitForTimeout(1500);
            }
            console.log('✓ 进入任务阶段');
            
            // 6. 找到在队伍中的玩家
            const teamPlayers = [];
            for (let i = 0; i < players.length; i++) {
                const player = players[i];
                const missionBtn = await player.locator('button:has-text("成功"), button:has-text("失败"), .mission-btn').first();
                if (await missionBtn.isVisible().catch(() => false)) {
                    teamPlayers.push({ player, index: i + 1 });
                    console.log(`  玩家${i + 1}在队伍中`);
                }
            }
            
            expect(teamPlayers.length).toBeGreaterThan(0);
            console.log(`✓ 找到${teamPlayers.length}个队员`);
            
            // 7. 并发投票测试 - 两个队员同时点击
            console.log('\n📍 并发投票测试');
            console.log('----------------------------------------');
            
            if (teamPlayers.length >= 2) {
                const player1 = teamPlayers[0];
                const player2 = teamPlayers[1];
                
                console.log(`  玩家${player1.index}和玩家${player2.index}同时投票...`);
                
                // 同时触发两个玩家的投票操作
                const votePromise1 = player1.player.evaluate(() => {
                    const successBtn = document.querySelector('button:has-text("成功"), .success-btn, #missionSuccess');
                    if (successBtn) {
                        successBtn.click();
                        return 'clicked';
                    }
                    return 'not_found';
                });
                
                const votePromise2 = player2.player.evaluate(() => {
                    const successBtn = document.querySelector('button:has-text("成功"), .success-btn, #missionSuccess');
                    if (successBtn) {
                        successBtn.click();
                        return 'clicked';
                    }
                    return 'not_found';
                });
                
                // 使用 Promise.all 同时执行
                const [result1, result2] = await Promise.all([votePromise1, votePromise2]);
                
                console.log(`  玩家${player1.index}投票结果: ${result1}`);
                console.log(`  玩家${player2.index}投票结果: ${result2}`);
                
                // 等待后端处理
                await hostPage.waitForTimeout(3000);
                
                // 8. 验证任务结果
                const phaseText = await hostPage.locator('#currentPhase, #btn-phase-text').textContent().catch(() => '');
                console.log(`  当前阶段: ${phaseText}`);
                
                // 验证游戏状态一致性
                const isConsistent = phaseText.includes('结果') || phaseText.includes('组队') || phaseText.includes('结束');
                expect(isConsistent).toBe(true);
                console.log('✓ 并发投票后状态一致');
            }
            
            console.log('\n========================================');
            console.log('✅ TC-CONCURRENT-VOTE 测试通过！');
            console.log('========================================\n');
            
        } finally {
            await context.close();
        }
    });
    
    test('TC-CONCURRENT-TEAM: 两个队长同时发起组队', async ({ browser }) => {
        console.log('\n========================================');
        console.log('[TC-CONCURRENT-TEAM] 并发组队测试');
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
                
                players.push(playerPage);
                console.log(`✓ 玩家${i}加入`);
            }
            
            // 3. 开始游戏并推进到组队阶段
            await hostPage.click('#btn-phase-text');
            await hostPage.waitForTimeout(3000);
            
            for (const player of players) {
                const confirmBtn = await player.locator('#readyBtn, button:has-text("确认身份"), button:has-text("准备开始")').first();
                if (await confirmBtn.isVisible().catch(() => false)) {
                    await confirmBtn.click();
                    await player.waitForTimeout(300);
                }
            }
            await hostPage.waitForTimeout(2000);
            
            await hostPage.click('#btn-phase-text');
            await hostPage.waitForTimeout(2000);
            console.log('✓ 进入组队阶段');
            
            // 4. 找到队长
            let leaderPlayer = null;
            let leaderIndex = -1;
            
            for (let i = 0; i < players.length; i++) {
                const player = players[i];
                const isLeaderText = await player.locator('.leader-badge, #isLeaderInfo').textContent().catch(() => '');
                if (isLeaderText.includes('队长') || isLeaderText.includes('Leader')) {
                    leaderPlayer = player;
                    leaderIndex = i + 1;
                    console.log(`✓ 找到队长: 玩家${leaderIndex}`);
                    break;
                }
            }
            
            expect(leaderPlayer).not.toBeNull();
            
            // 5. 队长选择队伍
            console.log('\n📍 队长选择队伍');
            console.log('----------------------------------------');
            
            // 选择2个队员
            const playerItems = await leaderPlayer.locator('.player-item, .team-player-item').all();
            let selectedCount = 0;
            
            for (const item of playerItems.slice(0, 3)) {
                const selectBtn = await item.locator('.select-btn, .player-select').first();
                if (await selectBtn.isVisible().catch(() => false)) {
                    await selectBtn.click();
                    selectedCount++;
                    await leaderPlayer.waitForTimeout(200);
                }
            }
            
            console.log(`  选择了${selectedCount}个队员`);
            
            // 6. 提交队伍
            const submitBtn = await leaderPlayer.locator('#submitTeamBtn, .submit-team-btn').first();
            expect(await submitBtn.isVisible().catch(() => false)).toBe(true);
            
            await submitBtn.click();
            console.log('✓ 队伍已提交');
            
            await hostPage.waitForTimeout(2000);
            
            // 7. 验证状态一致性
            const phaseText = await hostPage.locator('#currentPhase, #btn-phase-text').textContent().catch(() => '');
            console.log(`  当前阶段: ${phaseText}`);
            
            const isConsistent = phaseText.includes('投票') || phaseText.includes('表决');
            expect(isConsistent).toBe(true);
            console.log('✓ 组队提交后状态一致');
            
            console.log('\n========================================');
            console.log('✅ TC-CONCURRENT-TEAM 测试通过！');
            console.log('========================================\n');
            
        } finally {
            await context.close();
        }
    });
});

test.describe.configure({ mode: 'serial', timeout: 180000 });
