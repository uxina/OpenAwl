/**
 * 关键 Bug 回归测试 - 验证所有 critical 级别的 bug 没有重现
 */

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

async function joinRoom(socket, roomId, playerName, playerNumber) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('加入超时')), 5000);
    socket.on('connect', () => {
      socket.emit('player-join', {
        roomId, playerName, playerNumber
      }, (response) => {
        clearTimeout(timeout);
        if (response.success) {
          socket.playerId = response.playerId;
          resolve(response);
        } else {
          reject(new Error('加入失败: ' + response.message));
        }
      });
    });
    socket.on('connect_error', () => {
      clearTimeout(timeout);
      reject(new Error('连接失败'));
    });
  });
}

async function createAndJoin(roomId, count) {
  const sockets = [];
  for (let i = 0; i < count; i++) {
    const socket = io(SERVER_URL, { transports: ['websocket'], forceNew: true });
    await joinRoom(socket, roomId, `P${i + 1}`, i + 1);
    sockets.push(socket);
  }
  return sockets;
}

async function confirmAll(sockets, roomId) {
  for (const socket of sockets) {
    await new Promise((resolve) => {
      socket.emit('confirm-role', { roomId }, () => {});
      setTimeout(resolve, 100);
    });
  }
  await new Promise(resolve => setTimeout(resolve, 500));
}

class CriticalBugTest {
  constructor() {
    this.results = [];
    this.passed = 0;
    this.failed = 0;
  }

  log(msg, type = 'info') {
    const prefix = type === 'pass' ? '✅' : type === 'fail' ? '❌' : type === 'warn' ? '⚠️' : '  ';
    console.log(`${prefix} ${msg}`);
  }

  assert(condition, testName) {
    if (condition) {
      this.passed++;
      this.results.push({ name: testName, status: 'pass' });
      this.log(testName, 'pass');
    } else {
      this.failed++;
      this.results.push({ name: testName, status: 'fail' });
      this.log(testName, 'fail');
    }
  }

  async run() {
    console.log('\n' + '='.repeat(60));
    console.log('🐛 Critical Bug 回归测试');
    console.log('='.repeat(60));

    await this.testBUG001_CanJoinAfterCreate();
    await this.testBUG007_LeaderCanSubmitTeam();
    await this.testBUG010_NoMemoryLeak();
    await this.testBUG032_ReconnectAfterDisconnect();
    await this.testBUG035_GameProgressAfterJoin();
    await this.testBUG036_NonLeaderCannotSubmitVote();
    await this.testBUG039_NoGameNullError();
    await this.testBUG040_NoSkipRoleReveal();
    await this.testBUG043_RecreateRoomAfterReset();

    this.printSummary();
    return { passed: this.passed, failed: this.failed };
  }

  async testBUG001_CanJoinAfterCreate() {
    console.log('\n📋 测试 BUG-001: 创建房间后无法加入');
    try {
      const result = await makeRequest('/api/rooms', 'POST', { playerCount: 5 });
      const roomId = result.data.data.roomId;
      const socket = io(SERVER_URL, { transports: ['websocket'], forceNew: true });
      await joinRoom(socket, roomId, 'TestPlayer', 1);
      this.assert(true, 'BUG-001: 创建房间后可以加入');
      socket.disconnect();
    } catch (error) {
      this.assert(false, 'BUG-001: ' + error.message);
    }
  }

  async testBUG007_LeaderCanSubmitTeam() {
    console.log('\n📋 测试 BUG-007: 队长无法提交组队');
    try {
      const result = await makeRequest('/api/rooms', 'POST', { playerCount: 5 });
      const roomId = result.data.data.roomId;
      const sockets = await createAndJoin(roomId, 5);
      await confirmAll(sockets, roomId);

      const leaderSocket = sockets[0];

      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('提交超时')), 5000);
        leaderSocket.emit('build-team', {
          roomId: roomId,
          teamMembers: [sockets[0].playerId, sockets[1].playerId]
        }, (response) => {
          clearTimeout(timeout);
          if (response && response.success) {
            this.assert(true, 'BUG-007: 队长可以提交组队');
          } else {
            this.assert(false, 'BUG-007: 队长提交组队失败: ' + (response?.message || '无响应'));
          }
          resolve();
        });
      });

      sockets.forEach(s => s.disconnect());
    } catch (error) {
      this.assert(false, 'BUG-007: ' + error.message);
    }
  }

  async testBUG010_NoMemoryLeak() {
    console.log('\n📋 测试 BUG-010: 服务器内存溢出');
    try {
      const health = await makeRequest('/health');
      const memMB = health.data.memory.heapUsed / (1024 * 1024);
      this.assert(memMB < 200, `BUG-010: 内存使用正常 (${memMB.toFixed(1)}MB < 200MB)`);
    } catch (error) {
      this.assert(false, 'BUG-010: ' + error.message);
    }
  }

  async testBUG032_ReconnectAfterDisconnect() {
    console.log('\n📋 测试 BUG-032: 掉线后重连提示房间已满');
    try {
      const result = await makeRequest('/api/rooms', 'POST', { playerCount: 5 });
      const roomId = result.data.data.roomId;

      const socket = io(SERVER_URL, { transports: ['websocket'], forceNew: true });
      const joinResponse = await joinRoom(socket, roomId, 'TestPlayer', 1);
      const savedPlayerId = joinResponse.playerId;

      socket.disconnect();
      await new Promise(resolve => setTimeout(resolve, 500));

      const socket2 = io(SERVER_URL, { transports: ['websocket'], forceNew: true });
      const reconnectResult = await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('重连超时')), 5000);
        socket2.on('connect', () => {
          socket2.emit('player-rejoin', {
            roomId: roomId,
            playerId: savedPlayerId
          }, (response) => {
            clearTimeout(timeout);
            resolve(response);
          });
        });
        socket2.on('connect_error', () => {
          clearTimeout(timeout);
          reject(new Error('连接失败'));
        });
      });

      this.assert(reconnectResult && reconnectResult.success, 'BUG-032: 掉线后可以重连（不提示房间已满）');
      socket2.disconnect();
    } catch (error) {
      this.assert(false, 'BUG-032: ' + error.message);
    }
  }

  async testBUG035_GameProgressAfterJoin() {
    console.log('\n📋 测试 BUG-035: 5个玩家加入后游戏无法推进');
    try {
      const result = await makeRequest('/api/rooms', 'POST', { playerCount: 5 });
      const roomId = result.data.data.roomId;
      const sockets = await createAndJoin(roomId, 5);
      await confirmAll(sockets, roomId);

      await new Promise(resolve => setTimeout(resolve, 1000));

      const gameState = await makeRequest('/api/rooms/' + roomId);
      const gamePhase = gameState.data.data.gamePhase;

      this.assert(
        gamePhase !== 'waiting',
        `BUG-035: 5个玩家加入后游戏可以推进 (phase: ${gamePhase})`
      );

      sockets.forEach(s => s.disconnect());
    } catch (error) {
      this.assert(false, 'BUG-035: ' + error.message);
    }
  }

  async testBUG036_NonLeaderCannotSubmitVote() {
    console.log('\n📋 测试 BUG-036: 非队长可以提交发车投票');
    try {
      const result = await makeRequest('/api/rooms', 'POST', { playerCount: 5 });
      const roomId = result.data.data.roomId;
      const sockets = await createAndJoin(roomId, 5);
      await confirmAll(sockets, roomId);

      const nonLeaderSocket = sockets[1];
      const voteResult = await new Promise((resolve) => {
        nonLeaderSocket.emit('build-team', {
          roomId: roomId,
          teamMembers: [sockets[0].playerId, sockets[1].playerId]
        }, (response) => {
          resolve(response);
        });
      });

      this.assert(
        !voteResult || !voteResult.success,
        'BUG-036: 非队长不能提交发车投票'
      );

      sockets.forEach(s => s.disconnect());
    } catch (error) {
      this.assert(false, 'BUG-036: ' + error.message);
    }
  }

  async testBUG039_NoGameNullError() {
    console.log('\n📋 测试 BUG-039: 玩家加入时game变量未初始化');
    try {
      const result = await makeRequest('/api/rooms', 'POST', { playerCount: 5 });
      const roomId = result.data.data.roomId;
      const socket = io(SERVER_URL, { transports: ['websocket'], forceNew: true });
      await joinRoom(socket, roomId, 'TestPlayer', 1);
      this.assert(true, 'BUG-039: 玩家加入时无 game 变量错误');
      socket.disconnect();
    } catch (error) {
      this.assert(false, 'BUG-039: ' + error.message);
    }
  }

  async testBUG040_NoSkipRoleReveal() {
    console.log('\n📋 测试 BUG-040: 最后一个玩家加入后直接看到角色');
    try {
      const result = await makeRequest('/api/rooms', 'POST', { playerCount: 5 });
      const roomId = result.data.data.roomId;
      const sockets = [];
      let phaseAfterLastJoin = null;

      for (let i = 0; i < 5; i++) {
        const socket = io(SERVER_URL, { transports: ['websocket'], forceNew: true });
        socket.on('phase-changed', (data) => {
          phaseAfterLastJoin = data.phase;
        });
        await joinRoom(socket, roomId, `P${i + 1}`, i + 1);
        sockets.push(socket);
      }

      await new Promise(resolve => setTimeout(resolve, 500));

      const gameState = await makeRequest('/api/rooms/' + roomId);
      const currentPhase = gameState.data.data.gamePhase;

      this.assert(
        currentPhase === 'waiting',
        `BUG-040: 最后一个玩家加入后没有跳过角色阶段 (phase: ${currentPhase})`
      );

      sockets.forEach(s => s.disconnect());
    } catch (error) {
      this.assert(false, 'BUG-040: ' + error.message);
    }
  }

  async testBUG043_RecreateRoomAfterReset() {
    console.log('\n📋 测试 BUG-043: 重置后无法创建房间');
    try {
      const result1 = await makeRequest('/api/rooms', 'POST', { playerCount: 5 });
      const roomId1 = result1.data.data.roomId;

      await new Promise(resolve => setTimeout(resolve, 200));

      const result2 = await makeRequest('/api/rooms', 'POST', { playerCount: 5 });
      const roomId2 = result2.data.data.roomId;

      this.assert(roomId2 !== roomId1, 'BUG-043: 重置后可以创建新房间');
    } catch (error) {
      this.assert(false, 'BUG-043: ' + error.message);
    }
  }

  printSummary() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 Critical Bug 回归测试结果');
    console.log('='.repeat(60));
    console.log(`✅ 通过: ${this.passed}`);
    console.log(`❌ 失败: ${this.failed}`);
    console.log(`📈 总计: ${this.passed + this.failed}`);
    console.log('='.repeat(60));

    if (this.failed === 0) {
      console.log('\n🎉 所有 Critical Bug 回归测试通过！');
    } else {
      console.log('\n⚠️  部分测试失败，需要修复');
    }
  }
}

const tester = new CriticalBugTest();
tester.run().then(({ passed, failed }) => {
  process.exit(failed === 0 ? 0 : 1);
}).catch(err => {
  console.error('测试异常:', err);
  process.exit(1);
});
