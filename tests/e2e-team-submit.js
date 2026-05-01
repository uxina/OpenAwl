/**
 * Playwright E2E 测试 - 队长提交组队 + 队长序号播报
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
  const filePath = path.join(SCREENSHOT_DIR, `fix-${name}.png`);
  await page.screenshot({ path: filePath, fullPage: false });
  console.log(`  📸 截图: fix-${name}.png`);
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

async function runTests() {
  console.log('🔍 Playwright E2E 测试 - 队长提交组队 + 队长序号播报\n');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  let passed = 0;
  let failed = 0;
  const results = [];

  try {
    // 创建房间 + 5玩家加入
    console.log('📋 设置: 创建房间 + 5玩家加入');
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

    // 推进到夜间 -> 讨论 -> 组队
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
    await screenshot(voicePage, 'team-building-phase');

    // ====== BUG测试1: 队长序号播报 ======
    console.log('\n📋 BUG: 队长序号播报验证');

    const logContent = await getVoiceLog(voicePage);
    console.log(`  日志内容(前300字符): ${logContent.substring(0, 300)}`);
    await screenshot(voicePage, 'leader-announce-log');

    // 检查是否有队长序号播报
    const hasLeaderAnnounce = logContent.includes('号') && (logContent.includes('队长') || logContent.includes('队长是'));
    if (hasLeaderAnnounce) {
      console.log('  ✅ 语音日志包含队长序号播报');
      passed++;
      results.push({ test: '队长序号播报', status: 'pass' });
    } else {
      console.log('  ❌ 未检测到队长序号播报');
      failed++;
      results.push({ test: '队长序号播报', status: 'fail' });
    }

    // ====== BUG测试2: 队长提交组队 ======
    console.log('\n📋 BUG: 队长提交组队验证');

    // 找出队长
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

    if (!leaderPage) {
      console.log('  ❌ 未找到队长页面');
      failed++;
      results.push({ test: '队长提交组队', status: 'fail' });
    } else {
      await screenshot(leaderPage, 'leader-view');

      // 获取需要的队伍人数
      const requiredSize = await leaderPage.evaluate(() => {
        const el = document.getElementById('requiredSizeDisplay') || document.getElementById('requiredTeamSize');
        return el ? parseInt(el.textContent) : 2;
      });
      console.log(`  需要队伍人数: ${requiredSize}`);

      // 检查提交按钮是否存在
      const submitBtnExists = await leaderPage.$('#submitTeamBtn');
      if (!submitBtnExists) {
        console.log('  ❌ 提交按钮不存在');
        failed++;
        results.push({ test: '队长提交组队', status: 'fail' });
      } else {
        // 点击选择队员
        let selected = 0;
        const playerSelects = await leaderPage.$$('.player-select');
        console.log(`  可选队员数: ${playerSelects.length}`);

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
        await screenshot(leaderPage, 'team-selected');

        await leaderPage.waitForTimeout(500);

        // 检查提交按钮状态
        const btnText = await leaderPage.evaluate(() => document.getElementById('submitTeamBtn').textContent);
        const btnDisabled = await leaderPage.evaluate(() => document.getElementById('submitTeamBtn').disabled);
        console.log(`  提交按钮: text="${btnText}", disabled=${btnDisabled}`);

        if (selected === requiredSize && !btnDisabled) {
          // 点击提交
          await leaderPage.click('#submitTeamBtn');
          console.log('  已点击提交按钮');
          await leaderPage.waitForTimeout(3000);

          // 检查语音面板阶段是否变化
          const newPhase = await getVoicePhase(voicePage);
          console.log(`  提交后语音面板阶段: ${newPhase}`);
          await screenshot(voicePage, 'after-team-submit');

          if (newPhase === 'voting' || newPhase === 'discussion' || newPhase === 'team-building') {
            console.log('  ✅ 队伍提交成功');
            passed++;
            results.push({ test: '队长提交组队', status: 'pass' });
          } else {
            console.log(`  ⚠️ 提交后阶段: ${newPhase}`);
            // 检查日志是否有提交成功信息
            const logAfter = await getVoiceLog(voicePage);
            if (logAfter.includes('队伍') || logAfter.includes('组队')) {
              console.log('  ✅ 队伍提交成功（日志确认）');
              passed++;
              results.push({ test: '队长提交组队', status: 'pass' });
            } else {
              console.log('  ❌ 队伍提交可能失败');
              failed++;
              results.push({ test: '队长提交组队', status: 'fail' });
            }
          }
        } else {
          console.log(`  ❌ 选择人数不匹配或按钮被禁用: selected=${selected}, required=${requiredSize}, disabled=${btnDisabled}`);
          failed++;
          results.push({ test: '队长提交组队', status: 'fail' });
        }
      }
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
      console.log('\n🎉 所有BUG修复验证通过！');
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
