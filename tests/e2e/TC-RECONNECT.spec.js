/**
 * 测试夜间掉线重连场景
 */

const { test, expect, chromium } = require('@playwright/test');

const BASE_URL = 'http://localhost:3000';
const VOICE_PANEL_URL = `${BASE_URL}/voice-panel-v2.html`;
const PLAYER_URL = `${BASE_URL}/player-modular.html`;

test.describe('夜间掉线重连测试', () => {
    let browser;
    let voicePanelPage;
    let playerPages = [];

    test.beforeAll(async () => {
        browser = await chromium.launch({ 
            headless: true,
            slowMo: 100,
            args: ['--window-size=1920,1080']
        });
    });

    test.afterAll(async () => {
        if (browser) {
            await browser.close();
        }
    });

    test('夜间掉线重连测试', async () => {
        voicePanelPage = await browser.newPage();
        await voicePanelPage.goto(VOICE_PANEL_URL);
        await voicePanelPage.waitForLoadState('networkidle');
        
        console.log('1. 创建房间...');
        await voicePanelPage.click('#btn-smart-next');
        await voicePanelPage.waitForTimeout(1000);
        
        const roomIdText = await voicePanelPage.locator('#setup-room-id').textContent();
        const roomId = roomIdText.replace('房间号: ', '').trim();
        console.log(`房间号: ${roomId}`);
        
        console.log('2. 加入5个玩家...');
        for (let i = 1; i <= 5; i++) {
            const playerPage = await browser.newPage();
            await playerPage.goto(PLAYER_URL);
            await playerPage.waitForLoadState('networkidle');
            
            await playerPage.fill('#roomIdInput', roomId);
            await playerPage.click(`#playerIdSelector button:has-text("${i}")`);
            await playerPage.click('#joinRoomBtn');
            await playerPage.waitForTimeout(500);
            
            playerPages.push(playerPage);
            console.log(`玩家 ${i}号 已加入`);
        }
        
        await voicePanelPage.waitForTimeout(1000);
        
        console.log('3. 开始游戏...');
        await voicePanelPage.click('#btn-smart-next');
        await voicePanelPage.waitForTimeout(2000);
        
        console.log('4. 进入夜间阶段...');
        await voicePanelPage.click('#btn-smart-next');
        await voicePanelPage.waitForTimeout(2000);
        
        const gameStatus = await voicePanelPage.locator('#btn-phase-text').textContent();
        console.log(`当前阶段: ${gameStatus}`);
        
        console.log('5. 玩家1号掉线...');
        const player1Page = playerPages[0];
        const player1Id = player1Page.url();
        await player1Page.close();
        playerPages.shift();
        
        await voicePanelPage.waitForTimeout(2000);
        
        console.log('6. 玩家1号尝试重连...');
        const reconnectPage = await browser.newPage();
        await reconnectPage.goto(PLAYER_URL);
        await reconnectPage.waitForLoadState('networkidle');
        
        await reconnectPage.fill('#roomIdInput', roomId);
        await reconnectPage.click('#playerIdSelector button:has-text("1")');
        await reconnectPage.click('#joinRoomBtn');
        await reconnectPage.waitForTimeout(2000);
        
        const errorMessage = await reconnectPage.locator('.error-message, .toast-error, #errorMessage').textContent().catch(() => null);
        console.log(`错误消息: ${errorMessage}`);
        
        const pageContent = await reconnectPage.content();
        const hasRoomFullError = pageContent.includes('房间已满');
        const hasReconnectSuccess = pageContent.includes('player-reconnect-success') || 
                                    await reconnectPage.locator('#waitingScreen').isVisible().catch(() => false);
        
        console.log(`房间已满错误: ${hasRoomFullError}`);
        console.log(`重连成功: ${hasReconnectSuccess}`);
        
        if (hasRoomFullError) {
            console.log('BUG复现: 夜间掉线重连报房间已满!');
        }
        
        expect(hasRoomFullError).toBe(false);
        
        await reconnectPage.close();
        for (const page of playerPages) {
            await page.close();
        }
        await voicePanelPage.close();
    });
});
