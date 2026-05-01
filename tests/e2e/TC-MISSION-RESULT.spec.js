/**
 * 任务结果显示测试
 */

const { test, expect, chromium } = require('@playwright/test');

const BASE_URL = 'http://localhost:3000';
const VOICE_PANEL_URL = `${BASE_URL}/voice-panel-v2.html`;
const PLAYER_URL = `${BASE_URL}/player-modular.html`;

test.describe('任务结果显示测试', () => {
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

    test('第一轮任务结果显示测试', async () => {
        console.log('=== 开始测试 ===');
        
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
        await voicePanel.waitForTimeout(2000);
        
        console.log('4. 进入夜间阶段...');
        await voicePanel.click('#btn-smart-next');
        await voicePanel.waitForTimeout(3000);
        
        console.log('5. 完成夜间阶段...');
        await voicePanel.click('#btn-smart-next');
        await voicePanel.waitForTimeout(2000);
        
        console.log('6. 组队阶段...');
        await voicePanel.click('#btn-smart-next');
        await voicePanel.waitForTimeout(1000);
        
        console.log('7. 玩家投票...');
        for (const player of players) {
            const approveBtn = player.locator('button:has-text("赞成")');
            if (await approveBtn.isVisible().catch(() => false)) {
                await approveBtn.click();
                await player.waitForTimeout(300);
            }
        }
        await voicePanel.waitForTimeout(2000);
        
        console.log('8. 任务阶段...');
        await voicePanel.click('#btn-smart-next');
        await voicePanel.waitForTimeout(1000);
        
        console.log('9. 玩家执行任务...');
        for (const player of players) {
            const successBtn = player.locator('button:has-text("成功")');
            if (await successBtn.isVisible().catch(() => false)) {
                await successBtn.click();
                await player.waitForTimeout(300);
            }
        }
        await voicePanel.waitForTimeout(3000);
        
        console.log('10. 检查任务结果显示...');
        const logContent = await voicePanel.locator('#log-container').textContent();
        console.log(`日志内容: ${logContent}`);
        
        const hasCorrectRound = logContent.includes('第1轮') && !logContent.includes('第2轮任务');
        const hasCorrectTeamSize = !logContent.includes('队伍人数: 0人');
        const hasCorrectSuccessCount = !logContent.includes('成功票: -1张');
        
        console.log(`轮次显示正确: ${hasCorrectRound}`);
        console.log(`队伍人数正确: ${hasCorrectTeamSize}`);
        console.log(`成功票数正确: ${hasCorrectSuccessCount}`);
        
        expect(hasCorrectRound).toBe(true);
        expect(hasCorrectTeamSize).toBe(true);
        expect(hasCorrectSuccessCount).toBe(true);
        
        for (const p of players) {
            await p.close();
        }
        await voicePanel.close();
    });
});
