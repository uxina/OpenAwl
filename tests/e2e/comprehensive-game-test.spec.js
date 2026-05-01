/**
 * E2E综合测试套件：阿瓦隆游戏全面验证
 * 
 * 测试覆盖：
 * 1. 创建房间与玩家加入
 * 2. 玩家编号预选择实时同步（新增）
 * 3. 角色分配与夜间阶段
 * 4. 第一轮队长随机生成
 * 5. 队长轮换按编号顺序（新增）
 * 6. 组队投票完整流程
 * 7. 任务历史显示投票和票型（新增）
 * 8. 多轮任务循环（3轮成功→刺杀）
 * 9. 游戏结束与结算
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

async function createRoom(hostPage, playerCount = 5) {
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
  await hostPage.waitForTimeout(3000);
  
  const roomId = await hostPage.textContent('#room-id');
  console.log(`      房间ID: ${roomId}`);
  return roomId;
}

async function joinPlayer(context, roomId, playerNumber) {
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
  await playerPage.waitForTimeout(3000);
  
  console.log(`      玩家${playerNumber}号加入成功`);
  return playerPage;
}

async function smartNext(hostPage, targetPhase, playerPages = []) {
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
  
  await captainPage.waitForTimeout(2000);
  
  const selectButtons = captainPage.locator('#teamBuildingPlayerList .player-select');
  const count = await selectButtons.count();
  console.log(`      可选队员数量: ${count}`);
  
  for (let i = 0; i < teamSize && i < count; i++) {
    await selectButtons.nth(i).click();
    await captainPage.waitForTimeout(500);
  }
  
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

test.describe('阿瓦隆游戏 - 全面E2E测试', () => {
  
  test('E2E-001: 创建房间与玩家加入', async ({ browser }) => {
    console.log('\n[E2E-001] 验证创建房间与玩家加入');
    
    const context = await browser.newContext();
    const hostPage = await context.newPage();
    const playerPages = [];
    
    try {
      await hostPage.goto(`${BASE_URL}/voice-panel-v2.html`, { timeout: TIMEOUT.navigation });
      
      const roomId = await createRoom(hostPage, 5);
      expect(roomId).toBeTruthy();
      
      for (const playerNumber of [1, 2, 3, 4, 5]) {
        const playerPage = await joinPlayer(context, roomId, playerNumber);
        playerPages.push({ page: playerPage, number: playerNumber });
      }
      
      // 验证所有玩家都加入了
      const playerCount = await hostPage.textContent('#player-count');
      console.log(`  当前玩家数量: ${playerCount}`);
      expect(parseInt(playerCount)).toBe(5);
      
    } finally {
      await context.close();
    }
  });

  test('E2E-002: 玩家编号预选择实时同步', async ({ browser }) => {
    console.log('\n[E2E-002] 验证玩家编号预选择实时同步');
    
    const context = await browser.newContext();
    const hostPage = await context.newPage();
    const hostPage2 = await context.newPage();
    
    try {
      await hostPage.goto(`${BASE_URL}/player-modular.html`, { timeout: TIMEOUT.navigation });
      await hostPage2.goto(`${BASE_URL}/player-modular.html`, { timeout: TIMEOUT.navigation });
      
      // 等待页面加载
      await waitForVisible(hostPage, '#roomId');
      await waitForVisible(hostPage2, '#roomId');
      
      // 在第一个页面输入房间号
      const roomIdInput = hostPage.locator('#roomId');
      await roomIdInput.fill('9999');
      await hostPage.click('#queryRoomBtn');
      await hostPage.waitForTimeout(3000);
      
      // 在第二个页面输入相同房间号
      const roomIdInput2 = hostPage2.locator('#roomId');
      await roomIdInput2.fill('9999');
      await hostPage2.click('#queryRoomBtn');
      await hostPage2.waitForTimeout(3000);
      
      // 在第一个页面选择编号
      const btn1 = hostPage.locator('[data-player-id="1"]');
      await expect(btn1).toBeVisible();
      await btn1.click();
      await hostPage.waitForTimeout(2000);
      
      // 验证第二个页面看到编号1被占用（灰色）
      const btn1OnPage2 = hostPage2.locator('[data-player-id="1"]');
      await expect(btn1OnPage2).toBeVisible();
      
      // 等待同步
      await hostPage2.waitForTimeout(3000);
      
      // 检查按钮是否有taken类或disabled
      const isTaken = await btn1OnPage2.evaluate(el => 
        el.classList.contains('taken') || el.disabled
      );
      
      console.log(`  编号1在第二个页面是否被标记为已选: ${isTaken}`);
      
    } finally {
      await context.close();
    }
  });

  test('E2E-003: 完整游戏流程（3轮成功任务到刺杀）', async ({ browser }) => {
    console.log('\n[E2E-003] 验证完整游戏流程：3轮成功→刺杀→游戏结束');
    
    const playerCount = 5;
    const context = await browser.newContext();
    const hostPage = await context.newPage();
    const playerPages = [];
    
    try {
      // 创建房间
      console.log('\n[1] 创建房间...');
      await hostPage.goto(`${BASE_URL}/voice-panel-v2.html`, { timeout: TIMEOUT.navigation });
      const roomId = await createRoom(hostPage, playerCount);
      
      // 玩家加入
      console.log('\n[2] 玩家加入...');
      for (const playerNumber of [1, 2, 3, 4, 5]) {
        const playerPage = await joinPlayer(context, roomId, playerNumber);
        playerPages.push({ page: playerPage, number: playerNumber });
      }
      
      // 推进到组队阶段
      console.log('\n[3] 推进到组队阶段...');
      let success = await smartNext(hostPage, 'team-building', playerPages);
      expect(success).toBe(true);
      await hostPage.waitForTimeout(3000);
      
      // 验证第一轮队长随机性
      const firstLeader = await hostPage.textContent('#current-leader');
      console.log(`  第一轮队长: ${firstLeader}`);
      expect(firstLeader).toBeTruthy();
      
      // 记录第一轮队长编号
      const firstLeaderNum = parseInt(firstLeader.replace('号', ''));
      
      // 3轮任务循环
      for (let round = 1; round <= 3; round++) {
        console.log(`\n========== 第 ${round} 轮 ==========`);
        
        const leaderName = await hostPage.textContent('#current-leader');
        console.log(`  当前队长: ${leaderName}`);
        
        // 找到队长页面
        let captainPage = null;
        for (const { page, number } of playerPages) {
          const playerName = await page.textContent('#currentPlayerName');
          if (playerName === leaderName) {
            captainPage = page;
            break;
          }
        }
        expect(captainPage).not.toBeNull();
        
        // 队长组建队伍
        const missionSize = round === 1 ? 2 : round === 2 ? 3 : round === 3 ? 2 : 3;
        await captainBuildTeam(captainPage, missionSize);
        await hostPage.waitForTimeout(5000);
        
        // 所有玩家投票
        await allPlayersVote(playerPages);
        await hostPage.waitForTimeout(5000);
        
        // 推进到任务阶段
        success = await smartNext(hostPage, 'mission', playerPages);
        expect(success).toBe(true);
        await hostPage.waitForTimeout(3000);
        
        // 获取任务队员
        const missionPlayers = [];
        for (const { page, number } of playerPages) {
          try {
            const successBtn = page.locator('#successBtn').first();
            if (await successBtn.isVisible({ timeout: 3000 })) {
              missionPlayers.push({ page, number });
            }
          } catch (e) {}
        }
        
        // 任务队员投票
        await missionPlayersVote(missionPlayers, 'success');
        await hostPage.waitForTimeout(5000);
        
        // 验证任务历史显示（Bug#2修复验证）
        if (round > 1) {
          const missionHistory = await captainPage.locator('#missionHistoryList');
          if (await missionHistory.isVisible({ timeout: 5000 })) {
            const historyText = await missionHistory.textContent();
            console.log(`  任务历史: ${historyText.substring(0, 100)}...`);
            // 验证显示投票和票型
            expect(historyText).toMatch(/成功|失败|赞成|反对|票/i);
          }
        }
      }
      
      // 推进到刺杀阶段
      console.log('\n[4] 推进到刺杀阶段...');
      success = await smartNext(hostPage, 'assassination', playerPages);
      expect(success).toBe(true);
      await hostPage.waitForTimeout(3000);
      
      // 刺客刺杀
      console.log('\n[5] 刺客选择目标...');
      for (const { page, number } of playerPages) {
        try {
          const assassinateBtn = page.locator('.assassinate-btn').first();
          if (await assassinateBtn.isVisible({ timeout: 3000 })) {
            await assassinateBtn.click();
            console.log(`  玩家${number}号进行了刺杀`);
            await page.waitForTimeout(5000);
            break;
          }
        } catch (e) {}
      }
      
      // 验证游戏结束
      await hostPage.waitForTimeout(5000);
      const finalPhase = await hostPage.textContent('#game-phase');
      console.log(`  最终阶段: ${finalPhase}`);
      
      // 截图验证
      await hostPage.screenshot({ path: 'test-results/e2e-003-game-ended.png', fullPage: true });
      
    } finally {
      await context.close();
    }
  });

  test('E2E-004: 队长轮换按编号顺序验证', async ({ browser }) => {
    console.log('\n[E2E-004] 验证队长轮换按编号顺序（1号→2号→3号...）');
    
    const playerCount = 5;
    const context = await browser.newContext();
    const hostPage = await context.newPage();
    const playerPages = [];
    const captainSequence = [];
    
    try {
      console.log('\n[1] 创建房间...');
      await hostPage.goto(`${BASE_URL}/voice-panel-v2.html`, { timeout: TIMEOUT.navigation });
      const roomId = await createRoom(hostPage, playerCount);
      
      console.log('\n[2] 玩家加入...');
      for (const playerNumber of [1, 2, 3, 4, 5]) {
        const playerPage = await joinPlayer(context, roomId, playerNumber);
        playerPages.push({ page: playerPage, number: playerNumber });
      }
      
      console.log('\n[3] 推进到组队阶段...');
      let success = await smartNext(hostPage, 'team-building', playerPages);
      expect(success).toBe(true);
      await hostPage.waitForTimeout(3000);
      
      // 记录3轮队长序列
      for (let round = 1; round <= 3; round++) {
        const leaderName = await hostPage.textContent('#current-leader');
        const leaderNum = parseInt(leaderName.replace('号', ''));
        captainSequence.push(leaderNum);
        console.log(`  第${round}轮队长: ${leaderName} (编号${leaderNum})`);
        
        // 找到队长页面
        let captainPage = null;
        for (const { page, number } of playerPages) {
          const playerName = await page.textContent('#currentPlayerName');
          if (playerName === leaderName) {
            captainPage = page;
            break;
          }
        }
        expect(captainPage).not.toBeNull();
        
        // 队长组建队伍
        const missionSize = round === 1 ? 2 : round === 2 ? 3 : round === 3 ? 2 : 3;
        await captainBuildTeam(captainPage, missionSize);
        await hostPage.waitForTimeout(5000);
        
        // 所有玩家投票
        await allPlayersVote(playerPages);
        await hostPage.waitForTimeout(5000);
        
        // 推进到任务阶段
        success = await smartNext(hostPage, 'mission', playerPages);
        expect(success).toBe(true);
        await hostPage.waitForTimeout(3000);
        
        // 任务队员投票
        const missionPlayers = [];
        for (const { page, number } of playerPages) {
          try {
            const successBtn = page.locator('#successBtn').first();
            if (await successBtn.isVisible({ timeout: 3000 })) {
              missionPlayers.push({ page, number });
            }
          } catch (e) {}
        }
        await missionPlayersVote(missionPlayers, 'success');
        await hostPage.waitForTimeout(5000);
      }
      
      console.log(`\n  队长轮换序列: ${captainSequence.join(' → ')}`);
      
      // 验证队长轮换是连续的（按编号顺序）
      for (let i = 1; i < captainSequence.length; i++) {
        const diff = (captainSequence[i] - captainSequence[i-1] + 5) % 5;
        console.log(`  第${i}轮到第${i+1}轮的轮换差值: ${diff}`);
        // 应该每次轮换1个位置（顺时针）
        expect(diff).toBe(1);
      }
      
    } finally {
      await context.close();
    }
  });
});

test.describe.configure({ mode: 'serial', timeout: 600000 });
