/**
 * 完整游戏流程测试
 * 测试重构后完整游戏流程
 */

const { io } = require('socket.io-client');

const SERVER_URL = 'http://localhost:3000';
const TEST_TIMEOUT = 10000;

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runTests() {
  console.log('\n========================================');
  console.log('完整游戏流程测试');
  console.log('========================================\n');

  let passed = 0;
  let failed = 0;

  // 步骤1: 创建房间
  console.log('📍 步骤1: 创建房间');
  let controllerSocket;
  let roomId;
  try {
    controllerSocket = io(SERVER_URL, { transports: ['websocket'], reconnection: false });
    await new Promise((resolve, reject) => {
      controllerSocket.on('connect', resolve);
      setTimeout(() => reject(new Error('连接超时')), 5000);
    });

    const result = await new Promise((resolve, reject) => {
      controllerSocket.emit('create-room', { playerCount: 5 }, resolve);
      setTimeout(() => reject(new Error('创建超时')), 5000);
    });

    if (result.success) {
      roomId = result.roomId;
      console.log(`  ✅ 房间创建成功: ${roomId}`);
      passed++;
    } else {
      throw new Error(result.message);
    }
  } catch (e) {
    console.log(`  ❌ 失败: ${e.message}`);
    failed++;
    process.exit(1);
  }

  // 步骤2: 添加5个玩家
  console.log('\n📍 步骤2: 添加5个玩家');
  const players = [];
  try {
    for (let i = 0; i < 5; i++) {
      const playerSocket = io(SERVER_URL, { transports: ['websocket'], reconnection: false });
      await new Promise((resolve, reject) => {
        playerSocket.on('connect', resolve);
        setTimeout(() => reject(new Error('连接超时')), 5000);
      });

      const result = await new Promise((resolve, reject) => {
        playerSocket.emit('player-join', {
          roomId: roomId,
          playerName: `玩家${i + 1}`,
          playerNumber: i + 1
        }, resolve);
        setTimeout(() => reject(new Error('加入超时')), 5000);
      });

      if (result.success) {
        console.log(`  ✅ 玩家${i + 1} (${result.playerId}) 加入成功`);
        players.push({ socket: playerSocket, ...result });
      } else {
        throw new Error(result.message);
      }
      await sleep(100);
    }
    passed++;
  } catch (e) {
    console.log(`  ❌ 失败: ${e.message}`);
    failed++;
    players.forEach(p => p.socket.disconnect());
    controllerSocket.disconnect();
    process.exit(1);
  }

  // 步骤3: 开始游戏
  console.log('\n📍 步骤3: 开始游戏');
  try {
    const result = await new Promise((resolve, reject) => {
      controllerSocket.emit('start-game', { roomId }, resolve);
      setTimeout(() => reject(new Error('开始超时')), 5000);
    });

    if (result.success) {
      console.log(`  ✅ 游戏开始成功`);
      passed++;
    } else {
      throw new Error(result.message);
    }
    await sleep(500);
  } catch (e) {
    console.log(`  ❌ 失败: ${e.message}`);
    failed++;
    players.forEach(p => p.socket.disconnect());
    controllerSocket.disconnect();
    process.exit(1);
  }

  // 步骤4: 验证玩家收到角色
  console.log('\n📍 步骤4: 验证玩家收到角色分配');
  try {
    for (const player of players) {
      const roleEvent = await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('超时')), 5000);
        player.socket.once('role-assigned', (data) => {
          clearTimeout(timeout);
          resolve(data);
        });
      });
      console.log(`  ✅ 玩家${player.number} 收到角色: ${roleEvent.role} (${roleEvent.side})`);
    }
    passed++;
  } catch (e) {
    console.log(`  ❌ 失败: ${e.message}`);
    failed++;
  }

  // 步骤5: 推进阶段测试
  console.log('\n📍 步骤5: 推进阶段测试 (3次)');
  try {
    for (let i = 0; i < 3; i++) {
      const result = await new Promise((resolve, reject) => {
        controllerSocket.emit('next-phase', { roomId }, resolve);
        setTimeout(() => reject(new Error('推进超时')), 5000);
      });
      if (result.success) {
        console.log(`  ✅ 第${i + 1}次推进: ${result.gameState?.gamePhase || '未知'}`);
      } else {
        throw new Error(result.message);
      }
      await sleep(300);
    }
    passed++;
  } catch (e) {
    console.log(`  ❌ 失败: ${e.message}`);
    failed++;
  }

  // 清理
  console.log('\n📍 清理: 断开所有连接');
  players.forEach(p => p.socket.disconnect());
  controllerSocket.disconnect();
  console.log('  ✅ 清理完成');

  // 打印结果
  console.log('\n========================================');
  console.log('测试结果');
  console.log('========================================');
  console.log(`✅ 通过: ${passed}`);
  console.log(`❌ 失败: ${failed}`);
  console.log(`📈 总计: ${passed + failed}`);
  console.log('========================================\n');

  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(e => {
  console.error('测试异常:', e);
  process.exit(1);
});
