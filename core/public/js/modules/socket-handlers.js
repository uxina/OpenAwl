// public/js/modules/socket-handlers.js
// Socket事件处理模块
class SocketHandlers {
    constructor(gameCore, uiManager, teamBuilder) {
        this.gameCore = gameCore;
        this.uiManager = uiManager;
        this.teamBuilder = teamBuilder;
    }

    // 绑定所有Socket事件
    bindSocketEvents(socket) {
        const evt = window.SocketEvents.ServerToClient;

        // 连接事件
        socket.on('connect', () => this.handleConnect());
        socket.on('disconnect', () => this.handleDisconnect());

        // 游戏事件
        socket.on(evt.PLAYER_JOIN_SUCCESS, (data) => this.handlePlayerJoinSuccess(data));
        socket.on(evt.PLAYER_JOINED, (data) => this.handlePlayerJoined(data));
        socket.on(evt.PLAYER_LEFT, (data) => this.handlePlayerLeft(data));
        socket.on(evt.ROLE_ASSIGNED, (data) => this.handleRoleAssigned(data));
        socket.on(evt.GAME_STARTED, (data) => this.handleGameStarted(data));
        socket.on(evt.PHASE_CHANGED, (data) => this.handlePhaseChanged(data));
        socket.on(evt.YOU_ARE_LEADER, (data) => this.handleYouAreLeader(data));
        socket.on(evt.LEADER_CHANGED, (data) => this.handleLeaderChanged(data));
        socket.on(evt.TEAM_SELECTED, (data) => this.handleTeamSelected(data));
        socket.on(evt.VOTE_UPDATE, (data) => this.handleVoteUpdate(data));
        socket.on(evt.VOTE_COMPLETED, (data) => this.handleVoteCompleted(data));
        socket.on(evt.MISSION_START, (data) => this.handleMissionStart(data));
        socket.on(evt.MISSION_WAITING, (data) => this.handleMissionWaiting(data));
        socket.on(evt.MISSION_PROGRESS, (data) => this.handleMissionProgress(data));
        socket.on(evt.MISSION_COMPLETED, (data) => this.handleMissionCompleted(data));
        socket.on(evt.VOTE_RESULT, (data) => this.handleVoteResult(data));
        socket.on(evt.MISSION_RESULT, (data) => this.handleMissionResult(data));
        socket.on(evt.ASSASSIN_COMPLETED, (data) => this.handleAssassinCompleted(data));
        socket.on(evt.GAME_ENDED, (data) => this.handleGameEnded(data));

        // 游戏重置事件
        socket.on(evt.GAME_RESET, () => this.handleGameReset());

        // 强制断开事件（游戏重置时）
        socket.on(evt.FORCE_DISCONNECT, (data) => this.handleForceDisconnect(data));

        // 游戏重置后自动重新加入
        socket.on(evt.GAME_RESET_REJOINED, (data) => this.handleGameResetRejoined(data));

        // 重连相关事件
        socket.on(evt.PLAYER_OFFLINE, (data) => this.handlePlayerOffline(data));
        socket.on(evt.PLAYER_RECONNECTED, (data) => this.handlePlayerReconnected(data));

        // 错误事件
        socket.on(evt.ERROR, (error) => this.handleError(error));
    }
    
    // 处理其他玩家离线
    handlePlayerOffline(data) {
        console.log('有玩家离线:', data);
        
        // 更新玩家列表
        if (data.players) {
            this.gameCore.players = data.players;
        }
        
        // 显示离线提示
        if (data.playerName) {
            this.uiManager.showLoading(`${data.playerName} 已离线，等待重连...`);
        }
    }
    
    // 处理其他玩家重连
    handlePlayerReconnected(data) {
        console.log('有玩家重连:', data);
        
        // 更新玩家列表
        if (data.players) {
            this.gameCore.players = data.players;
        }
        
        // 显示重连提示
        if (data.playerName) {
            this.uiManager.showLoading(`${data.playerName} 已重连回来！`);
            setTimeout(() => {
                this.uiManager.hideLoading();
            }, 2000);
        }
    }
    
    // 处理游戏重置
    handleGameReset() {
        console.log('收到游戏重置通知');
        
        // 重置游戏核心状态
        this.gameCore.resetGame();
        
        // 显示等待屏幕
        this.uiManager.showScreen('waitingScreen');
        this.uiManager.showLoading('游戏已重置，等待开始...');
        
        // 隐藏玩家信息栏
        this.uiManager.hidePlayerInfoBar();
        
        // 重置玩家信息
        this.uiManager.updatePlayerRole('-', '-');
        
        console.log('玩家端已重置完成');
    }
    
    // 处理强制断开（游戏重置时）
    handleForceDisconnect(data) {
        console.log('收到强制断开通知:', data);
        
        // 显示提示信息
        this.uiManager.showError(data.message || '游戏已重置，请重新加入房间');
        
        // 清除保存的房间信息（让玩家可以重新加入）
        sessionStorage.removeItem('avalon_roomId');
        sessionStorage.removeItem('avalon_playerId');
        sessionStorage.removeItem('avalon_playerName');
        sessionStorage.removeItem('avalon_playerNumber');
        
        // 重置游戏核心状态
        this.gameCore.resetGame();
        
        // 显示等待屏幕
        this.uiManager.showScreen('waitingScreen');
        
        // 隐藏玩家信息栏
        this.uiManager.hidePlayerInfoBar();
        
        // 重置玩家信息
        this.uiManager.updatePlayerRole('-', '-');
        
        // 重新启用加入按钮
        const joinRoomBtn = document.getElementById('joinRoomBtn');
        if (joinRoomBtn) {
            joinRoomBtn.disabled = false;
            joinRoomBtn.textContent = '加入房间';
        }
        
        // 清除已选择的玩家ID
        this.gameCore.selectedPlayerId = null;
        
        console.log('玩家端已强制断开，等待重新加入');
    }
    
    // 处理游戏重置后自动重新加入
    handleGameResetRejoined(data) {
        console.log('游戏重置后自动重新加入:', data);
        
        // 更新游戏核心信息
        this.gameCore.currentRoomId = data.roomId;
        this.gameCore.playerId = data.playerId;
        this.gameCore.playerName = data.playerName;
        
        // 保存到 sessionStorage
        sessionStorage.setItem('avalon_roomId', data.roomId);
        sessionStorage.setItem('avalon_playerId', data.playerId);
        sessionStorage.setItem('avalon_playerName', data.playerName);
        if (data.playerNumber) {
            sessionStorage.setItem('avalon_playerNumber', data.playerNumber);
        }
        
        // 显示提示
        this.uiManager.showSuccess(data.message || '游戏已重置，您已自动重新加入房间');
        
        // 显示等待屏幕
        this.uiManager.showScreen('waitingScreen');
        
        // 更新房间号显示
        const roomIdElement = document.getElementById('roomId');
        if (roomIdElement) {
            roomIdElement.textContent = data.roomId;
        }
        
        // 重新启用加入按钮
        const joinRoomBtn = document.getElementById('joinRoomBtn');
        if (joinRoomBtn) {
            joinRoomBtn.disabled = true;
            joinRoomBtn.textContent = '已加入';
        }
        
        console.log('游戏重置后自动重新加入完成');
    }

    // 连接成功
    handleConnect() {
        console.log('Socket连接成功');
        this.uiManager.hideLoading();
    }

    // 连接断开
    handleDisconnect() {
        console.log('Socket连接断开');
        this.uiManager.showLoading('连接断开，正在重连...');
    }

    // 玩家加入成功（自己加入成功）
    handlePlayerJoinSuccess(data) {
        console.log('玩家加入成功:', data);
        console.log('uiManager:', this.uiManager);
        
        this.uiManager.hideLoading();
        
        // 重新启用加入按钮
        const joinRoomBtn = document.getElementById('joinRoomBtn');
        if (joinRoomBtn) {
            joinRoomBtn.disabled = false;
            joinRoomBtn.textContent = '加入房间';
        }
        
        // 更新游戏状态
        this.gameCore.currentRoomId = data.roomId;
        
        // 更新房间号显示
        const roomIdElement = document.getElementById('roomId');
        if (roomIdElement && data.roomId) {
            roomIdElement.textContent = data.roomId;
            console.log('房间号已更新:', data.roomId);
        }
        
        // 保存玩家名字（如果服务器返回了）
        if (data.playerName) {
            this.gameCore.playerName = data.playerName;
        }
        
        // 保存玩家ID到游戏核心
        if (data.playerId) {
            this.gameCore.playerId = data.playerId;
        }
        
        // 保存到sessionStorage（每个标签页独立保存，用于重连）
        sessionStorage.setItem('avalon_roomId', data.roomId);
        sessionStorage.setItem('avalon_playerId', data.playerId || this.gameCore.playerId);
        sessionStorage.setItem('avalon_playerName', data.playerName || this.gameCore.playerName);
        
        // 保存玩家列表
        if (data.players) {
            this.gameCore.players = data.players;
        }
        
        console.log('玩家加入成功 - playerName:', this.gameCore.playerName);
        console.log('玩家加入成功 - playerId:', data.playerId);
        console.log('玩家加入成功 - 玩家列表:', this.gameCore.players);
        
        // 显示同名玩家继承提示
        if (data.isNameTaken) {
            showWarningToast('⚠️ 检测到同名玩家在线，已继承其游戏状态');
        }
        
        // 检查是否是最后一个加入的玩家（游戏已开始）
        if (data.gameStarted && data.role) {
            console.log('最后一个玩家加入，游戏已开始，直接显示角色');
            
            // 保存角色信息
            this.gameCore.myRole = data.role;
            this.gameCore.mySide = data.side;
            
            // 直接显示角色分配屏幕
            this.uiManager.showRoleScreen({
                role: data.role,
                side: data.side,
                players: data.players
            });
        } else {
            // 正常流程：切换到等待屏幕
            console.log('切换到等待屏幕...');
            this.uiManager.showScreen('waitingScreen');
            console.log('等待屏幕切换完成');
            
            // 更新等待屏幕信息
            console.log('更新等待屏幕信息...');
            this.uiManager.updateWaitingScreen({
                playerCount: data.playerCount,
                players: data.players || []
            });
            console.log('等待屏幕信息更新完成');
        }
    }

    // 其他玩家加入
    handlePlayerJoined(data) {
        console.log('其他玩家加入:', data);
        this.gameCore.players = data.players || [];
        this.uiManager.updateWaitingScreen(data);
    }

    // 玩家离开
    handlePlayerLeft(data) {
        console.log('玩家离开:', data);
        this.gameCore.players = data.players || [];
        this.uiManager.updateWaitingScreen(data);
    }

    // 角色分配
    handleRoleAssigned(data) {
        console.log('角色分配事件收到:', data);
        this.gameCore.myRole = data.role;
        this.gameCore.mySide = data.side;
        this.gameCore.specialInfo = data.specialInfo || [];
        
        console.log('特殊角色信息:', this.gameCore.specialInfo);
        
        this.uiManager.showRoleScreen(data);
        console.log('角色屏幕已显示');
    }

    // 游戏开始
    handleGameStarted(data) {
        console.log('游戏开始事件收到:', data);
        console.log('当前阶段:', data.phase);
        this.gameCore.gameState = data;
        
        // 保存玩家列表
        if (data.players) {
            this.gameCore.players = data.players;
            console.log('玩家列表已保存:', this.gameCore.players.length, '人');
        }
        
        this.uiManager.showGameScreen(data);
        console.log('游戏屏幕已显示');
    }

    // 阶段改变
    handlePhaseChanged(data) {
        console.log('阶段改变:', data);

        // 保存角色信息（如果服务器发送了）
        if (data.myRole) {
            this.gameCore.myRole = data.myRole;
            this.gameCore.mySide = data.mySide;
        }

        // 保存特殊信息（如果服务器发送了）
        if (data.specialInfo) {
            this.gameCore.specialInfo = data.specialInfo;
            console.log('特殊角色信息已更新:', this.gameCore.specialInfo);
        }

        console.log('当前specialInfo:', this.gameCore.specialInfo);
        // 兼容两种字段名：服务器发送 phase，部分旧代码发送 gamePhase
        const phase = data.phase || data.gamePhase;
        this.gameCore.currentPhase = phase;

        // 更新玩家列表（如果有）
        if (data.players) {
            // 规范化玩家字段名：服务器发送 playerId/playerName，客户端期望 id/name
            this.gameCore.players = data.players.map(p => ({
                id: p.id || p.playerId,
                name: p.name || p.playerName,
                playerId: p.playerId || p.id,
                playerName: p.playerName || p.name,
                role: p.role,
                side: p.side,
                isLeader: false // 初始为 false，后续由 currentLeaderIndex 设置
            }));
            console.log('玩家列表已更新:', this.gameCore.players.map(p => ({ id: p.id, name: p.name, isLeader: p.isLeader })));
        }

        // 更新队长索引（如果有）
        if (data.currentLeaderIndex !== undefined) {
            this.gameCore.currentLeaderIndex = data.currentLeaderIndex;
            console.log('队长索引已更新:', this.gameCore.currentLeaderIndex);
        }

        // 同步更新所有玩家的 isLeader 标记（关键！在判断 isLeader() 之前必须执行）
        // 优先使用 currentLeaderName 匹配（避免索引错位问题），回退到 currentLeaderIndex
        if (this.gameCore.players && this.gameCore.players.length > 0) {
            if (data.currentLeaderName) {
                // 使用名字匹配，避免索引错位
                this.gameCore.players.forEach(p => {
                    p.isLeader = (p.name === data.currentLeaderName || p.playerName === data.currentLeaderName);
                });
            } else if (this.gameCore.currentLeaderIndex !== undefined) {
                // 回退到索引匹配
                this.gameCore.players.forEach((p, index) => {
                    p.isLeader = (index === this.gameCore.currentLeaderIndex);
                });
            }
            console.log('玩家 isLeader 标记已同步:', this.gameCore.players.map(p => ({ name: p.name, isLeader: p.isLeader })));
        }

        // 更新轮次（如果有）
        if (data.currentRound !== undefined) {
            this.gameCore.currentRound = data.currentRound;
        }

        // 保存任务结果历史（用于显示任务历史）
        if (data.missionResults) {
            this.gameCore.missionResults = data.missionResults;
            console.log('任务历史已更新:', this.gameCore.missionResults.length, '条记录');
        }

        // 根据阶段显示不同的屏幕
        if (phase === 'night') {
            // 夜间阶段，显示夜间屏幕
            console.log('进入夜间阶段，显示夜间屏幕');
            this.uiManager.showNightScreen({
                phase,
                specialInfo: this.gameCore.specialInfo || []
            });
        } else if (phase === 'day') {
            // 白天阶段，显示白天/讨论屏幕
            console.log('进入白天阶段，显示讨论屏幕');
            this.uiManager.showDayScreen({
                phase,
                round: data.currentRound,
                message: '天亮了，大家请开始讨论'
            });
        } else if (phase === 'team-building') {
            // 清除上一轮的队伍信息（防止状态残留）
            this.gameCore.currentTeam = [];
            if (this.teamBuilder) {
                this.teamBuilder.clearSelection();
            }
            
            this.uiManager.showTeamBuildingScreen(data);

            // 如果当前玩家是队长，显示队长界面（传递完整数据，包含服务器发送的players）
            if (this.gameCore.isLeader()) {
                const round = data.currentRound || data.round || 1;
                this.teamBuilder.showTeamBuilder({
                    round: round,
                    requiredSize: this.gameCore.getRequiredTeamSize(round, this.gameCore.players.length),
                    players: this.gameCore.players,
                    currentLeaderIndex: this.gameCore.currentLeaderIndex,
                    currentLeaderName: data.currentLeaderName
                });
            }
        } else if (phase === 'voting') {
            // 重置投票按钮状态
            if (typeof resetVotingButtons === 'function') {
                resetVotingButtons();
            }
            this.uiManager.showVotingScreen(data);
        } else if (phase === 'mission') {
            // 重置任务按钮状态
            if (typeof resetMissionButtons === 'function') {
                resetMissionButtons();
            }
            this.uiManager.showMissionScreen(data);
        } else if (phase === 'assassination') {
            // 刺杀阶段
            console.log('进入刺杀阶段');
            this.uiManager.showAssassinationScreen(data);
        }
    }

    // 你是队长
    handleYouAreLeader(data) {
        console.log('你是队长:', data);
        console.log('当前游戏阶段:', this.gameCore.currentPhase);

        // 更新所有玩家的队长状态，确保与服务器一致
        // 优先使用 currentLeaderName 匹配（避免索引错位问题），回退到 currentLeaderIndex
        // 注意：MISSION_COMPLETED 发送的是 currentLeader（队长名字），不是 currentLeaderName
        const leaderName = data.currentLeaderName || data.currentLeader || null;
        if (leaderName) {
            this.gameCore.players.forEach(p => {
                p.isLeader = (p.name === leaderName || p.playerName === leaderName);
            });
            console.log('[handleMissionCompleted] 已用 currentLeader 同步 isLeader:', 
                this.gameCore.players.map(p => ({ name: p.name, isLeader: p.isLeader })));
        } else if (data.currentLeaderIndex !== undefined) {
            this.gameCore.currentLeaderIndex = data.currentLeaderIndex;
            this.gameCore.players.forEach((p, index) => {
                p.isLeader = (index === this.gameCore.currentLeaderIndex);
            });
        }

        console.log('玩家队长状态已更新:', this.gameCore.players.map(p => ({ name: p.name, isLeader: p.isLeader })));

        // 只有在组队阶段才显示组队界面
        // 在角色确认阶段收到you-are-leader时，只更新队长状态，不跳转界面
        if (this.gameCore.currentPhase === 'team-building') {
            console.log('当前是组队阶段，显示组队界面');
            this.teamBuilder.showTeamBuilder(data);
        } else {
            console.log('当前不是组队阶段（' + this.gameCore.currentPhase + '），不显示组队界面');
        }
    }

    // 队长变更通知（广播给所有玩家）
    handleLeaderChanged(data) {
        console.log('收到队长变更通知:', data);

        // 更新当前队长索引
        if (data.leaderIndex !== undefined) {
            this.gameCore.currentLeaderIndex = data.leaderIndex;
        }

        // 同步更新所有玩家的 isLeader 标记
        // 优先使用 leaderName 匹配（避免索引错位问题）
        if (data.leaderName) {
            this.gameCore.players.forEach(p => {
                p.isLeader = (p.name === data.leaderName || p.playerName === data.leaderName);
            });
            console.log(`[handleLeaderChanged] 队长已更新为: ${data.leaderName}`);
        } else if (data.leaderId) {
            // 回退到 ID 匹配
            this.gameCore.players.forEach(p => {
                p.isLeader = (p.id === data.leaderId || p.playerId === data.leaderId);
            });
            console.log(`[handleLeaderChanged] 队长已更新 (by ID): ${data.leaderId}`);
        }

        console.log('玩家队长状态已更新:', this.gameCore.players.map(p => ({ name: p.name, isLeader: p.isLeader })));

        // 如果当前是组队阶段，更新组队界面
        if (this.gameCore.currentPhase === 'team-building') {
            console.log('当前是组队阶段，更新组队界面显示');
            // 重新显示组队界面（会根据 isLeader() 结果显示不同的UI）
            this.uiManager.showTeamBuildingScreen(data);
            if (this.gameCore.isLeader()) {
                this.teamBuilder.showTeamBuilder(data);
            }
        }
    }

    // 队伍组建完成
    handleTeamSelected(data) {
        console.log('队伍组建完成:', data);
        // 更新游戏状态
        this.gameCore.currentTeam = data.team;
    }

    // 投票进度更新
    handleVoteUpdate(data) {
        console.log('投票进度:', data);
        this.uiManager.updateVoteProgress(data);
    }

    // 投票完成
    handleVoteCompleted(data) {
        console.log('投票完成:', data);
        this.uiManager.showVoteCompleted(data);
    }

    // 任务开始（任务队员收到）
    handleMissionStart(data) {
        console.log('任务开始 - 你是队员:', data);
        console.log('handleMissionStart - 任务数据:', data);
        console.log('handleMissionStart - 当前阶段:', this.gameCore.currentPhase);
        console.log('handleMissionStart - players:', this.gameCore.players);
        console.log('handleMissionStart - currentTeam:', this.gameCore.currentTeam);
        
        // 更新当前轮次
        if (data.round) {
            this.gameCore.currentRound = data.round;
        }
        
        // 更新队伍信息
        if (data.teamMembers) {
            this.gameCore.currentTeam = data.teamMembers;
        }
        
        // 更新 players 数组
        if (this.gameCore.players && data.teamMembers) {
            // 标记队伍中的玩家
            this.gameCore.players.forEach(p => {
                p.inTeam = data.teamMembers.some(m => m.id === p.id || m === p.id);
            });
        }
        
        // 显示任务界面
        this.uiManager.showMissionScreen({
            round: data.round,
            currentTeam: data.teamMembers,
            players: this.gameCore.players,
            isEvil: data.isEvil,
            evilCanFail: data.evilCanFail,
            goodMustSucceed: data.goodMustSucceed
        });
    }

    // 任务等待（非任务队员收到）
    handleMissionWaiting(data) {
        console.log('任务等待 - 非队员:', data);
        console.log('handleMissionWaiting - 当前阶段:', this.gameCore.currentPhase);
        
        // 更新当前轮次
        if (data.round) {
            this.gameCore.currentRound = data.round;
        }
        
        // 更新队伍信息
        if (data.teamMembers) {
            this.gameCore.currentTeam = data.teamMembers;
        }
        
        // 显示等待界面
        this.uiManager.showMissionScreen({
            round: data.round,
            currentTeam: data.teamMembers,
            players: this.gameCore.players
        });
        
        // 显示等待信息
        const missionResult = document.getElementById('missionResult');
        const missionButtons = document.getElementById('missionButtons');
        if (missionResult) {
            missionResult.classList.remove('hidden');
            missionResult.innerHTML = '<div class="waiting-message">等待任务成员执行任务...</div>';
        }
        if (missionButtons) {
            missionButtons.classList.add('hidden');
        }
    }

    // 任务进度更新
    handleMissionProgress(data) {
        console.log('任务进度:', data);
        this.uiManager.updateMissionProgress(data);
    }

    // 任务完成
    handleMissionCompleted(data) {
        console.log('任务完成:', data);
        console.log('gamePhase:', data.gamePhase);
        
        if (data.players) {
            // 规范化字段名：服务器发送 playerId/playerName，客户端期望 id/name
            this.gameCore.players = data.players.map(p => ({
                id: p.id || p.playerId,
                name: p.name || p.playerName,
                playerId: p.playerId || p.id,
                playerName: p.playerName || p.name,
                role: p.role,
                side: p.side,
                isLeader: false // 初始为 false，后续由 currentLeaderName 同步设置
            }));
            console.log('更新玩家列表，新队长:', data.players.find(p => p.isLeader)?.name);
        }
        
        // 优先使用 currentLeaderName 匹配（避免索引错位问题），回退到 currentLeaderIndex
        if (data.currentLeaderName) {
            this.gameCore.players.forEach(p => {
                p.isLeader = (p.name === data.currentLeaderName || p.playerName === data.currentLeaderName);
            });
        } else if (data.currentLeaderIndex !== undefined) {
            this.gameCore.currentLeaderIndex = data.currentLeaderIndex;
            this.gameCore.players.forEach((p, index) => {
                p.isLeader = (index === this.gameCore.currentLeaderIndex);
            });
        }
        
        if (data.currentRound !== undefined) {
            this.gameCore.currentRound = data.currentRound;
        }
        
        // 根据游戏阶段直接跳转到对应界面（不再显示5秒倒计时页面）
        if (data.gamePhase === 'assassination') {
            console.log('进入刺杀阶段，显示刺杀界面');
            if (data.myRole) {
                this.gameCore.myRole = data.myRole;
                this.gameCore.mySide = data.mySide;
            }
            this.uiManager.showAssassinationScreen(data);
        } else if (data.gamePhase === 'team-building') {
            console.log('任务完成，进入下一轮组队阶段');
            this.gameCore.currentPhase = 'team-building';
            
            // 清除上一轮的队伍信息（关键！防止上轮队伍残留）
            this.gameCore.currentTeam = [];
            if (this.teamBuilder) {
                this.teamBuilder.clearSelection();
            }
            
            this.uiManager.showTeamBuildingScreen(data);
            
            if (this.gameCore.isLeader()) {
                const round = data.currentRound || data.round;
                this.teamBuilder.showTeamBuilder({
                    round: round,
                    requiredSize: this.gameCore.getRequiredTeamSize(round, this.gameCore.players.length),
                    players: this.gameCore.players,
                    currentLeaderIndex: this.gameCore.currentLeaderIndex,
                    currentLeaderName: data.currentLeaderName
                });
            }
        } else if (data.gamePhase === 'ended') {
            console.log('游戏结束');
            this.uiManager.showGameOverScreen(data);
        } else {
            // 未知阶段，默认进入组队阶段
            console.log('未知阶段，进入组队阶段');
            this.gameCore.currentPhase = 'team-building';
            
            // 清除上一轮的队伍信息
            this.gameCore.currentTeam = [];
            if (this.teamBuilder) {
                this.teamBuilder.clearSelection();
            }
            
            this.uiManager.showTeamBuildingScreen(data);
            
            if (this.gameCore.isLeader()) {
                const round = data.currentRound || data.round;
                this.teamBuilder.showTeamBuilder({
                    round: round,
                    requiredSize: this.gameCore.getRequiredTeamSize(round, this.gameCore.players.length),
                    players: this.gameCore.players,
                    currentLeaderIndex: this.gameCore.currentLeaderIndex,
                    currentLeaderName: data.currentLeaderName
                });
            }
        }
    }

    // 投票结果
    handleVoteResult(data) {
        console.log('投票结果:', data);
        this.uiManager.showVoteResult(data);
    }

    // 任务结果
    handleMissionResult(data) {
        console.log('任务结果:', data);
        this.uiManager.showMissionResult(data);
    }

    // 刺杀完成
    handleAssassinCompleted(data) {
        console.log('刺杀完成:', data);
        
        // 显示刺杀结果
        if (this.uiManager && typeof this.uiManager.showAssassinationResult === 'function') {
            this.uiManager.showAssassinationResult(data);
        }
        
        // 延迟显示游戏结束界面
        setTimeout(() => {
            if (this.gameCore.socket) {
                this.gameCore.socket.emit('request-game-state', {
                    roomId: this.gameCore.currentRoomId
                });
            }
        }, 3000);
    }

    // 游戏结束
    handleGameEnded(data) {
        console.log('游戏结束:', data);
        this.uiManager.showGameOverScreen(data);
    }

    // 错误处理
    handleError(error) {
        console.error('Socket错误:', error);
        
        // 重新启用加入按钮（如果是因为加入失败导致的错误）
        const joinRoomBtn = document.getElementById('joinRoomBtn');
        if (joinRoomBtn) {
            joinRoomBtn.disabled = false;
            joinRoomBtn.textContent = '加入房间';
        }
        
        // 确保uiManager存在且有showError方法
        if (this.uiManager && typeof this.uiManager.showError === 'function') {
            this.uiManager.showError(error);
        } else {
            // 备用错误处理：只使用console.error，不使用alert
            const errorMessage = typeof error === 'string' ? error : (error?.message || '发生未知错误');
            console.error('UI管理器不可用，错误信息:', errorMessage);
        }
    }
}