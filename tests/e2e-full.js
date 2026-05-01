/**
 * E2E 完整测试 - 保持页面打开
 */
const { chromium } = require('playwright');

const BASE = 'http://127.0.0.1:3000';

async function run() {
  console.log('🔍 E2E 完整测试\n');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();

  // 语音面板
  const voicePage = await context.newPage();
  voicePage.on('console', msg => {
    if (msg.type() === 'error') console.log('  [Voice Error]', msg.text());
  });
  await voicePage.goto(BASE + '/voice-panel-v2.html');
  await voicePage.waitForTimeout(2000);

  // 创建5人房间
  await voicePage.evaluate(() => {
    gameState.playerCount = 5;
    document.getElementById('player-count').textContent = '5';
  });
  await voicePage.click('#btn-create');
  await voicePage.waitForTimeout(2000);

  const roomId = await voicePage.evaluate(() => document.getElementById('room-id').textContent);
  console.log('房间:', roomId);

  const initialStatus = await voicePage.evaluate(() => document.getElementById('player-status').textContent);
  console.log('初始玩家显示:', initialStatus);

  // 打开5个玩家页面并加入（保持页面打开）
  const playerPages = [];
  for (let i = 0; i < 5; i++) {
    const page = await context.newPage();
    await page.goto(BASE + '/player-modular.html?roomId=' + roomId);
    await page.waitForTimeout(1000);
    await page.fill('#roomIdInput', roomId);
    await page.waitForTimeout(300);
    await page.click(`.player-id-btn[data-player-id="${i + 1}"]`);
    await page.waitForTimeout(200);
    await page.click('#joinRoomBtn');
    await page.waitForTimeout(500);
    playerPages.push(page);
    console.log(`P${i+1} 已加入`);

    // 每加入1个玩家就检查语音面板状态
    await voicePage.waitForTimeout(500);
    const status = await voicePage.evaluate(() => document.getElementById('player-status').textContent);
    console.log(`  加入后语音面板显示: ${status}`);
  }

  // 等待语音面板最终更新
  await voicePage.waitForTimeout(2000);

  const finalStatus = await voicePage.evaluate(() => document.getElementById('player-status').textContent);
  const btnText = await voicePage.evaluate(() => document.getElementById('smart-next-text').textContent);
  const gamePhase = await voicePage.evaluate(() => gameState.gamePhase);
  console.log('\n最终语音面板显示:', finalStatus);
  console.log('按钮文字:', btnText);
  console.log('游戏阶段:', gamePhase);

  // 点击推进
  try {
    await voicePage.click('#btn-smart-next');
    await voicePage.waitForTimeout(3000);
    console.log('已点击推进按钮');
  } catch (e) {
    console.log('点击失败:', e.message);
  }

  // 检查推进后阶段
  const phaseAfter = await voicePage.evaluate(() => gameState.gamePhase);
  console.log('推进后阶段:', phaseAfter);

  // 检查玩家页面状态
  if (playerPages.length > 0) {
    const playerPhase = await playerPages[0].evaluate(() => gameState.gamePhase).catch(() => 'unknown');
    console.log('玩家端阶段:', playerPhase);
  }

  const bug1Fixed = finalStatus.includes('5/5');
  const bug2Fixed = phaseAfter !== 'waiting';

  console.log('\n' + '='.repeat(50));
  console.log(`Bug 1 (语音面板显示玩家): ${bug1Fixed ? '✅ 已修复' : '❌ 未修复'} (${finalStatus})`);
  console.log(`Bug 2 (语音面板推进): ${bug2Fixed ? '✅ 已修复' : '❌ 未修复'} (waiting -> ${phaseAfter})`);
  console.log('='.repeat(50));

  // 关闭所有页面
  await voicePage.close();
  for (const p of playerPages) {
    await p.close();
  }
  await browser.close();

  process.exit(bug1Fixed && bug2Fixed ? 0 : 1);
}

run().catch(err => {
  console.error('E2E 异常:', err);
  process.exit(1);
});
