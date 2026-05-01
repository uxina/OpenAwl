/**
 * Handlers 单元测试
 * 测试所有 handler 函数的基本功能
 */

const handlers = require('../../core/handlers');
const { ClientToServer, ServerToClient } = require('../../core/config/socket-events');

class HandlersTest {
  constructor() {
    this.passed = 0;
    this.failed = 0;
    this.results = [];
  }

  log(msg, type = 'info') {
    const prefix = type === 'pass' ? '✅' : type === 'fail' ? '❌' : '  ';
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
    console.log('\n📦 Handlers 单元测试\n');
    console.log('='.repeat(50));

    await this.testHandlersExistence();
    await this.testRoomHandlers();
    await this.testPlayerHandlers();
    await this.testMissionHandlers();
    await this.testSystemHandlers();

    this.printSummary();
    return this.results;
  }

  async testHandlersExistence() {
    console.log('\n🔍 Handler 函数存在性检查\n');

    this.assert(
      typeof handlers.handleCreateRoom === 'function',
      'handleCreateRoom 存在'
    );
    this.assert(
      typeof handlers.handleGetRoomStatus === 'function',
      'handleGetRoomStatus 存在'
    );
    this.assert(
      typeof handlers.handlePlayerJoin === 'function',
      'handlePlayerJoin 存在'
    );
    this.assert(
      typeof handlers.handlePlayerRejoin === 'function',
      'handlePlayerRejoin 存在'
    );
    this.assert(
      typeof handlers.handlePlayerReconnect === 'function',
      'handlePlayerReconnect 存在'
    );
    this.assert(
      typeof handlers.handleConfirmRole === 'function',
      'handleConfirmRole 存在'
    );
    this.assert(
      typeof handlers.handlePreviousPhase === 'function',
      'handlePreviousPhase 存在'
    );
    this.assert(
      typeof handlers.handleMissionCompletedAutoAdvance === 'function',
      'handleMissionCompletedAutoAdvance 存在'
    );
    this.assert(
      typeof handlers.handleExecuteMission === 'function',
      'handleExecuteMission 存在'
    );
    this.assert(
      typeof handlers.handleAssassinate === 'function',
      'handleAssassinate 存在'
    );
    this.assert(
      typeof handlers.handleResetGame === 'function',
      'handleResetGame 存在'
    );
    this.assert(
      typeof handlers.handleRequestGameState === 'function',
      'handleRequestGameState 存在'
    );
    this.assert(
      typeof handlers.handleDisconnect === 'function',
      'handleDisconnect 存在'
    );
  }

  async testRoomHandlers() {
    console.log('\n🏠 Room Handlers 测试\n');

    const mockSocket = {
      id: 'test-socket-id',
      emit: () => {},
      join: () => {}
    };

    const mockIo = {
      to: () => ({ emit: () => {} })
    };

    const mockData = {
      playerName: '测试玩家',
      configuredPlayerCount: 5
    };

    let callbackCalled = false;
    let callbackResult = null;

    const callback = (result) => {
      callbackCalled = true;
      callbackResult = result;
    };

    try {
      handlers.handleCreateRoom(mockSocket, mockIo, mockData, callback);
      this.assert(callbackCalled, 'handleCreateRoom 调用 callback');
      this.assert(
        callbackResult && callbackResult.success === true,
        'handleCreateRoom 返回成功'
      );
      this.assert(
        callbackResult && callbackResult.roomId,
        'handleCreateRoom 返回 roomId'
      );
    } catch (e) {
      this.log(`handleCreateRoom 异常: ${e.message}`, 'fail');
      this.failed++;
    }
  }

  async testPlayerHandlers() {
    console.log('\n👥 Player Handlers 测试\n');

    const mockSocket = {
      id: 'test-player-socket',
      playerId: null,
      roomId: null,
      emit: () => {},
      join: () => {}
    };

    const mockIo = {
      to: () => ({ emit: () => {} })
    };

    this.log('handlePlayerJoin 需要先创建房间', 'info');
  }

  async testMissionHandlers() {
    console.log('\n🎯 Mission Handlers 测试\n');

    const mockSocket = {
      id: 'test-socket',
      playerId: 'player-1',
      roomId: 'room-1',
      emit: () => {},
      join: () => {}
    };

    const mockIo = {
      to: () => ({ emit: () => {} })
    };

    this.log('Mission handlers 需要完整的游戏上下文', 'info');
  }

  async testSystemHandlers() {
    console.log('\n⚙️ System Handlers 测试\n');

    const mockSocket = {
      id: 'test-socket-disconnect',
      playerId: null,
      roomId: null,
      emit: () => {},
      join: () => {}
    };

    const mockIo = {
      to: () => ({ emit: () => {} })
    };

    try {
      handlers.handleDisconnect(mockSocket, mockIo);
      this.assert(true, 'handleDisconnect 可执行（无错误）');
    } catch (e) {
      this.log(`handleDisconnect 异常: ${e.message}`, 'fail');
      this.failed++;
    }
  }

  printSummary() {
    console.log('\n' + '='.repeat(50));
    console.log('📊 Handlers 测试结果');
    console.log('='.repeat(50));
    console.log(`✅ 通过: ${this.passed}`);
    console.log(`❌ 失败: ${this.failed}`);
    console.log(`📈 总计: ${this.passed + this.failed}`);
    console.log('='.repeat(50));
  }
}

module.exports = { HandlersTest };