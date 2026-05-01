/**
 * 队长重连测试
 * 测试队长在组队阶段重连后能否正常提交队伍
 */

const { test, expect, chromium } = require('@playwright/test');

const BASE_URL = 'http://localhost:3000';
const VOICE_PANEL_URL = `${BASE_URL}/voice-panel-v2.html`;
const PLAYER_URL = `${BASE_URL}/player-modular.html`;

test.describe('队长重连测试', () => {
    let browser;

    test.beforeAll(async () => {
        browser = await chromium.launch({ 
            headless: true,
            slowMo: 200
        });
    });

    test.afterAll(async () => {
        if (browser) {
            await browser.close();
        }
    });

    test('队长重连后应能提交队伍', async () => {
        console.log('=== 测试队长重连 ===');
        
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
            await playerPage.waitForTimeout(300);
            players.push(playerPage);
        }
        
        await voicePanel.waitForTimeout(1000);
        
        // 3. 开始游戏并进入组队阶段
        console.log('2. 开始游戏并进入组队阶段...');
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
        
        // 4. 找到队长
        console.log('3. 找到队长...');
        let leaderIndex = -1;
        let leaderPlayer = null;
        for (let i = 0; i < players.length; i++) {
            const isLeaderInfo = players[i].locator('#isLeaderInfo');
            const isLeaderVisible = await isLeaderInfo.isVisible({ timeout: 2000 }).catch(() => false);
            if (isLeaderVisible) {
                leaderIndex = i;
                leaderPlayer = players[i];
                console.log(`队长是玩家${i + 1}`);
                break;
            }
        }
        
        expect(leaderIndex).toBeGreaterThanOrEqual(0);
        expect(leaderPlayer).not.toBeNull();
        
        // 5. 队长选择部分队伍成员
        console.log('4. 队长选择部分队伍成员...');
        const playerItems = leaderPlayer.locator('#teamBuildingPlayerList .player-item');
        const count = await playerItems.count();
        console.log(`玩家列表数量: ${count}`);
        
        // 只选择1个队员（不提交）
        const selectBtn = playerItems.nth(0).locator('.player-select');
        if (await selectBtn.isVisible().catch(() => false)) {
            await selectBtn.click();
            await leaderPlayer.waitForTimeout(300);
        }
        
        // 检查提交按钮状态
        const submitBtn = leaderPlayer.locator('#submitTeamBtn');
        const isDisabledBefore = await submitBtn.isDisabled();
        console.log(`重连前提交按钮状态: ${isDisabledBefore ? '禁用' : '可用'}`);
        
        // 6. 队长断开连接
        console.log('5. 队长断开连接...');
        const leaderPlayerId = await leaderPlayer.evaluate(() => {
            return sessionStorage.getItem('avalon_playerId');
        });
        console.log(`队长 playerId: ${leaderPlayerId}`);
        
        // 关闭队长页面
        await leaderPlayer.close();
        await voicePanel.waitForTimeout(2000);
        
        // 7. 队长重连
        console.log('6. 队长重连...');
        const newLeaderPage = await browser.newPage();
        await newLeaderPage.goto(PLAYER_URL);
        await newLeaderPage.waitForLoadState('networkidle');
        await newLeaderPage.fill('#roomIdInput', roomId);
        await newLeaderPage.click(`#playerIdSelector button:has-text("${leaderIndex + 1}号")`);
        await newLeaderPage.click('#joinRoomBtn');
        await newLeaderPage.waitForTimeout(2000);
        
        // 8. 检查队长是否恢复
        console.log('7. 检查队长是否恢复...');
        const isLeaderInfo = newLeaderPage.locator('#isLeaderInfo');
        const isLeaderVisible = await isLeaderInfo.isVisible({ timeout: 3000 }).catch(() => false);
        console.log(`队长信息是否显示: ${isLeaderVisible}`);
        expect(isLeaderVisible).toBe(true);
        
        // 9. 检查提交按钮是否可用
        console.log('8. 检查提交按钮...');
        const newPlayerItems = newLeaderPage.locator('#teamBuildingPlayerList .player-item');
        const newCount = await newPlayerItems.count();
        console.log(`重连后玩家列表数量: ${newCount}`);
        
        // 选择足够的队员
        const requiredSize = 2; // 第一轮需要2人
        for (let j = 0; j < Math.min(requiredSize, newCount); j++) {
            const newSelectBtn = newPlayerItems.nth(j).locator('.player-select');
            if (await newSelectBtn.isVisible().catch(() => false)) {
                await newSelectBtn.click();
                await newLeaderPage.waitForTimeout(300);
            }
        }
        
        const newSubmitBtn = newLeaderPage.locator('#submitTeamBtn');
        await newSubmitBtn.waitFor({ state: 'visible', timeout: 3000 });
        
        const isDisabledAfter = await newSubmitBtn.isDisabled();
        console.log(`重连后提交按钮状态: ${isDisabledAfter ? '禁用' : '可用'}`);
        
        // 10. 提交队伍
        if (!isDisabledAfter) {
            await newSubmitBtn.click();
            console.log('队伍已提交！');
        }
        
        expect(isDisabledAfter).toBe(false);
        
        // 清理
        for (let i = 0; i < players.length; i++) {
            if (i !== leaderIndex && players[i]) {
                await players[i].close();
            }
        }
        await newLeaderPage.close();
        await voicePanel.close();
    });
});
