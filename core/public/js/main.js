// public/js/main.js
// 主程序入口
let savedPlayerId = null;
let savedRoomId = null;
let savedPlayerName = null;

document.addEventListener('DOMContentLoaded', function() {
    // 初始化游戏核心模块
    const gameCore = new GameCore();
    const uiManager = new UIManager(gameCore);
    const teamBuilder = new TeamBuilder(gameCore);
    const socketHandlers = new SocketHandlers(gameCore, uiManager, teamBuilder);
    
    // 设置UI管理器引用
    gameCore.setUIManager(uiManager);
    
    // 设置队伍组建器引用
    gameCore.setTeamBuilder(teamBuilder);

    // 连接Socket
    const socket = io();
    
    // 生成或获取唯一的客户端ID（用于跨标签页识别）
    function getOrCreateClientId() {
        let clientId = localStorage.getItem('avalon_clientId');
        if (!clientId) {
            // 生成唯一ID：时间戳 + 随机数
            clientId = 'client_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('avalon_clientId', clientId);
        }
        return clientId;
    }
    
    // 为每个标签页生成唯一的ID（使用 sessionStorage）
    function getOrCreateTabId() {
        let tabId = sessionStorage.getItem('avalon_tabId');
        if (!tabId) {
            tabId = 'tab_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            sessionStorage.setItem('avalon_tabId', tabId);
        }
        return tabId;
    }
    
    const tabId = getOrCreateTabId();
    const clientId = getOrCreateClientId();
    console.log('标签页ID:', tabId, '客户端ID:', clientId);
    
    // 从sessionStorage恢复当前标签页的信息（每个标签页独立保存）
    let savedPlayerId = sessionStorage.getItem('avalon_playerId');
    let savedRoomId = sessionStorage.getItem('avalon_roomId');
    let savedPlayerName = sessionStorage.getItem('avalon_playerName');
    let savedPlayerNumber = sessionStorage.getItem('avalon_playerNumber');
    
    console.log('恢复保存的信息:', { savedPlayerId, savedRoomId, savedPlayerName, savedPlayerNumber, tabId });
    
    // 检查URL中是否有房间号参数
    function getRoomIdFromUrl() {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('roomId');
    }
    
    const urlRoomId = getRoomIdFromUrl();
    
    // 如果URL中有房间号，且与保存的房间号不同，清除保存的信息
    if (urlRoomId && savedRoomId && urlRoomId !== savedRoomId) {
        console.log(`URL房间号(${urlRoomId})与保存的房间号(${savedRoomId})不同，清除保存的信息`);
        sessionStorage.removeItem('avalon_playerId');
        sessionStorage.removeItem('avalon_roomId');
        sessionStorage.removeItem('avalon_playerName');
        sessionStorage.removeItem('avalon_playerNumber');
        savedPlayerId = null;
        savedRoomId = null;
        savedPlayerName = null;
        savedPlayerNumber = null;
    }
    
    // Socket连接事件处理
    socket.on('connect', () => {
        console.log('Socket连接成功，连接ID:', socket.id);
        gameCore.init(socket, '', '');
        
        // 绑定Socket事件
        socketHandlers.bindSocketEvents(socket);
        
        // 如果有URL房间号，查询房间状态（确保socket已连接）
        const urlRoomId = getRoomIdFromUrl();
        if (urlRoomId) {
            console.log('Socket已连接，查询房间状态:', urlRoomId);
            // 稍微延迟确保socket完全就绪
            setTimeout(() => {
                queryRoomStatus(socket, urlRoomId);
            }, 300);
        }
        
        // 尝试恢复连接（如果之前有保存的信息）
        if (savedPlayerId && savedRoomId && savedPlayerName) {
            console.log('尝试恢复之前的连接...');
            attemptReconnect(socket, savedRoomId, savedPlayerId, savedPlayerName, clientId, uiManager, gameCore);
        }
        
        // 隐藏加载状态
        uiManager.hideLoading();
    });
    
    socket.on('disconnect', () => {
        console.log('Socket连接断开');
        uiManager.showLoading('连接断开，正在重连...');
    });
    
    socket.on('connect_error', (error) => {
        console.error('Socket连接错误:', error);
        uiManager.showError('连接服务器失败，请刷新页面重试');
    });
    
    // 监听可以恢复连接的事件
    socket.on('can-restore-connection', (data) => {
        console.log('可以恢复之前的连接:', data);
        
        // 如果有多个离线玩家，让用户选择
        if (data.offlinePlayers && data.offlinePlayers.length > 0) {
            let selectedPlayer;
            
            if (data.offlinePlayers.length === 1) {
                // 只有一个离线玩家，直接选择
                selectedPlayer = data.offlinePlayers[0];
            } else {
                // 多个离线玩家，让用户选择
                const options = data.offlinePlayers.map((p, index) => 
                    `${index + 1}. ${p.playerName} (${p.role || '未知角色'})`
                ).join('\n');
                
                const choice = prompt(`${data.message}\n\n请选择要恢复的角色（输入编号1-${data.offlinePlayers.length}）：\n${options}\n\n输入0取消恢复，可以新身份加入。`);
                
                const choiceNum = parseInt(choice);
                if (choiceNum === 0 || isNaN(choiceNum) || choiceNum < 1 || choiceNum > data.offlinePlayers.length) {
                    console.log('用户选择不恢复或输入无效，清除保存的信息');
                    clearSavedInfo();
                    
                    // 通知服务器清除所有关联
                    data.offlinePlayers.forEach(p => {
                        socket.emit('decline-restore', { 
                            roomId: data.roomId, 
                            playerId: p.playerId,
                            clientId: clientId 
                        });
                    });
                    return;
                }
                
                selectedPlayer = data.offlinePlayers[choiceNum - 1];
            }
            
            if (selectedPlayer) {
                console.log('用户选择恢复连接:', selectedPlayer);
                
                // 保存恢复信息到sessionStorage
                sessionStorage.setItem('avalon_playerId', selectedPlayer.playerId);
                sessionStorage.setItem('avalon_roomId', data.roomId);
                sessionStorage.setItem('avalon_playerName', selectedPlayer.playerName);
                if (selectedPlayer.playerNumber) {
                    sessionStorage.setItem('avalon_playerNumber', selectedPlayer.playerNumber);
                }
                
                // 显示恢复提示
                const restore = confirm(`是否恢复 ${selectedPlayer.playerName} 的连接？\n\n点击"确定"恢复，点击"取消"可以新身份加入。`);
                
                if (restore) {
                    console.log('用户确认恢复连接');
                    // 防止重复点击导致重复请求
                    if (window.isReconnecting) {
                        console.log('正在重连中，忽略重复请求');
                        return;
                    }
                    window.isReconnecting = true;
                    // 自动恢复连接
                    attemptReconnect(socket, data.roomId, selectedPlayer.playerId, selectedPlayer.playerName, clientId, uiManager, gameCore);
                } else {
                    console.log('用户选择不恢复，清除保存的信息');
                    clearSavedInfo();
                    
                    // 通知服务器清除该clientId的关联
                    socket.emit('decline-restore', { 
                        roomId: data.roomId, 
                        playerId: selectedPlayer.playerId,
                        clientId: clientId 
                    });
                }
            }
        }
    });

    // 初始化页面
    initPage(uiManager, socket, gameCore);
});

// 尝试重连函数
function attemptReconnect(socket, roomId, playerId, playerName, clientId, uiManager, gameCore) {
    console.log('执行重连, 参数:', { roomId, playerId, playerName, clientId });
    console.log('savedPlayerId:', savedPlayerId);
    console.log('savedRoomId:', savedRoomId);
    console.log('savedPlayerName:', savedPlayerName);
    
    // 检查必要参数
    if (!roomId || !playerId || !playerName) {
        console.log('重连参数不完整，清除保存的信息');
        clearSavedInfo();
        return;
    }
    
    console.log(`[客户端] 尝试重连到房间 ${roomId}, 玩家ID: ${playerId}`);
    uiManager.showLoading('正在恢复连接...');
    
    // 移除可能存在的旧监听器（避免重复触发）
    socket.removeAllListeners('player-reconnect-success');
    socket.removeAllListeners('player-reconnect-error');
    console.log('[客户端] 已移除旧的 player-reconnect-success 监听器');
    
    // 设置重连成功/失败的监听器（只监听一次）
    socket.once('player-reconnect-success', (data) => {
        console.log('[客户端] 收到 player-reconnect-success 事件:', data);
        window.isReconnecting = false; // 重置重连标志
        uiManager.hideLoading();
        
        // 更新保存的信息
        savedPlayerId = data.playerId;
        savedRoomId = data.roomId;
        savedPlayerName = data.playerName;
        savedPlayerNumber = data.playerNumber;
        
        // 更新游戏核心信息
        gameCore.init(socket, data.roomId, data.playerName);
        gameCore.playerId = data.playerId;
        gameCore.myRole = data.role || '';
        gameCore.mySide = data.side || '';
        
        // 显示游戏区域（切换到等待屏幕）
        uiManager.showScreen('waitingScreen');
        
        // 更新玩家信息UI（使用 updatePlayerRole 和 updatePlayerInfoBar）
        if (data.role && data.side) {
            uiManager.updatePlayerRole(data.role, data.side);
        }
        uiManager.updatePlayerInfoBar();
        
        // 更新游戏阶段
        if (data.gamePhase) {
            gameCore.currentPhase = data.gamePhase;
        }
        
        // 更新队长索引
        if (data.currentLeaderIndex !== undefined) {
            gameCore.currentLeaderIndex = data.currentLeaderIndex;
        }
        
        // 更新玩家列表（包含 isLeader 属性）
        if (data.players) {
            gameCore.players = data.players;
            // 更新当前玩家的 isLeader 状态
            const currentPlayer = gameCore.players.find(p => p.id === data.playerId);
            if (currentPlayer) {
                currentPlayer.isLeader = currentPlayer.isLeader || false;
            }
        }

        // 根据游戏阶段显示正确的屏幕
        // 只有在角色分配阶段或之前才显示角色屏幕
        const earlyPhases = ['waiting', 'waiting-players', 'ready-to-start', 'opening', 'role-assign', 'role-confirm'];
        if (data.role && earlyPhases.includes(data.gamePhase)) {
            uiManager.showRoleScreen({
                role: data.role,
                side: data.side,
                specialInfo: data.specialInfo
            });
        } else if (data.gamePhase && !earlyPhases.includes(data.gamePhase)) {
            // 游戏已经开始，显示游戏屏幕并根据阶段显示对应内容
            uiManager.showGameScreen({
                phase: data.gamePhase,
                round: data.currentRound,
                players: data.players
            });

            // 根据具体阶段显示对应屏幕
            switch (data.gamePhase) {
                case 'voting':
                    uiManager.showVotingScreen({
                        team: data.currentTeam,
                        round: data.currentRound
                    });
                    break;
                case 'mission':
                    uiManager.showMissionScreen({
                        team: data.currentTeam,
                        round: data.currentRound
                    });
                    break;
                case 'night':
                    uiManager.showNightScreen({
                        phase: data.gamePhase,
                        specialInfo: data.specialInfo || []
                    });
                    break;
                case 'team-building':
                    uiManager.showTeamBuildingScreen({
                        round: data.currentRound,
                        players: data.players,
                        leader: data.leader,
                        currentLeaderIndex: data.currentLeaderIndex,
                        missionResults: data.missionResults
                    });
                    break;
            }
        }
        
        // 更新玩家列表
        if (data.players) {
            uiManager.updatePlayerList(data.players);
        }
        
        // 显示成功提示
        if (typeof showSuccessToast === 'function') {
            showSuccessToast('连接已恢复！');
        }
        
        // 禁用加入房间按钮，防止重复点击
        const joinRoomBtn = document.getElementById('joinRoomBtn');
        if (joinRoomBtn) {
            joinRoomBtn.disabled = true;
        }
        
        // 请求当前游戏状态
        socket.emit('request-game-state', { roomId: data.roomId });
    });
    
    socket.once('player-reconnect-error', (data) => {
        console.log('[客户端] 重连失败:', data);
        window.isReconnecting = false; // 重置重连标志
        uiManager.hideLoading();
        if (typeof showErrorToast === 'function') {
            showErrorToast(data.message || '重连失败');
        }
        clearSavedInfo();
    });
    
    // 发送重连请求
    console.log('[客户端] 发送 player-reconnect 请求:', { roomId, playerId, playerName, clientId });
    socket.emit('player-reconnect', {
        roomId: roomId,
        playerId: playerId,
        playerName: playerName,
        clientId: clientId
    });
    console.log('[客户端] player-reconnect 请求已发送');
}

// 清除保存的信息
function clearSavedInfo() {
    sessionStorage.removeItem('avalon_playerId');
    sessionStorage.removeItem('avalon_roomId');
    sessionStorage.removeItem('avalon_playerName');
    sessionStorage.removeItem('avalon_playerNumber');
    savedPlayerId = null;
    savedRoomId = null;
    savedPlayerName = null;
    savedPlayerNumber = null;
    console.log('已清除保存的玩家信息');
}

// 初始化页面
function initPage(uiManager, socket, gameCore) {
    // 初始化玩家ID选择器
    initPlayerIdSelector(socket);

    // 绑定加入房间按钮
    const joinRoomBtn = document.getElementById('joinRoomBtn');
    if (joinRoomBtn) {
        joinRoomBtn.addEventListener('click', () => {
            // 防止重复点击
            if (joinRoomBtn.disabled) {
                console.log('正在加入房间中，忽略重复点击');
                return;
            }
            joinRoomBtn.disabled = true;
            handleJoinRoom(socket, uiManager, gameCore);
            // 2秒后重新启用按钮
            setTimeout(() => {
                joinRoomBtn.disabled = false;
            }, 2000);
        });
    }

    // 绑定投票按钮事件
    initVotingEvents(socket, gameCore);
    
    // 绑定游戏结束页面按钮事件
    initGameOverEvents();

    // 如果URL中有房间号，自动查询房间状态
    const urlRoomId = getRoomIdFromUrl();
    if (urlRoomId) {
        console.log('URL中有房间号，自动查询房间状态:', urlRoomId);
        // 填充房间号输入框
        const roomIdInput = document.getElementById('roomIdInput');
        if (roomIdInput) {
            roomIdInput.value = urlRoomId;
        }
        // 延迟查询房间状态，确保socket已连接
        setTimeout(() => {
            queryRoomStatus(socket, urlRoomId);
        }, 500);
    }
}

// 初始化玩家ID选择器
function initPlayerIdSelector(socket) {
    const selector = document.getElementById('playerIdSelector');
    const hiddenInput = document.getElementById('selectedPlayerId');
    const joinBtn = document.getElementById('joinRoomBtn');
    const roomIdInput = document.getElementById('roomIdInput');
    const playerIdHint = document.getElementById('playerIdHint');
    
    if (!selector) return;
    
    // 清空选择器
    selector.innerHTML = '';
    
    // 默认生成1-10号按钮
    let maxPlayers = 10;
    
    // 生成玩家编号按钮的函数
    function generatePlayerButtons(count) {
        selector.innerHTML = '';
        for (let i = 1; i <= count; i++) {
            const btn = document.createElement('button');
            btn.className = 'player-id-btn';
            btn.textContent = i + '号';
            btn.dataset.playerId = i;
            btn.type = 'button';
            
            btn.addEventListener('click', () => {
                if (btn.classList.contains('taken')) {
                    alert('该编号已被其他玩家选择，请选择其他编号');
                    return;
                }
                
                const roomId = document.getElementById('roomId').value.trim();
                const prevSelected = parseInt(document.getElementById('selectedPlayerId').value);
                
                // 如果之前已选择过编号，先取消预选择
                if (prevSelected && roomId && roomId.length === 4) {
                    socket.emit('player-id-deselect', { roomId }, () => {});
                }
                
                selector.querySelectorAll('.player-id-btn').forEach(b => {
                    b.classList.remove('selected');
                });
                btn.classList.add('selected');
                document.getElementById('selectedPlayerId').value = i;
                const joinBtn = document.getElementById('joinRoomBtn');
                if (joinBtn) joinBtn.disabled = false;
                
                // 发送预选择事件，让其他玩家立即看到该编号被占用
                if (roomId && roomId.length === 4) {
                    socket.emit('player-id-select', { roomId, playerNumber: i }, (response) => {
                        if (!response || !response.success) {
                            // 预选择失败，恢复UI
                            btn.classList.remove('selected');
                            document.getElementById('selectedPlayerId').value = '';
                            if (joinBtn) joinBtn.disabled = true;
                        }
                    });
                }
                
                console.log('选择了玩家ID:', i);
            });
            
            selector.appendChild(btn);
        }
    }
    
    // 初始生成默认按钮
    generatePlayerButtons(maxPlayers);
    
    // 当房间号输入完成时，查询房间状态
    if (roomIdInput) {
        roomIdInput.addEventListener('blur', () => {
            const roomId = roomIdInput.value.trim();
            if (roomId && roomId.length === 4) {
                queryRoomStatus(socket, roomId);
            }
        });
        
        // 也支持回车键查询
        roomIdInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const roomId = roomIdInput.value.trim();
                if (roomId && roomId.length === 4) {
                    queryRoomStatus(socket, roomId);
                }
            }
        });
    }
    
    // 监听房间状态更新
    socket.on('room-status', (data) => {
        if (data.takenNumbers) {
            updateTakenPlayerIds(data.takenNumbers);
        }
    });
    
    // 监听玩家编号更新（实时同步）
    socket.on('player-numbers-updated', (data) => {
        if (data.takenNumbers) {
            updateTakenPlayerIds(data.takenNumbers);
            
            // 如果当前选择的编号被占用了，提示用户
            const selectedId = parseInt(hiddenInput.value);
            if (selectedId && data.takenNumbers.includes(selectedId)) {
                alert('您选择的编号已被其他玩家占用，请选择其他编号');
                hiddenInput.value = '';
                selector.querySelectorAll('.player-id-btn').forEach(b => {
                    b.classList.remove('selected');
                });
                if (joinBtn) {
                    joinBtn.disabled = true;
                }
            }
        }
    });
}

// 查询房间状态
function queryRoomStatus(socket, roomId) {
    console.log('查询房间状态:', roomId);
    socket.emit('get-room-status', { roomId }, (response) => {
        if (response.success) {
            // 根据房间配置的玩家数量重新生成按钮
            if (response.configuredCount) {
                const selector = document.getElementById('playerIdSelector');
                const playerIdHint = document.getElementById('playerIdHint');
                if (selector) {
                    // 重新生成按钮
                    selector.innerHTML = '';
                    for (let i = 1; i <= response.configuredCount; i++) {
                        const btn = document.createElement('button');
                        btn.className = 'player-id-btn';
                        btn.textContent = i + '号';
                        btn.dataset.playerId = i;
                        btn.type = 'button';
                        
                        btn.addEventListener('click', () => {
                            if (btn.classList.contains('taken')) {
                                alert('该编号已被其他玩家选择，请选择其他编号');
                                return;
                            }
                            selector.querySelectorAll('.player-id-btn').forEach(b => {
                                b.classList.remove('selected');
                            });
                            btn.classList.add('selected');
                            document.getElementById('selectedPlayerId').value = i;
                            const joinBtn = document.getElementById('joinRoomBtn');
                            if (joinBtn) joinBtn.disabled = false;
                            console.log('选择了玩家ID:', i);
                        });
                        
                        selector.appendChild(btn);
                    }
                    // 更新提示文字
                    if (playerIdHint) {
                        playerIdHint.textContent = `请选择1-${response.configuredCount}之间的编号，灰色表示已被选择`;
                    }
                    console.log(`房间配置人数: ${response.configuredCount}, 已生成对应数量按钮`);
                }
            }
            
            // 更新已占用的编号
            if (response.takenNumbers) {
                updateTakenPlayerIds(response.takenNumbers);
                console.log('房间已占用编号:', response.takenNumbers);
            }
        }
    });
}

// 更新已占用的玩家ID显示
function updateTakenPlayerIds(takenIds) {
    const selector = document.getElementById('playerIdSelector');
    if (!selector) return;
    
    selector.querySelectorAll('.player-id-btn').forEach(btn => {
        const id = parseInt(btn.dataset.playerId);
        if (takenIds.includes(id)) {
            btn.classList.add('taken');
            btn.disabled = true;
            btn.title = '该编号已被选择';
        } else {
            btn.classList.remove('taken');
            btn.disabled = false;
            btn.title = '';
        }
    });
}

// 处理房间加入
function handleJoinRoom(socket, uiManager, gameCore) {
    const roomId = document.getElementById('roomIdInput').value.trim();
    const playerNumber = document.getElementById('selectedPlayerId').value;
    
    console.log(`玩家点击加入房间，房间号: ${roomId}, 玩家编号: ${playerNumber}`);
    
    // 输入验证
    if (!validateInput(roomId, playerNumber)) {
        return;
    }
    
    // 使用玩家编号作为名字（如"1号"）
    const playerName = playerNumber + '号';

    // 设置游戏信息
    gameCore.currentRoomId = roomId;
    gameCore.playerName = playerName;
    
    // 显示房间信息
    document.getElementById('currentRoomId').textContent = roomId;
    
    // 获取或创建客户端ID
    const clientId = localStorage.getItem('avalon_clientId') || (() => {
        const id = 'client_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('avalon_clientId', id);
        return id;
    })();
    
    // 获取之前保存的 playerId（如果有）- 从sessionStorage读取
    const savedPlayerId = sessionStorage.getItem('avalon_playerId');
    
    // 发送加入房间请求
    console.log('[客户端] 发送 player-join 请求...');
    socket.emit('player-join', {
        roomId: roomId,
        playerName: playerName,
        playerNumber: playerNumber,
        clientId: clientId,
        playerId: savedPlayerId
    }, (response) => {
        console.log('[客户端] 收到 player-join 回调:', response);
        
        if (!response.success) {
            console.error('[客户端] 加入房间失败:', response.message);
            showErrorToast(response.message || '加入房间失败');
            joinRoomBtn.disabled = false;
            return;
        }
        
        // 保存信息到sessionStorage
        sessionStorage.setItem('avalon_roomId', roomId);
        sessionStorage.setItem('avalon_playerId', response.playerId);
        sessionStorage.setItem('avalon_playerName', playerName);
        sessionStorage.setItem('avalon_playerNumber', playerNumber);
        
        // 更新游戏核心状态
        gameCore.init(socket, roomId, playerName);
        gameCore.playerId = response.playerId;
        
        // 显示等待屏幕
        uiManager.showScreen('waitingScreen');
        showSuccessToast('加入成功！等待游戏开始...');
        
        console.log('[客户端] 加入成功，playerId:', response.playerId);
    });
    console.log('[客户端] player-join 请求已发送');

    // 监听重连成功（处理同名玩家加入的情况）
    socket.once('player-reconnect-success', (data) => {
        console.log('[客户端] 收到 player-reconnect-success (来自 join):', data);
        console.log('[客户端] 当前游戏阶段:', data.gamePhase);
        console.log('[客户端] 玩家角色:', data.role, data.side);

        // 清除超时
        if (window.joinTimeout) {
            clearTimeout(window.joinTimeout);
            window.joinTimeout = null;
        }

        // 保存信息到sessionStorage（每个标签页独立保存）
        sessionStorage.setItem('avalon_roomId', data.roomId);
        sessionStorage.setItem('avalon_playerId', data.playerId);
        sessionStorage.setItem('avalon_playerName', data.playerName);
        
        // 从玩家名字中提取编号（如"1号" -> "1"）
        const playerNumberMatch = data.playerName.match(/^(\d+)号$/);
        if (playerNumberMatch) {
            sessionStorage.setItem('avalon_playerNumber', playerNumberMatch[1]);
        }

        // 更新游戏核心状态
        gameCore.init(socket, data.roomId, data.playerName);
        gameCore.playerId = data.playerId;
        gameCore.myRole = data.role || '';
        gameCore.mySide = data.side || '';
        
        // 更新玩家列表（包含 isLeader 属性）
        if (data.players) {
            gameCore.players = data.players;
            console.log('[客户端] 更新 players 数组:', gameCore.players.map(p => ({ name: p.name, isLeader: p.isLeader })));
        }
        
        // 更新队长索引
        if (data.currentLeaderIndex !== undefined) {
            gameCore.currentLeaderIndex = data.currentLeaderIndex;
        }

        // 更新UI
        if (data.role && data.side) {
            uiManager.updatePlayerRole(data.role, data.side);
        }
        uiManager.updatePlayerInfoBar();

        // 更新游戏状态
        if (data.gamePhase) {
            gameCore.currentPhase = data.gamePhase;
        }

        // 根据游戏阶段显示正确的屏幕
        const earlyPhases = ['waiting', 'waiting-players', 'ready-to-start', 'opening', 'role-assign', 'role-confirm'];

        if (data.gamePhase === 'waiting' || data.gamePhase === 'waiting-players') {
            uiManager.showScreen('waitingScreen');
        } else if (earlyPhases.includes(data.gamePhase)) {
            // 角色分配阶段或之前
            uiManager.showScreen('roleAssignmentScreen');
            if (data.role) {
                uiManager.showRoleScreen({
                    role: data.role,
                    side: data.side,
                    specialInfo: data.specialInfo
                });
            }
        } else {
            // 游戏已经开始，显示游戏屏幕
            uiManager.showScreen('gameScreen');
            uiManager.showGameScreen({
                phase: data.gamePhase,
                round: data.currentRound,
                players: data.players
            });

            // 根据具体阶段显示对应屏幕
            switch (data.gamePhase) {
                case 'voting':
                    uiManager.showVotingScreen({
                        team: data.currentTeam,
                        round: data.currentRound
                    });
                    break;
                case 'mission':
                    uiManager.showMissionScreen({
                        team: data.currentTeam,
                        round: data.currentRound
                    });
                    break;
                case 'night':
                    uiManager.showNightScreen({
                        phase: data.gamePhase,
                        specialInfo: data.specialInfo || []
                    });
                    break;
                case 'team-building':
                    uiManager.showTeamBuildingScreen({
                        round: data.currentRound,
                        players: data.players,
                        leader: data.leader,
                        currentLeaderIndex: data.currentLeaderIndex,
                        missionResults: data.missionResults
                    });
                    break;
            }
        }
        uiManager.hideLoading();

        // 更新玩家列表
        if (data.players) {
            uiManager.updatePlayerList(data.players);
        }

        // 更新当前任务信息
        if (data.currentMission) {
            uiManager.updateMissionInfo(data.currentMission);
        }

        // 更新任务历史
        if (data.missionHistory) {
            uiManager.updateMissionHistory(data.missionHistory);
        }

        // 更新房间信息
        document.getElementById('currentRoomId').textContent = data.roomId;

        // 更新全局变量
        savedPlayerId = data.playerId;
        savedRoomId = data.roomId;
        savedPlayerName = data.playerName;
        
        console.log('更新后的全局变量:', { savedPlayerId, savedRoomId, savedPlayerName });
        
        // 显示重连提示
        if (data.isOfflineReconnect) {
            // 离线重连提示
            showInfoToast('✅ 已恢复离线连接，继续游戏');
        } else if (data.isNameTaken) {
            // 同名玩家继承提示
            showWarningToast('⚠️ 检测到同名玩家在线，已继承其游戏状态');
        }
    });
}

// 输入验证
function validateInput(roomId, playerNumber) {
    if (!roomId) {
        alert('请输入房间号');
        return false;
    }
    
    if (!playerNumber) {
        alert('请选择玩家编号（1-10）');
        return false;
    }
    
    const num = parseInt(playerNumber);
    if (isNaN(num) || num < 1 || num > 10) {
        alert('玩家编号必须在1-10之间');
        return false;
    }
    
    return true;
}

// 初始化投票按钮事件
function initVotingEvents(socket, gameCore) {
    const approveBtn = document.getElementById('approveBtn');
    const rejectBtn = document.getElementById('rejectBtn');
    
    if (approveBtn) {
        approveBtn.addEventListener('click', () => {
            console.log('玩家点击赞成按钮');
            socket.emit('vote-team', {
                roomId: gameCore.currentRoomId,
                vote: 'approve'
            });
            // 禁用按钮防止重复投票
            approveBtn.disabled = true;
            rejectBtn.disabled = true;
            approveBtn.textContent = '已投票';
        });
    }
    
    if (rejectBtn) {
        rejectBtn.addEventListener('click', () => {
            console.log('玩家点击反对按钮');
            socket.emit('vote-team', {
                roomId: gameCore.currentRoomId,
                vote: 'reject'
            });
            // 禁用按钮防止重复投票
            approveBtn.disabled = true;
            rejectBtn.disabled = true;
            rejectBtn.textContent = '已投票';
        });
    }
    
    // 绑定任务执行按钮事件
    const successBtn = document.getElementById('successBtn');
    const failBtn = document.getElementById('failBtn');
    
    if (successBtn) {
        successBtn.addEventListener('click', () => {
            console.log('玩家点击任务成功按钮');
            socket.emit('execute-mission', {
                roomId: gameCore.currentRoomId,
                missionVote: 'success'
            });
            // 禁用按钮防止重复提交
            successBtn.disabled = true;
            if (failBtn) failBtn.disabled = true;
            successBtn.textContent = '已执行';
        });
    }
    
    if (failBtn) {
        failBtn.addEventListener('click', () => {
            console.log('玩家点击任务失败按钮');
            socket.emit('execute-mission', {
                roomId: gameCore.currentRoomId,
                missionVote: 'fail'
            });
            // 禁用按钮防止重复提交
            failBtn.disabled = true;
            if (successBtn) successBtn.disabled = true;
            failBtn.textContent = '已执行';
        });
    }
    
    console.log('投票按钮事件已初始化');
}

// 重置投票按钮状态（在每次进入投票阶段时调用）
function resetVotingButtons() {
    const approveBtn = document.getElementById('approveBtn');
    const rejectBtn = document.getElementById('rejectBtn');
    
    if (approveBtn) {
        approveBtn.disabled = false;
        approveBtn.textContent = '赞成';
    }
    
    if (rejectBtn) {
        rejectBtn.disabled = false;
        rejectBtn.textContent = '反对';
    }
}

// 重置任务按钮状态（在每次进入任务阶段时调用）
function resetMissionButtons() {
    const successBtn = document.getElementById('successBtn');
    const failBtn = document.getElementById('failBtn');
    
    if (successBtn) {
        successBtn.disabled = false;
        successBtn.textContent = '任务成功';
    }
    
    if (failBtn) {
        failBtn.disabled = false;
        failBtn.textContent = '任务失败';
    }
}

// 初始化游戏结束页面按钮事件
function initGameOverEvents() {
    const restartBtn = document.getElementById('restartBtn');
    if (restartBtn) {
        restartBtn.addEventListener('click', () => {
            // 清除保存的房间信息
            sessionStorage.removeItem('avalon_roomId');
            sessionStorage.removeItem('avalon_playerId');
            sessionStorage.removeItem('avalon_playerName');
            sessionStorage.removeItem('avalon_playerNumber');
            
            // 返回加入房间页面（当前页面）
            window.location.reload();
        });
    }
}
