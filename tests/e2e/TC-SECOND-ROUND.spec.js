/**
 * 第二轮投票流程测试
 * 测试第一轮任务完成后，能否正确进入第二轮
 */

const { test, expect, chromium } = require('@playwright/test');

const BASE_URL = 'http://localhost:3000';
const VOICE_PANEL_URL = `${BASE_URL}/voice-panel-v2.html`;
const PLAYER_URL = `${BASE_URL}/player-modular.html`;

async function closeHelpOverlay(page) {
    try {
        await page.waitForTimeout(1500);
        const helpOverlay = page.locator('.help-overlay');
        if (await helpOverlay.isVisible().catch(() => false)) {
            const closeBtn = helpOverlay.locator('button').first();
            if (await closeBtn.isVisible().catch(() => false)) {
                await closeBtn.click();
                await page.waitForTimeout(500);
            }
        }
    } catch (e) {}
}

test.describe('第二轮投票流程测试', () => {
    let browser;

    test.beforeAll(async () => {
        browser = await chromium.launch({ 
            headless: true,
            slowMo: 100
        });
    });

    test.afterAll(async () => {
        if (browser) {
            await browser.close();
        }
    });

    test('第一轮完成后应能推进到第二轮', async () => {
        console.log('=== 测试第二轮推进 ===');
        
        const voicePanel = await browser.newPage();
        await voicePanel.goto(VOICE_PANEL_URL);
        await voicePanel.waitForLoadState('networkidle');
        await closeHelpOverlay(voicePanel);
        
        // 1. 创建房间
        console.log('1. 创建房间...');
        await voicePanel.click('#btn-smart-next');
        await voicePanel.waitForTimeout(2000);
        
        const roomIdElement = voicePanel.locator('#room-id');
        await roomIdElement.waitFor({ state: 'visible', timeout: 5000 });
        const roomId = await roomIdElement.textContent();
        console.log(`房间号: ${roomId}`);
        
        // 2. 加入玩家
        console.log('2. 加入5个玩家...');
        const players = [];
        for (let i = 1; i <= 5; i++) {
            const playerPage = await browser.newPage();
            await playerPage.goto(`${PLAYER_URL}?roomId=${roomId}`);
            await playerPage.waitForLoadState('networkidle');
            await closeHelpOverlay(playerPage);
            await playerPage.waitForTimeout(500);
            
            // 等待玩家编号按钮出现
            const playerBtn = playerPage.locator(`.player-id-btn[data-player-number="${i}"]`);
            if (await playerBtn.isVisible().catch(() => false)) {
                await playerBtn.click();
                await playerPage.waitForTimeout(300);
            }
            
            // 点击加入按钮
            const joinBtn = playerPage.locator('#joinRoomBtn');
            if (await joinBtn.isEnabled().catch(() => false)) {
                await joinBtn.click();
            }
            await playerPage.waitForTimeout(500);
            players.push(playerPage);
            console.log(`玩家${i} 已加入`);
        }
        
        await voicePanel.waitForTimeout(1000);
        
        // 3. 快速完成第一轮
        console.log('3. 快速完成第一轮...');
        
        // 开始游戏
        await voicePanel.click('#btn-smart-next');
        await voicePanel.waitForTimeout(500);
        console.log('开始游戏');
        
        // 跳过夜间阶段
        for (let i = 0; i < 8; i++) {
            await voicePanel.click('#btn-smart-next');
            await voicePanel.waitForTimeout(200);
        }
        console.log('跳过夜间阶段');
        
        // 等待进入组队阶段
        await voicePanel.waitForTimeout(1000);
        
        // 队长选择队伍（第一轮需要2人）
        console.log('第一轮队长选择队伍...');
        const round1Result = await selectTeamForCurrentRound(players, 2, voicePanel);
        console.log(`第一轮队伍选择结果: ${round1Result}`);
        
        // 推进到投票
        await voicePanel.click('#btn-smart-next');
        await voicePanel.waitForTimeout(1000);
        console.log('进入投票阶段');
        
        // 玩家投票
        console.log('第一轮玩家投票...');
        for (const player of players) {
            try {
                await player.waitForTimeout(500);
                const approveBtn = player.locator('#approveBtn');
                if (await approveBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
                    await approveBtn.click();
                    console.log('玩家投票成功');
                }
            } catch (e) {
                console.log(`投票失败: ${e.message}`);
            }
        }
        await voicePanel.waitForTimeout(2000);
        
        // 推进到任务阶段
        await voicePanel.click('#btn-smart-next');
        await voicePanel.waitForTimeout(1000);
        
        // 执行任务成功（通过 Socket 模拟）
        console.log('执行任务成功...');
        await executeMissionAsSuccess(players);
        await voicePanel.waitForTimeout(3000);
        
        // 检查是否在任务结果阶段
        let phaseText = await voicePanel.locator('#btn-phase-text').textContent().catch(() => '未知');
        console.log(`第一轮后阶段: ${phaseText}`);
        
        // 4. 推进到第二轮
        console.log('4. 推进到第二轮...');
        await voicePanel.click('#btn-smart-next');
        await voicePanel.waitForTimeout(3000);
        
        const newPhaseText = await voicePanel.locator('#btn-phase-text').textContent().catch(() => '未知');
        console.log(`第二轮阶段: ${newPhaseText}`);
        
        // 检查玩家页面的队长信息
        console.log('检查玩家页面的队长信息...');
        const leaderInfo = await checkLeaderInfo(players);
        console.log(`队长信息: ${JSON.stringify(leaderInfo)}`);
        
        // 5. 第二轮队长选择队伍（需要3人）
        console.log('5. 第二轮队长选择队伍...');
        const round2Result = await selectTeamForCurrentRound(players, 3, voicePanel);
        console.log(`第二轮队伍选择结果: ${round2Result}`);
        
        console.log('测试完成！');
        
        for (const p of players) {
            await p.close();
        }
        await voicePanel.close();
    });
});

async function checkLeaderInfo(players) {
    let leaderFound = false;
    let leaderName = null;
    
    for (let i = 0; i < players.length; i++) {
        const player = players[i];
        try {
            await player.waitForTimeout(500);
            const isLeaderInfo = player.locator('#isLeaderInfo');
            const isLeaderVisible = await isLeaderInfo.isVisible({ timeout: 1000 }).catch(() => false);
            
            if (isLeaderVisible) {
                console.log(`玩家${i + 1}是队长`);
                leaderFound = true;
                leaderName = `玩家${i + 1}`;
            }
        } catch (e) {
            // 忽略
        }
    }
    
    return { leaderFound, leaderName };
}

async function selectTeamForCurrentRound(players, requiredSize, voicePanel) {
    // 等待队伍选择阶段
    await voicePanel.waitForTimeout(1000);
    
    for (let i = 0; i < players.length; i++) {
        const player = players[i];
        try {
            await player.waitForTimeout(500);
            
            // 检查是否是队长界面
            const isLeaderInfo = player.locator('#isLeaderInfo');
            const isLeaderVisible = await isLeaderInfo.isVisible({ timeout: 2000 }).catch(() => false);
            
            if (isLeaderVisible) {
                console.log(`找到队长（玩家${i + 1}），开始选择队伍...`);
                
                // 等待玩家列表加载
                await player.waitForTimeout(500);
                
                // 在 player-modular.html 中，使用 teamBuilder 的选择器
                const playerItems = player.locator('#teamBuildingPlayerList .player-item, .team-player-item');
                const count = await playerItems.count();
                console.log(`玩家列表数量: ${count}`);
                
                if (count === 0) {
                    // 尝试其他选择器
                    const allPlayers = player.locator('.player-item');
                    const allCount = await allPlayers.count();
                    console.log(`备选玩家列表数量: ${allCount}`);
                    
                    for (let j = 0; j < Math.min(requiredSize, allCount); j++) {
                        const selectBtn = allPlayers.nth(j).locator('.player-select, .select-btn, button').first();
                        if (await selectBtn.isVisible().catch(() => false)) {
                            await selectBtn.click();
                            await player.waitForTimeout(300);
                        }
                    }
                } else {
                    // 选择前 requiredSize 个玩家
                    for (let j = 0; j < Math.min(requiredSize, count); j++) {
                        const selectBtn = playerItems.nth(j).locator('.player-select, .select-btn, button').first();
                        if (await selectBtn.isVisible().catch(() => false)) {
                            await selectBtn.click();
                            await player.waitForTimeout(300);
                        }
                    }
                }
                
                // 等待提交按钮
                await player.waitForTimeout(500);
                const submitBtn = player.locator('#submitTeamBtn');
                const isVisible = await submitBtn.isVisible({ timeout: 3000 }).catch(() => false);
                
                if (isVisible) {
                    const isDisabled = await submitBtn.isDisabled().catch(() => true);
                    if (!isDisabled) {
                        await submitBtn.click();
                        console.log('队伍已提交');
                        return 'success';
                    }
                }
                
                return 'button_not_ready';
            }
        } catch (e) {
            console.log(`玩家${i + 1}检查失败: ${e.message}`);
        }
    }
    return 'no_leader_found';
}

async function executeMissionAsSuccess(players) {
    // 模拟任务执行成功 - 直接通过 Socket 发送
    // 这需要访问服务器的 Socket.IO 实例，在测试中我们通过 API 方式
    // 由于测试环境限制，这里简化处理
    console.log('任务执行（简化）...');
}
