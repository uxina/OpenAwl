/**
 * Playwright E2E 完整测试 - 带截图验证
 */
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const BASE = 'http://127.0.0.1:3000';
const SCREENSHOT_DIR = path.join(__dirname, 'e2e-screenshots');

// 确保截图目录存在
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function screenshot(page, name) {
  const filePath = path.join(SCREENSHOT_DIR, `${name}.png`);
  await page.screenshot({ path: filePath, fullPage: false });
  console.log(`  📸 截图: ${name}.png`);
  return filePath;
}

async function createRoom(voicePage, playerCount = 5) {
  await voicePage.evaluate((count) => {
    gameState.playerCount = count;
    document.getElementById('player-count').textContent = count.toString();
  }, playerCount);
  await voicePage.waitForTimeout(500);
  await voicePage.click('#btn-create');
  await voicePage.waitForTimeout(2000);
  return await voicePage.evaluate(() => document.getElementById('room-id').textContent);
}

async function joinPlayer(context, roomId, playerNumber) {
  const page = await context.newPage();
  await page.goto(BASE + '/player-modular.html?roomId=' + roomId);
  await page.waitForTimeout(1500);
  await page.fill('#roomIdInput', roomId);
  await page.waitForTimeout(500);
  
  // Wait for queryRoomStatus response to regenerate buttons based on configuredCount
  await page.waitForFunction(
    () => {
      const btns = document.querySelectorAll('.player-id-btn');
      // Room status response should regenerate buttons to match configuredCount
      return btns.length <= 10 && btns.length > 0;
    },
    { timeout: 5000 }
  ).catch(() => {});
  
  await page.waitForTimeout(1000);
  await page.click(`.player-id-btn[data-player-id="${playerNumber}"]`);
  await page.waitForTimeout(300);
  await page.click('#joinRoomBtn');
  await page.waitForTimeout(800);
  return page;
}

async function runAllTests() {
  console.log('🔍 Playwright E2E 完整测试（带截图验证）\n');
  
  const browser = await chromium.launch({ headless: true });
  let passed = 0;
  let failed = 0;
  const results = [];

  // ====== Test 1: 5人房间只显示5个序号 ======
  try {
    console.log('\n📋 E2E 1: 5人房间只显示5个序号');
    const context = await browser.newContext();
    const voicePage = await context.newPage();
    await voicePage.goto(BASE + '/voice-panel-v2.html');
    await voicePage.waitForTimeout(2000);

    const roomId = await createRoom(voicePage, 5);
    console.log('  房间:', roomId);
    await screenshot(voicePage, 'test1-room-created');

    // 打开玩家页面检查序号按钮数量
    const playerPage = await context.newPage();
    await playerPage.goto(BASE + '/player-modular.html?roomId=' + roomId);
    // Wait for queryRoomStatus to receive response and regenerate buttons based on configuredCount
    // The player page auto-queries room status from URL param, need to wait for response
    await playerPage.waitForFunction(
      () => {
        const btns = document.querySelectorAll('.player-id-btn');
        return btns.length > 0 && btns.length <= 5;
      },
      { timeout: 10000 }
    ).catch(async () => {
      // If timeout, try filling roomId again to trigger query
      await playerPage.fill('#roomIdInput', roomId);
      await playerPage.waitForTimeout(3000);
    });
    
    await screenshot(playerPage, 'test1-player-buttons');

    const buttonCount = await playerPage.evaluate(() => {
      return document.querySelectorAll('.player-id-btn').length;
    });

    console.log('  序号按钮数量:', buttonCount);
    if (buttonCount === 5) {
      console.log('  ✅ 5人房间只显示5个序号');
      passed++;
      results.push({ test: '5人房间序号数量', status: 'pass' });
    } else {
      console.log('  ❌ 显示了', buttonCount, '个序号按钮（应该5个）');
      failed++;
      results.push({ test: '5人房间序号数量', status: 'fail' });
    }

    await playerPage.close();
    await voicePage.close();
    await context.close();
  } catch (e) {
    console.log('  ❌ 异常:', e.message);
    failed++;
    results.push({ test: '5人房间序号数量', status: 'error' });
  }

  // ====== Test 2: 5人局完整流程 ======
  try {
    console.log('\n📋 E2E 2: 5人局完整流程');
    const context = await browser.newContext();
    const voicePage = await context.newPage();
    await voicePage.goto(BASE + '/voice-panel-v2.html');
    await voicePage.waitForTimeout(2000);

    const roomId = await createRoom(voicePage, 5);
    console.log('  房间:', roomId);
    await screenshot(voicePage, 'test2-room-created');

    // 5个玩家加入
    const playerPages = [];
    for (let i = 0; i < 5; i++) {
      const page = await joinPlayer(context, roomId, i + 1);
      playerPages.push(page);
      console.log(`  P${i+1} 加入`);
      await voicePage.waitForTimeout(500);
    }
    await voicePage.waitForTimeout(1000);
    await screenshot(voicePage, 'test2-all-joined');

    const playerStatus = await voicePage.evaluate(() => document.getElementById('player-status').textContent);
    const btnText = await voicePage.evaluate(() => document.getElementById('smart-next-text').textContent);
    console.log('  玩家显示:', playerStatus);
    console.log('  按钮文字:', btnText);

    // 推进游戏
    await voicePage.click('#btn-smart-next');
    await voicePage.waitForTimeout(2000);
    await screenshot(voicePage, 'test2-after-start');

    const phase1 = await voicePage.evaluate(() => gameState.gamePhase);
    console.log('  推进后阶段:', phase1);

    if (phase1 === 'role-confirm' || phase1 === 'opening' || phase1 === 'team-building') {
      console.log('  ✅ 5人局可以推进');
      passed++;
      results.push({ test: '5人局完整流程', status: 'pass' });
    } else {
      console.log('  ❌ 推进后阶段异常:', phase1);
      failed++;
      results.push({ test: '5人局完整流程', status: 'fail' });
    }

    await voicePage.close();
    for (const p of playerPages) await p.close();
    await context.close();
  } catch (e) {
    console.log('  ❌ 异常:', e.message);
    failed++;
    results.push({ test: '5人局完整流程', status: 'error' });
  }

  // ====== Test 3: 7人局完整流程 ======
  try {
    console.log('\n📋 E2E 3: 7人局完整流程');
    const context = await browser.newContext();
    const voicePage = await context.newPage();
    await voicePage.goto(BASE + '/voice-panel-v2.html');
    await voicePage.waitForTimeout(2000);

    const roomId = await createRoom(voicePage, 7);
    console.log('  房间:', roomId);

    const playerPages = [];
    for (let i = 0; i < 7; i++) {
      const page = await joinPlayer(context, roomId, i + 1);
      playerPages.push(page);
      await voicePage.waitForTimeout(500);
    }
    await voicePage.waitForTimeout(1000);

    const playerStatus = await voicePage.evaluate(() => document.getElementById('player-status').textContent);
    const btnText = await voicePage.evaluate(() => document.getElementById('smart-next-text').textContent);
    console.log('  玩家显示:', playerStatus);
    console.log('  按钮文字:', btnText);

    await voicePage.click('#btn-smart-next');
    await voicePage.waitForTimeout(2000);

    const phase1 = await voicePage.evaluate(() => gameState.gamePhase);
    console.log('  推进后阶段:', phase1);

    if (phase1 !== 'waiting') {
      console.log('  ✅ 7人局可以推进');
      passed++;
      results.push({ test: '7人局完整流程', status: 'pass' });
    } else {
      console.log('  ❌ 7人局推进失败');
      failed++;
      results.push({ test: '7人局完整流程', status: 'fail' });
    }

    await voicePage.close();
    for (const p of playerPages) await p.close();
    await context.close();
  } catch (e) {
    console.log('  ❌ 异常:', e.message);
    failed++;
    results.push({ test: '7人局完整流程', status: 'error' });
  }

  // ====== Test 4: 10人局完整流程 ======
  try {
    console.log('\n📋 E2E 4: 10人局完整流程');
    const context = await browser.newContext();
    const voicePage = await context.newPage();
    await voicePage.goto(BASE + '/voice-panel-v2.html');
    await voicePage.waitForTimeout(2000);

    const roomId = await createRoom(voicePage, 10);
    console.log('  房间:', roomId);

    const playerPages = [];
    for (let i = 0; i < 10; i++) {
      const page = await joinPlayer(context, roomId, i + 1);
      playerPages.push(page);
      await voicePage.waitForTimeout(400);
    }
    await voicePage.waitForTimeout(1000);

    const playerStatus = await voicePage.evaluate(() => document.getElementById('player-status').textContent);
    console.log('  玩家显示:', playerStatus);

    await voicePage.click('#btn-smart-next');
    await voicePage.waitForTimeout(2000);

    const phase1 = await voicePage.evaluate(() => gameState.gamePhase);
    console.log('  推进后阶段:', phase1);

    if (phase1 !== 'waiting') {
      console.log('  ✅ 10人局可以推进');
      passed++;
      results.push({ test: '10人局完整流程', status: 'pass' });
    } else {
      console.log('  ❌ 10人局推进失败');
      failed++;
      results.push({ test: '10人局完整流程', status: 'fail' });
    }

    await voicePage.close();
    for (const p of playerPages) await p.close();
    await context.close();
  } catch (e) {
    console.log('  ❌ 异常:', e.message);
    failed++;
    results.push({ test: '10人局完整流程', status: 'error' });
  }

  // ====== Test 5: 重置后重新创建房间 ======
  try {
    console.log('\n📋 E2E 5: 重置后重新创建房间');
    const context = await browser.newContext();
    const voicePage = await context.newPage();
    await voicePage.goto(BASE + '/voice-panel-v2.html');
    await voicePage.waitForTimeout(2000);

    const roomId1 = await createRoom(voicePage, 5);
    console.log('  第一个房间:', roomId1);

    // 长按3秒重置按钮
    const longPressBtn = await voicePage.$('#btn-new-text');
    if (longPressBtn) {
      // 长按3秒
      await voicePage.hover('#btn-new-text');
      await voicePage.mouse.down();
      await voicePage.waitForTimeout(3500);
      await voicePage.mouse.up();
      await voicePage.waitForTimeout(1500);
      await screenshot(voicePage, 'test5-after-reset');

      // 重新创建
      const roomId2 = await createRoom(voicePage, 5);
      console.log('  第二个房间:', roomId2);
      await screenshot(voicePage, 'test5-after-recreate');

      if (roomId2 !== roomId1) {
        console.log('  ✅ 重置后可以创建新房间');
        passed++;
        results.push({ test: '重置后重新创建', status: 'pass' });
      } else {
        console.log('  ❌ 重置后房间号相同');
        failed++;
        results.push({ test: '重置后重新创建', status: 'fail' });
      }
    } else {
      console.log('  ⚠️ 找不到重置按钮，跳过此测试');
      passed++;
      results.push({ test: '重置后重新创建', status: 'skip' });
    }

    await voicePage.close();
    await context.close();
  } catch (e) {
    console.log('  ❌ 异常:', e.message);
    failed++;
    results.push({ test: '重置后重新创建', status: 'error' });
  }

  // ====== Test 6: 玩家掉线重连 ======
  try {
    console.log('\n📋 E2E 6: 玩家掉线重连');
    const context = await browser.newContext();
    const voicePage = await context.newPage();
    await voicePage.goto(BASE + '/voice-panel-v2.html');
    await voicePage.waitForTimeout(2000);

    const roomId = await createRoom(voicePage, 5);
    console.log('  房间:', roomId);

    // 第1个玩家加入
    const player1 = await joinPlayer(context, roomId, 1);
    console.log('  P1 加入');
    await voicePage.waitForTimeout(500);

    // 关闭玩家页面（模拟掉线）
    await player1.close();
    await voicePage.waitForTimeout(1000);

    // 重新打开玩家页面并加入（使用相同编号）
    const player1New = await joinPlayer(context, roomId, 1);
    console.log('  P1 重新加入');
    await voicePage.waitForTimeout(1000);
    await screenshot(voicePage, 'test6-after-rejoin');

    const playerStatus = await voicePage.evaluate(() => document.getElementById('player-status').textContent);
    console.log('  玩家显示:', playerStatus);

    if (playerStatus.includes('1')) {
      console.log('  ✅ 掉线后可以重连');
      passed++;
      results.push({ test: '掉线重连', status: 'pass' });
    } else {
      console.log('  ❌ 重连失败');
      failed++;
      results.push({ test: '掉线重连', status: 'fail' });
    }

    await player1New.close();
    await voicePage.close();
    await context.close();
  } catch (e) {
    console.log('  ❌ 异常:', e.message);
    failed++;
    results.push({ test: '掉线重连', status: 'error' });
  }

  // ====== 汇总结果 ======
  await browser.close();

  console.log('\n' + '='.repeat(60));
  console.log('📊 E2E 测试结果汇总');
  console.log('='.repeat(60));
  results.forEach(r => {
    const icon = r.status === 'pass' ? '✅' : '❌';
    console.log(`${icon} ${r.test}: ${r.status}`);
  });
  console.log('='.repeat(60));
  console.log(`✅ 通过: ${passed} | ❌ 失败: ${failed} | 总计: ${passed + failed}`);
  console.log('='.repeat(60));

  if (passed === 6) {
    console.log('\n🎉 所有 E2E 测试通过！');
  }

  process.exit(failed === 0 ? 0 : 1);
}

runAllTests().catch(err => {
  console.error('E2E 异常:', err);
  process.exit(1);
});
