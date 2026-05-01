/**
 * E2E测试：验证任务完成后是否能正常推进游戏
 * BUG-053: 任务执行后无法推进游戏
 */

const { test, expect } = require('@playwright/test');

const BASE_URL = 'http://localhost:3000';
const TIMEOUT = {
  navigation: 30000,
  element: 15000,
  action: 5000,
  wait: 2000
};

async function waitForVisible(page, selector, timeout = TIMEOUT.element) {
  await page.waitForSelector(selector, { state: 'visible', timeout });
}

async function voicePanelCreateRoom(hostPage, playerCount = 5) {
  console.log('  [语音面板] 创建房间...');
  await waitForVisible(hostPage, '#player-count');
  
  let currentCount = parseInt(await hostPage.textContent('#player-count'));
  while (currentCount < playerCount) {
    await hostPage.click('#btn-increase');
    currentCount++;
  }
  while (currentCount > playerCount) {
    await hostPage.click('#btn-decrease');
    currentCount--;
  }
  
  await hostPage.click('#btn-create');
  await hostPage.waitForTimeout(TIMEOUT.wait);
  
  const roomId = await hostPage.textContent('#room-id');
  console.log(`      房间ID: ${roomId}`);
  return roomId;
}

async function playerJoin(context, roomId, playerNumber) {
  console.log(`  [玩家${playerNumber}号] 加入房间...`);
  const playerPage = await context.newPage();
  await playerPage.goto(`${BASE_URL}/player-modular.html?roomId=${roomId}`, { timeout: TIMEOUT.navigation });
  await waitForVisible(playerPage, '#playerIdSelector');
  
  const btn = playerPage.locator(`[data-player-id="${playerNumber}"]`);
  await expect(btn).toBeVisible({ timeout: TIMEOUT.element });
  await btn.click();
  await playerPage.waitForTimeout(500);
  
  const joinBtn = playerPage.locator('#joinRoomBtn');
  await expect(joinBtn).toBeEnabled({ timeout: TIMEOUT.element });
  await joinBtn.click();
  await playerPage.waitForTimeout(TIMEOUT.wait);
  
  console.log(`      玩家${playerNumber}号加入成功`);
  return playerPage;
}

async function voicePanelSmartNext(hostPage, targetPhase, playerPages = []) {
  console.log(`  [语音面板] 智能推进到 ${targetPhase}...`);
  
  let attempts = 0;
  const maxAttempts = 30;
  
  while (attempts < maxAttempts) {
    const phaseText = await hostPage.textContent('#smart-next-text');
    console.log(`      当前阶段: ${phaseText}`);
    
    if (phaseText.includes(targetPhase) || 
        (targetPhase === 'team-building' && phaseText.includes('组队')) ||
        (targetPhase === 'mission' && phaseText.includes('任务'))) {
      console.log(`      ✅ 已到达 ${targetPhase} 阶段`);
      return true;
    }
    
    // 检测夜间阶段或需要玩家确认的阶段
    if (phaseText.includes('夜间') || phaseText.includes('night') || 
        phaseText.includes('下一步') || phaseText.includes('天亮了')) {
      console.log('      检测到需要玩家确认的阶段，点击玩家页面的下一步按钮');
      for (const playerPage of playerPages) {
        try {
          // 尝试多种可能的选择器
          const nextBtn = playerPage.locator('#readyBtn, #nextPhaseBtn, button:has-text("下一步"), button:has-text("进入下一阶段"), button:has-text("确认")').first();
          if (await nextBtn.isVisible({ timeout: 3000 })) {
            await nextBtn.click();
            console.log('        点击了玩家的下一步按钮');
            await playerPage.waitForTimeout(1500);
          }
        } catch (e) {
          // 忽略错误，继续下一个玩家
        }
      }
      await hostPage.waitForTimeout(3000);
    }
    
    await hostPage.click('#btn-smart-next');
    await hostPage.waitForTimeout(2500);
    attempts++;
  }
  
  console.log(`      ❌ 未能到达 ${targetPhase} 阶段`);
  return false;
}

test.describe('任务完成后推进Bug测试', () => {
  
  test('MISSION-001: 任务完成后能正常推进到下一轮', async ({ browser }) => {
    console.log('\n[MISSION-001] 开始测试: 任务完成后推进游戏');
    
    const playerCount = 5;
    const context = await browser.newContext();
    const hostPage = await context.newPage();
    
    // 捕获浏览器控制台日志
    hostPage.on('console', msg => {
      if (msg.text().includes('[VOICE-PHASE]') || msg.text().includes('[调试]')) {
        console.log(`      [HOST-CONSOLE] ${msg.text()}`);
      }
    });
    
    const playerPages = [];
    let roomId = '';
    
    try {
      // 1. 创建房间
      console.log('\n[1] 创建房间...');
      await hostPage.goto(`${BASE_URL}/voice-panel-v2.html`, { timeout: TIMEOUT.navigation });
      roomId = await voicePanelCreateRoom(hostPage, playerCount);
      
      // 2. 玩家加入
      console.log('\n[2] 玩家加入...');
      const joinOrder = [1, 2, 3, 4, 5];
      for (const playerNumber of joinOrder) {
        const playerPage = await playerJoin(context, roomId, playerNumber);
        playerPages.push({ page: playerPage, number: playerNumber });
      }
      
      // 3. 智能推进到组队阶段
      console.log('\n[3] 推进到组队阶段...');
      let success = await voicePanelSmartNext(hostPage, 'team-building', playerPages);
      expect(success).toBe(true);
      await hostPage.waitForTimeout(3000);
      
      // 4. 队长组建队伍（选择2人）
      console.log('\n[4] 队长组建队伍...');
      const leaderName = await hostPage.textContent('#current-leader');
      console.log(`      当前队长: ${leaderName}`);
      
      // 找到队长页面
      let captainPage = null;
      for (const { page, number } of playerPages) {
        const playerName = await page.textContent('#currentPlayerName');
        if (playerName === leaderName) {
          captainPage = page;
          console.log(`      [玩家${number}号] 是队长`);
          break;
        }
      }
      expect(captainPage).not.toBeNull();
      
      // 队长选择2个队员 - 使用正确的类名 .player-select
      const teamButtons = captainPage.locator('#teamBuildingPlayerList .player-select').first();
      await expect(teamButtons).toBeVisible({ timeout: TIMEOUT.element });
      
      // 选择前两个可用的队员
      const selectButtons = captainPage.locator('#teamBuildingPlayerList .player-select');
      const count = await selectButtons.count();
      console.log(`      可选队员数量: ${count}`);
      
      if (count >= 2) {
        await selectButtons.nth(0).click();
        await captainPage.waitForTimeout(500);
        await selectButtons.nth(1).click();
        await captainPage.waitForTimeout(500);
        console.log('      已选择2名队员');
      }
      
      // 提交队伍
      const submitBtn = captainPage.locator('#submitTeamBtn');
      await expect(submitBtn).toBeVisible({ timeout: TIMEOUT.element });
      await submitBtn.click();
      console.log('      队伍已提交');
      await hostPage.waitForTimeout(3000);
      
      // 5. 玩家投票（全部同意）
      console.log('\n[5] 玩家投票...');
      for (const { page, number } of playerPages) {
        try {
          const approveBtn = page.locator('#approveBtn, button:has-text("同意"), button:has-text("approve")').first();
          if (await approveBtn.isVisible({ timeout: 2000 })) {
            await approveBtn.click();
            console.log(`      [玩家${number}号] 投票同意`);
            await page.waitForTimeout(500);
          }
        } catch (e) {
          console.log(`      [玩家${number}号] 无需投票或已投票`);
        }
      }
      await hostPage.waitForTimeout(3000);
      
      // 6. 推进到任务阶段
      console.log('\n[6] 推进到任务阶段...');
      success = await voicePanelSmartNext(hostPage, 'mission', playerPages);
      expect(success).toBe(true);
      await hostPage.waitForTimeout(3000);
      
      // 7. 任务队员执行任务（全部成功）- 并行执行
      console.log('\n[7] 任务队员执行任务...');
      
      // 先找到所有任务队员
      const missionPlayers = [];
      for (const { page, number } of playerPages) {
        try {
          const successBtn = page.locator('#successBtn').first();
          if (await successBtn.isVisible({ timeout: 3000 })) {
            missionPlayers.push({ page, number });
            console.log(`      [玩家${number}号] 是任务队员`);
          }
        } catch (e) {
          console.log(`      [玩家${number}号] 不是任务队员`);
        }
      }
      
      console.log(`      任务队员数量: ${missionPlayers.length}`);
      
      // 并行点击所有任务队员的按钮
      const clickPromises = missionPlayers.map(async ({ page, number }) => {
        try {
          const successBtn = page.locator('#successBtn').first();
          await successBtn.click();
          console.log(`      [玩家${number}号] 点击任务成功按钮`);
          // 等待按钮状态变化
          await page.waitForTimeout(2000);
          return true;
        } catch (e) {
          console.log(`      [玩家${number}号] 点击失败: ${e.message}`);
          return false;
        }
      });
      
      const results = await Promise.all(clickPromises);
      const missionVoteCount = results.filter(r => r).length;
      console.log(`      共 ${missionVoteCount} 名任务队员成功执行了任务`);
      
      // 等待服务器处理任务结果和客户端更新
      console.log('      等待任务结果处理...');
      
      // 直接检查客户端gameState
      const clientState = await hostPage.evaluate(() => {
        return {
          gamePhase: window.gameState?.gamePhase,
          currentRound: window.gameState?.currentRound
        };
      }).catch(() => null);
      console.log('      客户端gameState:', JSON.stringify(clientState));
      
      // 记录任务完成前的按钮文字
      const phaseText = await hostPage.textContent('#smart-next-text');
      console.log(`      初始阶段: ${phaseText}`);
      
      // 等待最多20秒，检查阶段是否变化
      let phaseChanged = false;
      let newPhaseText = phaseText;
      
      // 如果初始文字已经是"等待队长组队"，说明阶段已经变了，直接通过
      if (phaseText.includes('等待队长组队') || phaseText.includes('第2轮') || phaseText.includes('下一轮')) {
        console.log(`      ✅ 阶段已变化: 按钮文字='${phaseText}'`);
        phaseChanged = true;
        newPhaseText = phaseText;
      } else {
        for (let i = 0; i < 20; i++) {
          await hostPage.waitForTimeout(1000);
          const currentText = await hostPage.textContent('#smart-next-text');
          const currentState = await hostPage.evaluate(() => {
            return window.gameState?.gamePhase;
          }).catch(() => 'unknown');
          console.log(`      第${i+1}秒: 按钮文字='${currentText}', gameState.gamePhase='${currentState}'`);
          if (currentText !== phaseText) {
            console.log(`      阶段变化: ${phaseText} -> ${currentText} (${i+1}秒后)`);
            phaseChanged = true;
            newPhaseText = currentText;
            break;
          }
        }
      }
      
      // 8. 验证任务完成后能推进到下一轮
      console.log('\n[8] 验证任务完成后推进...');
      
      // 检查语音面板是否显示任务结果
      console.log(`      当前阶段: ${newPhaseText}`);
      
      // 验证是否进入了下一轮（第2轮）或结束
      const currentRound = await hostPage.textContent('#current-round');
      console.log(`      当前轮次: ${currentRound}`);
      
      // 截图保存
      await hostPage.screenshot({ path: 'test-results/mission-complete-phase.png', fullPage: true });
      
      // 验证游戏能继续（不是卡住）
      expect(phaseChanged).toBe(true); // 阶段应该变化
      expect(newPhaseText).not.toBe('等待任务执行'); // 不应该还在等待任务执行
      
      console.log('\n  ✅ MISSION-001 通过（任务完成后能推进游戏）');
      
    } finally {
      await context.close();
    }
  });
});

test.describe.configure({ mode: 'serial', timeout: 300000 });
