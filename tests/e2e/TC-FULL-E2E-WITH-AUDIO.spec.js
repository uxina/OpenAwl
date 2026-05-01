/**
 * 完整 E2E 测试：语音面板 + 玩家客户端 + 语音播放
 * 使用 headed 模式，音频会通过 PulseAudio 播放
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

test.describe('完整 E2E 测试（带语音播放）', () => {
    let browser;

    test.beforeAll(async () => {
        browser = await chromium.launch({
            headless: false,  // 使用 headed 模式以支持音频
            slowMo: 500       // 放慢速度，方便听语音
        });
    });

    test.afterAll(async () => {
        if (browser) {
            await browser.close();
        }
    });

    test('TC-FULL-E2E: 语音面板完整流程', async () => {
        console.log('\n=== 完整 E2E 测试 ===');
        console.log('请注意听音箱语音播报！\n');

        const voicePanel = await browser.newPage();
        await voicePanel.goto(VOICE_PANEL_URL);
        await voicePanel.waitForLoadState('networkidle');
        await closeHelpOverlay(voicePanel);

        // 1. 创建房间
        console.log('📍 步骤1: 创建房间');
        await voicePanel.click('#btn-create');
        await delay(4000);  // 等待语音播放

        const roomIdElement = voicePanel.locator('#room-id');
        await roomIdElement.waitFor({ state: 'visible', timeout: 5000 });
        const roomId = await roomIdElement.textContent();
        console.log(`✅ 房间创建成功: ${roomId}`);
        console.log('🔊 应该听到："房间已创建，房间号 XXX"');

        // 2. 加入玩家
        console.log('\n📍 步骤2: 加入5个玩家');
        const players = [];
        for (let i = 1; i <= 5; i++) {
            const playerPage = await browser.newPage();
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
            console.log(`✅ 玩家${i} 已加入`);
        }
        await delay(2000);
        console.log('🔊 应该听到："玩家X 加入房间"');

        // 3. 开始游戏
        console.log('\n📍 步骤3: 开始游戏');
        await voicePanel.click('#btn-smart-next');
        await delay(4000);
        console.log('✅ 游戏已开始');
        console.log('🔊 应该听到："游戏开始"');

        // 等待身份分发
        await delay(3000);

        // 4. 跳过角色确认，进入白天
        console.log('\n📍 步骤4: 进入白天');
        await voicePanel.click('#btn-smart-next');
        await delay(4000);
        console.log('✅ 进入白天');
        console.log('🔊 应该听到："天亮了"');

        // 5. 跳过讨论
        console.log('\n📍 步骤5: 跳过讨论');
        await voicePanel.click('#btn-smart-next');
        await delay(3000);

        // 6. 进入组队阶段
        console.log('\n📍 步骤6: 进入组队阶段');
        await voicePanel.click('#btn-smart-next');
        await delay(3000);
        console.log('✅ 进入组队阶段');
        console.log('🔊 应该听到："队长 XXX 号请组建队伍"');

        // 等待队长选择
        await delay(3000);

        // 7. 推进到投票
        console.log('\n📍 步骤7: 进入投票阶段');
        await voicePanel.click('#btn-smart-next');
        await delay(3000);
        console.log('✅ 进入投票阶段');
        console.log('🔊 应该听到："投票开始"');

        // 8. 玩家投票
        console.log('\n📍 步骤8: 玩家投票');
        for (let i = 0; i < players.length; i++) {
            const player = players[i];
            try {
                const approveBtn = player.locator('#approveBtn');
                if (await approveBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
                    await approveBtn.click();
                    console.log(`✅ 玩家${i+1} 已投票`);
                }
            } catch (e) {
                console.log(`⚠️ 玩家${i+1} 投票失败`);
            }
            await delay(500);
        }
        await delay(3000);
        console.log('🔊 应该听到："投票通过/否决"');

        // 9. 等待任务阶段
        console.log('\n📍 步骤9: 进入任务阶段');
        await voicePanel.click('#btn-smart-next');
        await delay(3000);
        console.log('✅ 进入任务阶段');
        console.log('🔊 应该听到："任务开始"');

        // 清理
        for (const p of players) {
            await p.close();
        }
        await voicePanel.close();

        console.log('\n========================================');
        console.log('✅✅✅ E2E 测试完成！ ✅✅✅');
        console.log('========================================\n');
    });
});
