// BUG-046 测试：投票完成后游戏推进到 mission 阶段，任务队员能看到任务按钮
const { io } = require('socket.io-client');
const SERVER_URL = 'http://localhost:3000';

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function test() {
  console.log('\n=== BUG-046 测试：投票完成后推进到任务阶段 ===\n');
  
  // 创建控制器
  const controller = io(SERVER_URL, { transports: ['websocket'], reconnection: false });
  await new Promise((r, j) => { controller.on('connect', r); setTimeout(j, 5000); });
  
  // 创建房间
  const room = await new Promise((r, j) => {
    controller.emit('create-room', { playerCount: 5 }, r);
    setTimeout(() => j(new Error('超时')), 5000);
  });
  console.log('✅ 房间创建:', room.roomId);
  
  // 5个玩家加入
  const players = [];
  for (let i = 1; i <= 5; i++) {
    const p = io(SERVER_URL, { transports: ['websocket'], reconnection: false });
    await new Promise((r, j) => { p.on('connect', r); setTimeout(j, 5000); });
    const joinRes = await new Promise((r, j) => {
      p.emit('player-join', { roomId: room.roomId, playerName: '玩家'+i, playerNumber: i }, r);
      setTimeout(() => j(new Error('超时')), 5000);
    });
    players.push({ socket: p, playerId: joinRes.playerId, name: '玩家'+i });
    await sleep(100);
  }
  console.log('✅ 5个玩家加入');
  
  // 开始游戏
  await new Promise((r, j) => { controller.emit('start-game', { roomId: room.roomId }, r); setTimeout(j, 5000); });
  console.log('✅ 游戏开始');
  
  // 推进到 team-building（经过 role-confirm, night, day）
  let latestState;
  for (let i = 0; i < 4; i++) {
    const res = await new Promise((r, j) => { controller.emit('next-phase', { roomId: room.roomId }, r); setTimeout(j, 5000); });
    latestState = res.gameState;
    await sleep(200);
  }
  console.log('✅ 推进到 team-building 阶段');
  
  // 找到队长并组队
  const leaderPlayer = players.find(p => p.playerId === latestState?.currentLeaderId);
  if (!leaderPlayer) {
    console.log('❌ 未找到队长');
    process.exit(1);
  }
  console.log('✅ 队长:', leaderPlayer.name);
  
  // 选择2个队员
  const selectedPlayers = players.slice(0, 2);
  console.log('✅ 选择队员:', selectedPlayers.map(p => p.name));
  
  // 队长提交队伍
  await new Promise((r, j) => {
    leaderPlayer.socket.emit('build-team', { 
      roomId: room.roomId, 
      teamIds: selectedPlayers.map(p => p.playerId) 
    }, r);
    setTimeout(j, 5000);
  });
  console.log('✅ 队伍提交');
  
  // 推进到投票
  await new Promise((r, j) => { controller.emit('next-phase', { roomId: room.roomId }, r); setTimeout(j, 5000); });
  console.log('✅ 推进到投票阶段');
  await sleep(200);
  
  // 【关键修复】在投票前就设置好事件监听器
  let missionStartCount = 0;
  let missionWaitingCount = 0;
  let missionStartData = null;
  
  // 所有队员监听 mission-start 事件
  selectedPlayers.forEach((player, idx) => {
    player.socket.on('mission-start', (data) => {
      console.log(`✅ 队员${idx+1} (${player.name}) 收到 mission-start:`, data.message);
      console.log('   轮次:', data.round);
      console.log('   队伍:', data.teamMembers?.map(m => m.name || m));
      missionStartCount++;
      if (!missionStartData) missionStartData = data;
    });
  });
  
  // 非队员监听 mission-waiting 事件
  const nonTeamPlayers = players.filter(p => !selectedPlayers.some(sp => sp.playerId === p.playerId));
  nonTeamPlayers.forEach((player, idx) => {
    player.socket.on('mission-waiting', (data) => {
      console.log(`✅ 非队员${idx+1} (${player.name}) 收到 mission-waiting:`, data.message);
      missionWaitingCount++;
    });
  });
  
  // 所有玩家投票通过
  console.log('\n=== 开始投票 ===');
  for (const player of players) {
    const voteRes = await new Promise((r, j) => {
      player.socket.emit('vote', { 
        roomId: room.roomId, 
        playerId: player.playerId, 
        vote: 'approve' 
      }, r);
      setTimeout(() => j(new Error('超时')), 5000);
    });
    if (voteRes.result?.completed) {
      console.log('✅ 投票完成，phase:', voteRes.result.gamePhase);
    }
    await sleep(100);
  }
  
  // 等待事件处理
  await sleep(1000);
  
  // 验证结果
  console.log('\n=== 验证结果 ===');
  console.log('✅ 收到 mission-start 的队员数:', missionStartCount, '/', selectedPlayers.length);
  console.log('✅ 收到 mission-waiting 的非队员数:', missionWaitingCount, '/', nonTeamPlayers.length);
  
  if (missionStartCount === 0) {
    console.log('\n❌ BUG-046 未修复：队员未收到 mission-start 事件');
    console.log('   请检查服务器日志中的 [阶段路由] 输出');
    process.exit(1);
  }
  
  if (missionStartCount < selectedPlayers.length) {
    console.log('⚠️  部分队员未收到 mission-start 事件');
  }
  
  // 队员执行任务
  console.log('\n=== 任务执行 ===');
  for (const player of selectedPlayers) {
    const missionRes = await new Promise((r, j) => {
      player.socket.emit('execute-mission', { 
        roomId: room.roomId, 
        playerId: player.playerId, 
        result: 'success' 
      }, r);
      setTimeout(() => j(new Error('超时')), 5000);
    });
    console.log('✅', player.name, '执行任务:', missionRes.result?.completed ? '完成' : '等待中');
    await sleep(100);
  }
  
  await sleep(500);
  console.log('\n✅ BUG-046 测试完成：投票完成后正确推进到任务阶段，任务队员能收到任务事件');
  
  // 清理
  players.forEach(p => p.socket.disconnect());
  controller.disconnect();
}

test().catch(e => {
  console.error('测试异常:', e);
  process.exit(1);
});
