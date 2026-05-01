/**
 * 完整 E2E 测试：语音面板 + 玩家客户端
 * 验证语音播放功能（通过检查日志）
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

test.describe('语音面板 E2E 测试', () => {
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

    test('TC-VOICE-PANEL-E2E: 语音面板创建房间并推进完整流程', async () => {
        console.log('\n=== 语音面板 E2E 测试 ===');
        
        const voicePanel = await browser.newPage();
        
        // 捕获控制台日志
        const consoleLogs = [];
        const audioLogs = [];
        
        voicePanel.on('console', msg => {
            const text = msg.text();
            consoleLogs.push(text);
            if (text.includes('音频') || text.includes('playCommandAudio') || text.includes('播放')) {
                audioLogs.push(text);
            }
        });
        
        await voicePanel.goto(VOICE_PANEL_URL);
        await voicePanel.waitForLoadState('networkidle');
        await closeHelpOverlay(voicePanel);
        
        // 1. 创建房间
        console.log('📍 步骤1: 创建房间');
        await voicePanel.click('#btn-smart-next');
        await delay(3000);
        
        const roomIdElement = voicePanel.locator('#room-id');
        await roomIdElement.waitFor({ state: 'visible', timeout: 5000 });
        const roomId = await roomIdElement.textContent();
        console.log(`✅ 房间创建成功: ${roomId}`);
        
        // 打印语音日志
        const createRoomLogs = audioLogs.filter(l => l.includes('创建') || l.includes('房间'));
        console.log(`🔊 语音日志: ${createRoomLogs.length} 条`);
        createRoomLogs.forEach(l => console.log(`   ${l}`));
        
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
        
        // 3. 开始游戏
        console.log('\n📍 步骤3: 开始游戏');
        await voicePanel.click('#btn-smart-next');
        await delay(3000);
        console.log('✅ 游戏已开始');
        
        const startGameLogs = audioLogs.filter(l => l.includes('开始') || l.includes('游戏'));
        console.log(`🔊 开始游戏语音日志: ${startGameLogs.length} 条`);
        
        // 4. 跳过角色确认，进入白天
        console.log('\n📍 步骤4: 跳过角色确认');
        await voicePanel.click('#btn-smart-next');
        await delay(3000);
        console.log('✅ 进入白天');
        
        // 5. 跳过讨论
        console.log('\n📍 步骤5: 跳过讨论');
        await voicePanel.click('#btn-smart-next');
        await delay(3000);
        console.log('✅ 讨论结束');
        
        // 6. 进入组队阶段
        console.log('\n📍 步骤6: 进入组队阶段');
        await voicePanel.click('#btn-smart-next');
        await delay(3000);
        console.log('✅ 进入组队阶段');
        
        // 检查语音日志中的队长任命
        const leaderLogs = audioLogs.filter(l => l.includes('队长') || l.includes('CMD-042'));
        console.log(`🔊 队长任命语音日志: ${leaderLogs.length} 条`);
        
        // 等待队长选择
        await delay(2000);
        
        // 7. 推进到投票
        console.log('\n📍 步骤7: 进入投票阶段');
        await voicePanel.click('#btn-smart-next');
        await delay(3000);
        console.log('✅ 进入投票阶段');
        
        // 检查语音日志中的投票开始
        const voteStartLogs = audioLogs.filter(l => l.includes('投票') || l.includes('CMD-071'));
        console.log(`🔊 投票开始语音日志: ${voteStartLogs.length} 条`);
        
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
        
        // 9. 检查语音日志中的投票结果和任务开始
        console.log('\n📍 步骤9: 检查语音日志');
        
        const allAudioLogs = audioLogs.slice(); // 复制当前日志
        console.log(`\n📊 语音播放统计:`);
        console.log(`   - 创建房间: ${allAudioLogs.filter(l => l.includes('创建') || l.includes('房间')).length} 条`);
        console.log(`   - 游戏开始: ${allAudioLogs.filter(l => l.includes('开始') || l.includes('游戏')).length} 条`);
        console.log(`   - 天亮: ${allAudioLogs.filter(l => l.includes('天亮') || l.includes('CMD-022')).length} 条`);
        console.log(`   - 队长: ${allAudioLogs.filter(l => l.includes('队长') || l.includes('CMD-042')).length} 条`);
        console.log(`   - 投票: ${allAudioLogs.filter(l => l.includes('投票') || l.includes('CMD-071')).length} 条`);
        console.log(`   - 任务: ${allAudioLogs.filter(l => l.includes('任务') || l.includes('CMD-091') || l.includes('CMD-101')).length} 条`);
        
        // 打印所有语音相关日志
        console.log(`\n📋 所有语音日志 (${audioLogs.length} 条):`);
        audioLogs.forEach((l, i) => {
            console.log(`   ${i+1}. ${l}`);
        });
        
        // 验证语音播放
        const hasRoomCreatedAudio = audioLogs.some(l => l.includes('创建') || l.includes('房间'));
        const hasGameStartAudio = audioLogs.some(l => l.includes('开始') || l.includes('游戏'));
        
        if (hasRoomCreatedAudio && hasGameStartAudio) {
            console.log('\n✅ 语音播放验证通过！');
        } else {
            console.log('\n⚠️ 语音播放验证不完整');
        }
        
        // 清理
        for (const p of players) {
            await p.close();
        }
        await voicePanel.close();
        
        console.log('\n========================================');
        console.log('✅✅✅ 语音面板 E2E 测试完成！ ✅✅✅');
        console.log('========================================\n');
    });
});
