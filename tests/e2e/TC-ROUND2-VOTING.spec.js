/**
 * 第二轮投票流程测试
 * 测试第一轮任务完成后，能否正确进入第二轮
 */

const { test, expect, chromium } = require('@playwright/test');

const BASE_URL = 'http://localhost:3000';
const VOICE_PANEL_URL = `${BASE_URL}/voice-panel-v2.html`;
const PLAYER_URL = `${BASE_URL}/player-modular.html`;

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
        console.log('=== 测试第二轮投票流程 ===');
        
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
            await playerPage.waitForTimeout(300);
            
            players.push(playerPage);
        }
        
        await voicePanel.waitForTimeout(1000);
        
        console.log('3. 快速推进到任务阶段...');
        await voicePanel.click('#btn-smart-next');
        await voicePanel.waitForTimeout(300);
        await voicePanel.click('#btn-smart-next');
        await voicePanel.waitForTimeout(300);
        for (let i = 0; i < 12; i++) {
            await voicePanel.click('#btn-smart-next');
            await voicePanel.waitForTimeout(100);
        }
        await voicePanel.click('#btn-smart-next');
        await voicePanel.waitForTimeout(300);
        await voicePanel.click('#btn-smart-next');
        await voicePanel.waitForTimeout(300);
        await voicePanel.click('#btn-smart-next');
        await voicePanel.waitForTimeout(500);
        
        console.log('4. 玩家投票...');
        for (const player of players) {
            const approveBtn = player.locator('button:has-text("赞成")');
            if (await approveBtn.isVisible().catch(() => false)) {
                await approveBtn.click();
                await player.waitForTimeout(100);
            }
        }
        await voicePanel.waitForTimeout(2000);
        
        console.log('5. 推进到任务...');
        await voicePanel.click('#btn-smart-next');
        await voicePanel.waitForTimeout(500);
        
        console.log('6. 手动点击任务成功...');
        await voicePanel.click('button:has-text("任务成功")');
        await voicePanel.waitForTimeout(2000);
        
        let phaseText = await voicePanel.locator('#btn-phase-text').textContent();
        console.log(`第一轮后阶段: ${phaseText}`);
        
        let isMissionResult = phaseText.includes('任务结果');
        console.log(`是否在任务结果阶段: ${isMissionResult}`);
        expect(isMissionResult).toBe(true);
        
        console.log('7. 推进到第二轮...');
        await voicePanel.click('#btn-smart-next');
        await voicePanel.waitForTimeout(2000);
        
        let newPhaseText = await voicePanel.locator('#btn-phase-text').textContent();
        console.log(`第二轮阶段: ${newPhaseText}`);
        
        let isTeamBuilding = newPhaseText.includes('组队');
        console.log(`是否在组队阶段: ${isTeamBuilding}`);
        expect(isTeamBuilding).toBe(true);
        
        console.log('8. 第二轮组队 -> 讨论 -> 投票...');
        await voicePanel.click('#btn-smart-next');
        await voicePanel.waitForTimeout(300);
        await voicePanel.click('#btn-smart-next');
        await voicePanel.waitForTimeout(300);
        await voicePanel.click('#btn-smart-next');
        await voicePanel.waitForTimeout(500);
        
        let votingPhase = await voicePanel.locator('#btn-phase-text').textContent();
        console.log(`第二轮投票阶段: ${votingPhase}`);
        
        console.log('9. 玩家投票...');
        for (const player of players) {
            const approveBtn = player.locator('button:has-text("赞成")');
            if (await approveBtn.isVisible().catch(() => false)) {
                await approveBtn.click();
                await player.waitForTimeout(100);
            }
        }
        await voicePanel.waitForTimeout(2000);
        
        console.log('10. 推进到任务...');
        await voicePanel.click('#btn-smart-next');
        await voicePanel.waitForTimeout(500);
        
        console.log('11. 手动点击任务成功...');
        await voicePanel.click('button:has-text("任务成功")');
        await voicePanel.waitForTimeout(2000);
        
        phaseText = await voicePanel.locator('#btn-phase-text').textContent();
        console.log(`第二轮任务后阶段: ${phaseText}`);
        
        let isMissionResult2 = phaseText.includes('任务结果');
        console.log(`是否在任务结果阶段: ${isMissionResult2}`);
        expect(isMissionResult2).toBe(true);
        
        console.log('12. 推进到第三轮...');
        await voicePanel.click('#btn-smart-next');
        await voicePanel.waitForTimeout(2000);
        
        let thirdPhaseText = await voicePanel.locator('#btn-phase-text').textContent();
        console.log(`第三轮阶段: ${thirdPhaseText}`);
        
        let isTeamBuilding3 = thirdPhaseText.includes('组队');
        console.log(`是否在组队阶段: ${isTeamBuilding3}`);
        expect(isTeamBuilding3).toBe(true);
        
        for (const p of players) {
            await p.close();
        }
        await voicePanel.close();
    });
});
