/**
 * 刺杀阶段测试
 * 测试好人3次任务成功后进入刺杀阶段
 */

const { test, expect, chromium } = require('@playwright/test');

const BASE_URL = 'http://localhost:3000';
const VOICE_PANEL_URL = `${BASE_URL}/voice-panel-v2.html`;
const PLAYER_URL = `${BASE_URL}/player-modular.html`;

test.describe('刺杀阶段测试', () => {
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

    test('好人3次成功后应进入刺杀阶段', async () => {
        console.log('=== 测试刺杀阶段 ===');
        
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
        
        // 3. 快速完成3轮任务（每轮任务成功)
        console.log('2. 快速完成3轮任务...');
        
        // 开始游戏
        await voicePanel.click('#btn-smart-next');
        await voicePanel.waitForTimeout(500);
        
        // 夜间阶段
        await voicePanel.click('#btn-smart-next');
        await voicePanel.waitForTimeout(300);
        for (let i = 0; i < 12; i++) {
            await voicePanel.click('#btn-smart-next');
            await voicePanel.waitForTimeout(100);
        }
        
        // 白天 -> 组队
        await voicePanel.click('#btn-smart-next');
        await voicePanel.waitForTimeout(500);
        
        // 队长选择队伍（第一轮需要2人）
        const round1Result = await selectTeamForCurrentRound(players, 2, voicePanel);
        console.log(`第一轮队伍选择结果: ${round1Result}`);
        expect(round1Result).toBe('success');
        
        // 玩家投票
        console.log('第一轮玩家投票...');
        for (const player of players) {
            const approveBtn = player.locator('button:has-text("赞成")');
            if (await approveBtn.isVisible().catch(() => false)) {
                await approveBtn.click();
                await player.waitForTimeout(100);
            }
        }
        await voicePanel.waitForTimeout(2000);
        
        // 推进到任务
        await voicePanel.click('#btn-smart-next');
        await voicePanel.waitForTimeout(500);
        
        // 手动点击任务成功
        await voicePanel.click('button:has-text("任务成功")');
        await voicePanel.waitForTimeout(1000);
        
        // 检查是否在任务结果阶段
        let phaseText = await voicePanel.locator('#btn-phase-text').textContent();
        console.log(`第一轮后阶段: ${phaseText}`);
        expect(phaseText.includes('任务结果')).toBe(true);
        
        // 4. 推进到第二轮
        console.log('3. 推进到第二轮...');
        await voicePanel.click('#btn-smart-next');
        await voicePanel.waitForTimeout(1000);
        
        const newPhaseText = await voicePanel.locator('#btn-phase-text').textContent();
        console.log(`第二轮阶段: ${newPhaseText}`);
        expect(newPhaseText.includes('组队')).toBe(true);
        
        // 5. 第二轮队长选择队伍
        console.log('4. 第二轮队长选择队伍...');
        const round2Result = await selectTeamForCurrentRound(players, 3, voicePanel);
        console.log(`第二轮队伍选择结果: ${round2Result}`);
        expect(round2Result).toBe('success');
        
        // 6. 第二轮玩家投票
        console.log('5. 第二轮玩家投票...');
        for (const player of players) {
            const approveBtn = player.locator('button:has-text("赞成")');
            if (await approveBtn.isVisible().catch(() => false)) {
                await approveBtn.click();
                await player.waitForTimeout(100);
            }
        }
        await voicePanel.waitForTimeout(3000);
        
        // 7. 推进到任务
        await voicePanel.click('#btn-smart-next');
        await voicePanel.waitForTimeout(500);
        
        // 手动点击任务成功
        await voicePanel.click('button:has-text("任务成功")');
        await voicePanel.waitForTimeout(1000);
        
        // 检查是否在任务结果阶段
        phaseText = await voicePanel.locator('#btn-phase-text').textContent();
        console.log(`第二轮后阶段: ${phaseText}`);
        expect(phaseText.includes('任务结果')).toBe(true);
        
        // 8. 推进到第三轮
        console.log('6. 推进到第三轮...');
        await voicePanel.click('#btn-smart-next');
        await voicePanel.waitForTimeout(1000);
        
        const thirdPhaseText = await voicePanel.locator('#btn-phase-text').textContent();
        console.log(`第三轮阶段: ${thirdPhaseText}`);
        expect(thirdPhaseText.includes('组队')).toBe(true);
        
        // 9. 第三轮队长选择队伍
        console.log('7. 第三轮队长选择队伍...');
        const round3Result = await selectTeamForCurrentRound(players, 3, voicePanel);
        console.log(`第三轮队伍选择结果: ${round3Result}`);
        expect(round3Result).toBe('success');
        
        // 10. 第三轮玩家投票
        console.log('8. 第三轮玩家投票...');
        for (const player of players) {
            const approveBtn = player.locator('button:has-text("赞成")');
            if (await approveBtn.isVisible().catch(() => false)) {
                await approveBtn.click();
                await player.waitForTimeout(100);
            }
        }
        await voicePanel.waitForTimeout(3000);
        
        // 11. 推进到任务
        await voicePanel.click('#btn-smart-next');
        await voicePanel.waitForTimeout(500);
        
        // 手动点击任务成功
        await voicePanel.click('button:has-text("任务成功")');
        await voicePanel.waitForTimeout(1000);
        
        // 检查是否进入刺杀阶段
        phaseText = await voicePanel.locator('#btn-phase-text').textContent();
        console.log(`第三轮后阶段: ${phaseText}`);
        expect(phaseText.includes('刺杀')).toBe(true);
        
        // 12. 检查玩家页面刺杀选项
        console.log('检查玩家页面的刺杀选项...');
        await checkAssassinationOption(players, voicePanel);
        
        for (const p of players) {
            await p.close();
        }
        await voicePanel.close();
    });
});

async function selectTeamForCurrentRound(players, requiredSize, voicePanel) {
    for (let i = 0; i < players.length; i++) {
        const player = players[i];
        try {
            const isLeaderInfo = player.locator('#isLeaderInfo');
            const isLeaderVisible = await isLeaderInfo.isVisible({ timeout: 2000 });
            
            if (isLeaderVisible) {
                console.log(`找到队长（玩家${i + 1}），开始选择队伍...`);
                
                await player.waitForTimeout(500);
                
                const playerItems = player.locator('#teamBuildingPlayerList .player-item');
                const count = await playerItems.count();
                console.log(`玩家列表数量: ${count}`);
                
                for (let j = 0; j < Math.min(requiredSize, count); j++) {
                    const selectBtn = playerItems.nth(j).locator('.player-select');
                    if (await selectBtn.isVisible().catch(() => false)) {
                        await selectBtn.click();
                        await player.waitForTimeout(200);
                    }
                }
                
                const submitBtn = player.locator('#submitTeamBtn');
                await submitBtn.waitFor({ state: 'visible', timeout: 3000 });
                
                const isDisabled = await submitBtn.isDisabled();
                console.log(`提交按钮状态: ${isDisabled ? '禁用' : '可用'}`);
                
                if (!isDisabled) {
                    await submitBtn.click();
                    console.log('队伍已提交');
                    return 'success';
                } else {
                    await player.waitForTimeout(1000);
                    const isDisabled2 = await submitBtn.isDisabled();
                    console.log(`提交按钮状态: ${isDisabled ? '禁用' : '可用'}`);
                    
                    if (!isDisabled) {
                        await submitBtn.click();
                        console.log('队伍已提交（延迟)');
                        return 'success';
                    }
                }
            }
        } catch (e) {
            console.log(`玩家${i + 1}检查失败: ${e.message}`);
        }
    }
    return 'no_leader_found';
}

async function checkAssassinationOption(players, voicePanel) {
    // 检查语音面板是否进入刺杀阶段
    const phaseText = await voicePanel.locator('#btn-phase-text').textContent();
    console.log(`语音面板阶段: ${phaseText}`);
    
    if (!phaseText.includes('刺杀')) {
        console.log('语音面板没有进入刺杀阶段！');
        return;
    }
    
    // 检查玩家页面是否有刺杀选项
    for (let i = 0; i < players.length; i++) {
        const player = players[i];
        try {
            // 检查是否显示刺杀屏幕
            const assassinationScreen = player.locator('#assassinationScreen');
            const isVisible = await assassinationScreen.isVisible({ timeout: 2000 });
            
            if (isVisible) {
                console.log(`玩家${i + 1}显示了刺杀屏幕`);
                
                // 检查是否有刺杀目标选择按钮
                const targetButtons = player.locator('#assassinationPlayerList .player-item .assassinate-btn');
                const count = await targetButtons.count();
                console.log(`刺杀目标数量: ${count}`);
                
                if (count > 0) {
                    console.log('刺杀目标选择按钮可用！');
                    return;
                } else {
                    // 检查是否显示等待信息
                    const waitingMessage = player.locator('.waiting-message');
                    const isWaitingVisible = await waitingMessage.isVisible().catch(() => false);
                    if (isWaitingVisible) {
                        console.log(`玩家${i + 1}不是刺客，显示等待信息`);
                    }
                }
            }
        } catch (e) {
            console.log(`玩家${i + 1}检查刺杀选项失败: ${e.message}`);
        }
    }
    
    console.log('未找到刺客玩家');
}
