/**
 * ============================================================================
 * E2E测试框架 (End-to-End Test Framework)
 * ============================================================================
 *
 * 本框架用于对阿瓦隆游戏服务器进行端到端测试
 * 支持多玩家模拟、阶段验证、事件监听
 *
 * 设计原则:
 * 1. 模拟真实玩家行为
 * 2. 验证阶段转换正确性
 * 3. 检查事件发送完整性
 * 4. 支持并发测试多个房间
 * ============================================================================
 */

const { io } = require('socket.io-client');

const SERVER_URL = process.env.TEST_SERVER_URL || 'http://localhost:3000';
const TEST_TIMEOUT = 30000; // 30秒超时

/**
 * 测试玩家类
 * 模拟一个真实玩家的行为
 */
class TestPlayer {
  constructor(playerName, playerNumber) {
    this.name = playerName;
    this.number = playerNumber;
    this.socket = null;
    this.playerId = null;
    this.roomId = null;
    this.role = null;
    this.side = null;
    this.events = []; // 记录收到的事件
    this.connected = false;
  }

  /**
   * 连接到服务器
   */
  async connect() {
    return new Promise((resolve, reject) => {
      this.socket = io(SERVER_URL, {
        transports: ['websocket'],
        reconnection: false,
        timeout: 10000
      });

      this.socket.on('connect', () => {
        this.connected = true;
        console.log(`[测试玩家 ${this.name}] 已连接`);
        resolve();
      });

      this.socket.on('connect_error', (error) => {
        reject(new Error(`连接失败: ${error.message}`));
      });

      // 记录所有收到的事件
      this.socket.onAny((eventName, ...args) => {
        this.events.push({
          timestamp: Date.now(),
          event: eventName,
          data: args[0]
        });
      });

      // 设置超时
      setTimeout(() => {
        if (!this.connected) {
          reject(new Error('连接超时'));
        }
      }, 10000);
    });
  }

  /**
   * 加入房间
   */
  async joinRoom(roomId) {
    return new Promise((resolve, reject) => {
      this.socket.emit('player-join', {
        roomId: roomId,
        playerName: this.name,
        playerNumber: this.number
      }, (response) => {
        if (response.success) {
          this.playerId = response.playerId;
          this.roomId = roomId;
          console.log(`[测试玩家 ${this.name}] 加入房间 ${roomId}`);
          resolve(response);
        } else {
          reject(new Error(`加入房间失败: ${response.message}`));
        }
      });

      setTimeout(() => reject(new Error('加入房间超时')), 5000);
    });
  }

  /**
   * 等待特定事件
   */
  async waitForEvent(eventName, timeout = 5000) {
    return new Promise((resolve, reject) => {
      // 检查是否已经收到过该事件
      const existingEvent = this.events.find(e => e.event === eventName);
      if (existingEvent) {
        resolve(existingEvent.data);
        return;
      }

      // 监听新事件
      const handler = (data) => {
        this.socket.off(eventName, handler);
        resolve(data);
      };

      this.socket.on(eventName, handler);

      setTimeout(() => {
        this.socket.off(eventName, handler);
        reject(new Error(`等待事件 ${eventName} 超时`));
      }, timeout);
    });
  }

  /**
   * 断开连接
   */
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.connected = false;
      console.log(`[测试玩家 ${this.name}] 已断开`);
    }
  }

  /**
   * 获取收到的事件列表
   */
  getEvents(eventName = null) {
    if (eventName) {
      return this.events.filter(e => e.event === eventName);
    }
    return this.events;
  }

  /**
   * 清空事件记录
   */
  clearEvents() {
    this.events = [];
  }
}

/**
 * 测试控制器类
 * 模拟语音面板的行为
 */
class TestController {
  constructor() {
    this.socket = null;
    this.roomId = null;
    this.events = [];
    this.connected = false;
  }

  /**
   * 连接到服务器
   */
  async connect() {
    return new Promise((resolve, reject) => {
      this.socket = io(SERVER_URL, {
        transports: ['websocket'],
        reconnection: false
      });

      this.socket.on('connect', () => {
        this.connected = true;
        console.log('[测试控制器] 已连接');
        resolve();
      });

      this.socket.on('connect_error', reject);

      this.socket.onAny((eventName, ...args) => {
        this.events.push({
          timestamp: Date.now(),
          event: eventName,
          data: args[0]
        });
      });

      setTimeout(() => {
        if (!this.connected) reject(new Error('连接超时'));
      }, 10000);
    });
  }

  /**
   * 创建房间
   */
  async createRoom(playerCount = 5) {
    return new Promise((resolve, reject) => {
      this.socket.emit('create-room', {
        playerCount: playerCount
      }, (response) => {
        if (response.success) {
          this.roomId = response.roomId;
          console.log(`[测试控制器] 创建房间 ${this.roomId}`);
          resolve(response);
        } else {
          reject(new Error(`创建房间失败: ${response.message}`));
        }
      });

      setTimeout(() => reject(new Error('创建房间超时')), 5000);
    });
  }

  /**
   * 开始游戏
   */
  async startGame() {
    return new Promise((resolve, reject) => {
      this.socket.emit('start-game', {
        roomId: this.roomId
      }, (response) => {
        if (response.success) {
          console.log(`[测试控制器] 开始游戏`);
          resolve(response);
        } else {
          reject(new Error(`开始游戏失败: ${response.message}`));
        }
      });

      setTimeout(() => reject(new Error('开始游戏超时')), 5000);
    });
  }

  /**
   * 推进到下一阶段
   */
  async nextPhase() {
    return new Promise((resolve, reject) => {
      this.socket.emit('next-phase', {
        roomId: this.roomId
      }, (response) => {
        if (response.success) {
          console.log(`[测试控制器] 推进到下一阶段: ${response.gameState?.gamePhase}`);
          resolve(response);
        } else {
          reject(new Error(`推进阶段失败: ${response.message}`));
        }
      });

      setTimeout(() => reject(new Error('推进阶段超时')), 5000);
    });
  }

  /**
   * 等待特定事件
   */
  async waitForEvent(eventName, timeout = 5000) {
    return new Promise((resolve, reject) => {
      const existingEvent = this.events.find(e => e.event === eventName);
      if (existingEvent) {
        resolve(existingEvent.data);
        return;
      }

      const handler = (data) => {
        this.socket.off(eventName, handler);
        resolve(data);
      };

      this.socket.on(eventName, handler);

      setTimeout(() => {
        this.socket.off(eventName, handler);
        reject(new Error(`等待事件 ${eventName} 超时`));
      }, timeout);
    });
  }

  /**
   * 断开连接
   */
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.connected = false;
      console.log('[测试控制器] 已断开');
    }
  }

  /**
   * 获取收到的事件列表
   */
  getEvents(eventName = null) {
    if (eventName) {
      return this.events.filter(e => e.event === eventName);
    }
    return this.events;
  }
}

/**
 * 测试套件基类
 */
class TestSuite {
  constructor(name) {
    this.name = name;
    this.tests = [];
    this.results = [];
  }

  /**
   * 添加测试用例
   */
  addTest(testName, testFn) {
    this.tests.push({ name: testName, fn: testFn });
  }

  /**
   * 运行所有测试
   */
  async runAll() {
    console.log(`\n========== 测试套件: ${this.name} ==========\n`);

    for (const test of this.tests) {
      const result = await this.runTest(test);
      this.results.push(result);
    }

    this.printSummary();
    return this.results;
  }

  /**
   * 运行单个测试
   */
  async runTest(test) {
    console.log(`[测试] ${test.name} ...`);
    const startTime = Date.now();

    try {
      await test.fn();
      const duration = Date.now() - startTime;
      console.log(`  ✅ 通过 (${duration}ms)\n`);
      return { name: test.name, status: 'PASSED', duration };
    } catch (error) {
      const duration = Date.now() - startTime;
      console.log(`  ❌ 失败: ${error.message} (${duration}ms)\n`);
      return { name: test.name, status: 'FAILED', error: error.message, duration };
    }
  }

  /**
   * 打印测试摘要
   */
  printSummary() {
    const passed = this.results.filter(r => r.status === 'PASSED').length;
    const failed = this.results.filter(r => r.status === 'FAILED').length;
    const total = this.results.length;

    console.log(`========== 测试结果 ==========`);
    console.log(`总计: ${total} | 通过: ${passed} | 失败: ${failed}`);
    console.log(`==============================\n`);
  }
}

/**
 * 断言函数
 */
const assert = {
  equal(actual, expected, message) {
    if (actual !== expected) {
      throw new Error(message || `断言失败: 期望 ${expected}, 实际 ${actual}`);
    }
  },

  notEqual(actual, expected, message) {
    if (actual === expected) {
      throw new Error(message || `断言失败: 不期望 ${expected}`);
    }
  },

  true(value, message) {
    if (value !== true) {
      throw new Error(message || `断言失败: 期望 true, 实际 ${value}`);
    }
  },

  false(value, message) {
    if (value !== false) {
      throw new Error(message || `断言失败: 期望 false, 实际 ${value}`);
    }
  },

  exists(value, message) {
    if (value == null) {
      throw new Error(message || `断言失败: 值不存在`);
    }
  },

  includes(array, item, message) {
    if (!array.includes(item)) {
      throw new Error(message || `断言失败: ${item} 不在数组中`);
    }
  }
};

module.exports = {
  TestPlayer,
  TestController,
  TestSuite,
  assert,
  SERVER_URL,
  TEST_TIMEOUT
};
