/**
 * 简单的重连测试
 */

const { test, expect, chromium } = require('@playwright/test');

const BASE_URL = 'http://localhost:3000';
const VOICE_PANEL_URL = `${BASE_URL}/voice-panel-v2.html`;
const PLAYER_URL = `${BASE_URL}/player-modular.html`;

test.describe('重连测试', () => {
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

    test('夜间掉线重连测试', async () => {
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
        await voicePanel.waitForTimeout(2000);
        
        console.log('5. 玩家1号掉线...');
        await players[0].close();
        players.shift();
        await voicePanel.waitForTimeout(2000);
        
        console.log('6. 玩家1号尝试重连...');
        const reconnectPage = await browser.newPage();
        await reconnectPage.goto(PLAYER_URL);
        await reconnectPage.waitForLoadState('networkidle');
        
        await reconnectPage.fill('#roomIdInput', roomId);
        await reconnectPage.click(`#playerIdSelector button:has-text("1号")`);
        await reconnectPage.click('#joinRoomBtn');
        await reconnectPage.waitForTimeout(3000);
        
        const pageContent = await reconnectPage.content();
        const hasRoomFullError = pageContent.includes('房间已满');
        const hasReconnectSuccess = pageContent.includes('waitingScreen') || 
                                    pageContent.includes('roleAssignmentScreen') ||
                                    pageContent.includes('player-reconnect-success');
        
        console.log(`房间已满错误: ${hasRoomFullError}`);
        console.log(`重连成功: ${hasReconnectSuccess}`);
        
        if (hasRoomFullError) {
            console.log('!!! BUG复现: 夜间掉线重连报房间已满 !!!');
        }
        
        expect(hasRoomFullError).toBe(false);
        
        await reconnectPage.close();
        for (const p of players) {
            await p.close();
        }
        await voicePanel.close();
    });
});
