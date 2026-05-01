/**
 * 轻量级投票推进测试 v3
 * 增加等待时间确保阶段正确切换
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
            await helpOverlay.locator('button').first().click();
            await page.waitForTimeout(500);
        }
    } catch (e) {}
}

test.describe('轻量级投票推进测试 v3', () => {
    let browser;

    test.beforeAll(async () => {
        browser = await chromium.launch({
            headless: true,
            slowMo: 100,
            args: ['--disable-dev-shm-usage', '--no-sandbox']
        });
    });

    test.afterAll(async () => {
        if (browser) {
            await browser.close();
        }
    });

    test('投票完成后应能推进到任务阶段', async () => {
        console.log('\n=== 轻量级测试v3：投票完成后推进 ===');

        const voicePanel = await browser.newPage();
        await voicePanel.goto(VOICE_PANEL_URL);
        await voicePanel.waitForLoadState('networkidle');
        await closeHelpOverlay(voicePanel);

        console.log('1. 创建房间...');
        await voicePanel.click('button:has-text("创建房间")');
        await voicePanel.waitForTimeout(2000);

        const roomId = await voicePanel.locator('#room-id').textContent();
        console.log(`   房间号: ${roomId}`);

        console.log('2. 创建2个玩家 (1号和2号)...');
        const player1 = await browser.newPage();
        await player1.goto(PLAYER_URL);
        await player1.waitForLoadState('networkidle');
        await player1.fill('#roomIdInput', roomId);
        await player1.click('#playerIdSelector button:has-text("1号")');
        await player1.click('#joinRoomBtn');
        await player1.waitForTimeout(500);
        console.log('   玩家1号已加入');

        const player2 = await browser.newPage();
        await player2.goto(PLAYER_URL);
        await player2.waitForLoadState('networkidle');
        await player2.fill('#roomIdInput', roomId);
        await player2.click('#playerIdSelector button:has-text("2号")');
        await player2.click('#joinRoomBtn');
        await player2.waitForTimeout(500);
        console.log('   玩家2号已加入');

        await voicePanel.waitForTimeout(1000);

        console.log('3. 开始游戏...');
        await voicePanel.click('#btn-smart-next');
        await voicePanel.waitForTimeout(1000);

        let phase = await voicePanel.locator('#btn-phase-text').textContent({ timeout: 3000 }).catch(() => 'unknown');
        console.log(`   阶段: ${phase}`);

        console.log('4. 进入夜间...');
        await voicePanel.click('#btn-smart-next');
        await voicePanel.waitForTimeout(500);

        console.log('5. 完成夜间 (12步)...');
        for (let i = 0; i < 12; i++) {
            await voicePanel.click('#btn-smart-next').catch(() => {});
            await voicePanel.waitForTimeout(50);
        }
        console.log('   夜间完成');

        console.log('6. 进入白天...');
        await voicePanel.click('#btn-smart-next');
        await voicePanel.waitForTimeout(1000);
        phase = await voicePanel.locator('#btn-phase-text').textContent({ timeout: 3000 }).catch(() => 'unknown');
        console.log(`   阶段: ${phase}`);

        console.log('7. 进入组队...');
        await voicePanel.click('#btn-smart-next');
        await voicePanel.waitForTimeout(2000);
        phase = await voicePanel.locator('#btn-phase-text').textContent({ timeout: 3000 }).catch(() => 'unknown');
        console.log(`   阶段: ${phase}`);

        console.log('8. 队长(1号)选择队员...');
        // 等待队长界面出现
        await player1.waitForTimeout(2000);
        const memberBtn = player1.locator('button:has-text("2号")');
        if (await memberBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
            await memberBtn.click();
            console.log('   选择了2号');
            await player1.waitForTimeout(500);
        } else {
            console.log('   警告: 2号按钮不可见');
        }

        const confirmBtn = player1.locator('button:has-text("确认队伍")');
        if (await confirmBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
            await confirmBtn.click();
            console.log('   队伍已确认');
        } else {
            console.log('   警告: 确认按钮不可见');
        }

        // 等待服务器处理组队
        await voicePanel.waitForTimeout(3000);

        // 检查当前阶段
        phase = await voicePanel.locator('#btn-phase-text').textContent({ timeout: 3000 }).catch(() => 'unknown');
        console.log(`   组队后阶段: ${phase}`);

        console.log('9. 进入讨论...');
        await voicePanel.click('#btn-smart-next');
        await voicePanel.waitForTimeout(1000);
        phase = await voicePanel.locator('#btn-phase-text').textContent({ timeout: 3000 }).catch(() => 'unknown');
        console.log(`   阶段: ${phase}`);

        console.log('10. 进入投票...');
        await voicePanel.click('#btn-smart-next');
        await voicePanel.waitForTimeout(1000);
        phase = await voicePanel.locator('#btn-phase-text').textContent({ timeout: 3000 }).catch(() => 'unknown');
        console.log(`   阶段: ${phase}`);

        console.log('11. 等待投票按钮出现后投票...');
        // 等待投票按钮出现
        for (const player of [player1, player2]) {
            let voted = false;
            for (let i = 0; i < 10; i++) {
                const approveBtn = player.locator('button:has-text("赞成")');
                if (await approveBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
                    await approveBtn.click();
                    console.log(`   ${player === player1 ? '1号' : '2号'}投票赞成`);
                    await player.waitForTimeout(500);
                    voted = true;
                    break;
                }
                await player.waitForTimeout(500);
            }
            if (!voted) {
                console.log(`   警告: ${player === player1 ? '1号' : '2号'}未能投票`);
            }
        }

        // 等待服务器处理投票
        await voicePanel.waitForTimeout(5000);

        phase = await voicePanel.locator('#btn-phase-text').textContent({ timeout: 3000 }).catch(() => 'unknown');
        console.log(`\n   投票后阶段: ${phase}`);

        console.log('\n=== 测试结果 ===');
        const success = phase.includes('投票结果') || phase.includes('任务');
        console.log(`最终阶段: ${phase}`);
        console.log(`测试: ${success ? '✅ 通过' : '❌ 失败'}`);

        await player1.close();
        await player2.close();
        await voicePanel.close();

        expect(success).toBe(true);
    });
});
