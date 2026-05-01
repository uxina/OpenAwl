/**
 * 第二轮队长掉线重连测试
 * 精确模拟用户描述的场景
 */

const { test, expect, chromium } = require('@playwright/test');

const BASE_URL = 'http://localhost:3000';
const VOICE_PANEL_URL = `${BASE_URL}/voice-panel-v2.html`;
const PLAYER_URL = `${BASE_URL}/player-modular.html`;

test.describe('第二轮队长掉线重连测试', () => {
    let browser;

    test.beforeAll(async () => {
        browser = await chromium.launch({ 
            headless: true,
            slowMo: 300
        });
    });

    test.afterAll(async () => {
        if (browser) {
            await browser.close();
        }
    });

    test('第二轮队长掉线重连后应能正常组建队伍', async () => {
        console.log('=== 测试第二轮队长掉线重连 ===');
        
        const voicePanel = await browser.newPage();
        await voicePanel.goto(VOICE_PANEL_URL);
        await voicePanel.waitForLoadState('networkidle');
        await voicePanel.waitForTimeout(1000);
        
        // 1. 创建房间
        console.log('1. 创建房间...');
        await voicePanel.click('button:has-text("创建房间")');
        await voicePanel.waitForTimeout(2000);
        
        const roomIdElement = voicePanel.locator('#room-id');
        await roomIdElement.waitFor({ state: 'visible', timeout: 5000 });
        const roomId = await roomIdElement.textContent();
        console.log(`房间号: ${roomId}`);
        
        // 2. 加入玩家
        const players = [];
        for (let i = 1; i <= 5; i++) {
            const playerPage = await browser.newPage();
            await playerPage.goto(PLAYER_URL);
            await playerPage.waitForLoadState('networkidle');
            await playerPage.fill('#roomIdInput', roomId);
            await playerPage.click(`#playerIdSelector button:has-text("${i}号")`);
            await playerPage.click('#joinRoomBtn');
            await playerPage.waitForTimeout(500);
            players.push(playerPage);
        }
        
        await voicePanel.waitForTimeout(1000);
        
        // 3. 开始游戏并完成第一轮
        console.log('2. 开始游戏并完成第一轮...');
        await voicePanel.click('#btn-smart-next'); // 开始游戏
        await voicePanel.waitForTimeout(500);
        await voicePanel.click('#btn-smart-next'); // 夜间
        await voicePanel.waitForTimeout(300);
        for (let i = 0; i < 12; i++) {
            await voicePanel.click('#btn-smart-next');
            await voicePanel.waitForTimeout(100);
        }
        await voicePanel.click('#btn-smart-next'); // 白天 -> 组队
        await voicePanel.waitForTimeout(1000);
        
        // 第一轮队长选择队伍
        console.log('第一轮队长选择队伍...');
        let round1LeaderIndex = -1;
        for (let i = 0; i < players.length; i++) {
            const isLeaderInfo = players[i].locator('#isLeaderInfo');
            const isLeaderVisible = await isLeaderInfo.isVisible({ timeout: 2000 }).catch(() => false);
            if (isLeaderVisible) {
                round1LeaderIndex = i;
                console.log(`第一轮队长是玩家${i + 1}`);
                
                const playerItems = players[i].locator('#teamBuildingPlayerList .player-item');
                const count = await playerItems.count();
                for (let j = 0; j < 2; j++) {
                    const selectBtn = playerItems.nth(j).locator('.player-select');
                    if (await selectBtn.isVisible().catch(() => false)) {
                        await selectBtn.click();
                        await players[i].waitForTimeout(200);
                    }
                }
                
                const submitBtn = players[i].locator('#submitTeamBtn');
                await submitBtn.click();
                console.log('第一轮队伍已提交');
                break;
            }
        }
        
        await voicePanel.waitForTimeout(2000);
        
        // 玩家投票
        console.log('第一轮玩家投票...');
        for (const player of players) {
            const approveBtn = player.locator('button:has-text("赞成")');
            if (await approveBtn.isVisible().catch(() => false)) {
                await approveBtn.click();
                await player.waitForTimeout(100);
            }
        }
        await voicePanel.waitForTimeout(3000);
        
        // 推进到任务
        await voicePanel.click('#btn-smart-next');
        await voicePanel.waitForTimeout(500);
        
        // 手动点击任务成功
        await voicePanel.click('button:has-text("任务成功")');
        await voicePanel.waitForTimeout(2000);
        
        // 推进到第二轮
        console.log('3. 推进到第二轮...');
        await voicePanel.click('#btn-smart-next');
        await voicePanel.waitForTimeout(2000);
        
        // 4. 找到第二轮队长
        console.log('4. 找到第二轮队长...');
        let round2LeaderIndex = -1;
        for (let i = 0; i < players.length; i++) {
            const isLeaderInfo = players[i].locator('#isLeaderInfo');
            const isLeaderVisible = await isLeaderInfo.isVisible({ timeout: 2000 }).catch(() => false);
            if (isLeaderVisible) {
                round2LeaderIndex = i;
                console.log(`第二轮队长是玩家${i + 1}`);
                break;
            }
        }
        
        expect(round2LeaderIndex).toBeGreaterThanOrEqual(0);
        
        // 5. 队长掉线
        console.log(`5. 队长（玩家${round2LeaderIndex + 1}）掉线...`);
        const leaderPlayerId = await players[round2LeaderIndex].evaluate(() => {
            return sessionStorage.getItem('avalon_playerId');
        });
        console.log(`队长 playerId: ${leaderPlayerId}`);
        
        await players[round2LeaderIndex].close();
        players[round2LeaderIndex] = null;
        await voicePanel.waitForTimeout(2000);
        
        // 6. 队长重连
        console.log(`6. 队长（玩家${round2LeaderIndex + 1}）重连...`);
        const newLeaderPage = await browser.newPage();
        await newLeaderPage.goto(PLAYER_URL);
        await newLeaderPage.waitForLoadState('networkidle');
        await newLeaderPage.fill('#roomIdInput', roomId);
        await newLeaderPage.click(`#playerIdSelector button:has-text("${round2LeaderIndex + 1}号")`);
        await newLeaderPage.click('#joinRoomBtn');
        await newLeaderPage.waitForTimeout(3000);
        
        // 7. 检查队长状态
        console.log('7. 检查队长重连后的状态...');
        
        // 检查队长名称显示
        const currentLeaderText = await newLeaderPage.locator('#currentLeader').textContent().catch(() => '');
        const waitingLeaderText = await newLeaderPage.locator('#waitingLeader').textContent().catch(() => '');
        console.log(`当前队长显示: ${currentLeaderText}`);
        console.log(`等待队长显示: ${waitingLeaderText}`);
        
        // 检查是否显示"系统选择中"
        const isSystemSelecting = currentLeaderText.includes('系统选择中') || waitingLeaderText.includes('系统选择中');
        console.log(`是否显示"系统选择中": ${isSystemSelecting}`);
        
        // 检查队长信息面板
        const isLeaderInfo = newLeaderPage.locator('#isLeaderInfo');
        const isLeaderVisible = await isLeaderInfo.isVisible({ timeout: 2000 }).catch(() => false);
        console.log(`队长信息面板是否显示: ${isLeaderVisible}`);
        
        // 检查提交按钮
        const submitBtn = newLeaderPage.locator('#submitTeamBtn');
        const isSubmitVisible = await submitBtn.isVisible({ timeout: 2000 }).catch(() => false);
        console.log(`提交按钮是否可见: ${isSubmitVisible}`);
        
        // 8. 尝试选择队员并提交
        if (isLeaderVisible) {
            console.log('8. 尝试选择队员...');
            const playerItems = newLeaderPage.locator('#teamBuildingPlayerList .player-item');
            const count = await playerItems.count();
            console.log(`玩家列表数量: ${count}`);
            
            // 选择3个队员（第二轮需要3人）
            for (let j = 0; j < Math.min(3, count); j++) {
                const selectBtn = playerItems.nth(j).locator('.player-select');
                if (await selectBtn.isVisible().catch(() => false)) {
                    await selectBtn.click();
                    await newLeaderPage.waitForTimeout(300);
                }
            }
            
            const isDisabled = await submitBtn.isDisabled();
            console.log(`提交按钮状态: ${isDisabled ? '禁用' : '可用'}`);
            
            if (!isDisabled) {
                await submitBtn.click();
                console.log('队伍已提交！');
            }
        }
        
        // 验证
        expect(isSystemSelecting).toBe(false);
        expect(isLeaderVisible).toBe(true);
        
        // 清理
        for (let i = 0; i < players.length; i++) {
            if (players[i]) {
                await players[i].close();
            }
        }
        await newLeaderPage.close();
        await voicePanel.close();
    });
});
