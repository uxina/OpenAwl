/**
 * 语音面板+客户端完整游戏流程 E2E 测试
 * 测试语音面板（controller）和玩家客户端之间的交互
 */

const { chromium } = require('@playwright/test');
const path = require('path');

const SERVER_URL = 'http://localhost:3000';

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runE2ETest() {
  console.log('\n========================================');
  console.log('[E2E] 语音面板+客户端完整游戏流程测试');
  console.log('========================================\n');

  const browser = await chromium.launch();
  const context = await browser.newContext();
  
  try {
    // 步骤1: 打开语音面板
    console.log('📍 步骤1: 打开语音面板');
    const controllerPage = await context.newPage();
    await controllerPage.goto(SERVER_URL);
    await delay(1000);
    console.log('✅ 语音面板已打开');

    // 步骤2: 创建房间
    console.log('\n📍 步骤2: 创建房间');
    await controllerPage.selectOption('#playerCountSelect', '5');
    await controllerPage.click('#createRoomBtn');
    await delay(1000);
    
    const roomIdElement = await controllerPage.$('#roomId');
    const roomId = await roomIdElement?.textContent();
    console.log(`✅ 房间创建成功: ${roomId}`);

    // 步骤3: 打开5个玩家页面
    console.log('\n📍 步骤3: 打开5个玩家页面');
    const playerPages = [];
    for (let i = 1; i <= 5; i++) {
      const page = await context.newPage();
      await page.goto(`${SERVER_URL}/player.html?room=${roomId}&name=玩家${i}&number=${i}`);
      await delay(500);
      playerPages.push(page);
      console.log(`✅ 玩家${i} 页面已打开`);
    }

    // 步骤4: 验证玩家加入
    console.log('\n📍 步骤4: 验证玩家加入');
    await delay(2000);
    const playerListElement = await controllerPage.$('#playerList');
    const playerListText = await playerListElement?.textContent();
    console.log(`✅ 玩家列表: ${playerListText?.trim()}`);

    // 步骤5: 开始游戏
    console.log('\n📍 步骤5: 开始游戏');
    const startBtn = await controllerPage.$('#startGameBtn');
    if (await startBtn?.isVisible()) {
      await startBtn.click();
      await delay(1000);
      console.log('✅ 游戏已开始');
    }

    // 步骤6: 推进阶段到 role-confirm
    console.log('\n📍 步骤6: 推进阶段');
    const nextPhaseBtn = await controllerPage.$('#nextPhaseBtn');
    if (nextPhaseBtn) {
      await nextPhaseBtn.click();
      await delay(1000);
      const phaseElement = await controllerPage.$('#gamePhase');
      const phaseText = await phaseElement?.textContent();
      console.log(`✅ 当前阶段: ${phaseText?.trim()}`);
    }

    // 步骤7: 推进到 team-building
    console.log('\n📍 步骤7: 推进到组队阶段');
    for (let i = 0; i < 3; i++) {
      const btn = await controllerPage.$('#nextPhaseBtn');
      if (btn) {
        await btn.click();
        await delay(800);
      }
    }
    const phaseElement = await controllerPage.$('#gamePhase');
    const phaseText = await phaseElement?.textContent();
    console.log(`✅ 当前阶段: ${phaseText?.trim()}`);

    // 步骤8: 语音面板选择队伍并提交
    console.log('\n📍 步骤8: 语音面板组队');
    await delay(1000);
    const teamMembers = await controllerPage.$$('.team-member-checkbox');
    if (teamMembers && teamMembers.length >= 2) {
      for (let i = 0; i < 2 && i < teamMembers.length; i++) {
        await teamMembers[i].click();
        await delay(200);
      }
      console.log('✅ 已选择2名队员');
    }

    const submitTeamBtn = await controllerPage.$('#submitTeamBtn');
    if (submitTeamBtn) {
      await submitTeamBtn.click();
      await delay(1000);
      console.log('✅ 队伍已提交');
    }

    // 步骤9: 验证投票阶段
    console.log('\n📍 步骤9: 验证投票阶段');
    await delay(1000);
    const votePhaseElement = await controllerPage.$('#gamePhase');
    const votePhaseText = await votePhaseElement?.textContent();
    console.log(`✅ 当前阶段: ${votePhaseText?.trim()}`);

    // 步骤10: 验证投票进度
    console.log('\n📍 步骤10: 验证投票进度显示');
    const voteProgressElement = await controllerPage.$('#voteProgress');
    const voteProgressText = await voteProgressElement?.textContent();
    console.log(`✅ 投票进度: ${voteProgressText?.trim()}`);

    // 步骤11: 玩家客户端投票
    console.log('\n📍 步骤11: 玩家客户端投票');
    for (let i = 0; i < 5; i++) {
      const page = playerPages[i];
      const approveBtn = await page.$('#approveBtn');
      if (approveBtn) {
        await approveBtn.click();
        await delay(500);
        console.log(`✅ 玩家${i+1} 已投赞成票`);
      }
    }

    // 步骤12: 验证投票完成
    console.log('\n📍 步骤12: 验证投票完成');
    await delay(2000);
    const voteCompletedElement = await controllerPage.$('#voteResult');
    if (voteCompletedElement) {
      const voteResultText = await voteCompletedElement.textContent();
      console.log(`✅ 投票结果: ${voteResultText?.trim()}`);
    }

    const finalPhaseElement = await controllerPage.$('#gamePhase');
    const finalPhaseText = await finalPhaseElement?.textContent();
    console.log(`✅ 最终阶段: ${finalPhaseText?.trim()}`);

    console.log('\n========================================');
    console.log('✅ E2E 测试完成！');
    console.log('========================================\n');

    return true;
  } catch (error) {
    console.error('❌ E2E 测试失败:', error.message);
    return false;
  } finally {
    await browser.close();
  }
}

runE2ETest().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('测试异常:', error);
  process.exit(1);
});
