/**
 * E2E 调试测试 - 截图查看页面状态
 */

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const SERVER_URL = 'http://localhost:3000';
const VOICE_PANEL_URL = `${SERVER_URL}/voice-panel-v2.html`;

async function runTest() {
  console.log('\n🎮 E2E 调试测试\n');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  // 收集所有 console 日志
  page.on('console', msg => {
    console.log(`   📋 [${msg.type()}] ${msg.text()}`);
  });

  try {
    console.log('\n📋 步骤1: 打开语音面板...');
    await page.goto(VOICE_PANEL_URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    
    // 截图 1: 初始状态
    await page.screenshot({ path: path.join(__dirname, '../debug-step1-init.png') });
    console.log('   ✅ 截图 1 已保存');

    // 检查按钮状态
    const btnCreate = await page.$('#btn-create');
    const btnDisabled = await btnCreate.evaluate(el => el.disabled);
    console.log(`   按钮 disabled: ${btnDisabled}`);

    // 检查 socket 状态
    console.log('\n📋 步骤2: 检查 socket 状态...');
    const socketStatus = await page.evaluate(() => {
      return typeof window.socket !== 'undefined';
    });
    console.log(`   socket 存在: ${socketStatus}`);

    // 点击创建按钮
    console.log('\n📋 步骤3: 点击创建房间...');
    await page.click('#btn-create');
    await page.waitForTimeout(3000);

    // 截图 2: 点击后
    await page.screenshot({ path: path.join(__dirname, '../debug-step2-after-click.png') });
    console.log('   ✅ 截图 2 已保存');

    // 检查房间ID
    const roomId = await page.$eval('#room-id', el => el.textContent);
    console.log(`   房间ID: ${roomId}`);

    // 检查 localStorage
    const localStorageRoomId = await page.evaluate(() => localStorage.getItem('voicePanel_roomId'));
    console.log(`   localStorage roomId: ${localStorageRoomId}`);

    // 检查 gameState
    const gameStateRoomId = await page.evaluate(() => window.gameState?.roomId);
    console.log(`   gameState.roomId: ${gameStateRoomId}`);

    await browser.close();
    return true;

  } catch (error) {
    console.error(`❌ 测试失败: ${error.message}`);
    await browser.close();
    return false;
  }
}

runTest();
