/**
 * E2E测试：3轮任务后进入刺杀阶段（BUG-054验证）
 * 验证修复：每轮任务完成后，客户端状态正确重置，轮次正确更新
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
  
  // 等待房间状态查询完成（提示文字会从"请选择1-10"变为"请选择1-5"）
  await playerPage.waitForFunction(() => {
    const hint = document.getElementById('playerIdHint');
    return hint && hint.textContent.includes('1-5');
  }, { timeout: TIMEOUT.element });
  
  // 等待特定编号按钮出现
  const btn = playerPage.locator(`[data-player-id="${playerNumber}"]`);
  await btn.waitFor({ state: 'visible', timeout: TIMEOUT.element });
  await expect(btn).toBeVisible({ timeout: TIMEOUT.element });
  await expect(btn).not.toHaveClass(/taken/);
  
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
  const maxAttempts = 40;
  
  while (attempts < maxAttempts) {
    const phaseText = await hostPage.textContent('#smart-next-text');
    console.log(`      当前阶段: ${phaseText}`);
    
    if (phaseText.includes(targetPhase) || 
        (targetPhase === 'team-building' && phaseText.includes('组队')) ||
        (targetPhase === 'mission' && phaseText.includes('任务')) ||
        (targetPhase === 'ended' && (phaseText.includes('结束') || phaseText.includes('游戏结束')))) {
      console.log(`      ✅ 已到达 ${targetPhase} 阶段`);
      return true;
    }
    
    // 检测夜间阶段或需要玩家确认的阶段
    if (phaseText.includes('夜间') || phaseText.includes('night') || 
        phaseText.includes('下一步') || phaseText.includes('天亮了')) {
      console.log('      检测到需要玩家确认的阶段，点击玩家页面的下一步按钮');
      for (const playerPage of playerPages) {
        try {
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

async function captainBuildTeam(captainPage, teamSize = 2) {
  console.log('      [队长] 组建队伍...');
  
  // 等待组队界面刷新
  await captainPage.waitForTimeout(2000);
  
  const selectButtons = captainPage.locator('#teamBuildingPlayerList .player-select');
  const count = await selectButtons.count();
  console.log(`      可选队员数量: ${count}`);
  
  // 选择指定数量的队员
  for (let i = 0; i < teamSize && i < count; i++) {
    await selectButtons.nth(i).click();
    await captainPage.waitForTimeout(500);
  }
  
  // 提交队伍
  const submitBtn = captainPage.locator('#submitTeamBtn');
  await expect(submitBtn).toBeVisible({ timeout: TIMEOUT.element });
  await submitBtn.click();
  console.log('      队伍已提交');
}

async function allPlayersVote(playerPages) {
  console.log('      [所有玩家] 投票同意...');
  
  for (const { page, number } of playerPages) {
    try {
      const approveBtn = page.locator('#approveBtn, button:has-text("同意"), button:has-text("approve")').first();
      if (await approveBtn.isVisible({ timeout: 2000 })) {
        await approveBtn.click();
        console.log(`        [玩家${number}号] 投票同意`);
        await page.waitForTimeout(500);
      }
    } catch (e) {
      console.log(`        [玩家${number}号] 无需投票或已投票`);
    }
  }
}

async function missionPlayersVote(missionPlayers, voteType = 'success') {
  console.log(`      [任务队员] 执行任务 (${voteType})...`);
  
  for (const { page, number } of missionPlayers) {
    try {
      const btn = voteType === 'success' 
        ? page.locator('#successBtn').first()
        : page.locator('#failBtn').first();
      
      if (await btn.isVisible({ timeout: 3000 })) {
        await btn.click();
        console.log(`        [玩家${number}号] 点击${voteType === 'success' ? '成功' : '失败'}按钮`);
        await page.waitForTimeout(1000);
      }
    } catch (e) {
      console.log(`        [玩家${number}号] 不是任务队员`);
    }
  }
}

test.describe('BUG-054验证：3轮任务后刺杀阶段', () => {
  
  test('BUG-054-001: 3轮成功任务后进入刺杀阶段', async ({ browser }) => {
    console.log('\n[BUG-054-001] 开始测试: 3轮成功任务后进入刺杀阶段');
    
    const playerCount = 5;
    const context = await browser.newContext();
    const hostPage = await context.newPage();
    const playerPages = [];
    
    // 捕获控制台日志
    hostPage.on('console', msg => {
      if (msg.text().includes('[VOICE-PHASE]') || msg.text().includes('[POLL]')) {
        console.log(`      [HOST-CONSOLE] ${msg.text()}`);
      }
    });
    
    try {
      // ========== 第1步：创建房间 ==========
      console.log('\n[1] 创建房间...');
      await hostPage.goto(`${BASE_URL}/voice-panel-v2.html`, { timeout: TIMEOUT.navigation });
      const roomId = await voicePanelCreateRoom(hostPage, playerCount);
      
      // ========== 第2步：玩家加入 ==========
      console.log('\n[2] 玩家加入...');
      const joinOrder = [1, 2, 3, 4, 5];
      for (const playerNumber of joinOrder) {
        const playerPage = await playerJoin(context, roomId, playerNumber);
        playerPages.push({ page: playerPage, number: playerNumber });
      }
      
      // ========== 第3步：推进到组队阶段 ==========
      console.log('\n[3] 推进到组队阶段...');
      let success = await voicePanelSmartNext(hostPage, 'team-building', playerPages);
      expect(success).toBe(true);
      await hostPage.waitForTimeout(3000);
      
      // ========== 第4步：进行3轮成功任务 ==========
      let currentRound = 1;
      const maxRounds = 3;
      
      while (currentRound <= maxRounds) {
        console.log(`\n========== 第 ${currentRound} 轮 ==========`);
        
        // 获取当前队长
        const leaderName = await hostPage.textContent('#current-leader');
        console.log(`  当前队长: ${leaderName}`);
        
        // 找到队长页面
        let captainPage = null;
        for (const { page, number } of playerPages) {
          const playerName = await page.textContent('#currentPlayerName');
          if (playerName === leaderName) {
            captainPage = page;
            console.log(`  [玩家${number}号] 是队长`);
            break;
          }
        }
        expect(captainPage).not.toBeNull();
        
        // 验证轮次显示正确（BUG-054关键验证点）
        if (currentRound > 1) {
          const roundDisplay = await captainPage.textContent('#currentRoundDisplay');
          console.log(`  客户端显示的轮次: ${roundDisplay}`);
          expect(parseInt(roundDisplay)).toBe(currentRound);
          console.log(`  ✅ 轮次显示正确`);
        }
        
        // 队长组建队伍
        console.log(`\n  [4.${currentRound}] 队长组建队伍...`);
        const missionSize = currentRound === 1 ? 2 : currentRound === 2 ? 3 : currentRound === 3 ? 2 : 3;
        await captainBuildTeam(captainPage, missionSize);
        await hostPage.waitForTimeout(5000);
        
        // 所有玩家投票同意
        console.log(`\n  [5.${currentRound}] 玩家投票...`);
        await allPlayersVote(playerPages);
        await hostPage.waitForTimeout(5000);
        
        // 推进到任务阶段
        console.log(`\n  [6.${currentRound}] 推进到任务阶段...`);
        success = await voicePanelSmartNext(hostPage, 'mission', playerPages);
        expect(success).toBe(true);
        await hostPage.waitForTimeout(3000);
        
        // 找到任务队员并执行任务
        console.log(`\n  [7.${currentRound}] 任务队员执行任务...`);
        const missionPlayers = [];
        for (const { page, number } of playerPages) {
          try {
            const successBtn = page.locator('#successBtn').first();
            if (await successBtn.isVisible({ timeout: 3000 })) {
              missionPlayers.push({ page, number });
            }
          } catch (e) {
            // 不是任务队员
          }
        }
        console.log(`  任务队员数量: ${missionPlayers.length}`);
        
        // 所有任务队员执行成功任务
        await missionPlayersVote(missionPlayers, 'success');
        
        // 等待任务结果处理
        console.log('  等待任务结果处理...');
        await hostPage.waitForTimeout(5000);
        
        // 检查是否进入刺杀阶段
        const smartNextText = await hostPage.textContent('#smart-next-text');
        console.log(`  当前按钮: ${smartNextText}`);
        
        if (smartNextText.includes('刺客')) {
          console.log('  ✅ 进入刺杀阶段');
          break;
        } else if (smartNextText.includes('等待队长组队')) {
          console.log('  ✅ 进入下一轮');
          currentRound++;
          
          // 等待状态同步（不刷新页面，等待Socket.IO事件）
          console.log('  等待状态同步...');
          await hostPage.waitForTimeout(5000);
        } else {
          console.log('  ⚠️ 状态不确定，等待后重试...');
          await hostPage.waitForTimeout(3000);
          currentRound++;
        }
      }
      
      // ========== 第5步：验证进入刺杀阶段 ==========
      console.log('\n[5] 验证刺杀阶段...');
      
      const finalPhaseText = await hostPage.textContent('#smart-next-text');
      console.log(`  最终阶段: ${finalPhaseText}`);
      
      // 验证应该进入刺杀阶段（3轮成功后）
      expect(finalPhaseText).toContain('刺客');
      
      // 截图保存最终状态
      await hostPage.screenshot({ path: 'test-results/bug-054-assassination.png', fullPage: true });
      
      console.log('\n  ✅ BUG-054-001 通过（3轮成功任务后进入刺杀阶段）');
      
    } finally {
      await context.close();
    }
  });
});

test.describe.configure({ mode: 'serial', timeout: 600000 });
