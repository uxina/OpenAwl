/**
 * 阿瓦隆游戏逻辑核心类
 * 负责：角色分配、游戏状态管理、规则判定
 */

class AvalonGame {
  constructor(roomId) {
    this.roomId = roomId;
    this.players = []; // { id, name, role, side, isLeader, inTeam }
    this.offlinePlayers = {};
    this.gamePhase = 'waiting'; // waiting, role-confirm, night, team-building, voting, mission, assassination, ended
    this.currentRound = 0;
    this.currentLeaderIndex = 0;
    this.currentTeam = [];
    this.teamVotes = {};
    this.missionVotes = {};
    this.failedTeamVotes = 0;
    this.missionResults = [];
    this.gameWinner = null;
    this.assassinationTarget = null;
    this.readyPlayers = new Set();
    this.configuredPlayerCount = 5;
  }

  // ===== 静态配置 =====
  
  static getRoleConfig(playerCount) {
    const configs = {
      5: ['merlin', 'percival', 'servant', 'morgana', 'assassin'],
      6: ['merlin', 'percival', 'servant', 'servant', 'morgana', 'assassin'],
      7: ['merlin', 'percival', 'servant', 'servant', 'morgana', 'assassin', 'oberon'],
      8: ['merlin', 'percival', 'servant', 'servant', 'servant', 'morgana', 'assassin', 'oberon'],
      9: ['merlin', 'percival', 'servant', 'servant', 'servant', 'servant', 'morgana', 'assassin', 'oberon'],
      10: ['merlin', 'percival', 'servant', 'servant', 'servant', 'servant', 'morgana', 'assassin', 'mordred', 'oberon']
    };
    return configs[playerCount] || [];
  }

  static getMissionConfig(playerCount) {
    const configs = {
      5: [2, 3, 2, 3, 3],
      6: [2, 3, 4, 3, 4],
      7: [2, 3, 3, 4, 4],
      8: [3, 4, 4, 5, 5],
      9: [3, 4, 4, 5, 5],
      10: [3, 4, 4, 5, 5]
    };
    return configs[playerCount] || [];
  }

  assignRoles() {
    const roles = AvalonGame.getRoleConfig(this.players.length);
    const shuffledRoles = [...roles].sort(() => Math.random() - 0.5);

    this.players.forEach((player, index) => {
      if (shuffledRoles[index]) {
        player.role = shuffledRoles[index];
        player.side = ['merlin', 'percival', 'servant'].includes(shuffledRoles[index]) ? 'good' : 'evil';
      }
    });

    // 设置第一个玩家为队长
    if (this.players.length > 0) {
      this.players[0].isLeader = true;
      this.currentLeaderIndex = 0;
    }
  }

  // ===== 玩家管理 =====

  addPlayer(playerId, playerName, playerNumber = null) {
    if (this.gamePhase !== 'waiting' && this.gamePhase !== 'opening') {
      throw new Error('游戏已开始，无法加入');
    }
    if (this.players.find(p => p.id === playerId)) {
      throw new Error('玩家已存在');
    }
    if (this.players.length >= this.configuredPlayerCount) {
      throw new Error('房间已满');
    }

    this.players.push({
      id: playerId,
      name: playerName,
      playerNumber,
      role: null,
      side: null,
      isLeader: false,
      inTeam: false
    });

    return this.players.length;
  }

  removePlayer(playerId) {
    if (this.gamePhase !== 'waiting') {
      throw new Error('游戏已开始，无法离开');
    }
    this.players = this.players.filter(p => p.id !== playerId);
  }

  // ===== 游戏流程 =====

  startGame() {
    if (this.players.length < 5) {
      throw new Error('至少需要5名玩家');
    }

    // 分配角色
    const roles = this.shuffle(AvalonGame.getRoleConfig(this.players.length));
    this.players.forEach((player, index) => {
      player.role = roles[index];
      player.side = ['merlin', 'percival', 'servant'].includes(player.role) ? 'good' : 'evil';
    });

    // 初始化游戏状态
    this.gamePhase = 'role-confirm';
    this.currentRound = 1;
    this.failedTeamVotes = 0;
    this.missionResults = [];
    this.gameWinner = null;
    this.readyPlayers.clear();

    return this.getGameState();
  }

  confirmRole(playerId) {
    this.readyPlayers.add(playerId);
    return this.readyPlayers.size === this.players.length;
  }

  nextPhase() {
    const phases = ['waiting', 'opening', 'role-confirm', 'night', 'day', 'team-building', 'discussion', 'voting', 'mission', 'assassination', 'ended'];
    const currentIndex = phases.indexOf(this.gamePhase);

    if (currentIndex < phases.length - 1) {
      const previousPhase = this.gamePhase;
      this.gamePhase = phases[currentIndex + 1];

      // 阶段特定逻辑
      if (this.gamePhase === 'role-confirm' && previousPhase === 'opening') {
        // opening → role-confirm 时分配角色
        this.assignRoles();
      } else if (this.gamePhase === 'night') {
        // 夜间阶段开始
      } else if (this.gamePhase === 'day') {
        // 白天阶段开始
      } else if (this.gamePhase === 'team-building') {
        this.selectNextLeader();
      } else if (this.gamePhase === 'discussion') {
        // 讨论阶段开始
      } else if (this.gamePhase === 'mission') {
        this.missionVotes = {};
      }
    }

    return this.getGameState();
  }

  // ===== 队长与组队 =====

  selectNextLeader() {
    this.currentLeaderIndex = (this.currentLeaderIndex + 1) % this.players.length;
    this.players.forEach(p => {
      p.isLeader = (p.id === this.players[this.currentLeaderIndex].id);
      p.inTeam = false;
    });
    this.currentTeam = [];
    this.teamVotes = {};
  }

  selectTeam(leaderId, teamIds) {
    if (this.gamePhase !== 'team-building') {
      throw new Error('当前不是组队阶段');
    }

    const leader = this.players.find(p => p.id === leaderId);
    if (!leader?.isLeader) {
      throw new Error('只有队长可以组建队伍');
    }

    const requiredSize = AvalonGame.getMissionConfig(this.players.length)[this.currentRound - 1];
    if (teamIds.length !== requiredSize) {
      throw new Error(`需要选择 ${requiredSize} 名队员`);
    }

    // 验证队员
    const invalidPlayers = teamIds.filter(id => !this.players.some(p => p.id === id));
    if (invalidPlayers.length > 0) {
      throw new Error('无效的玩家选择');
    }

    this.currentTeam = teamIds;
    this.players.forEach(p => {
      p.inTeam = teamIds.includes(p.id);
    });
    
    this.gamePhase = 'voting';
    this.teamVotes = {};
    
    return this.getGameState();
  }

  // ===== 投票 =====

  vote(playerId, vote) {
    if (this.gamePhase !== 'voting') {
      throw new Error('当前不是投票阶段');
    }
    
    // 检查玩家是否已经投过票
    if (this.teamVotes[playerId] !== undefined) {
      throw new Error('您已经投过票了');
    }

    this.teamVotes[playerId] = vote;
    
    const voteCount = Object.keys(this.teamVotes).length;
    const totalPlayers = this.players.length;
    
    // 检查是否所有人都投票了
    if (voteCount < totalPlayers) {
      return {
        completed: false,
        voted: voteCount,
        total: totalPlayers
      };
    }

    // 计算投票结果
    const approveCount = Object.values(this.teamVotes).filter(v => v === 'approve').length;
    const rejectCount = Object.values(this.teamVotes).filter(v => v === 'reject').length;
    const passed = approveCount > rejectCount;

    if (passed) {
      this.gamePhase = 'mission';
      this.failedTeamVotes = 0;
      this.missionVotes = {};
    } else {
      this.failedTeamVotes++;
      
      // 检查连续失败次数
      if (this.failedTeamVotes >= 5) {
        this.gameWinner = 'evil';
        this.gamePhase = 'ended';
        return {
          completed: true,
          passed: false,
          approveCount,
          rejectCount,
          gameEnded: true,
          winner: 'evil',
          reason: '连续5次组队失败'
        };
      }
      
      this.selectNextLeader();
      this.gamePhase = 'team-building';
    }

    return {
      completed: true,
      passed,
      approveCount,
      rejectCount,
      failedTeamVotes: this.failedTeamVotes,
      gamePhase: this.gamePhase
    };
  }

  // ===== 任务执行 =====

  executeMission(playerId, result) {
    if (this.gamePhase !== 'mission') {
      throw new Error('当前不是任务阶段');
    }

    if (!this.currentTeam.includes(playerId)) {
      throw new Error('只有队员可以执行任务');
    }

    this.missionVotes[playerId] = result;
    
    const voteCount = Object.keys(this.missionVotes).length;
    const requiredCount = this.currentTeam.length;
    
    if (voteCount < requiredCount) {
      return {
        completed: false,
        voted: voteCount,
        total: requiredCount
      };
    }

    // 计算任务结果
    const failCount = Object.values(this.missionVotes).filter(v => v === 'fail').length;
    
    // 第4轮特殊规则：7人+需要2张失败才失败
    let missionFailed;
    if (this.currentRound === 4 && this.players.length >= 7) {
      missionFailed = failCount >= 2;
    } else {
      missionFailed = failCount >= 1;
    }

    const missionResult = {
      round: this.currentRound,
      result: missionFailed ? 'fail' : 'success',
      failCount,
      successCount: voteCount - failCount
    };
    
    this.missionResults.push(missionResult);

    // 检查游戏是否结束
    const successCount = this.missionResults.filter(r => r.result === 'success').length;
    const failCountTotal = this.missionResults.filter(r => r.result === 'fail').length;

    let gameEnded = false;
    let winner = null;

    if (successCount >= 3) {
      this.gamePhase = 'assassination';
    } else if (failCountTotal >= 3) {
      this.gameWinner = 'evil';
      this.gamePhase = 'ended';
      gameEnded = true;
      winner = 'evil';
    } else {
      this.currentRound++;
      this.selectNextLeader();
      this.gamePhase = 'team-building';
    }

    return {
      completed: true,
      missionResult,
      gameEnded,
      winner,
      missionResults: this.missionResults,
      gamePhase: this.gamePhase,
      currentRound: this.currentRound,
      currentLeaderIndex: this.currentLeaderIndex,
      currentLeader: this.players[this.currentLeaderIndex]?.name || `${this.currentLeaderIndex + 1}号`,
      players: this.players
    };
  }

  // ===== 刺杀阶段 =====

  assassinate(targetId) {
    if (this.gamePhase !== 'assassination') {
      throw new Error('当前不是刺杀阶段');
    }

    const target = this.players.find(p => p.id === targetId);
    if (!target) {
      throw new Error('目标玩家不存在');
    }

    const isMerlin = target.role === 'merlin';
    
    if (isMerlin) {
      this.gameWinner = 'evil';
    } else {
      this.gameWinner = 'good';
    }
    
    this.gamePhase = 'ended';
    this.assassinationTarget = targetId;

    return {
      success: isMerlin,
      winner: this.gameWinner,
      targetRole: target.role,
      merlinId: this.players.find(p => p.role === 'merlin')?.id
    };
  }

  // ===== 视野系统 =====

  getPlayerVision(playerId) {
    const player = this.players.find(p => p.id === playerId);
    if (!player) return null;

    const vision = {
      role: player.role,
      side: player.side,
      sees: []
    };

    switch (player.role) {
      case 'merlin':
        // 梅林看到所有坏人（除了莫德雷德）
        vision.sees = this.players
          .filter(p => p.side === 'evil' && p.role !== 'mordred')
          .map(p => ({ id: p.id, name: p.name, role: 'evil' }));
        break;
        
      case 'percival':
        // 派西维尔看到梅林和莫甘娜
        vision.sees = this.players
          .filter(p => p.role === 'merlin' || p.role === 'morgana')
          .map(p => ({ id: p.id, name: p.name, role: 'merlin-or-morgana' }));
        break;
        
      case 'assassin':
      case 'morgana':
      case 'mordred':
        // 坏人看到其他坏人（除了奥伯伦）
        vision.sees = this.players
          .filter(p => p.side === 'evil' && p.id !== playerId && p.role !== 'oberon')
          .map(p => ({ id: p.id, name: p.name, role: 'evil-teammate' }));
        break;
        
      case 'oberon':
        // 奥伯伦看不到任何人
        vision.sees = [];
        break;
        
      default:
        // 忠臣无视野
        vision.sees = [];
    }

    return vision;
  }

  // ===== 工具方法 =====

  shuffle(array) {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }

  getGameState() {
    const currentLeader = this.players[this.currentLeaderIndex];
    // 计算当前轮次需要的队伍人数
    const missionConfig = AvalonGame.getMissionConfig(this.players.length);
    const currentMissionSize = this.currentRound > 0 && this.currentRound <= missionConfig.length 
      ? missionConfig[this.currentRound - 1] 
      : 2;
    
    return {
      roomId: this.roomId,
      gamePhase: this.gamePhase,
      currentRound: this.currentRound,
      currentLeaderIndex: this.currentLeaderIndex,
      // 兼容原前端：使用 leader 字段
      leader: currentLeader?.name || null,
      leaderId: currentLeader?.id || null,
      currentLeader: currentLeader?.name || null,
      currentLeaderId: currentLeader?.id || null,
      currentTeam: this.currentTeam,
      missionResults: this.missionResults,
      failedTeamVotes: this.failedTeamVotes,
      consecutiveRejections: this.failedTeamVotes, // 兼容原前端
      gameWinner: this.gameWinner,
      currentMissionSize: currentMissionSize, // 当前轮次需要的队伍人数
      players: this.players.map(p => ({
        id: p.id,
        name: p.name,
        isLeader: p.isLeader,
        inTeam: p.inTeam,
        side: p.side,
        role: p.role
      })),
      playerCount: this.configuredPlayerCount,
      currentPlayerCount: this.players.length,
      teamVotes: this.teamVotes
    };
  }

  // 兼容原前端：获取离线玩家列表
  getOfflinePlayers() {
    return Object.entries(this.offlinePlayers || {}).map(([id, data]) => ({
      playerId: id,
      ...data
    }));
  }

  reset() {
    this.gamePhase = 'waiting';
    this.players.forEach(p => {
      p.role = null;
      p.side = null;
      p.isLeader = false;
      p.inTeam = false;
    });
    this.currentRound = 0;
    this.currentLeaderIndex = 0;
    this.currentTeam = [];
    this.teamVotes = {};
    this.missionVotes = {};
    this.failedTeamVotes = 0;
    this.missionResults = [];
    this.gameWinner = null;
    this.assassinationTarget = null;
    this.readyPlayers.clear();
  }
}

module.exports = AvalonGame;
