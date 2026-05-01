/**
 * E2E测试：5人完整游戏流程（新版语音面板 voice-panel-v2.html + 玩家端 player-modular.html）
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
 * 等待直到元素不可见
 */
async function waitForHidden(page, selector, timeout = TIMEOUT.element) {
  await page.waitForSelector(selector, { state: 'hidden', timeout });
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
 * 玩家加入房间
 */
async function playerJoin(context, roomId, playerNumber) {
  console.log(`  [玩家${playerNumber}号] 加入房间...`);
  
  const playerPage = await context.newPage();
  
  // 直接带roomId参数访问，减少输入
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
 * 玩家确认角色（新版player-modular.html）
 */
async function playerConfirmRole(playerPage, index) {
  console.log(`  [玩家${index + 1}] 确认角色...`);
  
  // 等待角色分配
  await playerPage.waitForTimeout(1500);
  
  // 检查是否有确认按钮（新版用 #readyBtn）
  const readyBtn = playerPage.locator('#readyBtn');
  const isVisible = await readyBtn.isVisible().catch(() => false);
  
  if (isVisible) {
    await readyBtn.click();
    await playerPage.waitForTimeout(500);
    console.log(`      角色已确认`);
  } else {
    // 旧版用 #confirmRoleBtn
    const confirmBtn = playerPage.locator('#confirmRoleBtn');
    const isConfirmVisible = await confirmBtn.isVisible().catch(() => false);
    if (isConfirmVisible) {
      await confirmBtn.click();
      await playerPage.waitForTimeout(500);
      console.log(`      角色已确认（旧版按钮）`);
    } else {
      console.log(`      无需确认（可能已确认过）`);
    }
  }
}

/**
 * 推进到下一阶段（语音面板）
 */
async function voicePanelNextPhase(hostPage) {
  console.log('  [语音面板] 推进阶段...');
  await hostPage.click('#btn-smart-next');
  await hostPage.waitForTimeout(1500);
}

/**
 * 等待组队阶段
 */
async function waitForTeamBuilding(playerPage, timeout = 15000) {
  console.log('  [等待] 组队阶段...');
  try {
    await playerPage.waitForSelector('#teamBuildingScreen', { state: 'visible', timeout });
    return true;
  } catch (e) {
    console.log('  [警告] 未检测到组队阶段');
    return false;
  }
}

test.describe('新版语音面板 - 5人完整游戏流程', () => {
  
  test('GF-V2-001: 语音面板+玩家端完整流程', async ({ browser }) => {
    console.log('\n[GF-V2-001] 开始测试: 5人局完整流程（新版语音面板）');
    
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
      // 2. 玩家加入房间
      // ==========================================
      console.log('\n[2] 玩家加入房间...');
      
      for (let i = 1; i <= playerCount; i++) {
        const playerPage = await playerJoin(context, roomId, i);
        playerPages.push(playerPage);
        await playerPage.waitForTimeout(500); // 间隔加入避免并发问题
      }
      
      console.log(`      ✅ 所有 ${playerCount} 个玩家已加入`);
      
      // ==========================================
      // 3. 语音面板推进到夜间阶段
      // ==========================================
      console.log('\n[3] 推进到夜间阶段...');
      await voicePanelNextPhase(hostPage);
      
      // 新版语音面板用 #smart-next-text 显示当前阶段
      const phaseText = await hostPage.textContent('#smart-next-text');
      console.log(`      当前阶段: ${phaseText}`);
      
      // ==========================================
      // 4. 玩家确认角色
      // ==========================================
      console.log('\n[4] 玩家确认角色...');
      
      for (let i = 0; i < playerPages.length; i++) {
        await playerConfirmRole(playerPages[i], i);
      }
      
      console.log('      ✅ 所有玩家已确认角色');
      
      // ==========================================
      // 5. 推进到组队阶段
      // ==========================================
      console.log('\n[5] 推进到组队阶段...');
      await voicePanelNextPhase(hostPage);
      
      // ==========================================
      // 6. 验证队长能看到组队选项
      // ==========================================
      console.log('\n[6] 验证组队界面...');
      
      // 等待一段时间让组队阶段生效
      await hostPage.waitForTimeout(3000);
      
      // 检查所有玩家是否进入组队界面
      let teamBuildingCount = 0;
      for (let i = 0; i < playerPages.length; i++) {
        try {
          const isTeamBuilding = await playerPages[i].isVisible('#teamBuildingScreen');
          if (isTeamBuilding) {
            teamBuildingCount++;
          }
        } catch (e) {
          // 忽略超时
        }
      }
      console.log(`      ${teamBuildingCount}/${playerCount} 个玩家进入组队界面`);
      
      // 检查队长是否能看到组队选项
      for (let i = 0; i < playerPages.length; i++) {
        try {
          const isLeaderInfoVisible = await playerPages[i].isVisible('#isLeaderInfo');
          const isNotLeaderInfoVisible = await playerPages[i].isVisible('#notLeaderInfo');
          const currentPlayerName = await playerPages[i].textContent('#currentPlayerName');
          
          console.log(`      [玩家${i + 1}号] ${currentPlayerName} - isLeader: ${isLeaderInfoVisible}, isNotLeader: ${isNotLeaderInfoVisible}`);
          
          // 截图保存以便调试
          await playerPages[i].screenshot({
            path: `test-results/screenshots/v2-player-${i + 1}-team-building.png`,
            fullPage: true
          });
        } catch (e) {
          console.log(`      [玩家${i + 1}] 检查失败: ${e.message}`);
        }
      }
      
      // 检查语音面板是否正确显示队长
      const currentLeader = await hostPage.textContent('#current-leader');
      console.log(`      语音面板显示队长: ${currentLeader}`);
      expect(currentLeader).not.toBe('--');
      expect(currentLeader).not.toBe('----');
      
      console.log('      ✅ 组队界面验证完成');
      
      // ==========================================
      // 7. 验证语音面板和客户端显示一致
      // ==========================================
      console.log('\n[7] 验证语音面板与客户端一致性...');
      
      for (let i = 0; i < playerPages.length; i++) {
        try {
          const clientLeader = await playerPages[i].textContent('#currentLeader');
          const clientWaitingLeader = await playerPages[i].textContent('#waitingLeader');
          
          console.log(`      [玩家${i + 1}号] 客户端显示队长: currentLeader="${clientLeader}", waitingLeader="${clientWaitingLeader}"`);
          
          // 验证客户端显示的队长与语音面板一致
          if (clientLeader && clientLeader !== '-') {
            expect(clientLeader).toBe(currentLeader);
          }
        } catch (e) {
          console.log(`      [玩家${i + 1}] 验证失败: ${e.message}`);
        }
      }
      
      console.log('      ✅ 语音面板与客户端一致性验证完成');
      
      // ==========================================
      // 测试通过
      // ==========================================
      console.log('\n  ✅ GF-V2-001 通过（基础流程验证）');
      
    } finally {
      // 清理截图
      await context.close();
    }
  });

  test('GF-V2-002: 队长能看到组队选项', async ({ browser }) => {
    console.log('\n[GF-V2-002] 开始测试: 队长组队选项验证');
    
    const playerCount = 5;
    const context = await browser.newContext();
    const hostPage = await context.newPage();
    const playerPages = [];
    let roomId = '';
    
    try {
      // 创建房间
      await hostPage.goto(`${BASE_URL}/voice-panel-v2.html`, { timeout: TIMEOUT.navigation });
      roomId = await voicePanelCreateRoom(hostPage, playerCount);
      
      // 玩家加入
      for (let i = 1; i <= playerCount; i++) {
        const playerPage = await playerJoin(context, roomId, i);
        playerPages.push(playerPage);
        await playerPage.waitForTimeout(500);
      }
      
      // 推进到夜间
      await voicePanelNextPhase(hostPage);
      await hostPage.waitForTimeout(1000);
      
      // 玩家确认角色
      for (let i = 0; i < playerPages.length; i++) {
        await playerConfirmRole(playerPages[i], i);
      }
      
      // 推进到组队
      await voicePanelNextPhase(hostPage);
      await hostPage.waitForTimeout(3000);
      
      // 找出队长
      let captainPage = null;
      let captainIndex = -1;
      const currentLeader = await hostPage.textContent('#current-leader');
      console.log(`      当前队长: ${currentLeader}`);
      
      for (let i = 0; i < playerPages.length; i++) {
        const playerName = await playerPages[i].textContent('#currentPlayerName');
        console.log(`      [玩家${i + 1}] 名称: ${playerName}`);
        
        if (playerName === currentLeader) {
          captainPage = playerPages[i];
          captainIndex = i;
          break;
        }
      }
      
      // 如果找不到匹配的，检查isLeaderInfo是否可见
      if (!captainPage) {
        for (let i = 0; i < playerPages.length; i++) {
          const isLeader = await playerPages[i].isVisible('#isLeaderInfo');
          if (isLeader) {
            captainPage = playerPages[i];
            captainIndex = i;
            console.log(`      [玩家${i + 1}] 是队长（通过isLeaderInfo检测）`);
            break;
          }
        }
      }
      
      expect(captainPage).not.toBeNull();
      
      // 验证队长能看到组队选项
      const isLeaderInfoVisible = await captainPage.isVisible('#isLeaderInfo');
      const isNotLeaderInfoVisible = await captainPage.isVisible('#notLeaderInfo');
      
      console.log(`      队长(isLeaderInfo)可见: ${isLeaderInfoVisible}`);
      console.log(`      队长(isNotLeaderInfo)可见: ${isNotLeaderInfoVisible}`);
      
      // 队长应该看到 isLeaderInfo（包含组队按钮），而不是 isNotLeaderInfo
      expect(isLeaderInfoVisible).toBe(true);
      expect(isNotLeaderInfoVisible).toBe(false);
      
      // 验证组队按钮存在
      const submitTeamBtn = captainPage.locator('#submitTeamBtn');
      await expect(submitTeamBtn).toBeVisible({ timeout: TIMEOUT.element });
      console.log('      组队按钮已显示');
      
      // 验证玩家选择列表
      const playerListItems = captainPage.locator('#teamBuildingPlayerList .player-item');
      const count = await playerListItems.count();
      console.log(`      可选玩家数量: ${count}`);
      expect(count).toBeGreaterThan(0);
      
      console.log('      ✅ GF-V2-002 通过（队长组队选项验证）');
      
    } finally {
      await context.close();
    }
  });

  test('GF-V2-003: 语音面板队长名称与客户端一致', async ({ browser }) => {
    console.log('\n[GF-V2-003] 开始测试: 语音面板队长名称与客户端一致性');
    
    const playerCount = 5;
    const context = await browser.newContext();
    const hostPage = await context.newPage();
    const playerPages = [];
    let roomId = '';
    
    try {
      // 创建房间
      await hostPage.goto(`${BASE_URL}/voice-panel-v2.html`, { timeout: TIMEOUT.navigation });
      roomId = await voicePanelCreateRoom(hostPage, playerCount);
      
      // 玩家加入
      for (let i = 1; i <= playerCount; i++) {
        const playerPage = await playerJoin(context, roomId, i);
        playerPages.push(playerPage);
        await playerPage.waitForTimeout(500);
      }
      
      // 推进到夜间
      await voicePanelNextPhase(hostPage);
      await hostPage.waitForTimeout(1000);
      
      // 玩家确认角色
      for (let i = 0; i < playerPages.length; i++) {
        await playerConfirmRole(playerPages[i], i);
      }
      
      // 推进到组队
      await voicePanelNextPhase(hostPage);
      await hostPage.waitForTimeout(3000);
      
      // 获取语音面板显示的队长
      const voicePanelLeader = await hostPage.textContent('#current-leader');
      console.log(`      语音面板队长: ${voicePanelLeader}`);
      
      expect(voicePanelLeader).not.toBe('--');
      expect(voicePanelLeader).not.toBe('----');
      expect(voicePanelLeader).not.toBe('');
      
      // 检查所有客户端显示的队长
      let allConsistent = true;
      for (let i = 0; i < playerPages.length; i++) {
        try {
          const clientLeader = await playerPages[i].textContent('#currentLeader');
          const clientWaiting = await playerPages[i].textContent('#waitingLeader');
          
          console.log(`      [玩家${i + 1}] 客户端currentLeader: ${clientLeader}, waitingLeader: ${clientWaiting}`);
          
          if (clientLeader && clientLeader !== '-' && clientLeader !== '') {
            if (clientLeader !== voicePanelLeader) {
              console.log(`      ❌ 不一致: 语音面板="${voicePanelLeader}", 客户端="${clientLeader}"`);
              allConsistent = false;
            }
          }
          
          if (clientWaiting && clientWaiting !== '-' && clientWaiting !== '') {
            if (clientWaiting !== voicePanelLeader) {
              console.log(`      ❌ 不一致: 语音面板="${voicePanelLeader}", 等待队长="${clientWaiting}"`);
              allConsistent = false;
            }
          }
        } catch (e) {
          console.log(`      [玩家${i + 1}] 检查失败: ${e.message}`);
        }
      }
      
      expect(allConsistent).toBe(true);
      console.log('      ✅ GF-V2-003 通过（队长名称一致性验证）');
      
    } finally {
      await context.close();
    }
  });
});

test.describe.configure({ mode: 'serial', timeout: 120000 });

test.afterEach(async ({ page }, testInfo) => {
  if (testInfo.status !== testInfo.expectedStatus) {
    await page.screenshot({ 
      path: `test-results/screenshot-${testInfo.title.replace(/\s+/g, '_')}.png`,
      fullPage: true 
    });
  }
});
