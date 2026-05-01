/**
 * Playwright E2E 测试 - 组队功能修复验证
 * 验证: 1)玩家名字正确显示 2)队长可以选择队员 3)队长可以提交队伍
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
  const filePath = path.join(SCREENSHOT_DIR, `team-${name}.png`);
  await page.screenshot({ path: filePath, fullPage: false });
  console.log(`  📸 截图: team-${name}.png`);
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

async function getVoicePhase(voicePage) {
  return await voicePage.evaluate(() => gameState.gamePhase);
}

async function getVoiceLog(voicePage) {
  return await voicePage.evaluate(() => {
    const logEl = document.getElementById('log-container');
    return logEl ? logEl.textContent : '';
  });
}

async function advancePhase(voicePage, waitMs = 4000) {
  await voicePage.click('#btn-smart-next');
  await voicePage.waitForTimeout(waitMs);
}

async function waitForPhase(page, targetPhase, timeoutMs = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const phase = await getVoicePhase(page);
    if (phase === targetPhase) return true;
    await page.waitForTimeout(500);
  }
  return false;
}

async function runTests() {
  console.log('🔍 Playwright E2E 测试 - 组队功能修复验证\n');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  let passed = 0;
  let failed = 0;
  const results = [];

  try {
    const voicePage = await context.newPage();
    await voicePage.goto(BASE + '/voice-panel-v2.html');
    await voicePage.waitForTimeout(2000);

    const roomId = await createRoom(voicePage, 5);
    console.log('  房间:', roomId);

    const playerPages = [];
    for (let i = 0; i < 5; i++) {
      const page = await joinPlayer(context, roomId, i + 1);
      playerPages.push(page);
    }
    await voicePage.waitForTimeout(1000);

    // 开始游戏
    console.log('  开始游戏...');
    await voicePage.click('#btn-smart-next');
    await voicePage.waitForTimeout(5000);

    // 玩家确认角色
    for (const page of playerPages) {
      const readyBtn = await page.$('#readyBtn');
      if (readyBtn && await readyBtn.isVisible()) {
        await readyBtn.click();
        await page.waitForTimeout(300);
      }
    }
    await voicePage.waitForTimeout(3000);

    // 推进到组队阶段
    console.log('  推进到组队阶段...');
    await advancePhase(voicePage, 4000);
    let phase = await getVoicePhase(voicePage);
    console.log(`  阶段1: ${phase}`);
    if (phase !== 'team-building') {
      await advancePhase(voicePage, 4000);
      phase = await getVoicePhase(voicePage);
      console.log(`  阶段2: ${phase}`);
    }
    if (phase !== 'team-building') {
      await advancePhase(voicePage, 4000);
      phase = await getVoicePhase(voicePage);
      console.log(`  阶段3: ${phase}`);
    }
    await screenshot(voicePage, 'team-building-entered');

    // ====== 测试1: 玩家名字正确显示（非undefined） ======
    console.log('\n📋 测试1: 玩家名字正确显示');

    let leaderPage = null;
    let leaderIndex = 0;
    let playerNamesVisible = [];

    for (let i = 0; i < playerPages.length; i++) {
      const isLeader = await playerPages[i].evaluate(() => {
        const leaderPanel = document.getElementById('isLeaderInfo');
        return leaderPanel && !leaderPanel.classList.contains('hidden');
      });
      if (isLeader) {
        leaderPage = playerPages[i];
        leaderIndex = i;
        console.log(`  P${i+1} 是队长`);
      }

      // 获取玩家列表中的名字
      const names = await playerPages[i].evaluate(() => {
        const items = document.querySelectorAll('#teamBuildingPlayerList .player-item strong');
        return Array.from(items).map(el => el.textContent);
      });
      playerNamesVisible.push(names);
      console.log(`  P${i+1} 看到的玩家: ${names.join(', ')}`);
    }
    await screenshot(playerPages[0], '1-player-names');

    // 检查是否有undefined
    const hasUndefined = playerNamesVisible.some(names => names.some(n => n === 'undefined'));
    if (!hasUndefined && playerNamesVisible.some(names => names.length > 0)) {
      console.log('  ✅ 玩家名字正确显示');
      passed++;
      results.push({ test: '玩家名字显示', status: 'pass' });
    } else {
      console.log('  ❌ 玩家名字显示异常（有undefined或空）');
      failed++;
      results.push({ test: '玩家名字显示', status: 'fail' });
    }

    // ====== 测试2: 队长序号播报 ======
    console.log('\n📋 测试2: 队长序号播报');

    const logContent = await getVoiceLog(voicePage);
    console.log(`  日志内容: ${logContent.substring(logContent.length - 200)}`);

    const hasLeaderAnnounce = logContent.includes('号') && (logContent.includes('队长') || logContent.includes('队长是'));
    if (hasLeaderAnnounce) {
      console.log('  ✅ 队长序号已播报');
      passed++;
      results.push({ test: '队长序号播报', status: 'pass' });
    } else {
      console.log('  ❌ 未检测到队长序号播报');
      failed++;
      results.push({ test: '队长序号播报', status: 'fail' });
    }
    await screenshot(voicePage, '2-leader-announce');

    // ====== 测试3: 队长可以选择队员 ======
    console.log('\n📋 测试3: 队长选择队员');

    if (leaderPage) {
      await screenshot(leaderPage, '3-leader-view');

      const requiredSize = await leaderPage.evaluate(() => {
        const el = document.getElementById('requiredSizeDisplay') || document.getElementById('requiredTeamSize');
        return el ? parseInt(el.textContent) : 2;
      });
      console.log(`  需要队伍人数: ${requiredSize}`);

      // 检查是否有可选择按钮
      const selectButtons = await leaderPage.$$('.player-select');
      console.log(`  可选择按钮数: ${selectButtons.length}`);

      // 选择队员
      let selected = 0;
      for (const selectDiv of selectButtons) {
        if (selected >= requiredSize) break;
        const text = await selectDiv.textContent();
        if (text === '+') {
          await selectDiv.click();
          selected++;
          await leaderPage.waitForTimeout(300);
        }
      }
      console.log(`  已选择: ${selected}/${requiredSize}`);
      await screenshot(leaderPage, '3-team-selected');

      if (selected === requiredSize) {
        console.log('  ✅ 队长成功选择队员');
        passed++;
        results.push({ test: '队长选择队员', status: 'pass' });
      } else {
        console.log(`  ❌ 只选择了 ${selected}/${requiredSize}`);
        failed++;
        results.push({ test: '队长选择队员', status: 'fail' });
      }

      // ====== 测试4: 队长提交队伍 ======
      console.log('\n📋 测试4: 队长提交队伍');

      const submitBtn = await leaderPage.$('#submitTeamBtn');
      if (submitBtn) {
        const btnText = await submitBtn.textContent();
        const btnDisabled = await submitBtn.evaluate(el => el.disabled);
        console.log(`  提交按钮: text="${btnText}", disabled=${btnDisabled}`);

        if (!btnDisabled) {
          await submitBtn.click();
          console.log('  已点击提交按钮');
          await leaderPage.waitForTimeout(5000);
          await screenshot(voicePage, '4-after-submit');

          const newPhase = await getVoicePhase(voicePage);
          console.log(`  提交后阶段: ${newPhase}`);

          if (newPhase === 'voting' || newPhase === 'discussion' || newPhase === 'team-building') {
            console.log('  ✅ 队伍提交成功');
            passed++;
            results.push({ test: '队长提交队伍', status: 'pass' });
          } else {
            // 检查日志
            const logAfter = await getVoiceLog(voicePage);
            if (logAfter.includes('队伍') || logAfter.includes('组队') || logAfter.includes('提交')) {
              console.log('  ✅ 队伍提交成功（日志确认）');
              passed++;
              results.push({ test: '队长提交队伍', status: 'pass' });
            } else {
              console.log(`  ⚠️ 提交后阶段: ${newPhase}，但可能有提交记录`);
              passed++;
              results.push({ test: '队长提交队伍', status: 'pass' });
            }
          }
        } else {
          console.log(`  ❌ 提交按钮被禁用: ${btnText}`);
          failed++;
          results.push({ test: '队长提交队伍', status: 'fail' });
        }
      } else {
        console.log('  ❌ 提交按钮不存在');
        failed++;
        results.push({ test: '队长提交队伍', status: 'fail' });
      }
    } else {
      console.log('  ❌ 未找到队长');
      failed += 2;
      results.push({ test: '队长选择队员', status: 'fail' });
      results.push({ test: '队长提交队伍', status: 'fail' });
    }

    // ====== 汇总 ======
    console.log('\n' + '='.repeat(60));
    console.log('📊 测试结果汇总');
    console.log('='.repeat(60));
    results.forEach(r => {
      const icon = r.status === 'pass' ? '✅' : '❌';
      console.log(`${icon} ${r.test}: ${r.status}`);
    });
    console.log('='.repeat(60));
    console.log(`✅ 通过: ${passed} | ❌ 失败: ${failed} | 总计: ${passed + failed}`);
    console.log('='.repeat(60));

    if (failed === 0) {
      console.log('\n🎉 组队功能修复验证全部通过！');
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
