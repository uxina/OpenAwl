// public/js/modules/team-builder.js
// 队伍组建逻辑模块
class TeamBuilder {
    constructor(gameCore) {
        this.gameCore = gameCore;
        this.selectedPlayers = new Set();
    }

    // 显示队伍组建界面（主控推进阶段后队长收到的回调）
    showTeamBuilder(data) {
        console.log('显示队伍组建界面:', data);
        
        // 清除之前的选择状态（防止上轮残留）
        this.selectedPlayers.clear();
        
        // 显示组队屏幕
        const uiManager = this.gameCore.uiManager;
        if (uiManager && uiManager.showScreen) {
            uiManager.showScreen('teamBuildingScreen');
        }
        
        // 更新队伍组建信息
        this.updateTeamBuildingInfo(data);
        
        // 检查当前玩家是否是队长，只有队长才能看到选择按钮
        const isLeader = this.gameCore.isLeader();
        console.log('showTeamBuilder - isLeader:', isLeader);
        this.updateTeamBuildingPlayerList(this.gameCore.players, isLeader);
        
        // 绑定清空选择按钮
        this.bindClearSelectionButton();
        
        // 绑定提交队伍按钮
        this.bindSubmitTeamButton();
        
        console.log('队伍组建界面已显示');
    }

    // 隐藏队伍组建界面
    hideTeamBuilder() {
        console.log('隐藏队伍组建界面');
        this.selectedPlayers.clear();
        
        // 隐藏组队屏幕
        const uiManager = this.gameCore.uiManager;
        if (uiManager && uiManager.hideScreen) {
            uiManager.hideScreen('teamBuildingScreen');
        }
    }

    // 更新队伍组建信息
    updateTeamBuildingInfo(data) {
        // 优先使用data.players更新本地players数组（规范化字段名）
        if (data.players) {
            // 规范化字段名：服务器发送 playerId/playerName，客户端期望 id/name
            this.gameCore.players = data.players.map(p => ({
                id: p.id || p.playerId,
                name: p.name || p.playerName,
                playerId: p.playerId || p.id,
                playerName: p.playerName || p.name,
                role: p.role,
                side: p.side,
                isLeader: false // 初始为 false，后续由 currentLeaderIndex 同步设置
            }));
            
            // 同步更新 all 玩家的 isLeader 标记（关键！在判断 isLeader() 之前必须执行）
            // 优先使用 currentLeaderName 匹配（避免索引错位问题），回退到 currentLeaderIndex
            if (data.currentLeaderName) {
                this.gameCore.players.forEach(p => {
                    p.isLeader = (p.name === data.currentLeaderName || p.playerName === data.currentLeaderName);
                });
            } else {
                const leaderIdx = data.currentLeaderIndex !== undefined ? data.currentLeaderIndex : this.gameCore.currentLeaderIndex;
                if (leaderIdx !== undefined && this.gameCore.players.length > 0) {
                    this.gameCore.players.forEach((p, index) => {
                        p.isLeader = (index === leaderIdx);
                    });
                    this.gameCore.currentLeaderIndex = leaderIdx;
                }
            }
        }
        
        const currentRoundDisplay = document.getElementById('currentRoundDisplay');
        const requiredTeamSize = document.getElementById('requiredTeamSize');
        const requiredSizeDisplay = document.getElementById('requiredSizeDisplay');
        const currentLeader = document.getElementById('currentLeader');
        const waitingLeader = document.getElementById('waitingLeader');
        const isLeaderInfo = document.getElementById('isLeaderInfo');
        const notLeaderInfo = document.getElementById('notLeaderInfo');
        
        // 兼容两种字段名：round 和 currentRound
        const round = data.round || data.currentRound || 1;
        if (currentRoundDisplay) currentRoundDisplay.textContent = round;
        
        const requiredSize = data.requiredSize || this.gameCore.getRequiredTeamSize(round, this.gameCore.players.length);
        
        if (requiredTeamSize) {
            requiredTeamSize.textContent = requiredSize;
        }
        
        if (requiredSizeDisplay) {
            requiredSizeDisplay.textContent = requiredSize;
        }
        
        if (currentLeader) currentLeader.textContent = this.gameCore.players[this.gameCore.currentLeaderIndex]?.name || '-';
        if (waitingLeader) waitingLeader.textContent = this.gameCore.players[this.gameCore.currentLeaderIndex]?.name || '-';
        
        // 检查当前玩家是否是队长
        const isLeader = this.gameCore.isLeader();
        const currentPlayerId = this.gameCore.getCurrentPlayer()?.id;
        const leaderPlayer = this.gameCore.players.find(p => p.isLeader);
        console.log('teamBuilder.updateTeamBuildingInfo - isLeader:', isLeader);
        console.log('teamBuilder.updateTeamBuildingInfo - currentPlayerId:', currentPlayerId);
        console.log('teamBuilder.updateTeamBuildingInfo - leaderPlayer:', leaderPlayer ? { id: leaderPlayer.id, name: leaderPlayer.name } : null);
        console.log('teamBuilder.updateTeamBuildingInfo - players:', this.gameCore.players.map(p => ({ id: p.id, name: p.name, isLeader: p.isLeader })));
        
        if (isLeaderInfo && notLeaderInfo) {
            if (isLeader) {
                isLeaderInfo.classList.remove('hidden');
                notLeaderInfo.classList.add('hidden');
            } else {
                isLeaderInfo.classList.add('hidden');
                notLeaderInfo.classList.remove('hidden');
            }
        }
    }

    // 更新队伍组建界面
    updateTeamBuildingScreen(data) {
        const isLeader = this.gameCore.isLeader();
        this.updateTeamBuildingPlayerList(data.players, isLeader);
        this.clearSelection();
        this.bindClearSelectionButton();
    }

    // 更新玩家列表
    updateTeamBuildingPlayerList(players, currentPlayerIsLeader) {
        const playerList = document.getElementById('teamBuildingPlayerList');
        playerList.innerHTML = '';
        
        players.forEach(player => {
            const playerItem = this.createPlayerItem(player, currentPlayerIsLeader);
            playerList.appendChild(playerItem);
        });
    }

    // 创建玩家列表项
    createPlayerItem(player, currentPlayerIsLeader) {
        const playerItem = document.createElement('div');
        playerItem.className = 'player-item';
        
        // 兼容两种字段名：player.name 和 player.playerName
        const playerName = player.name || player.playerName || '未知玩家';
        const playerId = player.id || player.playerId;
        const playerIsLeader = player.isLeader;
        const isMe = playerId === this.gameCore.socket.id ? '（我）' : '';
        const isSelected = this.selectedPlayers.has(playerId);
        
        // 只有当前玩家是队长时，才显示选择按钮
        const showSelectButton = currentPlayerIsLeader;
        
        playerItem.innerHTML = `
            <div class="player-info">
                <strong>${playerName}</strong>
                ${playerIsLeader ? '<span class="leader-badge">🚩 队长</span>' : ''}
                ${isMe}
            </div>
            ${showSelectButton ? `<div class="player-select ${isSelected ? 'selected' : ''}" data-id="${playerId}">${isSelected ? '✓' : '+'}</div>` : ''}
        `;
        
        // 如果显示选择按钮，添加点击事件
        if (showSelectButton) {
            const selectDiv = playerItem.querySelector('.player-select');
            selectDiv.addEventListener('click', () => {
                this.togglePlayerSelection(playerId, playerItem);
            });
        }
        
        return playerItem;
    }

    // 获取需要的队伍人数
    getRequiredTeamSize() {
        const requiredSizeElement = document.getElementById('requiredSizeDisplay') || document.getElementById('requiredTeamSize');
        const size = parseInt(requiredSizeElement?.textContent);
        // 确保返回有效的数字，默认2人
        return isNaN(size) || size < 1 ? 2 : size;
    }

    // 切换玩家选择状态
    togglePlayerSelection(playerId, playerItem) {
        const selectDiv = playerItem.querySelector('.player-select');
        
        const requiredTeamSize = this.getRequiredTeamSize();
        
        if (this.selectedPlayers.has(playerId)) {
            // 取消选择
            this.selectedPlayers.delete(playerId);
            selectDiv.classList.remove('selected');
            selectDiv.textContent = '+';
        } else {
            // 选择新玩家 - 严格检查是否已满
            if (this.selectedPlayers.size >= requiredTeamSize) {
                this.showError(`已达到人数上限（${requiredTeamSize}人），请先取消已选玩家`);
                return;
            }
            
            this.selectedPlayers.add(playerId);
            selectDiv.classList.add('selected');
            selectDiv.textContent = '✓';
        }
        
        // 更新提交按钮状态 - 只有选择正确数量时才启用
        const submitTeamBtn = document.getElementById('submitTeamBtn');
        if (submitTeamBtn) {
            const isCorrectSize = this.selectedPlayers.size === requiredTeamSize;
            submitTeamBtn.disabled = !isCorrectSize;
            
            // 更新按钮文字提示
            if (isCorrectSize) {
                submitTeamBtn.textContent = '提交队伍';
                submitTeamBtn.classList.remove('btn-disabled');
            } else {
                submitTeamBtn.textContent = `需选择${requiredTeamSize}人（当前${this.selectedPlayers.size}人）`;
            }
        }
        
        // 更新已选择队员显示
        this.updateSelectedPlayersDisplay();
        
        // 更新已选择数量显示
        const selectedCount = document.getElementById('selectedCount');
        if (selectedCount) {
            selectedCount.textContent = this.selectedPlayers.size;
        }
    }

    // 提交队伍
    submitTeam() {
        // 防止重复提交
        if (this.isSubmitting) {
            console.log('队伍提交中，忽略重复点击');
            return;
        }
        
        const requiredTeamSize = this.getRequiredTeamSize();
        
        // 严格验证选择数量
        if (this.selectedPlayers.size !== requiredTeamSize) {
            this.showError(`需要选择 ${requiredTeamSize} 名队员，当前选择了 ${this.selectedPlayers.size} 名`);
            return;
        }
        
        // 设置提交标志
        this.isSubmitting = true;
        
        // 队长可以选择是否加入队伍（不自动加入）
        const teamIds = Array.from(this.selectedPlayers);
        
        console.log('队长提交队伍:', teamIds, '需要人数:', requiredTeamSize);
        
        // 禁用提交按钮，防止重复提交
        const submitTeamBtn = document.getElementById('submitTeamBtn');
        if (submitTeamBtn) {
            submitTeamBtn.disabled = true;
            submitTeamBtn.textContent = '提交中...';
        }
        
        // 保存this引用，确保在回调中可用
        const self = this;
        
        this.gameCore.socket.emit('build-team', {
            roomId: this.gameCore.currentRoomId,
            teamMembers: teamIds
        }, (response) => {
            // 重置提交标志
            self.isSubmitting = false;
            
            if (response && response.success) {
                console.log('队伍提交成功:', response);
                self.hideTeamBuilder();
            } else {
                console.error('队伍提交失败:', response?.message || '未知错误');
                self.showError(response?.message || '提交失败，请重试');
                
                // 恢复提交按钮
                if (submitTeamBtn) {
                    submitTeamBtn.disabled = false;
                    submitTeamBtn.textContent = '提交队伍';
                }
            }
        });
    }

    // 更新已选择队员显示
    updateSelectedPlayersDisplay() {
        const selectedCount = document.getElementById('selectedCount');
        const selectedNames = document.getElementById('selectedNames');
        
        const requiredSize = this.getRequiredTeamSize();
        
        // 队长不自动加入，所以已选择人数就是 selectedPlayers.size
        const totalSelected = this.selectedPlayers.size;
        if (selectedCount) selectedCount.textContent = totalSelected;
        
        if (selectedNames) {
            if (this.selectedPlayers.size === 0) {
                selectedNames.textContent = '暂无选择';
            } else {
                // 获取选择的玩家名字
                const playerNames = Array.from(this.selectedPlayers).map(id => {
                    const player = this.gameCore.players.find(p => p.id === id);
                    return player ? player.name : id;
                });
                
                selectedNames.textContent = playerNames.join(', ');
            }
        }
    }

    // 清空选择
    clearSelection() {
        this.selectedPlayers.clear();
        this.updateSelectedPlayersDisplay();
        
        // 更新提交按钮状态和文字
        const submitTeamBtn = document.getElementById('submitTeamBtn');
        if (submitTeamBtn) {
            const requiredSize = this.getRequiredTeamSize();
            submitTeamBtn.disabled = true;
            submitTeamBtn.textContent = `需选择${requiredSize}人（当前0人）`;
            submitTeamBtn.classList.add('btn-disabled');
        }
        
        // 重置所有玩家选择按钮的显示状态
        const playerSelects = document.querySelectorAll('.player-select');
        playerSelects.forEach(selectDiv => {
            selectDiv.classList.remove('selected');
            selectDiv.textContent = '+';
        });
    }

    // 显示错误信息
    showError(message) {
        const errorDiv = document.getElementById('errorMessage');
        if (errorDiv) {
            errorDiv.textContent = message;
            errorDiv.classList.remove('hidden');
            setTimeout(() => {
                errorDiv.classList.add('hidden');
            }, 3000);
        }
    }

    // 绑定清空选择按钮
    bindClearSelectionButton() {
        const btn = document.getElementById('clearSelectionBtn');
        if (btn) {
            btn.onclick = () => {
                this.clearSelection();
            };
        }
    }

    // 绑定提交队伍按钮
    bindSubmitTeamButton() {
        const btn = document.getElementById('submitTeamBtn');
        if (btn) {
            btn.onclick = () => {
                this.submitTeam();
            };
        }
    }
}

// 导出模块
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TeamBuilder;
} else {
    window.TeamBuilder = TeamBuilder;
}