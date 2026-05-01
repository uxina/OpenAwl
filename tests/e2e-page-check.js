/**
 * E2E 调试测试 - 检查页面加载
 */

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const SERVER_URL = 'http://localhost:3000';
const VOICE_PANEL_URL = `${SERVER_URL}/voice-panel-v2.html`;

async function runTest() {
  console.log('\n🎮 E2E 调试测试 - 检查页面加载\n');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  // 捕获所有 console 消息
  page.on('console', msg => {
    console.log(`   📋 [${msg.type()}] ${msg.text()}`);
  });

  page.on('pageerror', error => {
    console.log(`   ❌ 页面错误: ${error.message}`);
  });

  try {
    console.log(`\n正在打开: ${VOICE_PANEL_URL}`);
    const response = await page.goto(VOICE_PANEL_URL, { waitUntil: 'networkidle' });
    console.log(`响应状态: ${response.status()}`);
    console.log(`页面标题: ${await page.title()}`);

    // 等待 3 秒让页面完全加载
    await page.waitForTimeout(3000);

    // 截图
    await page.screenshot({ path: path.join(__dirname, '../debug-page-load.png'), fullPage: true });
    console.log('   ✅ 截图已保存');

    // 检查 HTML 内容
    const pageContent = await page.content();
    console.log(`页面长度: ${pageContent.length} 字符`);

    // 检查 script 标签
    const scripts = await page.$$eval('script[src]', els => els.map(el => el.src));
    console.log(`加载的脚本数量: ${scripts.length}`);
    scripts.forEach(s => console.log(`  ${s}`));

    // 检查是否有 JS 错误
    const jsErrors = await page.evaluate(() => {
      // 尝试访问 gameState
      try {
        return {
          gameStateExists: typeof gameState !== 'undefined',
          socketExists: typeof socket !== 'undefined'
        };
      } catch (e) {
        return { error: e.message };
      }
    });
    console.log(`JS 状态: ${JSON.stringify(jsErrors)}`);

    await browser.close();

  } catch (error) {
    console.error(`❌ 测试失败: ${error.message}`);
    console.error(error.stack);
    await browser.close();
  }
}

runTest();
