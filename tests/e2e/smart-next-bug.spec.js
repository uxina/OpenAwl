/**
 * E2E测试：验证智能推进时的队长识别bug
 * 模拟用户场景：重置游戏后，用智能推进直接推进到组队阶段
 */

const { test, expect } = require('@playwright/test');

const BASE_URL = 'http://localhost:3000';
const TIMEOUT = {
  navigation: 30000,
  element: 15000,
  action: 5000,
  wait: 2000
};

/**
 * 等待直到元素可见
 */
async function waitForVisible(page, selector, timeout = TIMEOUT.element) {
  await page.waitForSelector(selector, { state: 'visible', timeout });
}

/**
 * 语音面板创建房间
 */
async function voicePanelCreateRoom(hostPage, playerCount = 5) {
  console.log('  [语音面板] 创建房间...');
  
  // 设置玩家数量
  await waitForVisible(hostPage, '#player-count');
  
  // 通过加减按钮调整到目标数量
  let currentCount = parseInt(await hostPage.textContent('#player-count'));
  while (currentCount < playerCount) {
    await hostPage.click('#btn-increase');
    currentCount++;
  }
  while (currentCount > playerCount) {
    await hostPage.click('#btn-decrease');
    currentCount--;
  }
  console.log(`      设置玩家数量: ${playerCount}人`);
  
  // 点击创建房间
  await hostPage.click('#btn-create');
  await hostPage.waitForTimeout(TIMEOUT.wait);
  
  // 验证房间ID
  const roomId = await hostPage.textContent('#room-id');
  expect(roomId).toMatch(/\d{4}/);
  console.log(`      房间ID: ${roomId}`);
  
  return roomId;
}

/**
 * 玩家加入房间（使用URL参数）
 */
async function playerJoin(context, roomId, playerNumber) {
  console.log(`  [玩家${playerNumber}号] 加入房间...`);
  
  const playerPage = await context.newPage();
  
  // 直接带roomId参数访问
  await playerPage.goto(`${BASE_URL}/player-modular.html?roomId=${roomId}`, { timeout: TIMEOUT.navigation });
  
  // 选择玩家编号
  await waitForVisible(playerPage, '#playerIdSelector');
  
  // 点击对应编号的按钮
  const btn = playerPage.locator(`[data-player-id="${playerNumber}"]`);
  await expect(btn).toBeVisible({ timeout: TIMEOUT.element });
  await btn.click();
  await playerPage.waitForTimeout(500);
  
  // 点击加入按钮
  const joinBtn = playerPage.locator('#joinRoomBtn');
  await expect(joinBtn).toBeEnabled({ timeout: TIMEOUT.element });
  await joinBtn.click();
  await playerPage.waitForTimeout(TIMEOUT.wait);
  
  console.log(`      玩家${playerNumber}号加入成功`);
  return playerPage;
}

/**
 * 玩家点击"进入下一阶段"按钮（用于夜间阶段）
 */
async function playerClickNextPhase(playerPage) {
  console.log('  [玩家] 点击进入下一阶段...');
  try {
    const nextBtn = playerPage.locator('#readyBtn, #nextPhaseBtn, .next-phase-btn, button:has-text("进入下一阶段"), button:has-text("下一步")').first();
    if (await nextBtn.isVisible({ timeout: 2000 })) {
      await nextBtn.click();
      await playerPage.waitForTimeout(1000);
      console.log('      已点击进入下一阶段');
      return true;
    }
  } catch (e) {
    console.log('      没有找到进入下一阶段按钮');
  }
  return false;
}

/**
 * 智能推进到指定阶段
 */
async function voicePanelSmartNext(hostPage, targetPhase, playerPages = []) {
  console.log(`  [语音面板] 智能推进到 ${targetPhase}...`);
  
  let attempts = 0;
  const maxAttempts = 15;
  
  while (attempts < maxAttempts) {
    // 获取当前阶段文本
    const phaseText = await hostPage.textContent('#smart-next-text');
    console.log(`      当前阶段: ${phaseText}`);
    
    // 检查是否已达到目标阶段
    if (phaseText.includes(targetPhase) || 
        (targetPhase === 'team-building' && phaseText.includes('组队'))) {
      console.log(`      ✅ 已到达 ${targetPhase} 阶段`);
      return true;
    }
    
    // 如果在夜间阶段，需要玩家点击"进入下一阶段"
    if (phaseText.includes('夜间') || phaseText.includes('night')) {
      console.log('      检测到夜间阶段，需要玩家点击进入下一阶段');
      for (const playerPage of playerPages) {
        await playerClickNextPhase(playerPage.page || playerPage);
      }
      await hostPage.waitForTimeout(2000);
    }
    
    // 点击智能推进按钮
    await hostPage.click('#btn-smart-next');
    await hostPage.waitForTimeout(2000);
    
    attempts++;
  }
  
  console.log(`      ❌ 未能到达 ${targetPhase} 阶段`);
  return false;
}

test.describe('智能推进队长识别Bug测试', () => {
  
  test('SMART-NEXT-001: 智能推进到组队阶段，验证队长能正确显示组队选项', async ({ browser }) => {
    console.log('\n[SMART-NEXT-001] 开始测试: 智能推进队长识别');
    
    const playerCount = 5;
    const context = await browser.newContext();
    const hostPage = await context.newPage();
    const playerPages = [];
    let roomId = '';
    
    try {
      // ==========================================
      // 1. 语音面板创建房间
      // ==========================================
      console.log('\n[1] 语音面板创建房间...');
      await hostPage.goto(`${BASE_URL}/voice-panel-v2.html`, { timeout: TIMEOUT.navigation });
      console.log('      已访问语音面板');
      
      roomId = await voicePanelCreateRoom(hostPage, playerCount);
      console.log(`      ✅ 房间 ${roomId} 创建成功`);
      
      // ==========================================
      // 2. 玩家按非顺序加入（模拟真实场景）
      // ==========================================
      console.log('\n[2] 玩家加入房间（非顺序）...');
      
      // 按 3, 1, 5, 2, 4 的顺序加入（非顺序）
      const joinOrder = [3, 1, 5, 2, 4];
      for (const playerNumber of joinOrder) {
        const playerPage = await playerJoin(context, roomId, playerNumber);
        playerPages.push({ page: playerPage, number: playerNumber });
        await playerPage.waitForTimeout(500);
      }
      
      console.log(`      ✅ 所有 ${playerCount} 个玩家已加入（顺序: ${joinOrder.join(', ')}）`);
      
      // ==========================================
      // 3. 智能推进到组队阶段（需要玩家配合点击）
      // ==========================================
      console.log('\n[3] 智能推进到组队阶段...');
      const success = await voicePanelSmartNext(hostPage, 'team-building', playerPages);
      expect(success).toBe(true);
      
      // 等待一段时间让阶段切换生效
      await hostPage.waitForTimeout(3000);
      
      // ==========================================
      // 4. 获取当前队长信息
      // ==========================================
      console.log('\n[4] 获取队长信息...');
      
      const currentLeader = await hostPage.textContent('#current-leader');
      console.log(`      语音面板显示队长: ${currentLeader}`);
      
      // 验证队长不是"--"
      expect(currentLeader).not.toBe('--');
      expect(currentLeader).not.toBe('----');
      
      // ==========================================
      // 5. 验证每个玩家的界面
      // ==========================================
      console.log('\n[5] 验证每个玩家的界面...');
      
      for (const { page, number } of playerPages) {
        // 截图保存
        await page.screenshot({
          path: `test-results/smart-next-player-${number}-team-building.png`,
          fullPage: true
        });
        
        // 检查当前玩家名称
        const playerName = await page.textContent('#currentPlayerName');
        console.log(`      [玩家${number}号] 界面显示名称: ${playerName}`);
        
        // 检查是否是队长界面
        const isLeaderInfoVisible = await page.isVisible('#isLeaderInfo').catch(() => false);
        const isNotLeaderInfoVisible = await page.isVisible('#notLeaderInfo').catch(() => false);
        
        console.log(`      [玩家${number}号] isLeaderInfo: ${isLeaderInfoVisible}, isNotLeaderInfo: ${isNotLeaderInfoVisible}`);
        
        // 验证队长能看到组队按钮
        if (playerName === currentLeader) {
          console.log(`      [玩家${number}号] 应该是队长`);
          expect(isLeaderInfoVisible).toBe(true);
          expect(isNotLeaderInfoVisible).toBe(false);
          
          // 验证组队按钮存在
          const submitTeamBtn = page.locator('#submitTeamBtn');
          await expect(submitTeamBtn).toBeVisible({ timeout: TIMEOUT.element });
          console.log(`      ✅ [玩家${number}号] 队长组队按钮已显示`);
        } else {
          console.log(`      [玩家${number}号] 不是队长`);
          // 非队长应该看到等待消息
          expect(isNotLeaderInfoVisible).toBe(true);
          console.log(`      ✅ [玩家${number}号] 非队长界面正确`);
        }
      }
      
      console.log('\n  ✅ SMART-NEXT-001 通过（智能推进队长识别测试）');
      
    } finally {
      await context.close();
    }
  });

  test('SMART-NEXT-002: 验证currentLeaderIndex和currentLeaderName一致性', async ({ browser }) => {
    console.log('\n[SMART-NEXT-002] 开始测试: 队长索引和名字一致性');
    
    const playerCount = 5;
    const context = await browser.newContext();
    const hostPage = await context.newPage();
    const playerPages = [];
    
    try {
      // 创建房间
      await hostPage.goto(`${BASE_URL}/voice-panel-v2.html`, { timeout: TIMEOUT.navigation });
      const roomId = await voicePanelCreateRoom(hostPage, playerCount);
      
      // 玩家加入（非顺序）
      const joinOrder = [2, 4, 1, 5, 3];
      for (const playerNumber of joinOrder) {
        const playerPage = await playerJoin(context, roomId, playerNumber);
        playerPages.push({ page: playerPage, number: playerNumber });
      }
      
      // 智能推进到组队阶段
      await voicePanelSmartNext(hostPage, 'team-building');
      await hostPage.waitForTimeout(3000);
      
      // 获取语音面板显示的队长
      const voicePanelLeader = await hostPage.textContent('#current-leader');
      console.log(`      语音面板队长: ${voicePanelLeader}`);
      
      // 检查所有客户端显示的队长
      let allConsistent = true;
      for (const { page, number } of playerPages) {
        const clientLeader = await page.textContent('#currentLeader').catch(() => '-');
        const clientWaiting = await page.textContent('#waitingLeader').catch(() => '-');
        
        console.log(`      [玩家${number}号] currentLeader: ${clientLeader}, waitingLeader: ${clientWaiting}`);
        
        // 验证一致性
        if (clientLeader !== '-' && clientLeader !== voicePanelLeader) {
          console.log(`      ❌ 不一致: 语音面板="${voicePanelLeader}", 客户端="${clientLeader}"`);
          allConsistent = false;
        }
      }
      
      expect(allConsistent).toBe(true);
      console.log('\n  ✅ SMART-NEXT-002 通过（队长信息一致性测试）');
      
    } finally {
      await context.close();
    }
  });
});

test.describe.configure({ mode: 'serial', timeout: 180000 });
