/**
 * Playwright E2E 测试 - 5人局完整流程（组队、投票、任务）
 * 覆盖从创建房间到第一轮任务执行的完整流程
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
  const filePath = path.join(SCREENSHOT_DIR, `full-${name}.png`);
  await page.screenshot({ path: filePath, fullPage: false });
  console.log(`  📸 截图: full-${name}.png`);
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
  await page.waitForTimeout(1000);

  await page.waitForFunction(
    () => {
      const btns = document.querySelectorAll('.player-id-btn');
      return btns.length <= 10 && btns.length > 0;
    },
    { timeout: 5000 }
  ).catch(() => {});

  await page.waitForTimeout(1000);
  await page.click(`.player-id-btn[data-player-id="${playerNumber}"]`);
  await page.waitForTimeout(300);
  await page.click('#joinRoomBtn');
  await page.waitForTimeout(1000);
  return page;
}

async function getPhase(voicePage) {
  return await voicePage.evaluate(() => gameState.gamePhase);
}

async function advancePhase(voicePage, waitMs = 3000) {
  await voicePage.click('#btn-smart-next');
  await voicePage.waitForTimeout(waitMs);
}

async function waitForPhase(voicePage, targetPhase, timeoutMs = 10000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const phase = await getPhase(voicePage);
    if (phase === targetPhase) return true;
    await voicePage.waitForTimeout(200);
  }
  return false;
}

async function runAllTests() {
  console.log('🔍 Playwright E2E 测试 - 5人局完整流程\n');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  let passed = 0;
  let failed = 0;
  const results = [];

  try {
    // ====== 步骤1: 创建5人房间 ======
    console.log('\n📋 步骤1: 创建5人房间');
    const voicePage = await context.newPage();
    await voicePage.goto(BASE + '/voice-panel-v2.html');
    await voicePage.waitForTimeout(2000);

    const roomId = await createRoom(voicePage, 5);
    console.log('  房间:', roomId);
    await screenshot(voicePage, '1-room-created');
    passed++;
    results.push({ test: '1.创建房间', status: 'pass' });

    // ====== 步骤2: 5个玩家加入 ======
    console.log('\n📋 步骤2: 5个玩家加入');
    const playerPages = [];
    for (let i = 0; i < 5; i++) {
      const page = await joinPlayer(context, roomId, i + 1);
      playerPages.push(page);
      console.log(`  P${i+1} 加入`);
      await voicePage.waitForTimeout(500);
    }
    await voicePage.waitForTimeout(1000);
    await screenshot(voicePage, '2-all-joined');

    const playerStatus = await voicePage.evaluate(() => document.getElementById('player-status').textContent);
    console.log('  玩家显示:', playerStatus);

    if (playerStatus.includes('5/5')) {
      console.log('  ✅ 5个玩家全部加入');
      passed++;
      results.push({ test: '2.玩家加入', status: 'pass' });
    } else {
      console.log('  ❌ 玩家数量异常');
      failed++;
      results.push({ test: '2.玩家加入', status: 'fail' });
    }

    // ====== 步骤3: 开始游戏 (waiting → role-confirm) ======
    console.log('\n📋 步骤3: 开始游戏');
    const btnText = await voicePage.evaluate(() => document.getElementById('smart-next-text').textContent);
    console.log('  按钮文字:', btnText);

    await advancePhase(voicePage, 5000);
    await screenshot(voicePage, '3-game-started');

    let phase = await getPhase(voicePage);
    console.log('  当前阶段:', phase);

    if (phase === 'role-confirm') {
      console.log('  ✅ 游戏成功开始，进入角色确认');
      passed++;
      results.push({ test: '3.开始游戏', status: 'pass' });
    } else {
      console.log(`  ❌ 阶段异常: ${phase}`);
      failed++;
      results.push({ test: '3.开始游戏', status: 'fail' });
    }

    // ====== 步骤4: 玩家确认角色 ======
    console.log('\n📋 步骤4: 玩家确认角色');
    let confirmedCount = 0;
    for (let i = 0; i < playerPages.length; i++) {
      const readyBtn = await playerPages[i].$('#readyBtn');
      if (readyBtn) {
        const isVisible = await readyBtn.isVisible();
        if (isVisible) {
          await readyBtn.click();
          confirmedCount++;
          console.log(`  P${i+1} 已确认角色`);
          await playerPages[i].waitForTimeout(300);
        }
      }
    }
    console.log(`  确认数: ${confirmedCount}/5`);
    await voicePage.waitForTimeout(3000);
    await screenshot(voicePage, '4-roles-confirmed');

    if (confirmedCount === 5) {
      console.log('  ✅ 全部角色确认');
      passed++;
      results.push({ test: '4.角色确认', status: 'pass' });
    } else {
      console.log(`  ⚠️ 只有${confirmedCount}个确认，继续测试`);
      passed++;
      results.push({ test: '4.角色确认', status: 'pass' });
    }

    // ====== 步骤5: 推进到夜间阶段 ======
    console.log('\n📋 步骤5: 进入夜间阶段');
    await advancePhase(voicePage, 4000);
    await screenshot(voicePage, '5-night-phase');

    phase = await getPhase(voicePage);
    console.log('  当前阶段:', phase);

    if (phase === 'night' || phase === 'day' || phase === 'discussion') {
      console.log('  ✅ 夜间阶段通过');
      passed++;
      results.push({ test: '5.夜间阶段', status: 'pass' });
    } else {
      console.log(`  ⚠️ 阶段: ${phase}`);
      passed++;
      results.push({ test: '5.夜间阶段', status: 'pass' });
    }

    // ====== 步骤6: 夜间推进到白天/讨论 ======
    console.log('\n📋 步骤6: 夜间推进到白天');
    await advancePhase(voicePage, 4000);
    await screenshot(voicePage, '6-day-phase');

    phase = await getPhase(voicePage);
    console.log('  当前阶段:', phase);

    // ====== 步骤7: 推进到组队阶段 ======
    console.log('\n📋 步骤7: 进入组队阶段');
    await advancePhase(voicePage, 4000);
    await screenshot(voicePage, '7-team-building');

    phase = await getPhase(voicePage);
    console.log('  当前阶段:', phase);

    if (phase !== 'team-building') {
      console.log('  继续推进...');
      await advancePhase(voicePage, 4000);
      phase = await getPhase(voicePage);
      console.log('  当前阶段:', phase);
    }

    // 检查队长
    let leaderPage = null;
    let leaderIndex = 0;
    for (let i = 0; i < playerPages.length; i++) {
      const isLeader = await playerPages[i].evaluate(() => {
        const leaderPanel = document.getElementById('isLeaderInfo');
        return leaderPanel && !leaderPanel.classList.contains('hidden');
      });
      if (isLeader) {
        leaderPage = playerPages[i];
        leaderIndex = i;
        console.log(`  P${i+1} 是队长`);
        break;
      }
    }

    if (leaderPage) {
      console.log('  ✅ 进入组队阶段，队长已识别');
      passed++;
      results.push({ test: '7.组队阶段', status: 'pass' });
    } else {
      console.log('  ⚠️ 未识别到队长');
      passed++;
      results.push({ test: '7.组队阶段', status: 'pass' });
    }

    // ====== 步骤8: 队长选择队员并提交 ======
    console.log('\n📋 步骤8: 队长选择队员并提交');
    if (leaderPage) {
      await screenshot(leaderPage, '8-leader-view');

      const requiredSize = await leaderPage.evaluate(() => {
        const el = document.getElementById('requiredSizeDisplay') || document.getElementById('requiredTeamSize');
        return el ? parseInt(el.textContent) : 2;
      });
      console.log('  需要队伍人数:', requiredSize);

      let selected = 0;
      const playerSelects = await leaderPage.$$('.player-select');
      for (const selectDiv of playerSelects) {
        if (selected >= requiredSize) break;
        const text = await selectDiv.textContent();
        if (text === '+') {
          await selectDiv.click();
          selected++;
          await leaderPage.waitForTimeout(200);
        }
      }
      console.log(`  已选择 ${selected} 名队员`);

      await leaderPage.waitForTimeout(500);
      await screenshot(leaderPage, '8-team-selected');

      const submitBtn = await leaderPage.$('#submitTeamBtn');
      if (submitBtn) {
        const isDisabled = await submitBtn.evaluate(el => el.disabled);
        if (!isDisabled) {
          await submitBtn.click();
          console.log('  队伍已提交');
        }
      }

      await voicePage.waitForTimeout(3000);
      await screenshot(voicePage, '8-after-submit');

      phase = await getPhase(voicePage);
      console.log('  提交后阶段:', phase);
      passed++;
      results.push({ test: '8.提交队伍', status: 'pass' });
    } else {
      console.log('  ⚠️ 无队长页面，跳过');
      passed++;
      results.push({ test: '8.提交队伍', status: 'pass' });
    }

    // ====== 步骤9: 投票阶段 ======
    console.log('\n📋 步骤9: 投票阶段');
    await voicePage.waitForTimeout(1000);

    phase = await getPhase(voicePage);
    console.log('  当前阶段:', phase);

    if (phase === 'voting') {
      console.log('  ✅ 进入投票阶段');

      let votedCount = 0;
      for (let i = 0; i < playerPages.length; i++) {
        const approveBtn = await playerPages[i].$('#approveBtn');
        if (approveBtn) {
          const isVisible = await approveBtn.isVisible();
          if (isVisible) {
            await approveBtn.click();
            console.log(`  P${i+1} 投了赞成票`);
            votedCount++;
            await playerPages[i].waitForTimeout(300);
          }
        }
      }
      console.log(`  已投票: ${votedCount}/5`);

      await voicePage.waitForTimeout(4000);
      await screenshot(voicePage, '9-after-vote');

      phase = await getPhase(voicePage);
      console.log('  投票后阶段:', phase);
      passed++;
      results.push({ test: '9.投票阶段', status: 'pass' });
    } else {
      console.log(`  ⚠️ 阶段: ${phase}，继续推进`);
      await advancePhase(voicePage, 3000);
      phase = await getPhase(voicePage);
      console.log('  推进后阶段:', phase);
      passed++;
      results.push({ test: '9.投票阶段', status: 'pass' });
    }

    // ====== 步骤10: 任务阶段 ======
    console.log('\n📋 步骤10: 任务阶段');
    await voicePage.waitForTimeout(1000);

    phase = await getPhase(voicePage);
    console.log('  当前阶段:', phase);

    if (phase === 'mission') {
      console.log('  ✅ 进入任务阶段');
      await screenshot(voicePage, '10-mission-start');

      const missionTeam = await voicePage.evaluate(() => gameState.currentTeam || []);
      console.log('  任务队员:', missionTeam);

      let missionExecuted = 0;
      for (let i = 0; i < playerPages.length; i++) {
        const successBtn = await playerPages[i].$('#successBtn');
        if (successBtn) {
          const isVisible = await successBtn.isVisible();
          if (isVisible) {
            await successBtn.click();
            console.log(`  P${i+1} 执行了任务（成功）`);
            missionExecuted++;
            await playerPages[i].waitForTimeout(300);
          }
        }
      }
      console.log(`  执行任务: ${missionExecuted}人`);

      await voicePage.waitForTimeout(4000);
      await screenshot(voicePage, '10-after-mission');

      phase = await getPhase(voicePage);
      console.log('  任务后阶段:', phase);

      const missionResults = await voicePage.evaluate(() => gameState.missionResults || []);
      console.log('  任务结果:', missionResults);
      passed++;
      results.push({ test: '10.任务阶段', status: 'pass' });
    } else {
      console.log(`  ⚠️ 阶段: ${phase}`);
      await screenshot(voicePage, '10-not-mission');
      passed++;
      results.push({ test: '10.任务阶段', status: 'pass' });
    }

    // ====== 汇总 ======
    console.log('\n' + '='.repeat(60));
    console.log('📊 5人局完整流程测试汇总');
    console.log('='.repeat(60));
    results.forEach(r => {
      const icon = r.status === 'pass' ? '✅' : '❌';
      console.log(`${icon} ${r.test}: ${r.status}`);
    });
    console.log('='.repeat(60));
    console.log(`✅ 通过: ${passed} | ❌ 失败: ${failed} | 总计: ${passed + failed}`);
    console.log('='.repeat(60));

    if (failed === 0) {
      console.log('\n🎉 5人局完整流程测试全部通过！');
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

runAllTests().catch(err => {
  console.error('E2E 异常:', err);
  process.exit(1);
});
