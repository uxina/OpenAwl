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

  /**
   * 获取安全的玩家数量用于任务配置计算
   * 优先使用 configuredPlayerCount，确保任务配置的一致性
   */
  getPlayerCountForMission() {
    const count = this.configuredPlayerCount || this.players.length;
    // 确保在有效范围内（5-10）
    return Math.max(5, Math.min(10, count));
  }

  /**
   * 安全获取当前轮次的任务配置
   * @param {number} round - 轮次（1-5）
   * @returns {number} 需要的队员数量
   */
  getRequiredTeamSizeForRound(round) {
    const playerCount = this.getPlayerCountForMission();
    const missionConfig = AvalonGame.getMissionConfig(playerCount);
    
    if (!missionConfig || missionConfig.length === 0) {
      throw new Error(`不支持的玩家数量: ${playerCount}，仅支持 5-10 人游戏`);
    }
    
    const requiredSize = missionConfig[round - 1];
    if (requiredSize === undefined) {
      throw new Error(`无效的轮次: ${round}，有效范围 1-5`);
    }
    
    return requiredSize;
  }

  /**
   * 获取当前队长的玩家对象
   * @returns {Object|null} 队长玩家对象，如果没有队长则返回 null
   */
  getCurrentLeader() {
    if (this.currentLeaderIndex < 0 || this.currentLeaderIndex >= this.players.length) {
      return null;
    }
    return this.players[this.currentLeaderIndex];
  }

  /**
   * 游戏状态守卫方法：确保关键状态变量已正确初始化
   * 在关键操作（组队、投票、任务执行）前调用
   * @throws {Error} 如果游戏状态未就绪
   */
  ensureGameStateReady() {
    // 确保 currentRound 有效
    if (this.currentRound < 1) {
      this.currentRound = 1;
    }

    // 确保 configuredPlayerCount 有效
    if (!this.configuredPlayerCount || this.configuredPlayerCount < 5) {
      this.configuredPlayerCount = Math.max(5, this.players.length);
    }

    // 确保 currentLeaderIndex 有效
    if (this.currentLeaderIndex < 0 || this.currentLeaderIndex >= this.players.length) {
      this.currentLeaderIndex = 0;
    }
  }

  /**
   * 阶段转换验证方法：确保阶段转换是合法的
   * 防止无效状态转换导致前端显示异常
   * @param {string} newPhase - 目标阶段
   * @returns {boolean} 是否允许转换
   */
  validatePhaseTransition(newPhase) {
    const validTransitions = {
      'waiting': ['opening'],
      'opening': ['role-confirm'],
      'role-confirm': ['night'],
      'night': ['day'],
      'day': ['team-building'],
      'team-building': ['voting'],
      'voting': ['mission', 'team-building'], // 投票通过到mission，拒绝回到team-building
      'mission': ['team-building', 'assassination'],
      'assassination': ['ended'],
      'ended': []
    };

    const allowed = validTransitions[this.gamePhase] || [];
    return allowed.includes(newPhase);
  }

  assignRoles() {
    const roles = AvalonGame.getRoleConfig(this.getPlayerCountForMission());
    const shuffledRoles = [...roles].sort(() => Math.random() - 0.5);

    this.players.forEach((player, index) => {
      if (shuffledRoles[index]) {
        player.role = shuffledRoles[index];
        player.side = ['merlin', 'percival', 'servant'].includes(shuffledRoles[index]) ? 'good' : 'evil';
      }
    });

    // 注意：队长选择在startGame()中已完成，这里不再重复选择
    console.log(`[assignRoles] 角色已分配，队长: ${this.players[this.currentLeaderIndex]?.name || '未知'}`);
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

    // 使用安全的玩家数量分配角色
    const roles = this.shuffle(AvalonGame.getRoleConfig(this.getPlayerCountForMission()));
    this.players.forEach((player, index) => {
      player.role = roles[index];
      player.side = ['merlin', 'percival', 'servant'].includes(player.role) ? 'good' : 'evil';
    });

    // 随机选择一个玩家作为初始队长（按编号顺序的随机选择）
    if (this.players.length > 0) {
      const sortedPlayers = this.getSortedPlayers();
      const randomIndex = Math.floor(Math.random() * sortedPlayers.length);
      const selectedPlayer = sortedPlayers[randomIndex];
      this.currentLeaderIndex = this.players.findIndex(p => p.id === selectedPlayer.id);
      this.players.forEach(p => {
        p.isLeader = (p.id === selectedPlayer.id);
      });
      console.log(`[startGame] 随机选择初始队长: ${selectedPlayer.name} (编号 ${selectedPlayer.playerNumber})`);
    }

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
        // 注意：如果角色已经分配（通过assignRolesIfFull），则不再重新分配
        // 这样可以避免角色被重复分配导致不同步
        const hasAssignedRoles = this.players.some(p => p.role);
        if (!hasAssignedRoles) {
          this.assignRoles();
        }
      } else if (this.gamePhase === 'night') {
        // 夜间阶段开始
      } else if (this.gamePhase === 'day') {
        // 白天阶段开始
      } else if (this.gamePhase === 'team-building') {
        // 组队阶段 - 不需要额外处理
        // 队长轮换在 completeTeamVote() 和 executeMission() 中处理
      } else if (this.gamePhase === 'discussion') {
        // 讨论阶段开始
      } else if (this.gamePhase === 'mission') {
        this.missionVotes = {};
      }
    }

    return this.getGameState();
  }

  // ===== 队长与组队 =====

  /**
   * 获取按playerNumber排序的玩家列表
   * @returns {Array} 排序后的玩家列表
   */
  getSortedPlayers() {
    return [...this.players].sort((a, b) => {
      const numA = a.playerNumber || 999;
      const numB = b.playerNumber || 999;
      return numA - numB;
    });
  }

  /**
   * 获取按playerNumber排序的队长索引
   * @returns {number} 队长在sortedPlayers中的索引
   */
  getCurrentLeaderIndexInSorted() {
    const sortedPlayers = this.getSortedPlayers();
    const currentLeader = this.players[this.currentLeaderIndex];
    if (!currentLeader) return 0;
    const index = sortedPlayers.findIndex(p => p.id === currentLeader.id);
    return index >= 0 ? index : 0;
  }

  selectNextLeader() {
    const sortedPlayers = this.getSortedPlayers();
    const currentSortedIndex = this.getCurrentLeaderIndexInSorted();
    const nextSortedIndex = (currentSortedIndex + 1) % sortedPlayers.length;
    const nextLeader = sortedPlayers[nextSortedIndex];
    
    // 更新currentLeaderIndex为原始players数组中的索引
    this.currentLeaderIndex = this.players.findIndex(p => p.id === nextLeader.id);
    
    this.players.forEach(p => {
      p.isLeader = (p.id === nextLeader.id);
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

    // 确保游戏状态就绪（统一使用状态守卫方法）
    this.ensureGameStateReady();

    // 使用安全的方法获取需要的队员数量
    const requiredSize = this.getRequiredTeamSizeForRound(this.currentRound);
    
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
    
    // 验证阶段转换
    if (!this.validatePhaseTransition('voting')) {
      throw new Error(`无效的阶段转换: ${this.gamePhase} -> voting`);
    }
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
        votedCount: voteCount,
        voted: voteCount,
        totalCount: totalPlayers,
        total: totalPlayers
      };
    }

    // 计算投票结果
    const approveCount = Object.values(this.teamVotes).filter(v => v === 'approve').length;
    const rejectCount = Object.values(this.teamVotes).filter(v => v === 'reject').length;
    const passed = approveCount > rejectCount;

    if (passed) {
      if (!this.validatePhaseTransition('mission')) {
        throw new Error(`无效的阶段转换: ${this.gamePhase} -> mission`);
      }
      this.gamePhase = 'mission';
      this.failedTeamVotes = 0;
      this.missionVotes = {};
    } else {
      this.failedTeamVotes++;
      
      // 检查连续失败次数
      if (this.failedTeamVotes >= 5) {
        this.gameWinner = 'evil';
        // 验证阶段转换
        if (!this.validatePhaseTransition('ended')) {
          throw new Error(`无效的阶段转换: ${this.gamePhase} -> ended`);
        }
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
      // 验证阶段转换
      if (!this.validatePhaseTransition('team-building')) {
        throw new Error(`无效的阶段转换: ${this.gamePhase} -> team-building`);
      }
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
    
    // 第4轮特殊规则：7人及以上局需要2张失败才失败，5人局第4轮仅需1张失败即判定失败
    let missionFailed;
    if (this.currentRound === 4 && this.players.length >= 7) {
      missionFailed = failCount >= 2;
    } else {
      missionFailed = failCount >= 1;
    }

    // 从teamVotes构建赞成/反对玩家名单
    const teamVotes = { ...this.teamVotes };
    let approvePlayers = [];
    let rejectPlayers = [];
    
    Object.entries(teamVotes).forEach(([playerId, vote]) => {
      const player = this.players.find(p => p.id === playerId);
      const playerName = player ? player.name : playerId;
      if (vote === 'approve') {
        approvePlayers.push(playerName);
      } else if (vote === 'reject') {
        rejectPlayers.push(playerName);
      }
    });

    // 获取队员名单
    const teamMembers = this.currentTeam.map(id => {
      const player = this.players.find(p => p.id === id);
      return player ? player.name : id;
    });

    const missionResult = {
      round: this.currentRound,
      result: missionFailed ? 'fail' : 'success',
      failCount,
      successCount: voteCount - failCount,
      teamVotes: teamVotes,
      teamLeader: this.getCurrentLeader()?.name || null,
      teamMembers: teamMembers,
      teamSize: this.currentTeam.length,
      // 组队投票详情
      approvePlayers: approvePlayers,
      rejectPlayers: rejectPlayers,
      approveCount: approvePlayers.length,
      rejectCount: rejectPlayers.length
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
      // 任务未达成3胜或3败，进入下一轮
      this.selectNextLeader(); // 先旋转队长
      this.currentRound++;
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
    // 确保游戏状态就绪
    this.ensureGameStateReady();
    
    const currentLeader = this.getCurrentLeader();
    // 使用安全的方法获取当前轮次需要的队伍人数
    const currentMissionSize = this.getRequiredTeamSizeForRound(this.currentRound);
    
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
      currentLeaderName: currentLeader?.name || null,
      // 将 currentTeam ID 数组映射为玩家对象数组，方便前端显示
      currentTeam: this.currentTeam.map(id => {
        const player = this.players.find(p => p.id === id);
        return player ? { id: player.id, name: player.name, role: player.role, side: player.side } : { id, name: '未知玩家' };
      }),
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
