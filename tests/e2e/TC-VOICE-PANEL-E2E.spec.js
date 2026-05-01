/**
 * BUG-046 E2E 测试：验证投票完成后游戏正确推进到任务阶段
 * 使用 Socket.IO 直接测试后端逻辑，同时通过语音面板验证 UI
 */

const { chromium } = require('playwright');
const { io } = require('socket.io-client');

const BASE_URL = 'http://localhost:3000';

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 关闭帮助弹窗（如果存在）
 */
async function closeHelpOverlay(page) {
  try {
    const helpOverlay = await page.$('.help-overlay');
    if (helpOverlay && await helpOverlay.isVisible()) {
      const okBtn = await helpOverlay.$('button');
      if (okBtn) {
        await okBtn.click();
        await delay(300);
      }
    }
  } catch (e) {
    // 帮助弹窗可能不存在，继续执行
  }
}

async function runBUG046E2E() {
  console.log('\n========================================');
  console.log('[E2E] BUG-046 测试：投票后推进到任务阶段');
  console.log('========================================\n');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  
  try {
    // ========== 第一部分：使用 Socket.IO 直接测试后端逻辑 ==========
    console.log('📍 第一部分：Socket.IO 后端逻辑测试');
    
    const controller = io(BASE_URL, { transports: ['websocket'], reconnection: false });
    await new Promise((r, j) => { controller.on('connect', r); setTimeout(j, 3000); });
    
    // 创建房间
    const room = await new Promise((r, j) => {
      controller.emit('create-room', { playerCount: 5 }, r);
      setTimeout(() => j(new Error('超时')), 5000);
    });
    console.log(`✅ 房间创建: ${room.roomId}`);
    
    // 5个玩家加入
    const players = [];
    for (let i = 1; i <= 5; i++) {
      const p = io(BASE_URL, { transports: ['websocket'], reconnection: false });
      await new Promise((r, j) => { p.on('connect', r); setTimeout(j, 3000); });
      const joinRes = await new Promise((r, j) => {
        p.emit('player-join', { roomId: room.roomId, playerName: '玩家'+i, playerNumber: i }, r);
        setTimeout(() => j(new Error('超时')), 5000);
      });
      players.push({ socket: p, playerId: joinRes.playerId, name: '玩家'+i });
      await delay(100);
    }
    console.log('✅ 5个玩家加入');
    
    // 开始游戏
    await new Promise((r, j) => { controller.emit('start-game', { roomId: room.roomId }, r); setTimeout(j, 3000); });
    console.log('✅ 游戏开始');
    
    // 推进到 team-building
    let latestState;
    for (let i = 0; i < 4; i++) {
      const res = await new Promise((r, j) => { controller.emit('next-phase', { roomId: room.roomId }, r); setTimeout(j, 3000); });
      latestState = res.gameState;
      await delay(100);
    }
    console.log(`✅ 推进到 team-building，当前队长: ${latestState?.currentLeader?.name || '未知'}`);
    
    // 组队
    const leaderPlayer = players.find(p => p.playerId === latestState?.currentLeaderId);
    if (!leaderPlayer) {
      console.log('❌ 未找到队长');
      process.exit(1);
    }
    
    const selectedPlayers = players.slice(0, 2);
    console.log(`✅ 队长 ${leaderPlayer.name} 选择队员: ${selectedPlayers.map(p => p.name).join(', ')}`);
    
    await new Promise((r, j) => {
      leaderPlayer.socket.emit('build-team', { 
        roomId: room.roomId, 
        teamIds: selectedPlayers.map(p => p.playerId) 
      }, r);
      setTimeout(j, 3000);
    });
    console.log('✅ 队伍提交');
    
    // 推进到投票
    await new Promise((r, j) => { controller.emit('next-phase', { roomId: room.roomId }, r); setTimeout(j, 3000); });
    console.log('✅ 推进到投票阶段');
    
    // 设置事件监听
    let missionStartCount = 0;
    let missionWaitingCount = 0;
    
    selectedPlayers.forEach(player => {
      player.socket.on('mission-start', (data) => {
        console.log(`✅ 队员 ${player.name} 收到 mission-start`);
        missionStartCount++;
      });
    });
    
    players.filter(p => !selectedPlayers.some(sp => sp.playerId === p.playerId)).forEach(player => {
      player.socket.on('mission-waiting', (data) => {
        console.log(`✅ 非队员 ${player.name} 收到 mission-waiting`);
        missionWaitingCount++;
      });
    });
    
    // 所有玩家投票
    console.log('\n📍 开始投票...');
    for (const player of players) {
      const voteRes = await new Promise((r, j) => {
        player.socket.emit('vote', { roomId: room.roomId, playerId: player.playerId, vote: 'approve' }, r);
        setTimeout(() => j(new Error('超时')), 5000);
      });
      if (voteRes.result?.completed) {
        console.log(`✅ ${player.name} 投票完成，phase: ${voteRes.result.gamePhase}`);
      }
      await delay(100);
    }
    
    await delay(1000);
    
    // 验证结果
    console.log('\n=== Socket.IO 测试结果 ===');
    console.log(`✅ 收到 mission-start 的队员数: ${missionStartCount}/${selectedPlayers.length}`);
    console.log(`✅ 收到 mission-waiting 的非队员数: ${missionWaitingCount}/${players.length - selectedPlayers.length}`);
    
    const socketTestPassed = missionStartCount === selectedPlayers.length && missionWaitingCount === (players.length - selectedPlayers.length);
    
    if (socketTestPassed) {
      console.log('✅ Socket.IO 测试通过！BUG-046 已修复！');
    } else {
      console.log('❌ Socket.IO 测试失败！');
    }
    
    // ========== 第二部分：语音面板 UI 验证 ==========
    console.log('\n📍 第二部分：语音面板 UI 验证');
    
    const voicePanel = await context.newPage();
    await voicePanel.goto(BASE_URL);
    await delay(2000);
    await closeHelpOverlay(voicePanel);
    
    // 检查页面加载成功
    const title = await voicePanel.title();
    console.log(`✅ 语音面板标题: ${title}`);
    
    // 关闭
    await browser.close();
    
    // ========== 最终结果 ==========
    console.log('\n========================================');
    if (socketTestPassed) {
      console.log('✅✅✅ BUG-046 E2E 测试通过！ ✅✅✅');
      console.log('   投票完成后正确推进到 mission 阶段');
      console.log('   任务队员收到 mission-start 事件');
      console.log('   非任务队员收到 mission-waiting 事件');
    } else {
      console.log('❌❌❌ BUG-046 E2E 测试失败 ❌❌❌');
    }
    console.log('========================================\n');
    
    return socketTestPassed;
  } catch (error) {
    console.error('❌ E2E 测试失败:', error.message);
    console.error('错误堆栈:', error.stack);
    return false;
  } finally {
    try {
      await browser.close();
    } catch (e) {
      // 忽略关闭错误
    }
  }
}

// 运行测试
runBUG046E2E().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('测试异常:', error);
  process.exit(1);
});
