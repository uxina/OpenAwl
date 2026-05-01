/**
 * ============================================================================
 * 游戏阶段路由配置 (Phase Route Configuration)
 * ============================================================================
 *
 * 本配置文件用于替代 server.js 中复杂的 if-else 嵌套逻辑
 * 采用"配置即代码"的思想，将阶段转换逻辑声明化
 *
 * 设计原则:
 * 1. 单一职责: 每个阶段只处理自己的逻辑
 * 2. 开闭原则: 新增阶段只需添加配置，无需修改核心代码
 * 3. 可测试性: 纯配置对象，易于单元测试
 *
 * 使用方式:
 *   const phaseRoutes = require('./config/phaseRoutes');
 *   const handler = phaseRoutes[gamePhase];
 *   if (handler) handler(game, roomId, services);
 * ============================================================================
 */

/**
 * 阿瓦隆游戏完整阶段流程:
 *
 * 1. waiting      - 等待阶段 (房间创建后，等待玩家加入)
 * 2. opening      - 开始阶段 (人数已满，等待语音面板开始游戏)
 * 3. role-confirm - 角色分配阶段 (分配角色，玩家确认身份)
 * 4. night        - 夜间阶段 (邪恶阵营互相确认)
 * 5. day          - 白天阶段 (公开讨论)
 * 6. team-building- 组队阶段 (队长选择任务队伍)
 * 7. discussion   - 讨论阶段 (玩家讨论队伍配置)
 * 8. voting       - 投票阶段 (对队伍进行投票)
 * 9. mission      - 任务阶段 (队伍成员执行任务)
 * 10. assassination- 刺杀阶段 (坏人3轮胜利后，刺客刺杀梅林)
 * 11. settlement  - 结算阶段 (计算最终胜负)
 * 12. ended       - 结束阶段 (游戏结束，展示结果)
 *
 * @typedef {Object} PhaseConfig
 * @property {Function} onEnter - 进入阶段时的回调函数 (game, roomId, services) => void
 * @property {Function} [onLeave] - 离开阶段时的回调函数 (可选)
 * @property {string} [description] - 阶段描述
 * @property {string} [displayName] - 显示名称
 */

const phaseRoutes = {

  // ============================================================================
  // 阶段 1: waiting (等待阶段)
  // ============================================================================
  // 触发时机: 房间创建后，等待玩家加入
  // 核心逻辑:
  //   1. 等待玩家加入房间
  //   2. 实时更新房间人数
  //   3. 达到配置人数后自动进入 opening 阶段
  // ============================================================================
  'waiting': {
    displayName: '等待玩家',
    description: '房间创建后，等待玩家加入',
    onEnter(game, roomId, { roomService }) {
      console.log(`[阶段路由] 进入 waiting 阶段，等待玩家加入`);

      roomService.broadcastToRoom(roomId, 'waiting-players', {
        message: '等待玩家加入',
        currentPlayers: game.players.length,
        requiredPlayers: game.configuredPlayerCount,
        gamePhase: game.gamePhase
      });
    }
  },

  // ============================================================================
  // 阶段 2: opening (开始阶段)
  // ============================================================================
  // 触发时机: 人数已满，等待语音面板开始游戏
  // 核心逻辑:
  //   1. 通知语音面板人数已满
  //   2. 等待语音面板点击"开始游戏"
  //   3. 点击后进入 role-confirm 阶段
  // ============================================================================
  'opening': {
    displayName: '准备开始',
    description: '人数已满，等待语音面板开始游戏',
    onEnter(game, roomId, { roomService }) {
      console.log(`[阶段路由] 进入 opening 阶段，等待语音面板开始游戏`);

      // 通知语音面板游戏已准备好
      roomService.notifyController(roomId, 'game-ready', {
        message: '玩家已满，可以开始游戏',
        playerCount: game.players.length,
        configuredCount: game.configuredPlayerCount,
        gamePhase: game.gamePhase
      });

      // 广播给所有玩家
      roomService.broadcastToRoom(roomId, 'game-ready', {
        message: '游戏即将开始，请做好准备',
        playerCount: game.players.length,
        gamePhase: game.gamePhase
      });
    }
  },

  // ============================================================================
  // 阶段 3: role-confirm (角色分配阶段)
  // ============================================================================
  // 触发时机: 语音面板点击"下一阶段"从 opening 进入
  // 核心逻辑:
  //   1. 向语音面板广播所有玩家角色信息 (controller-roles-assigned)
  //   2. 向每个玩家单独发送自己的角色 (role-assigned)
  //   3. 如果是队长，额外发送队长通知 (you-are-leader)
  // ============================================================================
  'role-confirm': {
    displayName: '角色确认',
    description: '分配角色，玩家确认身份',
    onEnter(game, roomId, { roomService, playerService, gameService }) {
      console.log(`[阶段路由] 进入 role-confirm 阶段，广播角色分配`);

      // 1. 给语音面板发送所有角色信息
      roomService.notifyController(roomId, 'controller-roles-assigned', {
        players: game.players.map(p => ({
          id: p.id,
          name: p.name,
          role: p.role,
          side: p.side
        })),
        gamePhase: game.gamePhase,
        currentRound: game.currentRound,
        currentLeaderIndex: game.currentLeaderIndex
      });

      // 2. 给每个玩家发送自己的角色
      game.players.forEach(player => {
        playerService.emitToPlayer(player.id, 'role-assigned', {
          role: player.role,
          side: player.side,
          vision: game.getPlayerVision(player.id)
        });

        // 3. 如果是队长，发送队长通知
        if (player.isLeader) {
          const socket = playerService.getPlayerSocket(player.id);
          if (socket) {
            gameService.sendLeaderNotification(game, socket, player);
          }
        }
      });
    }
  },

  // ============================================================================
  // 阶段 4: night (夜间阶段)
  // ============================================================================
  // 触发时机: 角色确认完成后进入
  // 核心逻辑:
  //   1. 邪恶阵营玩家互相确认身份
  //   2. 莫甘娜和刺客知道彼此身份
  //   3. 莫德雷德（如果有）也加入邪恶阵营确认
  // ============================================================================
  'night': {
    displayName: '夜间阶段',
    description: '邪恶阵营互相确认身份',
    onEnter(game, roomId, { roomService, playerService }) {
      console.log(`[阶段路由] 进入 night 阶段，邪恶阵营确认身份`);

      // 获取邪恶阵营玩家（不包括奥伯伦）
      const evilPlayers = game.players.filter(p =>
        p.side === 'evil' && p.role !== 'oberon'
      );

      // 获取奥伯伦（他不知道其他坏人）
      const oberon = game.players.find(p => p.role === 'oberon');

      // 向每个邪恶阵营玩家（除奥伯伦外）发送同伴信息
      evilPlayers.forEach(player => {
        const teammates = evilPlayers
          .filter(p => p.id !== player.id)
          .map(p => ({ id: p.id, name: p.name, role: p.role }));

        playerService.emitToPlayer(player.id, 'night-vision', {
          message: '你的邪恶阵营同伴',
          teammates: teammates,
          note: oberon ? '注意：奥伯伦是隐藏的坏人，你不知道他的身份' : null
        });
      });

      // 向梅林发送坏人信息（莫德雷德除外）
      const merlin = game.players.find(p => p.role === 'merlin');
      if (merlin) {
        const evilForMerlin = game.players
          .filter(p => p.side === 'evil' && p.role !== 'mordred')
          .map(p => ({ id: p.id, name: p.name }));

        playerService.emitToPlayer(merlin.id, 'night-vision', {
          message: '你感知到的邪恶势力',
          evilPlayers: evilForMerlin,
          note: '莫德雷德的力量太强，你无法感知到他'
        });
      }

      // 向派西维尔发送梅林和莫甘娜信息
      const percival = game.players.find(p => p.role === 'percival');
      if (percival) {
        const merlinAndMorgana = game.players
          .filter(p => p.role === 'merlin' || p.role === 'morgana')
          .map(p => ({ id: p.id, name: p.name }));

        playerService.emitToPlayer(percival.id, 'night-vision', {
          message: '梅林和莫甘娜的魔力在你眼前显现',
          candidates: merlinAndMorgana,
          note: '其中一人是梅林（好人），一人是莫甘娜（坏人）'
        });
      }

      // 广播夜间阶段开始
      roomService.broadcastToRoom(roomId, 'night-started', {
        message: '夜幕降临，邪恶势力正在暗中集结...',
        gamePhase: game.gamePhase
      });
    }
  },

  // ============================================================================
  // 阶段 5: day (白天阶段)
  // ============================================================================
  // 触发时机: 夜间阶段结束后进入
  // 核心逻辑:
  //   1. 公开讨论阶段开始
  //   2. 玩家可以自由发言讨论
  //   3. 为组队做准备
  // ============================================================================
  'day': {
    displayName: '白天阶段',
    description: '公开讨论阶段',
    onEnter(game, roomId, { roomService }) {
      console.log(`[阶段路由] 进入 day 阶段，公开讨论开始`);

      roomService.broadcastToRoom(roomId, 'day-started', {
        message: '天亮了，大家请开始讨论',
        round: game.currentRound,
        gamePhase: game.gamePhase,
        discussionTime: 180 // 建议讨论时间3分钟
      });
    }
  },

  // ============================================================================
  // 阶段 6: team-building (组队阶段)
  // ============================================================================
  // 触发时机: 白天讨论后，或任务投票失败后
  // 核心逻辑:
  //   1. 当前队长选择任务队伍
  //   2. 向队长发送组队通知
  //   3. 广播当前队长信息
  // ============================================================================
  'team-building': {
    displayName: '组队阶段',
    description: '队长选择任务队伍',
    onEnter(game, roomId, { roomService, playerService, gameService }) {
      console.log(`[阶段路由] 进入 team-building 阶段，通知新队长`);

      const currentLeader = game.players[game.currentLeaderIndex];
      if (currentLeader) {
        const { getRequiredTeamSize } = require('../utils/helpers');
        const requiredTeamSize = getRequiredTeamSize(game.currentRound, game.players.length);

        // 向队长发送组队通知
        const leaderSocket = playerService.getPlayerSocket(currentLeader.id);
        if (leaderSocket) {
          leaderSocket.emit('you-are-leader', {
            round: game.currentRound,
            requiredTeamSize: requiredTeamSize,
            currentLeaderIndex: game.currentLeaderIndex,
            currentLeaderName: currentLeader.name,
            message: `你是本轮队长，请选择 ${requiredTeamSize} 名队员执行任务`
          });
          console.log(`[阶段路由] 通知新队长: ${currentLeader.name}`);
        }

        // 广播队长信息给所有玩家
        roomService.broadcastToRoom(roomId, 'leader-changed', {
          leaderId: currentLeader.id,
          leaderName: currentLeader.name,
          leaderIndex: game.currentLeaderIndex,
          round: game.currentRound,
          requiredTeamSize: requiredTeamSize,
          message: `${currentLeader.name} 是本轮队长，正在选择队员...`
        });
      }
    }
  },

  // ============================================================================
  // 阶段 7: discussion (讨论阶段)
  // ============================================================================
  // 触发时机: 队长提交队伍后，投票前
  // 核心逻辑:
  //   1. 广播队伍配置
  //   2. 玩家讨论队伍是否合理
  //   3. 准备进入投票
  // ============================================================================
  'discussion': {
    displayName: '讨论阶段',
    description: '玩家讨论队伍配置',
    onEnter(game, roomId, { roomService }) {
      console.log(`[阶段路由] 进入 discussion 阶段，讨论队伍配置`);

      const teamMembers = game.currentTeam.map(id => {
        const player = game.players.find(p => p.id === id);
        return player ? { id: player.id, name: player.name } : null;
      }).filter(Boolean);

      roomService.broadcastToRoom(roomId, 'team-proposed', {
        message: '队长已提出队伍配置，请大家讨论',
        teamMembers: teamMembers,
        discussionTime: 60, // 建议讨论时间1分钟
        gamePhase: game.gamePhase
      });
    }
  },

  // ============================================================================
  // 阶段 8: voting (投票阶段)
  // ============================================================================
  // 触发时机: 讨论阶段结束后
  // 核心逻辑:
  //   1. 所有玩家对队伍进行投票（同意/反对）
  //   2. 收集投票结果
  //   3. 根据结果决定进入任务阶段或重新组队
  // ============================================================================
  'voting': {
    displayName: '投票阶段',
    description: '对队伍进行投票',
    onEnter(game, roomId, { roomService }) {
      console.log(`[阶段路由] 进入 voting 阶段，开始投票`);

      const teamMembers = game.currentTeam.map(id => {
        const player = game.players.find(p => p.id === id);
        return player ? { id: player.id, name: player.name } : null;
      }).filter(Boolean);

      // 广播投票开始
      roomService.broadcastToRoom(roomId, 'voting-started', {
        message: '请对当前队伍进行投票',
        teamMembers: teamMembers,
        votingTime: 30, // 投票时间30秒
        gamePhase: game.gamePhase
      });
    }
  },

  // ============================================================================
  // 阶段 9: mission (任务阶段)
  // ============================================================================
  // 触发时机: 队伍投票通过后
  // 核心逻辑:
  //   1. 队伍成员执行任务（成功/失败）
  //   2. 收集任务结果
  //   3. 判断任务成败
  // ============================================================================
  'mission': {
    displayName: '任务阶段',
    description: '队伍成员执行任务',
    onEnter(game, roomId, { roomService, playerService }) {
      console.log(`[阶段路由] 进入 mission 阶段，执行任务`);

      // 通知任务成员执行任务
      game.currentTeam.forEach(playerId => {
        const player = game.players.find(p => p.id === playerId);
        if (player) {
          playerService.emitToPlayer(playerId, 'mission-start', {
            message: '你被选入任务队伍，请选择任务结果',
            round: game.currentRound,
            teamMembers: game.currentTeam,
            isEvil: player.side === 'evil',
            evilCanFail: true, // 坏人可以选择让任务失败
            goodMustSucceed: true // 好人必须让任务成功
          });
        }
      });

      // 通知非任务成员等待
      const nonTeamPlayers = game.players.filter(p => !game.currentTeam.includes(p.id));
      nonTeamPlayers.forEach(player => {
        playerService.emitToPlayer(player.id, 'mission-waiting', {
          message: '任务正在进行中，请等待结果...',
          round: game.currentRound,
          teamMembers: game.currentTeam
        });
      });

      // 广播任务开始
      roomService.broadcastToRoom(roomId, 'mission-started', {
        message: '任务队伍正在执行任务...',
        round: game.currentRound,
        teamSize: game.currentTeam.length,
        gamePhase: game.gamePhase
      });
    }
  },

  // ============================================================================
  // 阶段 10: assassination (刺杀阶段)
  // ============================================================================
  // 触发时机: 邪恶阵营赢得3轮任务后
  // 核心逻辑:
  //   1. 刺客尝试刺杀梅林
  //   2. 如果刺杀成功，坏人胜利
  //   3. 如果刺杀失败，好人胜利
  // ============================================================================
  'assassination': {
    displayName: '刺杀阶段',
    description: '刺客尝试刺杀梅林',
    onEnter(game, roomId, { roomService, playerService }) {
      console.log(`[阶段路由] 进入 assassination 阶段，刺客行动`);

      // 找到刺客
      const assassin = game.players.find(p => p.role === 'assassin');

      if (assassin) {
        const assassinSocket = playerService.getPlayerSocket(assassin.id);
        if (assassinSocket) {
          // 向刺客发送刺杀选项
          const goodPlayers = game.players
            .filter(p => p.side === 'good')
            .map(p => ({ id: p.id, name: p.name, role: p.role }));

          assassinSocket.emit('assassination-start', {
            message: '坏人赢得了3轮任务！现在是你最后的机会',
            instruction: '请选择你要刺杀的目标（梅林）',
            candidates: goodPlayers,
            note: '如果你成功刺杀梅林，坏人将逆转获胜！'
          });

          console.log(`[阶段路由] 通知刺客 ${assassin.name} 进行刺杀`);
        }

        // 广播刺杀阶段开始
        roomService.broadcastToRoom(roomId, 'assassination-started', {
          message: '坏人即将胜利！刺客正在寻找梅林...',
          assassinName: assassin.name,
          gamePhase: game.gamePhase
        });
      } else {
        // 如果没有刺客（不应该发生），直接结算
        console.log('[阶段路由] 警告：没有找到刺客');
      }
    }
  },

  // ============================================================================
  // 阶段 11: settlement (结算阶段)
  // ============================================================================
  // 触发时机: 任务阶段结束后，或刺杀阶段结束后
  // 核心逻辑:
  //   1. 计算任务结果
  //   2. 判断游戏是否结束
  //   3. 准备进入结束阶段或下一轮
  // ============================================================================
  'settlement': {
    displayName: '结算阶段',
    description: '计算任务结果和胜负',
    onEnter(game, roomId, { roomService }) {
      console.log(`[阶段路由] 进入 settlement 阶段，结算本轮结果`);

      // 获取最新任务结果
      const lastMissionResult = game.missionResults[game.missionResults.length - 1];

      roomService.broadcastToRoom(roomId, 'mission-settlement', {
        message: '任务结果已揭晓',
        missionResult: lastMissionResult,
        missionResults: game.missionResults,
        currentRound: game.currentRound,
        goodWins: game.missionResults.filter(r => r === 'success').length,
        evilWins: game.missionResults.filter(r => r === 'fail').length,
        gamePhase: game.gamePhase
      });
    }
  },

  // ============================================================================
  // 阶段 12: ended (游戏结束)
  // ============================================================================
  // 触发时机: 好人或坏人达成胜利条件
  // 核心逻辑:
  //   1. 广播最终游戏结果
  //   2. 展示所有玩家身份
  //   3. 提供重新开始选项
  // ============================================================================
  'ended': {
    displayName: '游戏结束',
    description: '游戏结束，展示结果',
    onEnter(game, roomId, { roomService }) {
      console.log(`[阶段路由] 进入 ended 阶段，游戏结束`);

      const goodWins = game.missionResults.filter(r => r === 'success').length;
      const evilWins = game.missionResults.filter(r => r === 'fail').length;

      // 确定胜利方
      const winner = game.gameWinner || (goodWins >= 3 ? 'good' : 'evil');

      roomService.broadcastToRoom(roomId, 'game-ended', {
        message: winner === 'good' ? '好人阵营获胜！' : '坏人阵营获胜！',
        winner: winner,
        winnerName: winner === 'good' ? '亚瑟王的忠臣' : '莫德雷德的爪牙',
        finalScore: {
          good: goodWins,
          evil: evilWins
        },
        players: game.players.map(p => ({
          id: p.id,
          name: p.name,
          role: p.role,
          side: p.side,
          isLeader: p.isLeader
        })),
        missionResults: game.missionResults,
        gamePhase: game.gamePhase,
        canRestart: true
      });
    }
  }
};

/**
 * 阶段转换处理器
 *
 * 使用方式:
 *   const { handlePhaseTransition } = require('./config/phaseRoutes');
 *   handlePhaseTransition(game, roomId, services);
 *
 * @param {Object} game - 游戏实例
 * @param {string} roomId - 房间ID
 * @param {Object} services - 服务层对象 { roomService, playerService, gameService }
 */
function handlePhaseTransition(game, roomId, services) {
  const phaseConfig = phaseRoutes[game.gamePhase];

  if (phaseConfig && phaseConfig.onEnter) {
    try {
      phaseConfig.onEnter(game, roomId, services);
    } catch (error) {
      console.error(`[阶段路由] 执行 ${game.gamePhase} 阶段处理器出错:`, error);
    }
  }
}

/**
 * 获取所有阶段名称列表
 * @returns {string[]} 阶段名称数组
 */
function getAllPhases() {
  return Object.keys(phaseRoutes);
}

/**
 * 获取阶段显示名称
 * @param {string} phase - 阶段名称
 * @returns {string} 显示名称
 */
function getPhaseDisplayName(phase) {
  return phaseRoutes[phase]?.displayName || phase;
}

/**
 * 获取阶段描述
 * @param {string} phase - 阶段名称
 * @returns {string} 阶段描述
 */
function getPhaseDescription(phase) {
  return phaseRoutes[phase]?.description || '';
}

/**
 * 检查阶段是否有配置处理器
 * @param {string} phase - 阶段名称
 * @returns {boolean}
 */
function hasPhaseHandler(phase) {
  return phase in phaseRoutes && !!phaseRoutes[phase].onEnter;
}

/**
 * 获取完整阶段流程
 * @returns {Array<{name: string, displayName: string, description: string}>}
 */
function getPhaseFlow() {
  return getAllPhases().map(phase => ({
    name: phase,
    displayName: getPhaseDisplayName(phase),
    description: getPhaseDescription(phase)
  }));
}

module.exports = {
  phaseRoutes,
  handlePhaseTransition,
  getAllPhases,
  getPhaseDisplayName,
  getPhaseDescription,
  hasPhaseHandler,
  getPhaseFlow
};
