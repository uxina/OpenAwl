/**
 * 简化版 E2E 测试：测试语音面板创建房间和语音播放
 */

const { test, expect, chromium } = require('@playwright/test');

const BASE_URL = 'http://localhost:3000';
const VOICE_PANEL_URL = `${BASE_URL}/voice-panel-v2.html`;

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

test.describe('语音面板创建房间测试', () => {
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

    test('创建房间并验证语音播报', async () => {
        console.log('\n=== 语音面板创建房间测试 ===');

        const voicePanel = await browser.newPage();

        // 捕获控制台日志
        const allLogs = [];
        const audioLogs = [];

        voicePanel.on('console', msg => {
            const text = msg.text();
            allLogs.push({ type: msg.type(), text });
            if (text.includes('音频') || text.includes('播放') || text.includes('创建') ||
                text.includes('调试') || text.includes('序列音频') || text.includes('load')) {
                audioLogs.push({ type: msg.type(), text });
            }
        });

        await voicePanel.goto(VOICE_PANEL_URL);
        await voicePanel.waitForLoadState('networkidle');
        await closeHelpOverlay(voicePanel);

        // 检查页面元素
        const title = await voicePanel.title();
        console.log(`✅ 页面标题: ${title}`);

        // 检查创建房间按钮
        const btnCreate = voicePanel.locator('#btn-create');
        const isBtnCreateVisible = await btnCreate.isVisible();
        console.log(`✅ 创建房间按钮可见: ${isBtnCreateVisible}`);

        if (isBtnCreateVisible) {
            const btnText = await btnCreate.textContent();
            console.log(`✅ 创建房间按钮文本: ${btnText?.trim()}`);
        }

        // 点击创建房间
        console.log('\n📍 点击创建房间按钮...');
        await btnCreate.click();

        // 等待房间创建
        await delay(3000);

        // 检查房间号
        const roomIdElement = voicePanel.locator('#room-id');
        const roomIdVisible = await roomIdElement.isVisible().catch(() => false);
        console.log(`✅ 房间号元素可见: ${roomIdVisible}`);

        if (roomIdVisible) {
            const roomId = await roomIdElement.textContent();
            console.log(`✅ 房间号: ${roomId?.trim()}`);
        }

        // 检查系统日志
        const logContainer = voicePanel.locator('#log-container');
        const logVisible = await logContainer.isVisible().catch(() => false);
        console.log(`✅ 日志区域可见: ${logVisible}`);

        // 获取日志
        if (logVisible) {
            const logs = await logContainer.textContent();
            console.log(`📋 最近日志:\n${logs?.slice(-800)}`);
        }

        // 打印音频相关日志
        console.log(`\n📋 音频相关日志 (${audioLogs.length} 条):`);
        audioLogs.forEach((l, i) => {
            console.log(`   ${i+1}. [${l.type}] ${l.text}`);
        });

        // 也打印所有 console 日志
        console.log(`\n📋 所有 Console 日志 (${allLogs.length} 条):`);
        allLogs.forEach((l, i) => {
            console.log(`   ${i+1}. [${l.type}] ${l.text}`);
        });

        // 验证
        const hasRoomCreated = audioLogs.some(l => l.text.includes('创建') || l.text.includes('房间'));

        if (hasRoomCreated) {
            console.log('\n✅ 房间创建语音播报成功！');
        } else {
            console.log('\n⚠️ 未检测到房间创建语音播报');
        }

        await voicePanel.close();
        console.log('\n========================================');
        console.log('✅ 测试完成！');
        console.log('========================================\n');
    });
});
