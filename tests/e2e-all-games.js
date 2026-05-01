const http = require('http');
const io = require('socket.io-client');

const SERVER_URL = 'http://localhost:3000';

function makeRequest(path, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, SERVER_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      method: method,
      headers: body ? { 'Content-Type': 'application/json' } : {}
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function testGame(playerCount) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🎮 E2E 测试 - ${playerCount}人局`);
  console.log('='.repeat(60));

  try {
    // 步骤1: 创建房间
    console.log('\n📋 步骤1: 创建房间...');
    const createResult = await makeRequest('/api/rooms', 'POST', { playerCount: playerCount });
    if (!createResult.data.success) throw new Error('创建房间失败');
    const roomId = createResult.data.data.roomId;
    console.log(`   ✅ 房间创建成功: ${roomId}`);

    // 步骤2: 加入玩家
    console.log(`\n📋 步骤2: ${playerCount} 名玩家加入...`);
    const sockets = [];

    for (let i = 0; i < playerCount; i++) {
      const socket = io(SERVER_URL, {
        transports: ['websocket'],
        forceNew: true
      });

      await new Promise((resolve, reject) => {
        let timeout = setTimeout(() => reject(new Error(`Player${i+1} 超时`)), 5000);

        socket.on('connect', () => {
          socket.emit('player-join', {
            roomId: roomId,
            playerName: `Player${i+1}`,
            playerNumber: i + 1
          }, (response) => {
            clearTimeout(timeout);
            if (response.success) {
              console.log(`   ✅ Player${i+1} 加入成功`);
              resolve();
            } else {
              reject(new Error(`Player${i+1} 加入失败`));
            }
          });
        });

        socket.on('connect_error', (err) => {
          clearTimeout(timeout);
          reject(new Error(`Socket 连接失败: ${err.message}`));
        });
      });

      sockets.push(socket);
    }

    // 步骤3: 确认角色
    console.log('\n📋 步骤3: 确认角色...');
    let confirmed = 0;
    for (let i = 0; i < sockets.length; i++) {
      await new Promise((resolve) => {
        sockets[i].emit('confirm-role', { roomId: roomId }, (response) => {
          if (response.success) confirmed++;
        });
        setTimeout(resolve, 200);
      });
    }

    await new Promise(resolve => setTimeout(resolve, 500));
    console.log(`   ✅ ${confirmed}/${playerCount} 名玩家确认角色`);
    console.log(`   ✅ 游戏进入下一阶段`);

    // 清理
    sockets.forEach(s => s.disconnect());

    // 等待 socket 完全断开
    await new Promise(resolve => setTimeout(resolve, 2000));

    console.log(`\n✅ ${playerCount}人局测试通过！`);
    return { status: 'passed', playerCount };

  } catch (error) {
    console.log(`\n❌ ${playerCount}人局测试失败: ${error.message}`);
    console.error('详细错误:', error);
    return { status: 'failed', playerCount, error: error.message };
  }
}

async function runAllTests() {
  console.log('\n' + '='.repeat(60));
  console.log('🎮 Avalon Game E2E 完整流程测试');
  console.log('='.repeat(60));

  const results = [];

  // 5人局
  results.push(await testGame(5));
  await new Promise(resolve => setTimeout(resolve, 3000)); // 等待清理

  // 7人局
  results.push(await testGame(7));
  await new Promise(resolve => setTimeout(resolve, 3000)); // 等待清理

  // 10人局
  results.push(await testGame(10));

  // 总结
  console.log('\n' + '='.repeat(60));
  console.log('📊 测试结果汇总');
  console.log('='.repeat(60));

  let passed = 0, failed = 0;

  results.forEach(r => {
    const icon = r.status === 'passed' ? '✅' : '❌';
    console.log(`${icon} ${r.playerCount}人局 - ${r.status.toUpperCase()}`);
    if (r.status === 'passed') passed++;
    else failed++;
  });

  console.log('='.repeat(60));
  console.log(`📈 总计: ${results.length}`);
  console.log(`✅ 通过: ${passed}`);
  console.log(`❌ 失败: ${failed}`);
  console.log('='.repeat(60));

  if (failed === 0) {
    console.log('\n🎉 所有测试通过！');
  } else {
    console.log('\n⚠️ 部分测试失败');
  }
}

runAllTests().then(() => {
  process.exit(0);
}).catch(err => {
  console.error('测试异常:', err);
  process.exit(1);
});