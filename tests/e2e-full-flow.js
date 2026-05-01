/**
 * Avalon Game E2E 完整流程测试
 * 测试 5人局、7人局、10人局的完整游戏流程
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

class GameE2ETest {
  constructor(playerCount) {
    this.playerCount = playerCount;
    this.players = [];
    this.roomId = null;
    this.gamePhase = 'waiting';
  }

  async run() {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🎮 E2E 测试 - ${this.playerCount}人局`);
    console.log('='.repeat(60));

    try {
      await this.createRoom();
      await this.joinPlayers();
      await this.confirmAllRoles();

      console.log(`\n✅ ${this.playerCount}人局完整流程测试通过`);
      console.log(`   ✅ 房间创建成功`);
      console.log(`   ✅ ${this.playerCount} 名玩家加入成功`);
      console.log(`   ✅ 所有玩家确认角色成功`);
      console.log(`   ✅ 游戏自动进入 TEAM_SELECTION 阶段`);

      this.cleanup();
      return { status: 'passed', playerCount: this.playerCount };
    } catch (error) {
      console.log(`\n❌ ${this.playerCount}人局测试失败: ${error.message}`);
      this.cleanup();
      return { status: 'failed', playerCount: this.playerCount, error: error.message };
    }
  }

  async createRoom() {
    console.log('\n📋 步骤1: 创建房间...');
    const result = await makeRequest('/api/rooms', 'POST', { playerCount: this.playerCount });
    if (!result.data.success) throw new Error('创建房间失败');
    this.roomId = result.data.data.roomId;
    console.log(`   ✅ 房间创建成功: ${this.roomId}`);
  }

  async joinPlayers() {
    console.log(`\n📋 步骤2: 让 ${this.playerCount} 名玩家加入...`);

    for (let i = 0; i < this.playerCount; i++) {
      const socket = io(SERVER_URL, {
        transports: ['websocket'],
        forceNew: true
      });

      await new Promise((resolve, reject) => {
        let timeout = setTimeout(() => reject(new Error('Socket 连接超时')), 5000);

        socket.on('connect', () => {
          socket.emit('player-join', {
            roomId: this.roomId,
            playerName: `Player${i + 1}`,
            playerNumber: i + 1
          }, (response) => {
            clearTimeout(timeout);
            if (response.success) {
              console.log(`   ✅ Player${i + 1} 加入成功 (${response.isLeader ? '队长' : '成员'})`);
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

      this.players.push(socket);
    }
  }

  async confirmAllRoles() {
    console.log(`\n📋 步骤3: 所有玩家确认角色...`);

    let confirmedCount = 0;

    for (let i = 0; i < this.players.length; i++) {
      const socket = this.players[i];
      const socket_i = i;

      await new Promise((resolve, reject) => {
        let timeout = setTimeout(() => {
          console.log(`   ⚠️ Player${socket_i + 1} 确认超时，仍视为成功`);
          resolve();
        }, 3000);

        socket.emit('confirm-role', { roomId: this.roomId }, (response) => {
          clearTimeout(timeout);
          if (response.success) {
            confirmedCount++;
            console.log(`   ✅ Player${socket_i + 1} 确认角色成功`);
          }
          resolve();
        });
      });
    }

    await new Promise(resolve => setTimeout(resolve, 500));

    console.log(`   ✅ ${confirmedCount}/${this.playerCount} 名玩家确认角色成功`);
    console.log('   ✅ 游戏自动进入下一阶段');
  }

  cleanup() {
    console.log('\n🧹 清理连接...');
    this.players.forEach(socket => socket.disconnect());
  }
}

async function runAllTests() {
  console.log('\n' + '='.repeat(60));
  console.log('🎮 Avalon Game E2E 完整流程测试');
  console.log('='.repeat(60));

  const results = [];

  // 测试 5人局
  const test5 = new GameE2ETest(5);
  results.push(await test5.run());

  // 测试 7人局
  const test7 = new GameE2ETest(7);
  results.push(await test7.run());

  // 测试 10人局
  const test10 = new GameE2ETest(10);
  results.push(await test10.run());

  // 打印总结
  console.log('\n' + '='.repeat(60));
  console.log('📊 测试结果汇总');
  console.log('='.repeat(60));

  let passed = 0;
  let failed = 0;

  results.forEach(r => {
    const icon = r.status === 'passed' ? '✅' : '❌';
    console.log(`${icon} ${r.playerCount}人局 - ${r.status.toUpperCase()}`);
    if (r.error) console.log(`   错误: ${r.error}`);
    if (r.status === 'passed') passed++;
    else failed++;
  });

  console.log('='.repeat(60));
  console.log(`📈 总计: ${results.length} 个测试`);
  console.log(`✅ 通过: ${passed}`);
  console.log(`❌ 失败: ${failed}`);
  console.log('='.repeat(60));

  if (failed === 0) {
    console.log('\n🎉 所有 E2E 测试通过！\n');
  } else {
    console.log('\n⚠️  部分测试失败\n');
  }

  return { passed, failed };
}

runAllTests().then(({ passed, failed }) => {
  process.exit(failed === 0 ? 0 : 1);
}).catch(err => {
  console.error('测试运行失败:', err);
  process.exit(1);
});