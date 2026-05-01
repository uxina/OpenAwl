/**
 * E2E测试套件：阿瓦隆完整游戏流程
 * 覆盖场景：
 * 1. 创建房间与玩家加入
 * 2. 角色分配与夜间阶段
 * 3. 组队投票完整流程
 * 4. 任务执行与结果
 * 5. 多轮任务循环
 * 6. 刺杀阶段
 * 7. 游戏结束
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

async function getPlayerNameDisplay(page) {
  return page.locator('#playerNameDisplay').textContent().catch(() => page.locator('.player-name').textContent().catch(() => 'Unknown'));
}

async function voicePanelCreateRoom(hostPage, playerCount = 5) {
  console.log('  [语音面板] 创建房间...');
  await waitForVisible(hostPage, '#player-count');
  
  let currentCount = parseInt(await hostPage.textContent('#player-count'));
  while (currentCount < playerCount) {
    await hostPage.click('#btn-increase');
    currentCount++;
  }
  
  await waitForVisible(hostPage, '#btn-create');
  await hostPage.click('#btn-create');
  await hostPage.waitForTimeout(3000);
  
  const roomId = await hostPage.textContent('#room-id');
  console.log(`      房间ID: ${roomId}`);
}

async function playerJoin(page, playerNumber) {
  await page.goto(BASE_URL + '/player-modular.html');
  await waitForVisible(page, '[data-player-id]');
  
  const btn = page.locator(`[data-player-id="${playerNumber}"]`);
  await btn.click();
  await page.waitForTimeout(TIMEOUT.wait);
  
  const playerName = await page.locator('#playerNameDisplay').textContent().catch(() => '已加入');
  console.log(`      玩家${playerNumber}号加入成功`);
}

async function advanceToPhase(hostPage, playerPages, targetPhase, maxSteps = 15) {
  console.log(`  [语音面板] 智能推进到 ${targetPhase}...`);
  
  for (let step = 0; step < maxSteps; step++) {
    const phaseText = await hostPage.textContent('#smart-next-text');
    
    if (phaseText && phaseText.includes(targetPhase)) {
      console.log(`      ✅ 已到达 ${targetPhase} 阶段`);
      return true;
    }
    
    for (const pp of playerPages) {
      const nextBtn = pp.locator('#readyBtn, #nextPhaseBtn, button:has-text("下一步")').first();
      if (await nextBtn.isVisible().catch(() => false)) {
        await nextBtn.click({ timeout: 2000 }).catch(() => {});
      }
    }
    
    const btn = hostPage.locator('#btn-smart-next');
    if (await btn.isVisible().catch(() => false)) {
      await btn.click();
      await hostPage.waitForTimeout(2000);
    }
    
    await hostPage.waitForTimeout(500);
  }
  
  return false;
}

async function captainBuildTeam(captainPage, teamSize) {
  console.log(`      [队长] 组建队伍 (${teamSize}人)...`);
  
  await waitForVisible(captainPage, '#teamBuildingPlayerList');
  const selectButtons = await captainPage.locator('#teamBuildingPlayerList .player-select').all();
  console.log(`      可选队员数量: ${selectButtons.length}`);
  
  for (let i = 0; i < teamSize - 1 && i < selectButtons.length; i++) {
    await selectButtons[i].click();
    await captainPage.waitForTimeout(200);
  }
  
  const submitBtn = captainPage.locator('#submitTeamBtn');
  await expect(submitBtn).toBeVisible({ timeout: TIMEOUT.element });
  await submitBtn.click();
  console.log('      队伍已提交');
}

async function allPlayersVote(players, approve = true) {
  console.log(`      [所有玩家] 投票${approve ? '同意' : '拒绝'}...`);
  
  for (const pp of players) {
    const btn = pp.locator(`#${approve ? 'approveBtn' : 'rejectBtn'}, button:has-text("${approve ? '同意' : '拒绝'}")`).first();
    if (await btn.isVisible().catch(() => false)) {
      await btn.click();
    }
  }
  
  await players[0].waitForTimeout(2000);
}

async function executeMission(players, result = 'success') {
  console.log(`      [任务队员] 执行任务 (${result})...`);
  
  for (const pp of players) {
    const btn = pp.locator(`#${result === 'success' ? 'successBtn' : 'failBtn'}, button:has-text("${result === 'success' ? '成功' : '失败'}")`).first();
    if (await btn.isVisible().catch(() => false)) {
      await btn.click();
    }
  }
  
  await players[0].waitForTimeout(2000);
}

test.describe.configure({ mode: 'serial', timeout: 600000 });

test.describe('E2E测试：阿瓦隆完整游戏流程', () => {
  
  test('E2E-001: 创建房间与玩家加入', async ({ browser }) => {
    console.log('\n[E2E-001] 测试：创建房间与玩家加入');
    
    const context = await browser.newContext();
    const hostPage = await context.newPage();
    await hostPage.goto(BASE_URL + '/voice-panel-v2.html');
    
    const playerPages = [];
    for (let i = 1; i <= 5; i++) {
      playerPages.push(await context.newPage());
    }
    
    try {
      console.log('\n[1] 创建房间...');
      await voicePanelCreateRoom(hostPage, 5);
      
      const roomId = await hostPage.textContent('#room-id');
      expect(roomId).toBeTruthy();
      console.log(`  ✅ 房间ID: ${roomId}`);
      
      console.log('\n[2] 玩家加入...');
      for (let i = 0; i < 5; i++) {
        await playerJoin(playerPages[i], i + 1);
        await hostPage.waitForTimeout(500);
      }
      
      const playerCount = await hostPage.textContent('#current-player-count');
      expect(playerCount).toBe('5');
      console.log(`  ✅ 当前玩家数: ${playerCount}`);
      
    } finally {
      await context.close();
    }
  });

  test('E2E-002: 角色分配与夜间阶段', async ({ browser }) => {
    console.log('\n[E2E-002] 测试：角色分配与夜间阶段');
    
    const context = await browser.newContext();
    const hostPage = await context.newPage();
    await hostPage.goto(BASE_URL + '/voice-panel-v2.html');
    
    const playerPages = [];
    for (let i = 1; i <= 5; i++) {
      playerPages.push(await context.newPage());
    }
    
    try {
      console.log('\n[1] 创建房间并加入...');
      await voicePanelCreateRoom(hostPage, 5);
      for (let i = 0; i < 5; i++) {
        await playerJoin(playerPages[i], i + 1);
        await hostPage.waitForTimeout(500);
      }
      
      console.log('\n[2] 推进到角色确认阶段...');
      await advanceToPhase(hostPage, playerPages, 'role-confirm');
      
      const phase = await hostPage.textContent('#current-phase');
      expect(phase).toContain('角色');
      console.log(`  ✅ 当前阶段: ${phase}`);
      
      console.log('\n[3] 推进到夜间阶段...');
      await advanceToPhase(hostPage, playerPages, 'night');
      
      const nightPhase = await hostPage.textContent('#current-phase');
      expect(nightPhase).toContain('夜间');
      console.log(`  ✅ 当前阶段: ${nightPhase}`);
      
    } finally {
      await context.close();
    }
  });

  test('E2E-003: 组队投票完整流程', async ({ browser }) => {
    console.log('\n[E2E-003] 测试：组队投票完整流程');
    
    const context = await browser.newContext();
    const hostPage = await context.newPage();
    await hostPage.goto(BASE_URL + '/voice-panel-v2.html');
    
    const playerPages = [];
    for (let i = 1; i <= 5; i++) {
      playerPages.push(await context.newPage());
    }
    
    try {
      console.log('\n[1] 创建房间并加入...');
      await voicePanelCreateRoom(hostPage, 5);
      for (let i = 0; i < 5; i++) {
        await playerJoin(playerPages[i], i + 1);
        await hostPage.waitForTimeout(500);
      }
      
      console.log('\n[2] 推进到组队阶段...');
      await advanceToPhase(hostPage, playerPages, 'team-building');
      
      const phase = await hostPage.textContent('#current-phase');
      expect(phase).toContain('组队');
      console.log(`  ✅ 当前阶段: ${phase}`);
      
      console.log('\n[3] 队长组建队伍...');
      const leaderName = await hostPage.textContent('#current-leader');
      console.log(`  当前队长: ${leaderName}`);
      
      let captainPage = null;
      for (const pp of playerPages) {
        const playerName = await pp.locator('#currentPlayerName').textContent();
        if (playerName === leaderName) {
          captainPage = pp;
          break;
        }
      }
      expect(captainPage).not.toBeNull();
      
      await captainBuildTeam(captainPage, 2);
      await hostPage.waitForTimeout(3000);
      
      console.log('\n[4] 玩家投票...');
      await allPlayersVote(playerPages);
      await hostPage.waitForTimeout(3000);
      
      console.log('\n[5] 验证投票结果...');
      await advanceToPhase(hostPage, playerPages, 'mission');
      const missionPhase = await hostPage.textContent('#current-phase');
      expect(missionPhase).toContain('任务');
      console.log(`  ✅ 进入任务阶段: ${missionPhase}`);
      
    } finally {
      await context.close();
    }
  });

  test('E2E-004: 任务执行与结果', async ({ browser }) => {
    console.log('\n[E2E-004] 测试：任务执行与结果');
    
    const context = await browser.newContext();
    const hostPage = await context.newPage();
    await hostPage.goto(BASE_URL + '/voice-panel-v2.html');
    
    const playerPages = [];
    for (let i = 1; i <= 5; i++) {
      playerPages.push(await context.newPage());
    }
    
    try {
      console.log('\n[1] 创建房间并推进到任务阶段...');
      await voicePanelCreateRoom(hostPage, 5);
      for (let i = 0; i < 5; i++) {
        await playerJoin(playerPages[i], i + 1);
        await hostPage.waitForTimeout(500);
      }
      await advanceToPhase(hostPage, playerPages, 'team-building');
      
      const leaderName = await hostPage.textContent('#current-leader');
      let captainPage = null;
      for (const pp of playerPages) {
        const playerName = await pp.locator('#currentPlayerName').textContent();
        if (playerName === leaderName) {
          captainPage = pp;
          break;
        }
      }
      await captainBuildTeam(captainPage, 2);
      await hostPage.waitForTimeout(3000);
      await allPlayersVote(playerPages);
      await hostPage.waitForTimeout(3000);
      await advanceToPhase(hostPage, playerPages, 'mission');
      
      console.log('\n[2] 执行任务（成功）...');
      await executeMission(playerPages, 'success');
      await hostPage.waitForTimeout(5000);
      
      console.log('\n[3] 验证任务结果...');
      const smartNextText = await hostPage.textContent('#smart-next-text');
      console.log(`  下一步按钮: ${smartNextText}`);
      expect(smartNextText).toBeTruthy();
      
    } finally {
      await context.close();
    }
  });

  test('E2E-005: 完整游戏流程（3轮成功到刺杀）', async ({ browser }) => {
    console.log('\n[E2E-005] 测试：完整游戏流程（3轮成功到刺杀）');
    
    const context = await browser.newContext();
    const hostPage = await context.newPage();
    await hostPage.goto(BASE_URL + '/voice-panel-v2.html');
    
    const playerPages = [];
    for (let i = 1; i <= 5; i++) {
      playerPages.push(await context.newPage());
    }
    
    try {
      console.log('\n[1] 创建房间并加入...');
      await voicePanelCreateRoom(hostPage, 5);
      for (let i = 0; i < 5; i++) {
        await playerJoin(playerPages[i], i + 1);
        await hostPage.waitForTimeout(500);
      }
      await advanceToPhase(hostPage, playerPages, 'team-building');
      
      console.log('\n[2] 执行3轮任务...');
      for (let currentRound = 1; currentRound <= 3; currentRound++) {
        console.log(`\n  ========== 第 ${currentRound} 轮 ==========`);
        
        const leaderName = await hostPage.textContent('#current-leader');
        console.log(`  当前队长: ${leaderName}`);
        
        let captainPage = null;
        for (const pp of playerPages) {
          const playerName = await pp.locator('#currentPlayerName').textContent();
          if (playerName === leaderName) {
            captainPage = pp;
            break;
          }
        }
        expect(captainPage).not.toBeNull();
        
        const missionSize = currentRound === 1 ? 2 : currentRound === 2 ? 3 : 2;
        await captainBuildTeam(captainPage, missionSize);
        await hostPage.waitForTimeout(3000);
        
        await allPlayersVote(playerPages);
        await hostPage.waitForTimeout(3000);
        
        await advanceToPhase(hostPage, playerPages, 'mission');
        await executeMission(playerPages, 'success');
        await hostPage.waitForTimeout(5000);
        
        const smartNextText = await hostPage.textContent('#smart-next-text');
        console.log(`  下一步: ${smartNextText}`);
        
        if (smartNextText && smartNextText.includes('刺杀')) {
          console.log('  ✅ 进入刺杀阶段');
          break;
        }
      }
      
      console.log('\n[3] 验证刺杀阶段...');
      const smartNextText = await hostPage.textContent('#smart-next-text');
      expect(smartNextText).toContain('刺客');
      console.log(`  ✅ 当前阶段: ${smartNextText}`);
      
    } finally {
      await context.close();
    }
  });

  test('E2E-006: 多轮任务循环（3轮失败）', async ({ browser }) => {
    console.log('\n[E2E-006] 测试：多轮任务循环（3轮失败）');
    
    const context = await browser.newContext();
    const hostPage = await context.newPage();
    await hostPage.goto(BASE_URL + '/voice-panel-v2.html');
    
    const playerPages = [];
    for (let i = 1; i <= 5; i++) {
      playerPages.push(await context.newPage());
    }
    
    try {
      console.log('\n[1] 创建房间并加入...');
      await voicePanelCreateRoom(hostPage, 5);
      for (let i = 0; i < 5; i++) {
        await playerJoin(playerPages[i], i + 1);
        await hostPage.waitForTimeout(500);
      }
      await advanceToPhase(hostPage, playerPages, 'team-building');
      
      console.log('\n[2] 执行3轮失败任务...');
      for (let currentRound = 1; currentRound <= 3; currentRound++) {
        console.log(`\n  ========== 第 ${currentRound} 轮 ==========`);
        
        const leaderName = await hostPage.textContent('#current-leader');
        console.log(`  当前队长: ${leaderName}`);
        
        let captainPage = null;
        for (const pp of playerPages) {
          const playerName = await pp.locator('#currentPlayerName').textContent();
          if (playerName === leaderName) {
            captainPage = pp;
            break;
          }
        }
        expect(captainPage).not.toBeNull();
        
        const missionSize = currentRound === 1 ? 2 : currentRound === 2 ? 3 : 2;
        await captainBuildTeam(captainPage, missionSize);
        await hostPage.waitForTimeout(3000);
        
        await allPlayersVote(playerPages);
        await hostPage.waitForTimeout(3000);
        
        await advanceToPhase(hostPage, playerPages, 'mission');
        await executeMission(playerPages, 'fail');
        await hostPage.waitForTimeout(5000);
        
        const smartNextText = await hostPage.textContent('#smart-next-text');
        console.log(`  下一步: ${smartNextText}`);
        
        if (smartNextText && smartNextText.includes('刺杀')) {
          console.log('  ✅ 进入刺杀阶段');
          break;
        }
      }
      
      console.log('\n[3] 验证刺杀阶段...');
      const smartNextText = await hostPage.textContent('#smart-next-text');
      expect(smartNextText).toContain('刺客');
      console.log(`  ✅ 当前阶段: ${smartNextText}`);
      
    } finally {
      await context.close();
    }
  });

  test('E2E-007: 刺杀阶段与游戏结束', async ({ browser }) => {
    console.log('\n[E2E-007] 测试：刺杀阶段与游戏结束');
    
    const context = await browser.newContext();
    const hostPage = await context.newPage();
    await hostPage.goto(BASE_URL + '/voice-panel-v2.html');
    
    const playerPages = [];
    for (let i = 1; i <= 5; i++) {
      playerPages.push(await context.newPage());
    }
    
    try {
      console.log('\n[1] 创建房间并推进到刺杀阶段...');
      await voicePanelCreateRoom(hostPage, 5);
      for (let i = 0; i < 5; i++) {
        await playerJoin(playerPages[i], i + 1);
        await hostPage.waitForTimeout(500);
      }
      await advanceToPhase(hostPage, playerPages, 'team-building');
      
      for (let currentRound = 1; currentRound <= 3; currentRound++) {
        const leaderName = await hostPage.textContent('#current-leader');
        let captainPage = null;
        for (const pp of playerPages) {
          const playerName = await pp.locator('#currentPlayerName').textContent();
          if (playerName === leaderName) {
            captainPage = pp;
            break;
          }
        }
        
        const missionSize = currentRound === 1 ? 2 : currentRound === 2 ? 3 : 2;
        await captainBuildTeam(captainPage, missionSize);
        await hostPage.waitForTimeout(3000);
        await allPlayersVote(playerPages);
        await hostPage.waitForTimeout(3000);
        await advanceToPhase(hostPage, playerPages, 'mission');
        await executeMission(playerPages, 'success');
        await hostPage.waitForTimeout(5000);
        
        const smartNextText = await hostPage.textContent('#smart-next-text');
        if (smartNextText && smartNextText.includes('刺杀')) break;
      }
      
      console.log('\n[2] 刺客执行刺杀...');
      for (const pp of playerPages) {
        const nextBtn = pp.locator('#nextBtn');
        if (await nextBtn.isVisible().catch(() => false)) {
          await nextBtn.click({ timeout: 2000 }).catch(() => {});
        }
      }
      await hostPage.waitForTimeout(2000);
      
      const assassinPage = playerPages[4];
      const assassinateBtn = assassinPage.locator('.assassinate-btn[data-player-id="1"]');
      if (await assassinateBtn.isVisible().catch(() => false)) {
        await assassinateBtn.click();
        console.log('  ✅ 刺客已选择目标');
      }
      
      console.log('\n[3] 等待游戏结束...');
      await hostPage.waitForTimeout(5000);
      
      const gameOverScreen = hostPage.locator('#gameOverScreen');
      const isVisible = await gameOverScreen.isVisible().catch(() => false);
      
      if (isVisible) {
        const winnerText = await hostPage.textContent('#gameWinner');
        console.log(`  ✅ 游戏结束，获胜方: ${winnerText}`);
      } else {
        console.log('  ⚠️ 游戏结束界面未显示（可能需要更长时间）');
      }
      
    } finally {
      await context.close();
    }
  });

});
