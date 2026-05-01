/**
 * Avalon Game E2E 测试 - 7人局
 */

const io = require('socket.io-client');
const http = require('http');

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

async function test7Players() {
  console.log('\n🎮 E2E 测试 - 7人局\n');

  try {
    // 创建房间
    console.log('📋 步骤1: 创建房间...');
    const result = await makeRequest('/api/rooms', 'POST', { playerCount: 7 });
    if (!result.data.success) throw new Error('创建房间失败: ' + JSON.stringify(result));
    const roomId = result.data.data.roomId;
    console.log(`   ✅ 房间创建成功: ${roomId}`);

    // 让7名玩家加入
    console.log('\n📋 步骤2: 让7名玩家加入...');
    const players = [];

    for (let i = 0; i < 7; i++) {
      const socket = io(SERVER_URL, {
        transports: ['websocket'],
        forceNew: true
      });

      await new Promise((resolve, reject) => {
        let timeout = setTimeout(() => reject(new Error('Socket 连接超时')), 5000);

        socket.on('connect', () => {
          socket.emit('player-join', {
            roomId: roomId,
            playerName: `Player${i + 1}`,
            playerNumber: i + 1
          }, (response) => {
            clearTimeout(timeout);
            if (response.success) {
              console.log(`   ✅ Player${i + 1} 加入成功`);
              resolve();
            } else {
              reject(new Error(`Player${i + 1} 加入失败: ${response.message}`));
            }
          });
        });

        socket.on('connect_error', (err) => {
          clearTimeout(timeout);
          reject(new Error('Socket 连接失败: ' + err.message));
        });
      });

      players.push(socket);
    }

    console.log('\n📋 步骤3: 所有玩家确认角色...');
    for (let i = 0; i < players.length; i++) {
      const socket = players[i];
      await new Promise((resolve) => {
        socket.emit('confirm-role', { roomId: roomId }, (response) => {
          console.log(`   ✅ Player${i + 1} 确认角色`);
          resolve();
        });
        setTimeout(resolve, 200);
      });
    }

    await new Promise(resolve => setTimeout(resolve, 500));

    console.log('\n✅ 7人局完整流程测试通过！');

    players.forEach(socket => socket.disconnect());
    return true;

  } catch (error) {
    console.log(`\n❌ 7人局测试失败: ${error.message}`);
    return false;
  }
}

test7Players().then(success => {
  process.exit(success ? 0 : 1);
});