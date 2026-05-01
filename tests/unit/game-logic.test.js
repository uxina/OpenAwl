/**
 * 游戏逻辑单元测试
 */

const AvalonGame = require('../../core/game-logic');

class GameLogicTest {
  constructor() {
    this.tests = [];
    this.setupTests();
  }

  setupTests() {
    this.tests = [
      { name: '创建游戏', fn: this.testCreateGame },
      { name: '添加玩家', fn: this.testAddPlayer },
      { name: '开始游戏', fn: this.testStartGame },
      { name: '角色分配', fn: this.testRoleAssignment },
      { name: '组队', fn: this.testTeamBuilding },
      { name: '投票', fn: this.testVoting },
      { name: '任务执行', fn: this.testMission },
    ];
  }

  run() {
    console.log('  游戏逻辑测试\n');
    let passed = 0;
    let failed = 0;

    for (const test of this.tests) {
      try {
        test.fn.call(this);
        console.log(`    ✅ ${test.name}`);
        passed++;
      } catch (error) {
        console.error(`    ❌ ${test.name}: ${error.message}`);
        failed++;
      }
    }

    console.log(`\n    结果: ${passed}通过, ${failed}失败\n`);
    return { passed, failed };
  }

  testCreateGame() {
    const game = new AvalonGame('1234');
    if (game.roomId !== '1234') throw new Error('房间号不匹配');
    if (game.gamePhase !== 'waiting') throw new Error('初始阶段错误');
  }

  testAddPlayer() {
    const game = new AvalonGame('1234');
    game.configuredPlayerCount = 5;
    
    const count = game.addPlayer('p1', '玩家1');
    if (count !== 1) throw new Error('玩家计数错误');
    if (game.players.length !== 1) throw new Error('玩家未添加');
  }

  testStartGame() {
    const game = new AvalonGame('1234');
    game.configuredPlayerCount = 5;
    
    // 添加5个玩家
    for (let i = 1; i <= 5; i++) {
      game.addPlayer(`p${i}`, `玩家${i}`);
    }
    
    game.startGame();
    if (game.gamePhase !== 'role-confirm') throw new Error('游戏阶段未变更');
    if (game.players[0].role === null) throw new Error('角色未分配');
  }

  testRoleAssignment() {
    const game = new AvalonGame('1234');
    game.configuredPlayerCount = 5;
    
    for (let i = 1; i <= 5; i++) {
      game.addPlayer(`p${i}`, `玩家${i}`);
    }
    
    game.startGame();
    
    // 检查角色分配
    const roles = game.players.map(p => p.role);
    const requiredRoles = ['merlin', 'percival', 'servant', 'morgana', 'assassin'];
    
    for (const role of requiredRoles) {
      if (!roles.includes(role)) {
        throw new Error(`缺少角色: ${role}`);
      }
    }
  }

  testTeamBuilding() {
    const game = new AvalonGame('1234');
    game.configuredPlayerCount = 5;
    
    for (let i = 1; i <= 5; i++) {
      game.addPlayer(`p${i}`, `玩家${i}`);
    }
    
    game.startGame();
    game.gamePhase = 'team-building';
    game.currentLeaderIndex = 0;
    game.players[0].isLeader = true;
    
    // 组建队伍
    game.selectTeam('p1', ['p1', 'p2']);
    if (game.gamePhase !== 'voting') throw new Error('阶段未变更');
    if (game.currentTeam.length !== 2) throw new Error('队伍人数错误');
  }

  testVoting() {
    const game = new AvalonGame('1234');
    game.configuredPlayerCount = 5;
    
    for (let i = 1; i <= 5; i++) {
      game.addPlayer(`p${i}`, `玩家${i}`);
    }
    
    game.startGame();
    game.gamePhase = 'voting';
    game.currentTeam = ['p1', 'p2'];
    
    // 投票 - 需要5个人都投票
    game.vote('p1', 'approve');
    game.vote('p2', 'approve');
    game.vote('p3', 'approve');
    game.vote('p4', 'reject');
    const result = game.vote('p5', 'reject'); // 第5个人投票
    
    if (!result.completed) throw new Error('投票未完成');
    // 3票赞成，2票反对，应该通过
    if (!result.passed) throw new Error('投票应通过');
  }

  testMission() {
    const game = new AvalonGame('1234');
    game.configuredPlayerCount = 5;
    
    for (let i = 1; i <= 5; i++) {
      game.addPlayer(`p${i}`, `玩家${i}`);
    }
    
    game.startGame();
    game.gamePhase = 'mission';
    game.currentTeam = ['p1', 'p2'];
    game.currentRound = 1;
    
    // 执行任务
    game.executeMission('p1', 'success');
    const result = game.executeMission('p2', 'success');
    
    if (!result.completed) throw new Error('任务未完成');
    if (result.missionResult.result !== 'success') throw new Error('任务应成功');
  }
}

// 运行测试
const test = new GameLogicTest();
test.run();
