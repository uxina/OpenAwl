/**
 * Playwright E2E 测试 - BUG-053: 任务执行后服务器崩溃
 * 简化版: 直接验证服务器不会在任务执行后崩溃
 */
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const http = require('http');

const BASE = 'http://127.0.0.1:3000';
const SCREENSHOT_DIR = path.join(__dirname, 'e2e-screenshots');

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function screenshot(page, name) {
  const filePath = path.join(SCREENSHOT_DIR, `mission-${name}.png`);
  await page.screenshot({ path: filePath, fullPage: false });
  console.log(`  📸 截图: mission-${name}.png`);
}

async function checkServerAlive() {
  return new Promise((resolve) => {
    http.get('http://127.0.0.1:3000', (res) => {
      resolve(true);
    }).on('error', () => resolve(false));
  });
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
    const phase = await voicePage.evaluate(() => gameState.gamePhase);
    console.log(`    [attempt ${i + 1}] phase: ${phase}`);
    if (phase === 'team-building') break;
    if (phase === 'mission') break; // Stop if we reach mission
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
    console.log('🎮 开始 BUG-053 测试: 任务执行后服务器不崩溃');
    console.log('='.repeat(60));

    // 1. 创建房间
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

    // 3. 开始游戏
    await voicePage.evaluate(() => smartNext());
    await voicePage.waitForTimeout(2000);

    // Confirm roles
    let phase = await voicePage.evaluate(() => gameState.gamePhase);
    if (phase === 'role-confirm') {
      await voicePage.evaluate(() => smartNext());
      await voicePage.waitForTimeout(2000);
    }

    // 4. 推进到组队阶段
    phase = await advancePhase(voicePage, 30);
    console.log(`  阶段: ${phase}`);

    if (phase !== 'team-building') {
      console.log(`  ❌ 未能到达组队阶段`);
      failed++;
      throw new Error('Stage not reached');
    }
    console.log(`  ✅ 测试1: 推进到组队阶段`);
    passed++;
    results.push({ test: '推进到组队阶段', status: 'pass' });

    // 5. 队长选择队员并提交
    const leaderIdx = await voicePage.evaluate(() => gameState.currentLeaderIndex);
    const leaderPage = playerPages[leaderIdx];
    console.log(`  队长索引: ${leaderIdx} (${leaderIdx + 1}号)`);

    // Click select buttons on leader page
    let selected = 0;
    const buttons = await leaderPage.$$('.player-select');
    for (const btn of buttons) {
      if (selected >= 2) break;
      const text = await btn.evaluate(el => el.textContent);
      if (text === '+') {
        await btn.click();
        selected++;
      }
    }
    console.log(`  已选择 ${selected} 名队员`);

    await voicePage.waitForTimeout(1000);

    // Submit team
    const submitted = await leaderPage.evaluate(() => {
      const btn = document.getElementById('submitTeamBtn');
      if (btn && !btn.disabled) {
        btn.click();
        return true;
      }
      return false;
    });
    console.log(`  队伍提交: ${submitted}`);
    await voicePage.waitForTimeout(3000);

    phase = await voicePage.evaluate(() => gameState.gamePhase);
    console.log(`  提交后阶段: ${phase}`);

    if (phase === 'voting') {
      console.log(`  ✅ 测试2: 队伍提交进入投票阶段`);
      passed++;
      results.push({ test: '队伍提交', status: 'pass' });
    } else {
      console.log(`  ❌ 阶段: ${phase}`);
      failed++;
      results.push({ test: '队伍提交', status: 'fail' });
    }

    // 6. 所有玩家投票通过
    if (phase === 'voting') {
      for (const pp of playerPages) {
        await pp.evaluate(() => {
          const btn = document.getElementById('approveBtn');
          if (btn) btn.click();
        });
        await voicePage.waitForTimeout(500);
      }
      await voicePage.waitForTimeout(3000);

      phase = await voicePage.evaluate(() => gameState.gamePhase);
      console.log(`  投票后阶段: ${phase}`);

      if (phase === 'mission') {
        console.log(`  ✅ 测试3: 投票通过进入任务阶段`);
        passed++;
        results.push({ test: '投票通过', status: 'pass' });
      } else {
        console.log(`  ❌ 阶段: ${phase}`);
        failed++;
        results.push({ test: '投票通过', status: 'fail' });
      }
    }

    // 7. 任务阶段 - 执行任务（关键测试）
    if (phase === 'mission') {
      await screenshot(voicePage, '1-mission-phase');

      // Get team members from first player page
      const teamMembers = await playerPages[0].evaluate(() => {
        const gc = window.gameCore;
        return gc ? gc.currentTeam || [] : [];
      });
      console.log(`  任务队伍: ${teamMembers.length} 人`);

      if (teamMembers.length > 0) {
        // Find which player pages are on the team and have them execute
        for (let i = 0; i < playerPages.length; i++) {
          const isOnTeam = await playerPages[i].evaluate((memberIds) => {
            const gc = window.gameCore;
            if (!gc || !gc.currentPlayer) return false;
            return memberIds.includes(gc.currentPlayer.id);
          }, teamMembers);

          if (isOnTeam) {
            console.log(`  ${i + 1}号 队员执行任务`);
            await playerPages[i].evaluate(() => {
              const btn = document.getElementById('missionSuccessBtn');
              if (btn) btn.click();
            });
            await voicePage.waitForTimeout(1000);
          }
        }

        await voicePage.waitForTimeout(3000);

        // 8. 检查服务器是否还在运行
        const alive = await checkServerAlive();
        console.log(`  服务器状态: ${alive ? '运行中' : '已崩溃'}`);

        if (alive) {
          console.log(`  ✅ 测试4: 服务器在任务执行后不崩溃`);
          passed++;
          results.push({ test: '服务器不崩溃', status: 'pass' });

          // 9. 检查阶段推进
          const nextPhase = await voicePage.evaluate(() => gameState.gamePhase);
          console.log(`  任务后阶段: ${nextPhase}`);

          if (nextPhase === 'team-building' || nextPhase === 'assassination' || nextPhase === 'ended') {
            console.log(`  ✅ 测试5: 阶段正确推进 (${nextPhase})`);
            passed++;
            results.push({ test: '阶段正确推进', status: 'pass' });
          } else {
            console.log(`  ❌ 阶段: ${nextPhase}`);
            failed++;
            results.push({ test: '阶段正确推进', status: 'fail' });
          }
        } else {
          console.log(`  ❌ 服务器崩溃`);
          failed++;
          results.push({ test: '服务器不崩溃', status: 'fail' });
        }
      } else {
        console.log(`  ❌ 无法获取队伍信息`);
        failed++;
        results.push({ test: '获取队伍', status: 'fail' });
      }
    }

    await screenshot(voicePage, '2-final');

    // 汇总
    console.log('\n' + '='.repeat(60));
    console.log('📊 测试结果汇总');
    console.log('='.repeat(60));
    results.forEach(r => {
      console.log(`${r.status === 'pass' ? '✅' : '❌'} ${r.test}: ${r.status}`);
    });
    console.log('='.repeat(60));
    console.log(`✅ 通过: ${passed} | ❌ 失败: ${failed} | 总计: ${passed + failed}`);
    console.log('='.repeat(60));

    if (failed === 0) {
      console.log('\n🎉 BUG-053 修复验证全部通过！');
    }

  } catch (e) {
    console.log('\n❌ 测试异常:', e.message);
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
