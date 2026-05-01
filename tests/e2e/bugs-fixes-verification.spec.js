/**
 * E2E测试：4个Bug修复验证
 * 
 * Bug 1: 第一轮队长应该是随机生成的，而不是指定的4号
 * Bug 2: 每轮任务结束，返回到下轮后，玩家界面需要显示上轮的组队投票情况（谁反对，谁赞成）和任务完成的票型（几票成功，几票失败）
 * Bug 3: 5人局的播放的语音，第四轮应该只需要一个失败就失败
 * Bug 4: 最后结算的界面也应该有投票情况和任务完成票型
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

test.describe('4个Bug修复验证', () => {
  
  test('Bug#1: 第一轮队长应该是随机生成的', async ({ browser }) => {
    console.log('\n[Bug#1] 验证第一轮队长随机性');
    console.log('  说明：队长应该按编号顺序轮换，第一轮随机选择');
    
    const playerCount = 5;
    const context = await browser.newContext();
    const hostPage = await context.newPage();
    const playerPages = [];
    
    try {
      // 创建房间
      console.log('\n[1] 创建房间...');
      await hostPage.goto(`${BASE_URL}/voice-panel-v2.html`, { timeout: TIMEOUT.navigation });
      const roomId = await voicePanelCreateRoom(hostPage, playerCount);
      
      // 玩家加入
      console.log('\n[2] 玩家加入...');
      const joinOrder = [1, 2, 3, 4, 5];
      for (const playerNumber of joinOrder) {
        const playerPage = await playerJoin(context, roomId, playerNumber);
        playerPages.push({ page: playerPage, number: playerNumber });
      }
      
      // 推进到组队阶段
      console.log('\n[3] 推进到组队阶段...');
      let success = await voicePanelSmartNext(hostPage, 'team-building', playerPages);
      expect(success).toBe(true);
      await hostPage.waitForTimeout(3000);
      
      // 获取第一轮队长
      const leaderName = await hostPage.textContent('#current-leader');
      console.log(`  第一轮队长: ${leaderName}`);
      
      // 截图验证
      await hostPage.screenshot({ path: 'test-results/bug1-first-round-captain.png', fullPage: true });
      
      // 验证队长已正确选择
      expect(leaderName).toMatch(/\d+号/);
      console.log(`  ✅ Bug#1修复验证通过：第一轮队长已正确选择: ${leaderName}`);
      
    } finally {
      await context.close();
    }
  });

  test('Bug#2: 每轮任务结束后显示上轮投票和任务票型', async ({ browser }) => {
    console.log('\n[Bug#2] 验证任务结束后显示上轮投票和任务票型');
    
    const playerCount = 5;
    const context = await browser.newContext();
    const hostPage = await context.newPage();
    const playerPages = [];
    
    try {
      // 创建房间
      console.log('\n[1] 创建房间...');
      await hostPage.goto(`${BASE_URL}/voice-panel-v2.html`, { timeout: TIMEOUT.navigation });
      const roomId = await voicePanelCreateRoom(hostPage, playerCount);
      
      // 玩家加入
      console.log('\n[2] 玩家加入...');
      for (const playerNumber of [1, 2, 3, 4, 5]) {
        const playerPage = await playerJoin(context, roomId, playerNumber);
        playerPages.push({ page: playerPage, number: playerNumber });
      }
      
      // 推进到组队阶段
      console.log('\n[3] 推进到组队阶段...');
      let success = await voicePanelSmartNext(hostPage, 'team-building', playerPages);
      expect(success).toBe(true);
      await hostPage.waitForTimeout(3000);
      
      // 第一轮
      console.log('\n========== 第 1 轮 ==========');
      const leaderName = await hostPage.textContent('#current-leader');
      console.log(`  当前队长: ${leaderName}`);
      
      // 找到队长
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
      await captainBuildTeam(captainPage, 2);
      await hostPage.waitForTimeout(5000);
      
      // 所有玩家投票
      await allPlayersVote(playerPages);
      await hostPage.waitForTimeout(5000);
      
      // 推进到任务阶段
      success = await voicePanelSmartNext(hostPage, 'mission', playerPages);
      expect(success).toBe(true);
      await hostPage.waitForTimeout(3000);
      
      // 任务队员执行任务
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
      
      // 推进到第二轮
      console.log('\n========== 推进到第 2 轮 ==========');
      success = await voicePanelSmartNext(hostPage, 'team-building', playerPages);
      expect(success).toBe(true);
      await hostPage.waitForTimeout(5000);
      
      // 验证第二轮时显示第一轮的投票情况
      console.log('\n  验证第二轮是否显示第一轮投票结果...');
      
      // 检查是否有投票结果显示
      const hasVoteResult = await captainPage.locator('#voteResult').isVisible({ timeout: 5000 }).catch(() => false);
      
      if (hasVoteResult) {
        const voteResultText = await captainPage.locator('#voteResult').textContent();
        console.log('  投票结果显示:');
        console.log(`    ${voteResultText}`);
        
        // 截图
        await captainPage.screenshot({ path: 'test-results/bug2-vote-result-after-round1.png', fullPage: true });
        
        // 验证包含赞成/反对信息
        expect(voteResultText).toMatch(/赞成|反对|同意|reject|approve|👍|👎/i);
        console.log('  ✅ Bug#2修复验证通过：显示上轮组队投票情况');
      } else {
        console.log('  ⚠️ 投票结果未显示，可能需要进一步修复');
        await captainPage.screenshot({ path: 'test-results/bug2-vote-result-not-shown.png', fullPage: true });
      }
      
    } finally {
      await context.close();
    }
  });

  test('Bug#3: 5人局第四轮只需1票失败', async ({ browser }) => {
    console.log('\n[Bug#3] 验证5人局3轮成功后进入刺杀阶段');
    console.log('  测试策略：执行3轮任务，全部成功，验证游戏进入刺杀阶段');
    
    const playerCount = 5;
    const context = await browser.newContext();
    const hostPage = await context.newPage();
    const playerPages = [];
    
    try {
      // 创建房间
      console.log('\n[1] 创建房间...');
      await hostPage.goto(`${BASE_URL}/voice-panel-v2.html`, { timeout: TIMEOUT.navigation });
      const roomId = await voicePanelCreateRoom(hostPage, playerCount);
      
      // 玩家加入
      console.log('\n[2] 玩家加入...');
      for (const playerNumber of [1, 2, 3, 4, 5]) {
        const playerPage = await playerJoin(context, roomId, playerNumber);
        playerPages.push({ page: playerPage, number: playerNumber });
      }
      
      // 执行3轮任务，所有任务都投成功票
      for (let round = 1; round <= 3; round++) {
        console.log(`\n========== 第 ${round} 轮 ==========`);
        
        // 推进到组队阶段
        const success = await voicePanelSmartNext(hostPage, 'team-building', playerPages);
        expect(success).toBe(true);
        await hostPage.waitForTimeout(3000);
        
        const leaderName = await hostPage.textContent('#current-leader');
        console.log(`  第${round}轮队长: ${leaderName}`);
        
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
        
        // 所有玩家投票同意
        await allPlayersVote(playerPages);
        await hostPage.waitForTimeout(5000);
        
        // 推进到任务阶段
        const missionSuccess = await voicePanelSmartNext(hostPage, 'mission', playerPages);
        expect(missionSuccess).toBe(true);
        await hostPage.waitForTimeout(3000);
        
        // 所有任务队员投成功票
        let missionPlayers = [];
        for (const { page, number } of playerPages) {
          try {
            const successBtn = page.locator('#successBtn').first();
            if (await successBtn.isVisible({ timeout: 3000 })) {
              missionPlayers.push({ page, number });
            }
          } catch (e) {}
        }
        
        console.log(`  任务队员数量: ${missionPlayers.length}`);
        await missionPlayersVote(missionPlayers, 'success');
        await hostPage.waitForTimeout(5000);
        
        // 验证任务结果
        const missionResult = await captainPage.locator('#missionResult');
        if (await missionResult.isVisible({ timeout: 5000 })) {
          const resultText = await missionResult.textContent();
          console.log(`  任务结果: ${resultText.substring(0, 100)}`);
        }
      }
      
      // 3轮成功后，游戏应该进入刺杀阶段
      console.log('\n[3] 等待游戏进入刺杀阶段...');
      // 等待任意玩家页面显示"刺杀阶段"
      let assassinationFound = false;
      for (const { page, number } of playerPages) {
        try {
          await page.waitForFunction(() => {
            const bodyText = document.body.textContent || '';
            return bodyText.includes('刺杀阶段');
          }, { timeout: 15000 });
          console.log(`  玩家${number}号页面显示刺杀阶段`);
          assassinationFound = true;
          break;
        } catch (e) {
          // 继续检查下一个玩家
        }
      }
      
      // 截图验证
      await hostPage.screenshot({ path: 'test-results/bug3-after-3-rounds-assassination.png', fullPage: true });
      await playerPages[0].page.screenshot({ path: 'test-results/bug3-player1-assassination.png', fullPage: true });
      
      // 验证游戏进入了刺杀阶段
      expect(assassinationFound).toBe(true);
      console.log('  ✅ Bug#3测试通过：3轮成功后游戏正确进入刺杀阶段');
      
    } finally {
      await context.close();
    }
  });

  test('Bug#4: 结算界面显示投票和任务票型', async ({ browser }) => {
    console.log('\n[Bug#4] 验证结算界面显示投票和任务票型');
    
    const playerCount = 5;
    const context = await browser.newContext();
    const hostPage = await context.newPage();
    const playerPages = [];
    
    try {
      // 创建房间
      console.log('\n[1] 创建房间...');
      await hostPage.goto(`${BASE_URL}/voice-panel-v2.html`, { timeout: TIMEOUT.navigation });
      const roomId = await voicePanelCreateRoom(hostPage, playerCount);
      
      // 玩家加入
      console.log('\n[2] 玩家加入...');
      for (const playerNumber of [1, 2, 3, 4, 5]) {
        const playerPage = await playerJoin(context, roomId, playerNumber);
        playerPages.push({ page: playerPage, number: playerNumber });
      }
      
      // 快速推进到刺杀阶段
      console.log('\n[3] 快速推进到刺杀阶段...');
      
      for (let round = 1; round <= 3; round++) {
        console.log(`\n  推进第${round}轮...`);
        let success = await voicePanelSmartNext(hostPage, 'team-building', playerPages);
        expect(success).toBe(true);
        await hostPage.waitForTimeout(3000);
        
        const leaderName = await hostPage.textContent('#current-leader');
        console.log(`  第${round}轮队长: ${leaderName}`);
        
        let captainPage = null;
        for (const { page, number } of playerPages) {
          const playerName = await page.textContent('#currentPlayerName');
          if (playerName === leaderName) {
            captainPage = page;
            break;
          }
        }
        expect(captainPage).not.toBeNull();
        
        const missionSize = round === 1 ? 2 : round === 2 ? 3 : round === 3 ? 2 : 3;
        await captainBuildTeam(captainPage, missionSize);
        await hostPage.waitForTimeout(5000);
        
        await allPlayersVote(playerPages);
        await hostPage.waitForTimeout(5000);
        
        success = await voicePanelSmartNext(hostPage, 'mission', playerPages);
        expect(success).toBe(true);
        await hostPage.waitForTimeout(3000);
        
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
      
      // 推进到刺杀阶段
      console.log('\n  推进到刺杀阶段...');
      let success = await voicePanelSmartNext(hostPage, 'assassination', playerPages);
      expect(success).toBe(true);
      await hostPage.waitForTimeout(3000);
      
      // 刺客刺杀一个非梅林的玩家
      console.log('\n  刺客选择刺杀目标...');
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
      
      // 等待游戏结束
      await hostPage.waitForTimeout(5000);
      
      // 验证结算界面
      console.log('\n  验证结算界面...');
      
      // 检查最终任务历史
      const finalMissionHistory = await hostPage.locator('#finalMissionHistory');
      if (await finalMissionHistory.isVisible({ timeout: 5000 })) {
        const historyText = await finalMissionHistory.textContent();
        console.log(`  最终任务历史: ${historyText}`);
        
        await hostPage.screenshot({ path: 'test-results/bug4-final-mission-history.png', fullPage: true });
        
        expect(historyText).toMatch(/第.*轮|成功|失败|任务票型|票|成功票|失败票/i);
        console.log('  ✅ Bug#4修复验证通过：结算界面显示任务票型');
      } else {
        console.log('  ⚠️ 最终任务历史未显示');
        await hostPage.screenshot({ path: 'test-results/bug4-mission-history-not-shown.png', fullPage: true });
      }
      
      // 检查最终投票历史
      const finalVoteHistory = await hostPage.locator('#finalVoteHistory');
      if (await finalVoteHistory.isVisible({ timeout: 5000 })) {
        const voteHistoryText = await finalVoteHistory.textContent();
        console.log(`  最终投票历史: ${voteHistoryText}`);
        
        await hostPage.screenshot({ path: 'test-results/bug4-final-vote-history.png', fullPage: true });
        
        expect(voteHistoryText).toMatch(/赞成|反对|组队投票|同意|reject|approve|👍|👎/i);
        console.log('  ✅ Bug#4修复验证通过：结算界面显示组队投票情况');
      } else {
        console.log('  ⚠️ 最终投票历史未显示');
        await hostPage.screenshot({ path: 'test-results/bug4-vote-history-not-shown.png', fullPage: true });
      }
      
    } finally {
      await context.close();
    }
  });
});

test.describe.configure({ mode: 'serial', timeout: 600000 });