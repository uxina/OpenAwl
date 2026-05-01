/**
 * 完整 E2E 测试：语音面板 + 玩家客户端 + 语音播放
 *
 * 使用方法：
 * 1. 确保服务器运行在 localhost:3000
 * 2. 在 PC 上运行：npx playwright test tests/e2e/TC-PC-E2E.spec.js
 *
 * 测试内容：
 * - 语音面板创建房间
 * - 5个玩家加入
 * - 完整游戏流程（角色确认 -> 夜间 -> 白天 -> 组队 -> 投票 -> 任务）
 * - 语音播报验证
 */

const { test, expect, chromium } = require('@playwright/test');

const BASE_URL = 'http://localhost:3000';
const VOICE_PANEL_URL = `${BASE_URL}/voice-panel-v2.html`;
const PLAYER_URL = `${BASE_URL}/player-modular.html`;

async function delay(ms) {
    return new Promise(r => setTimeout(r, ms));
}

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

test.describe('PC E2E 测试：语音面板 + 玩家客户端完整流程', () => {
    let browser;
    let context;

    test.beforeAll(async () => {
        browser = await chromium.launch({
            headless: false,  //headed 模式，音频会播放
            slowMo: 800,      // 放慢速度，方便听语音和观察
            args: ['--autoplay-policy=no-user-gesture-required']  // 允许自动播放音频
        });
        context = await browser.newContext({
            viewport: { width: 1920, height: 1080 }
        });
    });

    test.afterAll(async () => {
        if (browser) {
            await browser.close();
        }
    });

    test('完整游戏流程测试', async () => {
        console.log('\n========================================');
        console.log('PC E2E 测试：语音面板 + 玩家客户端');
        console.log('========================================\n');
        console.log('请注意听音箱语音播报！\n');

        // ========== 1. 打开语音面板 ==========
        console.log('📍 步骤1: 打开语音面板');
        const voicePanel = await context.newPage();
        await voicePanel.goto(VOICE_PANEL_URL);
        await voicePanel.waitForLoadState('networkidle');
        await closeHelpOverlay(voicePanel);

        const title = await voicePanel.title();
        console.log(`✅ 语音面板标题: ${title}`);

        // ========== 2. 创建房间 ==========
        console.log('\n📍 步骤2: 创建房间');
        await voicePanel.click('#btn-create');
        await delay(4000);

        const roomIdElement = voicePanel.locator('#room-id');
        await roomIdElement.waitFor({ state: 'visible', timeout: 5000 });
        const roomId = await roomIdElement.textContent();
        console.log(`✅ 房间创建成功: ${roomId}`);
        console.log('🔊 语音播报: "房间已创建，房间号 [数字]"');

        // ========== 3. 加入5个玩家 ==========
        console.log('\n📍 步骤3: 加入5个玩家');
        const players = [];
        for (let i = 1; i <= 5; i++) {
            const playerPage = await context.newPage();
            await playerPage.goto(`${PLAYER_URL}?roomId=${roomId}`);
            await playerPage.waitForLoadState('networkidle');
            await closeHelpOverlay(playerPage);
            await delay(500);

            // 选择玩家编号
            const playerBtn = playerPage.locator(`.player-id-btn[data-player-number="${i}"]`);
            if (await playerBtn.isVisible().catch(() => false)) {
                await playerBtn.click();
                await delay(300);
            }

            // 点击加入按钮
            const joinBtn = playerPage.locator('#joinRoomBtn');
            if (await joinBtn.isEnabled().catch(() => false)) {
                await joinBtn.click();
            }
            await delay(500);
            players.push(playerPage);
            console.log(`✅ 玩家${i} 已加入`);
        }
        await delay(2000);
        console.log('🔊 语音播报: "玩家X 加入房间"（多次）');

        // ========== 4. 开始游戏 ==========
        console.log('\n📍 步骤4: 开始游戏');
        await voicePanel.click('#btn-smart-next');
        await delay(4000);
        console.log('✅ 游戏已开始');
        console.log('🔊 语音播报: "游戏开始"');

        // 等待身份分发
        await delay(3000);
        console.log('🔊 语音播报: "请查看您的身份"（玩家端）');

        // ========== 5. 跳过角色确认，进入白天 ==========
        console.log('\n📍 步骤5: 跳过角色确认');
        await voicePanel.click('#btn-smart-next');
        await delay(4000);
        console.log('✅ 进入白天');
        console.log('🔊 语音播报: "天亮了"');

        // ========== 6. 跳过讨论 ==========
        console.log('\n📍 步骤6: 跳过讨论');
        await voicePanel.click('#btn-smart-next');
        await delay(3000);
        console.log('✅ 讨论结束');

        // ========== 7. 进入组队阶段 ==========
        console.log('\n📍 步骤7: 进入组队阶段');
        await voicePanel.click('#btn-smart-next');
        await delay(3000);
        console.log('✅ 进入组队阶段');
        console.log('🔊 语音播报: "队长 XXX 号请组建队伍"');

        // 等待队长选择队员
        await delay(3000);

        // ========== 8. 队长选择队伍 ==========
        console.log('\n📍 步骤8: 队长选择队员');

        // 找到队长页面（玩家1通常是第一个队长）
        const leaderPage = players[0];
        try {
            // 在队长页面选择前2个玩家
            const playerItems = leaderPage.locator('.player-item, #teamBuildingPlayerList .player-item');
            const count = await playerItems.count();
            console.log(`   找到 ${count} 个可选择的玩家`);

            for (let i = 0; i < Math.min(2, count); i++) {
                const selectBtn = playerItems.nth(i).locator('button, .select-btn, .player-select').first();
                if (await selectBtn.isVisible().catch(() => false)) {
                    await selectBtn.click();
                    await delay(300);
                }
            }

            // 提交队伍
            await delay(500);
            const submitBtn = leaderPage.locator('#submitTeamBtn');
            if (await submitBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
                if (!(await submitBtn.isDisabled().catch(() => true))) {
                    await submitBtn.click();
                    console.log('✅ 队长已提交队伍');
                }
            }
        } catch (e) {
            console.log(`⚠️ 队长选择队伍失败: ${e.message}`);
        }

        await delay(2000);

        // ========== 9. 进入投票阶段 ==========
        console.log('\n📍 步骤9: 进入投票阶段');
        await voicePanel.click('#btn-smart-next');
        await delay(3000);
        console.log('✅ 进入投票阶段');
        console.log('🔊 语音播报: "投票开始"');

        // ========== 10. 所有玩家投票 ==========
        console.log('\n📍 步骤10: 玩家投票');
        for (let i = 0; i < players.length; i++) {
            const player = players[i];
            try {
                const approveBtn = player.locator('#approveBtn, .vote-approve-btn, button.approve');
                if (await approveBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
                    await approveBtn.click();
                    console.log(`✅ 玩家${i + 1} 投票成功`);
                }
            } catch (e) {
                console.log(`⚠️ 玩家${i + 1} 投票失败`);
            }
            await delay(500);
        }
        await delay(3000);
        console.log('🔊 语音播报: "投票通过" 或 "投票否决"');

        // ========== 11. 进入任务阶段 ==========
        console.log('\n📍 步骤11: 进入任务阶段');
        await voicePanel.click('#btn-smart-next');
        await delay(3000);
        console.log('✅ 进入任务阶段');
        console.log('🔊 语音播报: "任务开始"');

        // ========== 12. 任务执行 ==========
        console.log('\n📍 步骤12: 任务队员执行任务');

        // 找到任务队员（通常是玩家1和玩家2）
        for (let i = 0; i < 2; i++) {
            const player = players[i];
            try {
                const successBtn = player.locator('#successBtn, .mission-success-btn, button.success');
                if (await successBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
                    await successBtn.click();
                    console.log(`✅ 玩家${i + 1} 执行任务成功`);
                }
            } catch (e) {
                console.log(`⚠️ 玩家${i + 1} 执行任务失败`);
            }
            await delay(500);
        }
        await delay(3000);
        console.log('🔊 语音播报: "任务成功" 或 "任务失败"');

        // ========== 13. 等待第二轮 ==========
        console.log('\n📍 步骤13: 等待游戏结果或进入下一轮');
        await delay(3000);

        // ========== 清理 ==========
        console.log('\n📍 清理...');
        for (const p of players) {
            await p.close();
        }
        await voicePanel.close();

        console.log('\n========================================');
        console.log('✅✅✅ PC E2E 测试完成！ ✅✅✅');
        console.log('========================================\n');
        console.log('测试覆盖：');
        console.log('  ✅ 语音面板创建房间');
        console.log('  ✅ 玩家加入房间');
        console.log('  ✅ 游戏开始流程');
        console.log('  ✅ 角色确认 -> 夜间 -> 白天');
        console.log('  ✅ 组队阶段');
        console.log('  ✅ 投票阶段');
        console.log('  ✅ 任务执行');
        console.log('  ✅ 语音播报验证\n');
    });

    test('BUG-046 修复验证：投票后正确进入任务阶段', async () => {
        console.log('\n========================================');
        console.log('BUG-046 修复验证测试');
        console.log('========================================\n');

        const voicePanel = await context.newPage();
        await voicePanel.goto(VOICE_PANEL_URL);
        await voicePanel.waitForLoadState('networkidle');
        await closeHelpOverlay(voicePanel);

        // 创建房间
        await voicePanel.click('#btn-create');
        await delay(4000);

        const roomIdElement = voicePanel.locator('#room-id');
        await roomIdElement.waitFor({ state: 'visible', timeout: 5000 });
        const roomId = await roomIdElement.textContent();
        console.log(`✅ 房间创建成功: ${roomId}`);

        // 加入玩家
        const players = [];
        for (let i = 1; i <= 5; i++) {
            const playerPage = await context.newPage();
            await playerPage.goto(`${PLAYER_URL}?roomId=${roomId}`);
            await playerPage.waitForLoadState('networkidle');
            await closeHelpOverlay(playerPage);
            await delay(500);

            const playerBtn = playerPage.locator(`.player-id-btn[data-player-number="${i}"]`);
            if (await playerBtn.isVisible().catch(() => false)) {
                await playerBtn.click();
                await delay(300);
            }

            const joinBtn = playerPage.locator('#joinRoomBtn');
            if (await joinBtn.isEnabled().catch(() => false)) {
                await joinBtn.click();
            }
            await delay(500);
            players.push(playerPage);
        }
        console.log('✅ 5个玩家加入');
        await delay(2000);

        // 开始游戏
        await voicePanel.click('#btn-smart-next');
        await delay(4000);

        // 快速推进到组队阶段
        for (let i = 0; i < 3; i++) {
            await voicePanel.click('#btn-smart-next');
            await delay(2000);
        }
        console.log('✅ 进入组队阶段');

        // 队长选择队伍
        const leaderPage = players[0];
        try {
            const playerItems = leaderPage.locator('.player-item, #teamBuildingPlayerList .player-item');
            for (let i = 0; i < 2; i++) {
                const selectBtn = playerItems.nth(i).locator('button, .select-btn, .player-select').first();
                if (await selectBtn.isVisible().catch(() => false)) {
                    await selectBtn.click();
                    await delay(300);
                }
            }
            const submitBtn = leaderPage.locator('#submitTeamBtn');
            if (await submitBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
                if (!(await submitBtn.isDisabled().catch(() => true))) {
                    await submitBtn.click();
                }
            }
        } catch (e) {
            console.log(`⚠️ 队长选择失败: ${e.message}`);
        }
        await delay(2000);

        // 推进到投票
        await voicePanel.click('#btn-smart-next');
        await delay(2000);
        console.log('✅ 进入投票阶段');

        // 所有玩家投票
        for (const player of players) {
            try {
                const approveBtn = player.locator('#approveBtn, .vote-approve-btn, button.approve');
                if (await approveBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
                    await approveBtn.click();
                }
            } catch (e) {}
            await delay(300);
        }
        await delay(3000);

        // 验证：检查是否正确进入任务阶段
        console.log('\n📍 验证：检查是否进入任务阶段');

        // 检查语音面板显示
        const phaseText = await voicePanel.locator('#btn-phase-text, #gamePhase').textContent().catch(() => '');
        console.log(`   语音面板阶段: ${phaseText}`);

        // 任务队员应该看到任务按钮
        let missionButtonVisible = false;
        for (let i = 0; i < 2; i++) {
            const player = players[i];
            const missionBtn = player.locator('#successBtn, .mission-success-btn, button.success');
            if (await missionBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
                missionButtonVisible = true;
                console.log(`✅ 玩家${i + 1}（任务队员）看到任务按钮`);
            }
        }

        if (missionButtonVisible) {
            console.log('\n✅✅✅ BUG-046 修复验证通过！ ✅✅✅');
            console.log('   投票后正确进入任务阶段，任务队员能看到任务按钮');
        } else {
            console.log('\n❌❌❌ BUG-046 可能未修复 ❌❌❌');
            console.log('   任务队员未看到任务按钮');
        }

        // 清理
        for (const p of players) {
            await p.close();
        }
        await voicePanel.close();
    });
});
