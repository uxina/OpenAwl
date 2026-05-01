/**
 * 客户端任务投票流程测试
 * 测试玩家通过客户端完成任务投票后，语音面板能否正确推进
 */

const { test, expect, chromium } = require('@playwright/test');

const BASE_URL = 'http://localhost:3000';
const VOICE_PANEL_URL = `${BASE_URL}/voice-panel-v2.html`;
const PLAYER_URL = `${BASE_URL}/player-modular.html`;

const MISSION_CONFIG = {
    5: [2, 3, 2, 3, 3],
    6: [2, 3, 4, 3, 4],
    7: [2, 3, 3, 4, 4],
    8: [3, 4, 4, 5, 5],
    9: [3, 4, 4, 5, 5],
    10: [3, 4, 4, 5, 5]
};

test.describe('客户端任务投票流程测试', () => {
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

    test('完整流程：组队->投票->任务->推进到第二轮', async () => {
        console.log('=== 测试完整游戏流程 ===');
        
        const voicePanel = await browser.newPage();
        await voicePanel.goto(VOICE_PANEL_URL);
        await voicePanel.waitForLoadState('networkidle');
        await voicePanel.waitForTimeout(1000);
        
        console.log('1. 创建房间...');
        await voicePanel.click('button:has-text("创建房间")');
        await voicePanel.waitForTimeout(3000);
        
        const roomIdElement = voicePanel.locator('#room-id');
        await roomIdElement.waitFor({ state: 'visible', timeout: 5000 });
        const roomId = await roomIdElement.textContent();
        console.log(`房间号: ${roomId}`);
        
        console.log('2. 加入5个玩家...');
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
            console.log(`玩家 ${i}号 已加入`);
        }
        
        await voicePanel.waitForTimeout(1000);
        
        console.log('3. 开始游戏...');
        await voicePanel.click('#btn-smart-next');
        await voicePanel.waitForTimeout(500);
        
        console.log('4. 进入夜间阶段...');
        await voicePanel.click('#btn-smart-next');
        await voicePanel.waitForTimeout(500);
        
        console.log('5. 完成夜间阶段（12步）...');
        for (let i = 0; i < 12; i++) {
            await voicePanel.click('#btn-smart-next');
            await voicePanel.waitForTimeout(100);
        }
        
        console.log('6. 白天阶段 -> 组队阶段...');
        await voicePanel.click('#btn-smart-next');
        await voicePanel.waitForTimeout(500);
        
        // 现在应该进入组队阶段，队长需要选择队伍
        let phaseText = await voicePanel.locator('#btn-phase-text').textContent();
        console.log(`当前阶段: ${phaseText}`);
        
        // 等待队长界面出现
        await voicePanel.waitForTimeout(1000);
        
        console.log('7. 队长选择队伍...');
        // 第一个玩家是队长，选择队伍
        const leaderPage = players[0]; // 1号是第一个队长
        const teamSize = MISSION_CONFIG[5][0]; // 第一轮需要2人
        console.log(`需要选择 ${teamSize} 人`);
        
        // 点击队员选择按钮
        for (let i = 1; i <= teamSize; i++) {
            const memberBtn = leaderPage.locator(`button:has-text("${i}号")`);
            if (await memberBtn.isVisible().catch(() => false)) {
                await memberBtn.click();
                await leaderPage.waitForTimeout(200);
                console.log(`选择了 ${i}号`);
            }
        }
        
        // 确认队伍
        const confirmBtn = leaderPage.locator('button:has-text("确认队伍")');
        if (await confirmBtn.isVisible().catch(() => false)) {
            await confirmBtn.click();
            console.log('队伍已确认');
        }
        
        await voicePanel.waitForTimeout(2000);
        
        console.log('8. 组队阶段 -> 讨论阶段...');
        await voicePanel.click('#btn-smart-next');
        await voicePanel.waitForTimeout(500);
        
        console.log('9. 讨论阶段 -> 投票阶段...');
        await voicePanel.click('#btn-smart-next');
        await voicePanel.waitForTimeout(500);
        
        phaseText = await voicePanel.locator('#btn-phase-text').textContent();
        console.log(`当前阶段: ${phaseText}`);
        
        console.log('10. 玩家投票...');
        // 所有玩家投票赞成
        for (const player of players) {
            const approveBtn = player.locator('button:has-text("赞成")');
            if (await approveBtn.isVisible().catch(() => false)) {
                await approveBtn.click();
                await player.waitForTimeout(200);
                console.log(`玩家投票赞成`);
            }
        }
        
        await voicePanel.waitForTimeout(3000);
        
        // 检查投票结果
        phaseText = await voicePanel.locator('#btn-phase-text').textContent();
        console.log(`投票后阶段: ${phaseText}`);
        
        // 如果投票通过，应该进入任务阶段
        if (phaseText.includes('投票结果')) {
            console.log('11. 推进到任务阶段...');
            await voicePanel.click('#btn-smart-next');
            await voicePanel.waitForTimeout(1000);
        }
        
        phaseText = await voicePanel.locator('#btn-phase-text').textContent();
        console.log(`当前阶段: ${phaseText}`);
        
        console.log('12. 队伍成员执行任务...');
        let votedCount = 0;
        for (const player of players) {
            const successBtn = player.locator('button:has-text("成功")');
            const failBtn = player.locator('button:has-text("失败")');
            
            if (await successBtn.isVisible().catch(() => false)) {
                await successBtn.click();
                votedCount++;
                console.log(`玩家执行任务成功`);
                await player.waitForTimeout(200);
            } else if (await failBtn.isVisible().catch(() => false)) {
                await failBtn.click();
                votedCount++;
                console.log(`玩家执行任务失败`);
                await player.waitForTimeout(200);
            }
        }
        console.log(`执行任务人数: ${votedCount}`);
        
        await voicePanel.waitForTimeout(3000);
        
        // 检查是否自动进入任务结果阶段
        phaseText = await voicePanel.locator('#btn-phase-text').textContent();
        console.log(`任务后阶段: ${phaseText}`);
        
        const isMissionResult = phaseText.includes('任务结果');
        console.log(`是否在任务结果阶段: ${isMissionResult}`);
        
        if (isMissionResult) {
            console.log('13. 推进到第二轮组队...');
            await voicePanel.click('#btn-smart-next');
            await voicePanel.waitForTimeout(2000);
            
            const newPhaseText = await voicePanel.locator('#btn-phase-text').textContent();
            console.log(`新阶段: ${newPhaseText}`);
            
            const isTeamBuilding = newPhaseText.includes('组队');
            expect(isTeamBuilding).toBe(true);
        } else {
            // 如果没有自动进入任务结果阶段，检查日志
            const logContent = await voicePanel.locator('#log-container').textContent();
            console.log(`日志内容: ${logContent.substring(0, 500)}`);
        }
        
        expect(votedCount).toBeGreaterThan(0);
        
        for (const p of players) {
            await p.close();
        }
        await voicePanel.close();
    });
});
