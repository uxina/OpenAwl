/**
 * 任务完成后阶段推进测试
 */

const { test, expect, chromium } = require('@playwright/test');

const BASE_URL = 'http://localhost:3000';
const VOICE_PANEL_URL = `${BASE_URL}/voice-panel-v2.html`;
const PLAYER_URL = `${BASE_URL}/player-modular.html`;
const TIMEOUT = 30000;

test.describe('任务完成后阶段推进测试', () => {
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

    test('手动点击任务成功按钮后应能推进到第二轮', async () => {
        console.log('=== 测试手动任务成功按钮 ===');

        const voicePanel = await browser.newPage();
        await voicePanel.goto(VOICE_PANEL_URL, { timeout: TIMEOUT });
        await voicePanel.waitForLoadState('networkidle');
        await voicePanel.waitForTimeout(1000);

        console.log('1. 创建房间...');
        await voicePanel.click('button:has-text("创建房间")');

        // 等待房间创建成功
        await voicePanel.waitForTimeout(3000);

        const roomIdElement = voicePanel.locator('#room-id');
        await roomIdElement.waitFor({ state: 'visible', timeout: 5000 });
        const roomId = await roomIdElement.textContent();
        console.log(`   房间号: ${roomId}`);

        console.log('2. 加入5个玩家...');
        const players = [];
        for (let i = 1; i <= 5; i++) {
            const playerPage = await browser.newPage();
            await playerPage.goto(PLAYER_URL, { timeout: TIMEOUT });
            await playerPage.waitForLoadState('networkidle');

            await playerPage.fill('#roomIdInput', roomId);
            await playerPage.click(`#playerIdSelector button:has-text("${i}号")`);
            await playerPage.click('#joinRoomBtn');
            await playerPage.waitForTimeout(500);

            players.push(playerPage);
            console.log(`   玩家${i}加入`);
        }

        // 等待所有玩家加入
        await voicePanel.waitForTimeout(2000);

        // 检查玩家是否都已加入
        const playerStatus = await voicePanel.locator('#btn-phase-text').textContent();
        console.log(`   语音面板状态: ${playerStatus}`);

        console.log('3. 快速推进到任务阶段...');
        await voicePanel.click('#btn-smart-next'); // 开始游戏
        await voicePanel.waitForTimeout(500);
        await voicePanel.click('#btn-smart-next'); // 夜间
        await voicePanel.waitForTimeout(500);
        for (let i = 0; i < 12; i++) { // 夜间12步
            await voicePanel.click('#btn-smart-next');
            await voicePanel.waitForTimeout(100);
        }
        await voicePanel.click('#btn-smart-next'); // 白天 -> 组队
        await voicePanel.waitForTimeout(500);
        await voicePanel.click('#btn-smart-next'); // 组队 -> 讨论
        await voicePanel.waitForTimeout(500);
        await voicePanel.click('#btn-smart-next'); // 讨论 -> 投票
        await voicePanel.waitForTimeout(500);

        // 玩家投票
        for (const player of players) {
            const approveBtn = player.locator('button:has-text("赞成")');
            if (await approveBtn.isVisible().catch(() => false)) {
                await approveBtn.click();
                await player.waitForTimeout(100);
            }
        }
        await voicePanel.waitForTimeout(2000);

        await voicePanel.click('#btn-smart-next'); // 投票结果 -> 任务
        await voicePanel.waitForTimeout(1000);

        console.log('4. 手动点击任务成功按钮...');
        await voicePanel.click('button:has-text("任务成功")');
        await voicePanel.waitForTimeout(2000);

        const phaseText = await voicePanel.locator('#btn-phase-text').textContent();
        console.log(`   当前阶段: ${phaseText}`);

        const isMissionResult = phaseText.includes('任务结果');
        console.log(`   是否在任务结果阶段: ${isMissionResult}`);
        expect(isMissionResult).toBe(true);

        console.log('5. 推进到第二轮...');
        await voicePanel.click('#btn-smart-next');
        await voicePanel.waitForTimeout(2000);

        const newPhaseText = await voicePanel.locator('#btn-phase-text').textContent();
        console.log(`   新阶段: ${newPhaseText}`);

        const isTeamBuilding = newPhaseText.includes('组队');
        expect(isTeamBuilding).toBe(true);

        for (const p of players) {
            await p.close();
        }
        await voicePanel.close();
    });

    test('手动点击任务失败按钮后应能推进到第二轮', async () => {
        console.log('=== 测试手动任务失败按钮 ===');

        const voicePanel = await browser.newPage();
        await voicePanel.goto(VOICE_PANEL_URL, { timeout: TIMEOUT });
        await voicePanel.waitForLoadState('networkidle');
        await voicePanel.waitForTimeout(1000);

        console.log('1. 创建房间...');
        await voicePanel.click('button:has-text("创建房间")');
        await voicePanel.waitForTimeout(3000);

        const roomIdElement = voicePanel.locator('#room-id');
        await roomIdElement.waitFor({ state: 'visible', timeout: 5000 });
        const roomId = await roomIdElement.textContent();
        console.log(`   房间号: ${roomId}`);

        console.log('2. 加入5个玩家...');
        const players = [];
        for (let i = 1; i <= 5; i++) {
            const playerPage = await browser.newPage();
            await playerPage.goto(PLAYER_URL, { timeout: TIMEOUT });
            await playerPage.waitForLoadState('networkidle');

            await playerPage.fill('#roomIdInput', roomId);
            await playerPage.click(`#playerIdSelector button:has-text("${i}号")`);
            await playerPage.click('#joinRoomBtn');
            await playerPage.waitForTimeout(500);

            players.push(playerPage);
            console.log(`   玩家${i}加入`);
        }

        await voicePanel.waitForTimeout(2000);

        console.log('3. 快速推进到任务阶段...');
        await voicePanel.click('#btn-smart-next'); // 开始游戏
        await voicePanel.waitForTimeout(500);
        await voicePanel.click('#btn-smart-next'); // 夜间
        await voicePanel.waitForTimeout(500);
        for (let i = 0; i < 12; i++) { // 夜间12步
            await voicePanel.click('#btn-smart-next');
            await voicePanel.waitForTimeout(100);
        }
        await voicePanel.click('#btn-smart-next'); // 白天 -> 组队
        await voicePanel.waitForTimeout(500);
        await voicePanel.click('#btn-smart-next'); // 组队 -> 讨论
        await voicePanel.waitForTimeout(500);
        await voicePanel.click('#btn-smart-next'); // 讨论 -> 投票
        await voicePanel.waitForTimeout(500);

        // 玩家投票
        for (const player of players) {
            const approveBtn = player.locator('button:has-text("赞成")');
            if (await approveBtn.isVisible().catch(() => false)) {
                await approveBtn.click();
                await player.waitForTimeout(100);
            }
        }
        await voicePanel.waitForTimeout(2000);

        await voicePanel.click('#btn-smart-next'); // 投票结果 -> 任务
        await voicePanel.waitForTimeout(1000);

        console.log('4. 手动点击任务失败按钮...');
        await voicePanel.click('button:has-text("任务失败")');
        await voicePanel.waitForTimeout(2000);

        const phaseText = await voicePanel.locator('#btn-phase-text').textContent();
        console.log(`   当前阶段: ${phaseText}`);

        const isMissionResult = phaseText.includes('任务结果');
        console.log(`   是否在任务结果阶段: ${isMissionResult}`);
        expect(isMissionResult).toBe(true);

        console.log('5. 推进到第二轮...');
        await voicePanel.click('#btn-smart-next');
        await voicePanel.waitForTimeout(2000);

        const newPhaseText = await voicePanel.locator('#btn-phase-text').textContent();
        console.log(`   新阶段: ${newPhaseText}`);

        const isTeamBuilding = newPhaseText.includes('组队');
        expect(isTeamBuilding).toBe(true);

        for (const p of players) {
            await p.close();
        }
        await voicePanel.close();
    });
});

test.setTimeout(60000);
