/**
 * Playwright E2E 测试 - BUG-052: 队长没有看到组队按钮
 * 验证: 当玩家是队长时，能正确看到组队按钮和队员选择界面
 */
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const BASE = 'http://127.0.0.1:3000';
const SCREENSHOT_DIR = path.join(__dirname, 'e2e-screenshots');

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function screenshot(page, name) {
  const filePath = path.join(SCREENSHOT_DIR, `leader-${name}.png`);
  await page.screenshot({ path: filePath, fullPage: false });
  console.log(`  📸 截图: leader-${name}.png`);
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
  await page.waitForTimeout(1000);
  await page.waitForFunction(
    () => document.querySelectorAll('.player-id-btn').length <= 10,
    { timeout: 5000 }
  ).catch(() => {});
  await page.waitForTimeout(1000);
  await page.click(`.player-id-btn[data-player-id="${playerNumber}"]`);
  await page.waitForTimeout(300);
  await page.click('#joinRoomBtn');
  await page.waitForTimeout(1000);
  return page;
}

async function advancePhase(voicePage, maxAttempts = 30) {
  for (let i = 0; i < maxAttempts; i++) {
    const currentPhase = await voicePage.evaluate(() => gameState.gamePhase);
    console.log(`    [advancePhase] 尝试 ${i + 1}/${maxAttempts}, 当前阶段: ${currentPhase}`);
    if (currentPhase === 'team-building') break;
    
    const btnText = await voicePage.evaluate(() => {
      const el = document.getElementById('btn-smart-next');
      return el ? el.textContent : '';
    });
    if (btnText.includes('等待') || btnText.includes('锁定')) {
      await voicePage.waitForTimeout(1500);
      continue;
    }
    await voicePage.evaluate(() => smartNext());
    await voicePage.waitForTimeout(1000);
  }
  return await voicePage.evaluate(() => gameState.gamePhase);
}

async function runTests() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  let passed = 0;
  let failed = 0;
  const results = [];

  try {
    console.log('🎮 开始 BUG-052 测试: 队长没有看到组队按钮');
    console.log('='.repeat(60));

    // 1. 语音面板创建房间
    const voicePage = await context.newPage();
    await voicePage.goto(BASE + '/voice-panel-v2.html');
    await voicePage.waitForTimeout(2000);
    const roomId = await createRoom(voicePage);
    console.log(`  ✅ 房间创建成功: ${roomId}`);

    // 2. 5个玩家加入
    const playerPages = [];
    for (let i = 1; i <= 5; i++) {
      const page = await joinPlayer(context, roomId, i);
      playerPages.push(page);
      console.log(`  ✅ ${i}号玩家加入`);
    }
    await voicePage.waitForTimeout(2000);
    await screenshot(voicePage, '1-all-joined');

    // 3. 开始游戏（推进到 role-confirm）
    await voicePage.evaluate(() => smartNext());
    await voicePage.waitForTimeout(3000);
    const gamePhase = await voicePage.evaluate(() => gameState.gamePhase);
    console.log(`  游戏阶段: ${gamePhase}`);

    // 4. 确认角色（推进到 night）
    for (let p = 0; p < playerPages.length; p++) {
      await playerPages[p].evaluate(() => {
        const btn = document.getElementById('confirmRoleBtn');
        if (btn) btn.click();
      });
      await voicePage.waitForTimeout(500);
    }
    await voicePage.waitForTimeout(2000);

    // 5. 推进到 team-building 阶段
    await advancePhase(voicePage, 30);
    const teamBuildingPhase = await voicePage.evaluate(() => gameState.gamePhase);
    console.log(`  当前阶段: ${teamBuildingPhase}`);
    await voicePage.waitForTimeout(2000);

    if (teamBuildingPhase !== 'team-building') {
      console.log(`  ❌ 未能推进到 team-building 阶段，当前阶段: ${teamBuildingPhase}`);
      failed += 3;
      results.push({ test: '队长信息面板可见', status: 'fail' });
      results.push({ test: '提交按钮存在', status: 'fail' });
      results.push({ test: '选择按钮存在', status: 'fail' });
      throw new Error('阶段未正确推进');
    }

    // 6. 获取当前队长信息
    const leaderInfo = await voicePage.evaluate(() => {
      const leaderIdx = gameState.currentLeaderIndex;
      const leaderText = document.getElementById('current-leader').textContent;
      return { leaderIndex: leaderIdx, leaderText: leaderText };
    });
    console.log(`  队长索引: ${leaderInfo.leaderIndex}`);
    console.log(`  队长显示: ${leaderInfo.leaderText}`);

    // 7. 检查队长页面是否显示组队按钮
    const leaderNumber = leaderInfo.leaderIndex + 1;
    const leaderPage = playerPages[leaderInfo.leaderIndex];
    await screenshot(leaderPage, `2-leader-${leaderNumber}-view`);

    const isLeaderInfoVisible = await leaderPage.evaluate(() => {
      const el = document.getElementById('isLeaderInfo');
      if (!el) return { visible: false, reason: 'element not found' };
      const style = window.getComputedStyle(el);
      return {
        visible: style.display !== 'none' && style.visibility !== 'hidden',
        html: el.innerHTML.substring(0, 200)
      };
    });
    console.log(`  队长信息面板可见: ${isLeaderInfoVisible.visible}`);

    const submitBtnVisible = await leaderPage.evaluate(() => {
      const el = document.getElementById('submitTeamBtn');
      if (!el) return { visible: false, reason: 'button not found' };
      const style = window.getComputedStyle(el);
      return {
        visible: style.display !== 'none' && el.offsetParent !== null,
        disabled: el.disabled,
        text: el.textContent
      };
    });
    console.log(`  提交队伍按钮可见: ${submitBtnVisible.visible}`);
    console.log(`  提交按钮文字: ${submitBtnVisible.text}`);
    console.log(`  提交按钮禁用: ${submitBtnVisible.disabled}`);

    const playerListVisible = await leaderPage.evaluate(() => {
      const el = document.getElementById('teamBuildingPlayerList');
      if (!el) return { visible: false, children: 0 };
      return { visible: true, children: el.children.length };
    });
    console.log(`  玩家列表可见: ${playerListVisible.visible}, 子元素: ${playerListVisible.children}`);

    const selectButtons = await leaderPage.evaluate(() => {
      const buttons = document.querySelectorAll('.player-select');
      return buttons.length;
    });
    console.log(`  选择按钮数量: ${selectButtons}`);

    // ====== 判断测试结果 ======
    console.log('\n' + '='.repeat(60));
    console.log('📊 测试结果汇总');
    console.log('='.repeat(60));

    // 测试1: 队长信息面板可见
    if (isLeaderInfoVisible.visible) {
      console.log(`  ✅ 测试1: 队长信息面板可见`);
      passed++;
      results.push({ test: '队长信息面板可见', status: 'pass' });
    } else {
      console.log(`  ❌ 测试1: 队长信息面板不可见`);
      failed++;
      results.push({ test: '队长信息面板可见', status: 'fail' });
    }

    // 测试2: 提交按钮存在且可见
    if (submitBtnVisible.visible !== false) {
      console.log(`  ✅ 测试2: 提交按钮存在`);
      passed++;
      results.push({ test: '提交按钮存在', status: 'pass' });
    } else {
      console.log(`  ❌ 测试2: 提交按钮不存在`);
      failed++;
      results.push({ test: '提交按钮存在', status: 'fail' });
    }

    // 测试3: 选择按钮存在（只有队长能看到）
    if (selectButtons > 0) {
      console.log(`  ✅ 测试3: 选择按钮存在 (${selectButtons}个)`);
      passed++;
      results.push({ test: '选择按钮存在', status: 'pass' });
    } else {
      console.log(`  ❌ 测试3: 选择按钮不存在`);
      failed++;
      results.push({ test: '选择按钮存在', status: 'fail' });
    }

    // ====== 截图所有玩家页面 ======
    for (let i = 0; i < playerPages.length; i++) {
      const isLeader = (i === leaderInfo.leaderIndex);
      await screenshot(playerPages[i], `3-player-${i + 1}${isLeader ? '-leader' : ''}-view`);
    }

    console.log('\n' + '='.repeat(60));
    console.log(`✅ 通过: ${passed} | ❌ 失败: ${failed} | 总计: ${passed + failed}`);
    console.log('='.repeat(60));

    if (failed === 0) {
      console.log('\n🎉 BUG-052 修复验证全部通过！队长能正确看到组队按钮！');
    }

  } catch (e) {
    console.log('\n❌ 测试异常:', e.message);
    console.log(e.stack);
    failed++;
  } finally {
    await context.close();
    await browser.close();
  }

  process.exit(failed === 0 ? 0 : 1);
}

runTests().catch(err => {
  console.error('E2E 异常:', err);
  process.exit(1);
});
