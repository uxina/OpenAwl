// 游戏核心逻辑模块
class GameCore {
    constructor() {
        this.socket = null;
        this.currentRoomId = '';
        this.playerName = '';
        this.myRole = '';
        this.mySide = '';
        this.specialInfo = [];
        this.gameState = 'waiting';
        this.currentPhase = 'waiting';
        this.players = [];
        this.currentLeaderIndex = 0;
        this.selectedPlayers = new Set();
        this.selectedTarget = null;
        this.uiManager = null;
    }

    // 初始化游戏
    init(socket, roomId, playerName) {
        this.socket = socket;
        this.currentRoomId = roomId;
        this.playerName = playerName;
        console.log('游戏核心初始化完成');
    }

    // 设置UI管理器引用
    setUIManager(uiManager) {
        this.uiManager = uiManager;
    }

    // 设置队伍组建器引用
    setTeamBuilder(teamBuilder) {
        this.teamBuilder = teamBuilder;
    }

    // 获取当前玩家信息
    getCurrentPlayer() {
        const savedPlayerId = sessionStorage.getItem('avalon_playerId');
        return {
            id: savedPlayerId || this.socket?.id,
            name: this.playerName,
            role: this.myRole,
            side: this.mySide
        };
    }

    // 检查是否是队长
    isLeader() {
        const currentPlayer = this.getCurrentPlayer();
        console.log('[isLeader] currentPlayer:', currentPlayer);
        console.log('[isLeader] this.players:', this.players.map(p => ({ id: p.id, name: p.name, isLeader: p.isLeader })));
        
        // 先尝试用 ID 匹配
        let player = this.players.find(p => p.id === currentPlayer.id);
        console.log('[isLeader] found player by ID:', player);
        
        // 如果 ID 匹配失败，回退到名字匹配（避免索引错位问题）
        if (!player && currentPlayer.name) {
            player = this.players.find(p => p.name === currentPlayer.name || p.playerName === currentPlayer.name);
            console.log('[isLeader] found player by name:', player);
        }
        
        console.log('[isLeader] result:', player?.isLeader || false);
        return player?.isLeader || false;
    }

    // 检查当前玩家是否在任务队伍中
    isInTeam() {
        const currentPlayer = this.getCurrentPlayer();
        console.log('[isInTeam] currentPlayer.id:', currentPlayer.id);
        console.log('[isInTeam] players:', this.players.map(p => ({ id: p.id, name: p.name, inTeam: p.inTeam })));
        
        // 先尝试用 ID 匹配
        let player = this.players.find(p => p.id === currentPlayer.id);
        
        // 如果 ID 匹配失败，回退到名字匹配
        if (!player && currentPlayer.name) {
            player = this.players.find(p => p.name === currentPlayer.name || p.playerName === currentPlayer.name);
        }
        
        console.log('[isInTeam] found player:', player);
        return player?.inTeam || false;
    }

    // 获取需要的队伍人数
    getRequiredTeamSize(round, playerCount) {
        const missionConfig = {
            5: [2, 3, 2, 3, 3],  // 5人游戏
            6: [2, 3, 4, 3, 4],  // 6人游戏
            7: [2, 3, 3, 4, 4],  // 7人游戏
            8: [3, 4, 4, 5, 5],  // 8人游戏
            9: [3, 4, 4, 5, 5],  // 9人游戏
            10: [3, 4, 4, 5, 5]  // 10人游戏
        };
        
        const config = missionConfig[playerCount] || missionConfig[5];
        return config[round - 1] || 2;
    }

    // 获取角色名称
    getRoleName(role) {
        const roleNames = {
            'merlin': '梅林',
            'percival': '派西维尔',
            'servant': '忠臣',
            'morgana': '莫甘娜',
            'assassin': '刺客',
            'mordred': '莫德雷德',
            'oberon': '奥伯伦'
        };
        return roleNames[role] || role;
    }

    // 清空选择
    clearSelection() {
        this.selectedPlayers.clear();
        this.selectedTarget = null;
    }

    // 更新游戏状态
    updateGameState(newState, phase) {
        this.gameState = newState;
        this.currentPhase = phase;
        console.log(`游戏状态更新: ${newState}, 阶段: ${phase}`);
    }

    // 重置游戏
    resetGame() {
        console.log('重置游戏核心状态');
        this.myRole = '';
        this.mySide = '';
        this.specialInfo = [];
        this.gameState = 'waiting';
        this.currentPhase = 'waiting';
        this.players = [];
        this.currentLeaderIndex = 0;
        this.selectedPlayers.clear();
        this.selectedTarget = null;
        console.log('游戏核心状态已重置');
    }
}

// 导出模块
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GameCore;
} else {
    window.GameCore = GameCore;
}