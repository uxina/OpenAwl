/**
 * 重构验证测试
 * 验证 gameStore 和 services 是否正常工作
 */

const { io } = require('socket.io-client');

const SERVER_URL = 'http://localhost:3000';
const TEST_TIMEOUT = 10000;

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runTests() {
  console.log('\n========================================');
  console.log('重构验证测试');
  console.log('========================================\n');

  let passed = 0;
  let failed = 0;

  // 测试1: 创建房间
  console.log('📍 测试1: 创建房间 API');
  try {
    const response = await fetch(`${SERVER_URL}/api/rooms`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerCount: 5 })
    });
    const data = await response.json();
    if (data.success && data.data.roomId) {
      console.log(`  ✅ 通过: 房间 ${data.data.roomId} 创建成功`);
      passed++;
      var roomId = data.data.roomId;
    } else {
      throw new Error('创建失败');
    }
  } catch (e) {
    console.log(`  ❌ 失败: ${e.message}`);
    failed++;
  }

  // 测试2: 获取房间列表
  console.log('\n📍 测试2: 获取房间列表 API');
  try {
    const response = await fetch(`${SERVER_URL}/api/rooms`);
    const data = await response.json();
    if (data.success && Array.isArray(data.data)) {
      console.log(`  ✅ 通过: 房间列表获取成功，共 ${data.data.length} 个房间`);
      passed++;
    } else {
      throw new Error('获取失败');
    }
  } catch (e) {
    console.log(`  ❌ 失败: ${e.message}`);
    failed++;
  }

  // 测试3: Socket连接
  console.log('\n📍 测试3: Socket连接');
  try {
    const socket = io(SERVER_URL, { transports: ['websocket'], reconnection: false });
    await new Promise((resolve, reject) => {
      socket.on('connect', resolve);
      socket.on('connect_error', reject);
      setTimeout(() => reject(new Error('连接超时')), 5000);
    });
    console.log('  ✅ 通过: Socket连接成功');
    passed++;
    socket.disconnect();
  } catch (e) {
    console.log(`  ❌ 失败: ${e.message}`);
    failed++;
  }

  // 测试4: 玩家加入
  console.log('\n📍 测试4: 玩家加入房间');
  let playerSocket;
  try {
    playerSocket = io(SERVER_URL, { transports: ['websocket'], reconnection: false });
    await new Promise((resolve, reject) => {
      playerSocket.on('connect', resolve);
      setTimeout(() => reject(new Error('连接超时')), 5000);
    });

    const result = await new Promise((resolve, reject) => {
      playerSocket.emit('player-join', {
        roomId: roomId,
        playerName: '测试玩家1',
        playerNumber: 1
      }, resolve);
      setTimeout(() => reject(new Error('加入超时')), 5000);
    });

    if (result.success) {
      console.log(`  ✅ 通过: 玩家加入成功，playerId=${result.playerId}`);
      passed++;
    } else {
      throw new Error(result.message);
    }
  } catch (e) {
    console.log(`  ❌ 失败: ${e.message}`);
    failed++;
    if (playerSocket) playerSocket.disconnect();
  }

  // 测试5: 控制器创建房间
  console.log('\n📍 测试5: 控制器创建房间');
  let controllerSocket;
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
      console.log(`  ✅ 通过: 控制器创建房间成功，roomId=${result.roomId}`);

      // 验证房间确实创建
      const response = await fetch(`${SERVER_URL}/api/rooms/${result.roomId}`);
      const data = await response.json();
      if (data.success && data.data.roomId === result.roomId) {
        console.log(`  ✅ 通过: 房间详情API验证成功`);
        passed++;
      } else {
        throw new Error('房间详情验证失败');
      }
    } else {
      throw new Error(result.message);
    }
    controllerSocket.disconnect();
  } catch (e) {
    console.log(`  ❌ 失败: ${e.message}`);
    failed++;
    if (controllerSocket) controllerSocket.disconnect();
  }

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
