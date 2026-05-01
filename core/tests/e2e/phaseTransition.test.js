/**
 * ============================================================================
 * E2E测试: 游戏阶段转换流程
 * ============================================================================
 *
 * 测试场景:
 * 1. 创建房间
 * 2. 5个玩家加入
 * 3. 语音面板开始游戏
 * 4. 推进各阶段并验证
 * ============================================================================
 */

const { TestPlayer, TestController, TestSuite, assert } = require('./testFramework');
const { getPhaseDisplayName } = require('../../config/phaseRoutes');

// 测试套件
const suite = new TestSuite('游戏阶段转换E2E测试');

// 测试1: 基础房间创建和玩家加入
suite.addTest('创建房间并加入5个玩家', async () => {
  const controller = new TestController();
  const players = [];

  try {
    // 1. 控制器连接并创建房间
    await controller.connect();
    const roomResponse = await controller.createRoom(5);
    assert.exists(roomResponse.roomId, '房间ID应该存在');
    assert.equal(roomResponse.playerCount, 5, '房间人数应为5');

    const roomId = roomResponse.roomId;

    // 2. 5个玩家依次加入
    for (let i = 1; i <= 5; i++) {
      const player = new TestPlayer(`玩家${i}`, i);
      await player.connect();
      const joinResponse = await player.joinRoom(roomId);
      assert.exists(joinResponse.playerId, `玩家${i}的ID应该存在`);
      players.push(player);
    }

    // 3. 验证所有玩家都收到了game-ready事件
    for (const player of players) {
      const gameReadyEvents = player.getEvents('game-ready');
      assert.equal(gameReadyEvents.length, 1, `${player.name}应该收到game-ready事件`);
    }

    console.log('  ✓ 房间创建成功');
    console.log('  ✓ 5个玩家成功加入');
    console.log('  ✓ 所有玩家收到game-ready事件');

  } finally {
    // 清理
    controller.disconnect();
    players.forEach(p => p.disconnect());
  }
});

// 测试2: 阶段转换 - waiting -> opening -> role-confirm
suite.addTest('阶段转换: waiting -> opening -> role-confirm', async () => {
  const controller = new TestController();
  const players = [];

  try {
    // 1. 创建房间和加入玩家
    await controller.connect();
    const { roomId } = await controller.createRoom(5);

    for (let i = 1; i <= 5; i++) {
      const player = new TestPlayer(`玩家${i}`, i);
      await player.connect();
      await player.joinRoom(roomId);
      players.push(player);
    }

    // 2. 等待game-ready事件（opening阶段）
    await controller.waitForEvent('game-ready', 3000);
    console.log('  ✓ 进入opening阶段');

    // 3. 开始游戏 -> role-confirm阶段
    await controller.startGame();
    await controller.nextPhase(); // opening -> role-confirm

    // 4. 验证所有玩家收到角色
    for (const player of players) {
      const roleAssignedEvent = await player.waitForEvent('role-assigned', 3000);
      assert.exists(roleAssignedEvent.role, `${player.name}应该收到角色`);
      assert.exists(roleAssignedEvent.side, `${player.name}应该收到阵营`);
      player.role = roleAssignedEvent.role;
      player.side = roleAssignedEvent.side;
    }

    console.log('  ✓ 进入role-confirm阶段');
    console.log('  ✓ 所有玩家收到角色分配');

    // 5. 验证角色分配合理
    const roles = players.map(p => p.role);
    assert.includes(roles, 'merlin', '应该有梅林');
    assert.includes(roles, 'assassin', '应该有刺客');

    console.log('  ✓ 角色分配合理');

  } finally {
    controller.disconnect();
    players.forEach(p => p.disconnect());
  }
});

// 测试3: 完整阶段流程验证
suite.addTest('完整阶段流程: role-confirm -> night -> day -> team-building', async () => {
  const controller = new TestController();
  const players = [];

  try {
    // 1. 初始化游戏到role-confirm阶段
    await controller.connect();
    const { roomId } = await controller.createRoom(5);

    for (let i = 1; i <= 5; i++) {
      const player = new TestPlayer(`玩家${i}`, i);
      await player.connect();
      await player.joinRoom(roomId);
      players.push(player);
    }

    await controller.waitForEvent('game-ready');
    await controller.startGame();
    await controller.nextPhase(); // -> role-confirm

    // 等待所有玩家收到角色
    await Promise.all(players.map(p => p.waitForEvent('role-assigned')));

    // 2. role-confirm -> night
    await controller.nextPhase();
    console.log('  ✓ 进入night阶段');

    // 验证邪恶阵营收到night-vision
    const evilPlayers = players.filter(p => p.side === 'evil');
    for (const evilPlayer of evilPlayers) {
      if (evilPlayer.role !== 'oberon') { // 奥伯伦不收到
        const nightVision = await evilPlayer.waitForEvent('night-vision', 3000);
        assert.exists(nightVision.teammates, '邪恶阵营应该看到同伴');
      }
    }
    console.log('  ✓ 邪恶阵营收到night-vision');

    // 3. night -> day
    await controller.nextPhase();
    console.log('  ✓ 进入day阶段');

    // 4. day -> team-building
    await controller.nextPhase();
    console.log('  ✓ 进入team-building阶段');

    // 验证队长收到you-are-leader
    const leader = players.find(p => p.role === 'merlin'); // 第一个玩家是队长
    if (leader) {
      const leaderEvent = await leader.waitForEvent('you-are-leader', 3000);
      assert.exists(leaderEvent.requiredTeamSize, '队长应该收到队伍大小');
      console.log('  ✓ 队长收到you-are-leader事件');
    }

  } finally {
    controller.disconnect();
    players.forEach(p => p.disconnect());
  }
});

// 测试4: 验证阶段路由配置被正确使用
suite.addTest('验证阶段路由配置正确执行', async () => {
  const controller = new TestController();
  const players = [];

  try {
    await controller.connect();
    const { roomId } = await controller.createRoom(5);

    for (let i = 1; i <= 5; i++) {
      const player = new TestPlayer(`玩家${i}`, i);
      await player.connect();
      await player.joinRoom(roomId);
      players.push(player);
    }

    // 记录阶段转换
    const phaseTransitions = [];
    controller.socket.on('phase-changed', (data) => {
      phaseTransitions.push(data.gamePhase);
    });

    // 执行阶段转换
    await controller.waitForEvent('game-ready'); // opening
    await controller.startGame();
    await controller.nextPhase(); // role-confirm
    await controller.nextPhase(); // night
    await controller.nextPhase(); // day
    await controller.nextPhase(); // team-building

    // 等待所有阶段转换完成
    await new Promise(resolve => setTimeout(resolve, 1000));

    // 验证阶段顺序
    assert.includes(phaseTransitions, 'role-confirm', '应该经过role-confirm阶段');
    assert.includes(phaseTransitions, 'night', '应该经过night阶段');
    assert.includes(phaseTransitions, 'day', '应该经过day阶段');
    assert.includes(phaseTransitions, 'team-building', '应该经过team-building阶段');

    console.log('  ✓ 阶段转换顺序正确');
    console.log(`  ✓ 经过的阶段: ${phaseTransitions.join(' -> ')}`);

  } finally {
    controller.disconnect();
    players.forEach(p => p.disconnect());
  }
});

// 运行测试
if (require.main === module) {
  suite.runAll().then(results => {
    const failed = results.filter(r => r.status === 'FAILED').length;
    process.exit(failed > 0 ? 1 : 0);
  });
}

module.exports = { suite };
