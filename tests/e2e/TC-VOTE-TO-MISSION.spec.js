/**
 * 投票完成后推进测试
 * 专门测试：组队->投票完成后，能否正确推进到任务阶段
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

async function waitAndClick(page, selector, timeout = 5000) {
    await page.locator(selector).waitFor({ state: 'visible', timeout });
    await page.click(selector);
}

test.describe('投票完成后推进测试', () => {
    let browser;

    test.beforeAll(async () => {
        browser = await chromium.launch({
            headless: true,
            slowMo: 50
        });
    });

    test.afterAll(async () => {
        if (browser) {
            await browser.close();
        }
    });

    test('投票完成后应能推进到任务阶段', async () => {
        console.log('\n=== 测试：投票完成后推进 ===');

        const voicePanel = await browser.newPage();
        const consoleLogs = [];
        voicePanel.on('console', msg => {
            consoleLogs.push(`[${msg.type()}] ${msg.text()}`);
            if (msg.text().includes('vote') || msg.text().includes('phase') || msg.text().includes('mission')) {
                console.log(`  [VoicePanel] ${msg.text()}`);
            }
        });

        await voicePanel.goto(VOICE_PANEL_URL);
        await voicePanel.waitForLoadState('networkidle');
        await closeHelpOverlay(voicePanel);

        console.log('1. 创建房间...');
        await waitAndClick(voicePanel, 'button:has-text("创建房间")');
        await voicePanel.waitForTimeout(2000);

        const roomId = await voicePanel.locator('#room-id').textContent();
        console.log(`   房间号: ${roomId}`);

        console.log('2. 加入5个玩家...');
        const players = [];
        for (let i = 1; i <= 5; i++) {
            const playerPage = await browser.newPage();
            playerPage.on('console', msg => {
                if (msg.text().includes('error') || msg.text().includes('Error')) {
                    console.log(`   [Player${i}] ERROR: ${msg.text()}`);
                }
            });

            await playerPage.goto(PLAYER_URL);
            await playerPage.waitForLoadState('networkidle');

            await playerPage.fill('#roomIdInput', roomId);
            await playerPage.click(`#playerIdSelector button:has-text("${i}号")`);
            await playerPage.click('#joinRoomBtn');
            await playerPage.waitForTimeout(300);

            players.push(playerPage);
            console.log(`   玩家 ${i}号 加入`);
        }

        await voicePanel.waitForTimeout(1000);

        console.log('3. 开始游戏 (opening -> role-confirm)...');
        await waitAndClick(voicePanel, '#btn-smart-next');
        await voicePanel.waitForTimeout(500);

        console.log('4. 进入夜间阶段 (role-confirm -> night)...');
        await waitAndClick(voicePanel, '#btn-smart-next');
        await voicePanel.waitForTimeout(500);

        console.log('5. 完成夜间阶段...');
        for (let i = 0; i < 12; i++) {
            await waitAndClick(voicePanel, '#btn-smart-next', 3000);
            await voicePanel.waitForTimeout(100);
        }

        console.log('6. 进入白天阶段 (night -> day)...');
        await waitAndClick(voicePanel, '#btn-smart-next');
        await voicePanel.waitForTimeout(500);

        console.log('7. 进入组队阶段 (day -> team-building)...');
        await waitAndClick(voicePanel, '#btn-smart-next');
        await voicePanel.waitForTimeout(500);

        let phase = await voicePanel.locator('#btn-phase-text').textContent();
        console.log(`   当前阶段: ${phase}`);

        console.log('8. 队长选择队伍...');
        const leader = players[0];
        const missionConfig = { 5: [2, 3, 2, 3, 3] };
        const teamSize = missionConfig[5][0];

        for (let i = 1; i <= teamSize; i++) {
            const btn = leader.locator(`button:has-text("${i}号")`);
            if (await btn.isVisible().catch(() => false)) {
                await btn.click();
                await leader.waitForTimeout(200);
            }
        }

        const confirmBtn = leader.locator('button:has-text("确认队伍")');
        if (await confirmBtn.isVisible().catch(() => false)) {
            await confirmBtn.click();
            console.log('   队伍已确认');
        }

        await voicePanel.waitForTimeout(2000);

        console.log('9. 进入讨论阶段 (team-building -> discussion)...');
        await waitAndClick(voicePanel, '#btn-smart-next');
        await voicePanel.waitForTimeout(500);

        console.log('10. 进入投票阶段 (discussion -> voting)...');
        await waitAndClick(voicePanel, '#btn-smart-next');
        await voicePanel.waitForTimeout(500);

        phase = await voicePanel.locator('#btn-phase-text').textContent();
        console.log(`   当前阶段: ${phase}`);

        console.log('11. 所有玩家投票...');
        for (let i = 0; i < players.length; i++) {
            const player = players[i];
            const approveBtn = player.locator('button:has-text("赞成")');
            if (await approveBtn.isVisible().catch(() => false)) {
                await approveBtn.click();
                console.log(`   玩家${i + 1}投票赞成`);
                await player.waitForTimeout(200);
            } else {
                console.log(`   玩家${i + 1} - 赞成按钮不可见`);
            }
        }

        await voicePanel.waitForTimeout(3000);

        phase = await voicePanel.locator('#btn-phase-text').textContent();
        console.log(`   投票后阶段: ${phase}`);

        console.log('12. 检查是否在投票结果或任务阶段...');
        const inVotingResult = phase.includes('投票结果');
        const inMission = phase.includes('任务');

        if (inVotingResult) {
            console.log('   在投票结果阶段，推进到任务...');
            await waitAndClick(voicePanel, '#btn-smart-next');
            await voicePanel.waitForTimeout(1000);
            phase = await voicePanel.locator('#btn-phase-text').textContent();
            console.log(`   推进后阶段: ${phase}`);
        }

        console.log('\n=== 测试结果 ===');
        console.log(`最终阶段: ${phase}`);
        console.log(`测试: ${(inMission || phase.includes('任务')) ? '✅ 通过' : '❌ 失败'}`);

        console.log('\n控制台日志 (vote/phase/mission 相关):');
        consoleLogs.filter(log =>
            log.includes('vote') || log.includes('phase') || log.includes('mission')
        ).forEach(log => console.log(`  ${log}`));

        for (const p of players) {
            await p.close();
        }
        await voicePanel.close();

        expect(phase.includes('任务')).toBe(true);
    });
});

test.describe.configure({ timeout: 120000 });
test.setTimeout(120000);
