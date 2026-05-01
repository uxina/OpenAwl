/**
 * E2E 调试测试 - 完整检查创建房间流程
 */

const { chromium } = require('playwright');
const path = require('path');

const SERVER_URL = 'http://localhost:3000';
const VOICE_PANEL_URL = `${SERVER_URL}/voice-panel-v2.html`;

async function runTest() {
  console.log('\n🎮 E2E 完整调试测试\n');

  const browser = await chromium.launch({ headless: false }); // 非 headless 可以看
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    console.log(`正在打开: ${VOICE_PANEL_URL}`);
    await page.goto(VOICE_PANEL_URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // 步骤 1: 点击创建房间
    console.log('\n📋 步骤1: 点击创建房间按钮...');
    await page.click('#btn-create');
    await page.waitForTimeout(5000);

    // 读取页面日志
    console.log('\n📋 步骤2: 读取页面日志...');
    const logs = await page.$$eval('#log-container .log-entry', els => 
      els.map(el => el.textContent)
    );
    console.log('页面日志:');
    logs.forEach(l => console.log(`  ${l}`));

    // 检查房间 ID
    const roomId = await page.$eval('#room-id', el => el.textContent);
    console.log(`\n房间 ID: ${roomId}`);

    // 检查 gameState
    const gameStateInfo = await page.evaluate(() => {
      return {
        roomId: window.gameState?.roomId,
        playerCount: window.gameState?.playerCount,
        phase: window.gameState?.gamePhase
      };
    });
    console.log(`gameState: ${JSON.stringify(gameStateInfo)}`);

    // 检查标记变量
    const markers = await page.evaluate(() => {
      return {
        hasCreatedRoom: window.hasCreatedRoom,
        isUserInitiatedCreate: window.isUserInitiatedCreate,
        hasSentCreateRequest: window.hasSentCreateRequest
      };
    });
    console.log(`标记: ${JSON.stringify(markers)}`);

    await browser.close();
    console.log('\n✅ 测试完成');

  } catch (error) {
    console.error(`❌ 测试失败: ${error.message}`);
    await browser.close();
  }
}

runTest();
