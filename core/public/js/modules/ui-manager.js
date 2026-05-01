// public/js/modules/ui-manager.js
// 界面管理模块
class UIManager {
    constructor(gameCore) {
        this.gameCore = gameCore;
        this.currentScreen = 'waitingScreen';
    }

    // 显示指定屏幕
    showScreen(screenId) {
        console.log(`showScreen 被调用: ${screenId}`);

        // 隐藏所有屏幕
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.add('hidden');
            screen.classList.remove('active');
        });

        // 显示目标屏幕
        const targetScreen = document.getElementById(screenId);
        console.log(`目标屏幕元素:`, targetScreen);

        if (targetScreen) {
            targetScreen.classList.remove('hidden');
            targetScreen.classList.add('active');
            this.currentScreen = screenId;
            console.log(`切换到屏幕成功: ${screenId}`);
        } else {
            console.error(`屏幕未找到: ${screenId}`);
        }

        // 显示玩家信息栏（除了加入屏幕）
        const playerInfoBar = document.getElementById('playerInfoBar');
        if (playerInfoBar) {
            if (screenId !== 'joinScreen' && screenId !== 'loading') {
                playerInfoBar.classList.remove('hidden');
                this.updatePlayerInfoBar();
            } else {
                playerInfoBar.classList.add('hidden');
            }
        }
    }

    // 隐藏指定屏幕
    hideScreen(screenId) {
        console.log(`hideScreen 被调用: ${screenId}`);
        const targetScreen = document.getElementById(screenId);
        if (targetScreen) {
            targetScreen.classList.add('hidden');
            targetScreen.classList.remove('active');
            console.log(`隐藏屏幕成功: ${screenId}`);
        } else {
            console.error(`屏幕未找到: ${screenId}`);
        }
    }

    // 更新玩家信息栏
    updatePlayerInfoBar() {
        const nameElement = document.getElementById('currentPlayerName');
        const roleElement = document.getElementById('currentPlayerRole');
        const sideElement = document.getElementById('currentPlayerSide');

        // 更新名字
        if (nameElement && this.gameCore.playerName) {
            nameElement.textContent = this.gameCore.playerName;
        }

        // 更新角色（如果已分配）
        if (roleElement && this.gameCore.myRole) {
            const roleName = this.gameCore.getRoleName(this.gameCore.myRole);
            roleElement.querySelector('strong').textContent = roleName;
            roleElement.classList.remove('hidden');

            // 根据阵营设置颜色
            roleElement.className = 'player-role-display';
            if (this.gameCore.mySide === 'good') {
                roleElement.classList.add('good');
            } else if (this.gameCore.mySide === 'evil') {
                roleElement.classList.add('evil');
            }
        }

        // 更新阵营（如果已分配）
        if (sideElement && this.gameCore.mySide) {
            const sideName = this.gameCore.mySide === 'good' ? '好人' : '坏人';
            sideElement.querySelector('strong').textContent = sideName;
            sideElement.classList.remove('hidden');

            // 根据阵营设置颜色
            sideElement.className = 'player-side-display';
            if (this.gameCore.mySide === 'good') {
                sideElement.classList.add('good');
            } else {
                sideElement.classList.add('evil');
            }
        }
    }

    // 显示等待屏幕
    showWaitingScreen(data) {
        this.showScreen('waitingScreen');
        this.updateWaitingScreen(data);
    }

    // 显示角色分配屏幕
    showRoleAssignmentScreen(data) {
        this.showScreen('roleAssignmentScreen');
        this.updateRoleInfo(data);
    }

    // 显示角色屏幕（角色分配后）
    showRoleScreen(data) {
        console.log('显示角色屏幕:', data);

        // 保存角色信息到 gameCore
        if (data.role) {
            this.gameCore.myRole = data.role;
        }
        if (data.side) {
            this.gameCore.mySide = data.side;
        }
        if (data.specialInfo) {
            this.gameCore.specialInfo = data.specialInfo;
        }

        // 使用现有的角色分配屏幕
        this.showScreen('roleAssignmentScreen');
        this.updateRoleInfo(data);

        // 更新玩家信息栏（显示角色和阵营）
        this.updatePlayerInfoBar();

        // 绑定确认按钮事件
        const readyBtn = document.getElementById('readyBtn');
        if (readyBtn) {
            readyBtn.onclick = () => {
                console.log('玩家确认身份');
                readyBtn.disabled = true;
                readyBtn.textContent = '已确认，等待其他玩家...';
                
                // 发送确认身份消息到服务器
                if (this.gameCore.socket) {
                    this.gameCore.socket.emit('confirm-role', {
                        roomId: this.gameCore.currentRoomId
                    });
                }
            };
        }
    }

    // 显示游戏屏幕（游戏开始后）
    showGameScreen(data) {
        console.log('显示游戏屏幕:', data);
        console.log('gameCore.myRole:', this.gameCore.myRole);
        
        // 只有在角色信息已经收到后才显示对应屏幕
        // 角色信息会在 role-assigned 事件中设置
        if (!this.gameCore.myRole) {
            console.log('角色信息尚未收到，等待角色分配...');
            // 显示加载提示，而不是什么都不显示
            this.showLoading('等待角色分配...');
            return;
        }
        
        this.hideLoading();
        
        // 根据当前阶段显示不同的界面
        if (data.phase === 'night') {
            this.showNightScreen(data);
        } else if (data.phase === 'team-building') {
            this.showTeamBuildingScreen(data);
        } else if (data.phase === 'voting') {
            this.showVotingScreen(data);
        } else if (data.phase === 'mission') {
            this.showMissionScreen(data);
        }
    }

    // 显示夜间屏幕
    showNightScreen(data) {
        console.log('显示夜间屏幕:', data);
        console.log('gameCore.playerName:', this.gameCore.playerName);
        console.log('gameCore.myRole:', this.gameCore.myRole);
        console.log('gameCore.mySide:', this.gameCore.mySide);
        
        this.showScreen('nightScreen');
        
        // 显示当前身份
        const roleName = this.gameCore.getRoleName(this.gameCore.myRole);
        const sideName = this.gameCore.mySide === 'good' ? '好人' : '坏人';
        
        const nightMyName = document.getElementById('nightMyName');
        const nightMyRole = document.getElementById('nightMyRole');
        const nightMySide = document.getElementById('nightMySide');
        const nightRoleInfo = document.getElementById('nightRoleInfo');
        const nightRoleIcon = document.getElementById('nightRoleIcon');
        
        console.log('夜间屏幕元素:', { nightMyName, nightMyRole, nightMySide, nightRoleInfo });
        
        if (nightMyName) nightMyName.textContent = this.gameCore.playerName || '未知';
        if (nightMyRole) nightMyRole.textContent = roleName;
        if (nightMySide) nightMySide.textContent = sideName;
        
        // 设置角色图标
        if (nightRoleIcon) {
            const icons = {
                'merlin': '🧙‍♂️',
                'percival': '⚔️',
                'servant': '🛡️',
                'assassin': '🗡️',
                'morgana': '🧙‍♀️',
                'mordred': '👹',
                'oberon': '👤'
            };
            nightRoleIcon.textContent = icons[this.gameCore.myRole] || '🎭';
        }
        
        // 根据阵营设置颜色
        if (nightRoleInfo) {
            nightRoleInfo.className = 'night-role-info';
            if (this.gameCore.mySide === 'good') {
                nightRoleInfo.classList.add('good');
            } else {
                nightRoleInfo.classList.add('evil');
            }
        }
        
        // 显示技能信息
        this.updateNightAbilityInfo();
        
        // 显示阵营信息
        this.updateFactionInfo(data.players);
        
        // 显示特殊信息（梅林看到坏人等）
        this.updateSpecialInfo(data.specialInfo);
    }
    
    // 更新夜间技能信息
    updateNightAbilityInfo() {
        const nightAbilityText = document.getElementById('nightAbilityText');
        if (!nightAbilityText) return;
        
        const abilities = {
            'merlin': '你是正义方的智者。夜间你可以看到所有坏人的身份（除了莫德雷德）。',
            'percival': '你是忠诚的骑士。夜间你可以看到梅林和莫甘娜，但分不清谁是谁。',
            'servant': '你是亚瑟王的忠实仆人。你没有特殊能力，但你是正义的伙伴。',
            'assassin': '你是邪恶方的刺客。夜间你可以看到其他坏人（除了奥伯伦）。游戏结束时你可以刺杀梅林。',
            'morgana': '你是邪恶方的女巫。夜间你可以看到其他坏人（除了奥伯伦）。你会被派西维尔看到，让他分不清谁是梅林。',
            'mordred': '你是邪恶方的黑暗骑士。夜间你可以看到其他坏人（除了奥伯伦）。梅林看不到你的身份。',
            'oberon': '你是邪恶方的神秘人。你看不到其他坏人，他们也看不到你。'
        };
        
        nightAbilityText.textContent = abilities[this.gameCore.myRole] || '完成你的阵营目标。';
    }
    
    // 更新阵营信息
    updateFactionInfo(players) {
        const factionMembers = document.getElementById('factionMembers');
        if (!factionMembers) return;
        
        if (!players || players.length === 0) {
            factionMembers.textContent = '暂无阵营信息';
            return;
        }
        
        // 根据角色显示不同的阵营信息
        const myRole = this.gameCore.myRole;
        let factionText = '';
        
        if (myRole === 'merlin') {
            // 梅林看到所有坏人（除了莫德雷德）
            const evilPlayers = players.filter(p => p.side === 'evil' && p.role !== 'mordred');
            factionText = '<div class="faction-section evil"><h4>你看到的坏人（除了莫德雷德）:</h4>' +
                evilPlayers.map(p => `<div class="faction-player evil">${p.name} (${this.gameCore.getRoleName(p.role)})</div>`).join('') +
                '</div>';
        } else if (myRole === 'percival') {
            // 派西维尔看到梅林和莫甘娜
            const merlinAndMorgana = players.filter(p => p.role === 'merlin' || p.role === 'morgana');
            factionText = '<div class="faction-section"><h4>你看到的梅林和莫甘娜:</h4>' +
                merlinAndMorgana.map(p => `<div class="faction-player">${p.name} (${this.gameCore.getRoleName(p.role)})</div>`).join('') +
                '</div>';
        } else if (['assassin', 'morgana', 'mordred'].includes(myRole)) {
            // 坏人看到其他坏人（除了奥伯伦）
            const evilPlayers = players.filter(p => p.side === 'evil' && p.role !== 'oberon' && p.id !== this.gameCore.socket?.id);
            if (evilPlayers.length > 0) {
                factionText = '<div class="faction-section evil"><h4>你的邪恶同伴:</h4>' +
                    evilPlayers.map(p => `<div class="faction-player evil">${p.name} (${this.gameCore.getRoleName(p.role)})</div>`).join('') +
                    '</div>';
            } else {
                factionText = '<div class="faction-section">你没有看到其他坏人</div>';
            }
        } else if (myRole === 'oberon') {
            factionText = '<div class="faction-section">你看不到其他坏人</div>';
        } else if (myRole === 'servant') {
            // 忠臣看不到任何人，但显示阵营信息
            factionText = '<div class="faction-section good"><h4>你是忠臣</h4><p>你的任务是帮助好人阵营完成3次任务成功</p></div>';
        } else {
            // 其他情况（理论上不会发生）
            factionText = '<div class="faction-section">暂无阵营信息</div>';
        }
        
        factionMembers.innerHTML = factionText;
    }

    // 显示白天/讨论屏幕
    showDayScreen(data) {
        console.log('显示白天屏幕:', data);
        this.showScreen('dayScreen');
        
        // 更新白天阶段信息
        const dayMessage = document.getElementById('dayMessage');
        const dayRound = document.getElementById('dayRound');
        
        if (dayMessage) {
            dayMessage.textContent = data.message || '天亮了，大家请开始讨论';
        }
        if (dayRound) {
            dayRound.textContent = data.round || 1;
        }
        
        // 3秒后自动跳转到组队阶段提示
        setTimeout(() => {
            const autoAdvanceMessage = document.getElementById('autoAdvanceMessage');
            if (autoAdvanceMessage) {
                autoAdvanceMessage.textContent = '讨论时间结束，即将进入组队阶段...';
                autoAdvanceMessage.classList.remove('hidden');
            }
        }, 3000);
    }

    // 显示组队屏幕
    showTeamBuildingScreen(data) {
        this.showScreen('teamBuildingScreen');
        this.updateTeamBuildingInfo(data);
    }

    // 显示投票屏幕
    showVotingScreen(data) {
        this.showScreen('votingScreen');
        this.updateVotingInfo(data);
    }

    // 显示任务屏幕
    showMissionScreen(data) {
        this.showScreen('missionScreen');
        this.updateMissionInfo(data);
    }

    // 显示游戏结束屏幕
    showGameOverScreen(data) {
        this.showScreen('gameOverScreen');
        this.updateGameResult(data);
    }

    // 显示刺杀阶段屏幕
    showAssassinationScreen(data) {
        this.showScreen('assassinationScreen');
        this.updateAssassinationScreen(data);
    }

    // 更新刺杀阶段屏幕
    updateAssassinationScreen(data) {
        const playerList = document.getElementById('assassinationPlayerList');
        const resultDiv = document.getElementById('assassinationResult');
        
        // 检查当前玩家是否是刺客
        const isAssassin = this.gameCore.myRole === 'assassin';
        console.log('updateAssassinationScreen - myRole:', this.gameCore.myRole, 'isAssassin:', isAssassin);
        console.log('updateAssassinationScreen - players:', this.gameCore.players.map(p => ({ name: p.name, side: p.side })));
        
        // 获取当前玩家ID
        const currentPlayerId = this.gameCore.getCurrentPlayer?.()?.id || sessionStorage.getItem('avalon_playerId');
        console.log('updateAssassinationScreen - currentPlayerId:', currentPlayerId);
        
        if (resultDiv) {
            resultDiv.classList.add('hidden');
        }
        
        if (playerList) {
            playerList.innerHTML = '';
            
            // 只显示好人阵营的玩家（刺客只能刺杀好人）
            const goodPlayers = this.gameCore.players.filter(p => p.side === 'good');
            console.log('updateAssassinationScreen - goodPlayers:', goodPlayers.map(p => p.name));
            
            goodPlayers.forEach(player => {
                const playerItem = document.createElement('div');
                playerItem.className = 'player-item';
                
                const isMe = player.id === currentPlayerId ? '（我）' : '';
                
                // 只有刺客才能看到选择按钮，且不能刺杀自己
                if (isAssassin && player.id !== currentPlayerId) {
                    playerItem.innerHTML = `
                        <div class="player-info">
                            <strong>${player.name}</strong>
                            ${isMe}
                        </div>
                        <button class="btn btn-danger assassinate-btn" data-id="${player.id}">刺杀</button>
                    `;
                    
                    // 添加刺杀按钮事件
                    const assassinateBtn = playerItem.querySelector('.assassinate-btn');
                    assassinateBtn.addEventListener('click', () => {
                        this.assassinatePlayer(player.id);
                    });
                } else {
                    playerItem.innerHTML = `
                        <div class="player-info">
                            <strong>${player.name}</strong>
                            ${isMe}
                        </div>
                    `;
                }
                
                playerList.appendChild(playerItem);
            });
        }
        
        // 如果不是刺客，显示等待信息
        if (!isAssassin && resultDiv) {
            resultDiv.classList.remove('hidden');
            resultDiv.innerHTML = '<div class="waiting-message">等待刺客行动...</div>';
        }
    }

    // 刺杀玩家
    assassinatePlayer(targetId) {
        console.log('刺杀目标:', targetId);
        
        // 发送刺杀请求到服务器
        if (this.gameCore.socket) {
            this.gameCore.socket.emit('assassinate', {
                roomId: this.gameCore.currentRoomId,
                targetPlayerId: targetId
            });
        }
        
        // 禁用所有刺杀按钮
        const buttons = document.querySelectorAll('.assassinate-btn');
        buttons.forEach(btn => {
            btn.disabled = true;
            btn.textContent = '已选择';
        });
    }

    // 显示刺杀结果
    showAssassinationResult(data) {
        const resultDiv = document.getElementById('assassinationResult');
        if (!resultDiv) return;
        
        resultDiv.classList.remove('hidden');
        
        const isCorrect = data.isCorrect;
        const merlinPlayer = this.gameCore.players.find(p => p.role === 'merlin');
        
        if (isCorrect) {
            resultDiv.innerHTML = `
                <div class="assassination-fail">
                    <div>🎯 刺杀成功！</div>
                    <div style="font-size: 0.9em; margin-top: 8px;">刺客找到了梅林！</div>
                    <div style="font-size: 0.8em; margin-top: 5px; color: #e74c3c;">邪恶方胜利！</div>
                </div>
            `;
        } else {
            resultDiv.innerHTML = `
                <div class="assassination-success">
                    <div>❌ 刺杀失败！</div>
                    <div style="font-size: 0.9em; margin-top: 8px;">刺客没有刺中梅林！</div>
                    <div style="font-size: 0.8em; margin-top: 5px; color: #27ae60;">好人方胜利！</div>
                </div>
            `;
        }
    }

    // 更新等待屏幕信息
    updateWaitingScreen(data) {
        console.log('updateWaitingScreen 被调用:', data);
        
        const currentPlayerCount = document.getElementById('currentPlayerCount');
        console.log('currentPlayerCount 元素:', currentPlayerCount);
        
        if (data.players) {
            console.log('玩家列表:', data.players);
            if (currentPlayerCount) {
                currentPlayerCount.textContent = data.players.length;
            }
            // 等待游戏开始时，不显示阵营（showSide: false）
            this.updatePlayerList(data.players, { showSide: false });
        } else {
            console.log('没有玩家列表数据');
        }
        
        // 绑定查看规则按钮
        const showRulesBtn = document.getElementById('showRulesBtn');
        if (showRulesBtn) {
            showRulesBtn.onclick = () => {
                this.showRulesScreen();
            };
        }
    }

    // 显示规则说明屏幕
    showRulesScreen() {
        this.showScreen('rulesScreen');
        
        // 绑定"我明白了"按钮
        const understoodBtn = document.getElementById('understoodBtn');
        if (understoodBtn) {
            understoodBtn.onclick = () => {
                this.showWaitingScreen({});
            };
        }
    }

    // 更新角色信息
    updateRoleInfo(data) {
        if (data.role) {
            const roleName = this.gameCore.getRoleName(data.role);
            const sideName = data.side === 'good' ? '好人' : '坏人';
            
            document.getElementById('myRole').textContent = roleName;
            document.getElementById('mySide').textContent = sideName;
            
            // 设置阵营样式
            const sideElement = document.getElementById('mySide');
            if (sideElement) {
                sideElement.className = data.side === 'good' ? 'good' : 'evil';
            }
            
            // 设置角色图标
            const roleIcon = document.getElementById('roleIcon');
            if (roleIcon) {
                const icons = {
                    'merlin': '🧙‍♂️',
                    'percival': '⚔️',
                    'servant': '🛡️',
                    'assassin': '🗡️',
                    'morgana': '🧙‍♀️',
                    'mordred': '👹',
                    'oberon': '👤'
                };
                roleIcon.textContent = icons[data.role] || '🎭';
            }
            
            // 设置角色描述
            const descriptions = {
                'merlin': '你是正义方的智者，知道所有坏人的身份，但必须隐藏自己不被刺客发现。',
                'percival': '你是忠诚的骑士，知道梅林和莫甘娜的身份，但不知道谁是真正的梅林。',
                'servant': '你是亚瑟王的忠实仆人，与正义方一起完成三次任务成功。',
                'assassin': '你是邪恶方的刺客，任务是在游戏结束时刺杀梅林。',
                'morgana': '你是邪恶方的女巫，伪装成梅林迷惑派西维尔。',
                'mordred': '你是邪恶方的黑暗骑士，梅林看不到你的身份。',
                'oberon': '你是邪恶方的神秘人，看不到其他坏人，其他坏人也看不到你。'
            };
            
            const descriptionElement = document.getElementById('roleDescription');
            if (descriptionElement) {
                descriptionElement.textContent = descriptions[data.role] || '完成你的阵营目标。';
            }
            
            // 设置角色能力
            const abilities = {
                'merlin': '能力：夜间可以看到所有坏人（除了莫德雷德）',
                'percival': '能力：夜间可以看到梅林和莫甘娜（但分不清谁是谁）',
                'servant': '能力：无特殊能力，但你是正义的伙伴',
                'assassin': '能力：游戏结束时可以刺杀一名玩家',
                'morgana': '能力：你会被派西维尔看到，让他分不清谁是梅林',
                'mordred': '能力：梅林看不到你',
                'oberon': '能力：你看不到其他坏人，他们也看不到你'
            };
            
            const abilityElement = document.getElementById('roleAbility');
            if (abilityElement) {
                abilityElement.textContent = abilities[data.role] || '';
            }
            
            // 设置角色提示
            const hints = {
                'merlin': '提示：小心不要暴露自己！刺客在寻找你。帮助好人完成任务，但不要太过明显。',
                'percival': '提示：观察那两个玩家，通过他们的行为判断谁是真正的梅林。',
                'servant': '提示：支持看起来可信的玩家，帮助梅林隐藏身份。',
                'assassin': '提示：观察谁可能是梅林（那些对坏人身份了解太多的人），准备刺杀。',
                'morgana': '提示：表现得像个好人，迷惑派西维尔，让他以为你是梅林。',
                'mordred': '提示：利用梅林看不到你的优势，积极参与任务破坏。',
                'oberon': '提示：你不知道队友是谁，需要通过观察找出他们。'
            };
            
            const hintElement = document.getElementById('roleHintText');
            if (hintElement) {
                hintElement.textContent = hints[data.role] || '完成你的阵营目标。';
            }
        }
    }

    // 更新特殊角色信息
    updateSpecialInfo(specialInfo) {
        const specialInfoDiv = document.getElementById('specialInfo');
        specialInfoDiv.innerHTML = '';
        
        if (!specialInfo || specialInfo.length === 0) {
            specialInfoDiv.innerHTML = '<div style=\"color: #7f8c8d;\">无特殊信息</div>';
            return;
        }
        
        specialInfo.forEach(info => {
            const infoDiv = document.createElement('div');
            infoDiv.className = 'special-info-item';
            
            switch (info.type) {
                case 'see-merlin-morgana':
                    infoDiv.innerHTML = '<h4>派西维尔视角</h4><p>你看到以下玩家是梅林或莫甘娜：</p>' + 
                        info.players.map(p => `<div>${p.name} - ${p.role}</div>`).join('');
                    break;
                case 'see-evil':
                    // 根据当前角色判断是梅林还是坏人
                    if (this.gameCore.myRole === 'merlin') {
                        infoDiv.innerHTML = '<h4>梅林视角</h4><p>你看到的坏人是：</p>' + 
                            info.players.map(p => `<div>${p.name} - ${p.role}</div>`).join('');
                    } else {
                        infoDiv.innerHTML = '<h4>坏人视角</h4><p>你的队友是：</p>' + 
                            info.players.map(p => `<div>${p.name} - ${this.gameCore.getRoleName(p.role)}</div>`).join('');
                    }
                    break;
                case 'see-merlin':
                    infoDiv.innerHTML = '<h4>莫甘娜视角</h4><p>你看到梅林是：</p>' + 
                        info.players.map(p => `<div>${p.name}</div>`).join('');
                    break;
                default:
                    infoDiv.innerHTML = `<div>未知信息类型: ${info.type}</div>`;
            }
            
            specialInfoDiv.appendChild(infoDiv);
        });
    }

    // 更新组队信息
    updateTeamBuildingInfo(data) {
        console.log('updateTeamBuildingInfo - 收到的数据:', {
            leader: data.leader,
            currentLeaderIndex: data.currentLeaderIndex,
            round: data.round,
            currentRound: data.currentRound,
            players: data.players?.length
        });
        
        // 兼容两种字段名：leader/playerName 和 currentLeaderIndex/currentRound
        const leaderIndex = data.currentLeaderIndex !== undefined ? data.currentLeaderIndex : (data.leaderIndex !== undefined ? data.leaderIndex : -1);
        const round = data.round || data.currentRound || 1;
        const playerCount = data.playerCount || this.gameCore.players.length || 5;
        
        // 获取队长名字 - 优先使用服务器发送的 currentLeaderName
        let leaderName = data.currentLeaderName || data.leader || '系统选择中';
        if (leaderIndex >= 0 && data.players && data.players[leaderIndex]) {
            leaderName = data.players[leaderIndex].playerName || data.players[leaderIndex].name || leaderName;
        }
        
        document.getElementById('currentLeader').textContent = leaderName;
        document.getElementById('waitingLeader').textContent = leaderName;
        document.getElementById('currentRoundDisplay').textContent = round;
        
        // 优先使用data.players更新本地players数组（兼容两种字段名）
        // 关键：用 currentLeaderName 来设置 isLeader，而不是依赖服务器发送的 isLeader
        if (data.players) {
            const leaderName = data.currentLeaderName || data.leader || null;
            this.gameCore.players = data.players.map(p => {
                const playerId = p.id || p.playerId;
                const playerName = p.name || p.playerName || '未知玩家';
                // 根据队长名字设置 isLeader
                const isLeader = leaderName ? (playerName === leaderName) : (p.isLeader || false);
                return {
                    id: playerId,
                    name: playerName,
                    playerName: playerName,
                    role: p.role,
                    side: p.side,
                    isLeader: isLeader,
                    playerNumber: p.playerNumber
                };
            });
            console.log('updateTeamBuildingInfo - 已用 currentLeaderName 同步 isLeader:', 
                this.gameCore.players.map(p => ({ name: p.name, isLeader: p.isLeader })));
        }
        
        // 获取玩家数量（优先使用data.playerCount，否则使用players数组长度）
        const requiredTeamSize = this.gameCore.getRequiredTeamSize(round, playerCount);
        document.getElementById('requiredTeamSize').textContent = requiredTeamSize;
        document.getElementById('requiredSizeDisplay').textContent = requiredTeamSize;
        
        // 检查当前玩家是否是队长
        const isLeader = this.gameCore.isLeader();
        console.log('updateTeamBuildingInfo - isLeader:', isLeader);
        console.log('updateTeamBuildingInfo - 当前玩家ID:', this.gameCore.socket?.id);
        console.log('updateTeamBuildingInfo - players:', this.gameCore.players.map(p => ({ id: p.id, name: p.name, isLeader: p.isLeader })));
        
        const isLeaderInfo = document.getElementById('isLeaderInfo');
        const notLeaderInfo = document.getElementById('notLeaderInfo');
        
        if (isLeader) {
            isLeaderInfo.classList.remove('hidden');
            notLeaderInfo.classList.add('hidden');
        } else {
            isLeaderInfo.classList.add('hidden');
            notLeaderInfo.classList.remove('hidden');
        }
        
        // 重置提交按钮状态（按钮在isLeaderInfo面板内，面板隐藏时按钮自然不可见）
        const submitTeamBtn = document.getElementById('submitTeamBtn');
        if (submitTeamBtn) {
            submitTeamBtn.disabled = true;
        }
        
        // 更新玩家列表显示（只有队长才能看到选择按钮）
        if (this.gameCore.teamBuilder) {
            this.gameCore.teamBuilder.updateTeamBuildingPlayerList(this.gameCore.players, isLeader);
        }
        
        // 更新任务历史显示
        this.updateMissionHistory(data.missionResults || []);
    }

    // 更新任务历史信息条
    updateMissionHistory(missionResults) {
        const missionHistoryList = document.getElementById('missionHistoryList');
        if (!missionHistoryList) return;
        
        if (missionResults.length === 0) {
            missionHistoryList.innerHTML = '<div class="no-mission">暂无任务记录</div>';
            return;
        }
        
        let html = '';
        missionResults.forEach((result, index) => {
            const round = index + 1;
            const isSuccess = result.result === 'success';
            const statusClass = isSuccess ? 'mission-success' : 'mission-fail';
            const statusText = isSuccess ? '✅ 成功' : '❌ 失败';
            
            // 获取该轮的队员名单（如果有）
            let teamMembersText = '';
            if (result.teamMembers && result.teamMembers.length > 0) {
                teamMembersText = `<div class="mission-team">队员: ${result.teamMembers.join(', ')}</div>`;
            }
            
            // 获取投票结果（如果有）
            let voteInfoText = '';
            if (result.voteResult) {
                voteInfoText = `<div class="mission-vote">投票: ${result.voteResult.approve}票同意 / ${result.voteResult.reject}票反对</div>`;
            }
            
            // 获取详细投票名单（approvePlayers/rejectPlayers）
            let voteDetailsText = '';
            if (result.approvePlayers || result.rejectPlayers) {
                let voteDetails = [];
                if (result.approvePlayers && result.approvePlayers.length > 0) {
                    voteDetails.push(`👍赞成(${result.approveCount || result.approvePlayers.length}): ${result.approvePlayers.join('、')}`);
                }
                if (result.rejectPlayers && result.rejectPlayers.length > 0) {
                    voteDetails.push(`👎反对(${result.rejectCount || result.rejectPlayers.length}): ${result.rejectPlayers.join('、')}`);
                }
                if (voteDetails.length > 0) {
                    voteDetailsText = `<div class="vote-details">${voteDetails.join('<br>')}</div>`;
                }
            }
            
            // 获取任务票型（如果有）
            let missionVoteText = '';
            if (result.failCount !== undefined) {
                const successCount = (result.teamSize || result.teamMembers?.length || 0) - result.failCount;
                missionVoteText = `<div class="mission-vote-info">任务票型: ${successCount}成功 ${result.failCount}失败</div>`;
            }
            
            html += `
                <div class="mission-item ${statusClass}">
                    <div class="mission-header">
                        <span class="mission-round">第${round}轮</span>
                        <span class="mission-status">${statusText}</span>
                    </div>
                    ${teamMembersText}
                    ${voteInfoText}
                    ${voteDetailsText}
                    ${missionVoteText}
                </div>
            `;
        });
        
        missionHistoryList.innerHTML = html;
    }

    // 更新投票信息
    updateVotingInfo(data) {
        document.getElementById('votingLeader').textContent = data.leader;
        document.getElementById('votingTeamMembers').textContent = data.currentTeam.map(p => p.name).join('、');
        document.getElementById('votedCount').textContent = '0';
        document.getElementById('totalVoters').textContent = data.playerCount;
        
        document.getElementById('voteButtons').classList.remove('hidden');
        document.getElementById('voteResult').classList.add('hidden');
    }

    // 更新投票进度
    updateVoteProgress(data) {
        document.getElementById('votedCount').textContent = data.votedCount;
        document.getElementById('totalVoters').textContent = data.totalCount;
    }

    // 显示投票完成结果
    showVoteCompleted(data) {
        const voteResult = document.getElementById('voteResult');
        const voteButtons = document.getElementById('voteButtons');
        
        if (voteButtons) voteButtons.classList.add('hidden');
        if (voteResult) {
            voteResult.classList.remove('hidden');
            
            // 从teamVotes构建赞成/反对名单
            const teamVotes = data.teamVotes || {};
            const players = data.players || this.gameCore.players || [];
            
            let approvePlayers = [];
            let rejectPlayers = [];
            
            Object.entries(teamVotes).forEach(([playerId, vote]) => {
                const player = players.find(p => p.id === playerId);
                const playerName = player ? player.name : playerId;
                if (vote === 'approve') {
                    approvePlayers.push(playerName);
                } else if (vote === 'reject') {
                    rejectPlayers.push(playerName);
                }
            });
            
            const approveCount = approvePlayers.length;
            const rejectCount = rejectPlayers.length;
            
            // 构建投票详情HTML
            let voteDetailsHtml = '';
            
            if (approvePlayers.length > 0) {
                voteDetailsHtml += `<div style="margin-top: 10px; color: #27ae60;">👍 赞成发车: ${approvePlayers.join('、')}</div>`;
            }
            
            if (rejectPlayers.length > 0) {
                voteDetailsHtml += `<div style="margin-top: 5px; color: #e74c3c;">👎 反对发车: ${rejectPlayers.join('、')}</div>`;
            }
            
            const totalPlayers = players.length || (approveCount + rejectCount);
            const abstainCount = totalPlayers - approveCount - rejectCount;
            if (abstainCount > 0) {
                const votedPlayerIds = Object.keys(teamVotes);
                const abstainPlayers = players
                    .filter(p => !votedPlayerIds.includes(p.id))
                    .map(p => p.name);
                if (abstainPlayers.length > 0) {
                    voteDetailsHtml += `<div style="margin-top: 5px; color: #95a5a6;">😐 弃权: ${abstainPlayers.join('、')}</div>`;
                }
            }
            
            if (approveCount > rejectCount) {
                voteResult.innerHTML = `
                    <div class="team-result-success">
                        <div>🎉 组队成功！</div>
                        <div style="font-size: 0.9em; margin-top: 8px;">${approveCount}票赞成，${rejectCount}票反对</div>
                        ${voteDetailsHtml}
                        <div style="font-size: 0.8em; margin-top: 10px; color: #666;">即将进入任务阶段...</div>
                    </div>
                `;
            } else {
                let failMessage = `
                    <div class="team-result-fail">
                        <div>❌ 组队失败！</div>
                        <div style="font-size: 0.9em; margin-top: 8px;">${approveCount}票赞成，${rejectCount}票反对</div>
                        ${voteDetailsHtml}
                `;
                
                if (data.failedTeamVotes) {
                    failMessage += `<div style="font-size: 0.8em; margin-top: 10px; color: #666;">连续组队失败: ${data.failedTeamVotes}/5</div>`;
                }
                
                if (data.leader) {
                    failMessage += `<div style="font-size: 0.8em; margin-top: 5px; color: #666;">下一位队长: ${data.leader}</div>`;
                }
                
                failMessage += `</div>`;
                voteResult.innerHTML = failMessage;
            }
        }
    }

    // 显示投票结果
    showVoteResult(data) {
        console.log('显示投票结果:', data);
        this.showVoteCompleted(data);
    }

    // 显示任务结果
    showMissionResult(data) {
        console.log('显示任务结果:', data);
        this.showMissionCompleted(data);
    }

    // 更新任务信息
    updateMissionInfo(data) {
        document.getElementById('missionRound').textContent = data.round;
        
        // 处理 currentTeam 数据格式：可能是 ID 数组或对象数组
        let teamMemberNames = [];
        if (data.currentTeam && data.currentTeam.length > 0) {
            if (typeof data.currentTeam[0] === 'string') {
                // currentTeam 是 ID 数组，从 players 中查找名称
                teamMemberNames = data.currentTeam.map(id => {
                    const player = data.players?.find(p => p.id === id);
                    return player?.name || id;
                });
            } else {
                // currentTeam 是对象数组
                teamMemberNames = data.currentTeam.map(p => p.name);
            }
        }
        document.getElementById('missionTeamMembers').textContent = teamMemberNames.join('、') || '-';
        
        document.getElementById('missionResult').classList.add('hidden');
        
        // 获取当前玩家ID - 使用多种方式确保获取到正确的ID
        const currentPlayerId = this.gameCore.getCurrentPlayer?.()?.id || sessionStorage.getItem('avalon_playerId');
        
        // 尝试多种方式检查玩家是否在队伍中
        let isInTeam = false;
        
        // 方式1: 使用 gameCore.isInTeam()
        try {
            isInTeam = this.gameCore.isInTeam();
        } catch (e) {
            console.log('isInTeam() 失败:', e.message);
        }
        
        // 方式2: 直接从 data.players 中查找
        if (!isInTeam && data.players) {
            const player = data.players.find(p => p.id === currentPlayerId);
            isInTeam = player?.inTeam || false;
        }
        
        // 方式3: 从 data.currentTeam 中查找
        if (!isInTeam && data.currentTeam && currentPlayerId) {
            if (typeof data.currentTeam[0] === 'string') {
                isInTeam = data.currentTeam.includes(currentPlayerId);
            } else {
                isInTeam = data.currentTeam.some(p => p.id === currentPlayerId);
            }
        }
        
        console.log('updateMissionInfo - 是否在任务队伍中:', isInTeam);
        console.log('updateMissionInfo - 当前玩家ID:', currentPlayerId);
        console.log('updateMissionInfo - 任务队伍:', data.currentTeam);
        console.log('updateMissionInfo - players:', data.players?.map(p => ({ id: p.id, name: p.name, inTeam: p.inTeam })));
        
        // 只有任务队伍中的玩家才能看到任务按钮
        const missionButtons = document.getElementById('missionButtons');
        if (isInTeam) {
            missionButtons.classList.remove('hidden');
            
            // 好人不能投失败票，隐藏失败按钮
            const failBtn = document.getElementById('failBtn');
            if (failBtn && this.gameCore.mySide === 'good') {
                failBtn.style.display = 'none';
            } else if (failBtn) {
                failBtn.style.display = 'block';
            }
        } else {
            // 不在任务队伍中的玩家不显示按钮
            missionButtons.classList.add('hidden');
            
            // 显示等待信息
            const missionResult = document.getElementById('missionResult');
            missionResult.classList.remove('hidden');
            missionResult.innerHTML = '<div class="waiting-message">等待任务成员执行任务...</div>';
        }
    }

    // 更新任务进度
    updateMissionProgress(data) {
        const missionResult = document.getElementById('missionResult');
        if (missionResult) {
            missionResult.classList.remove('hidden');
            missionResult.innerHTML = `任务执行进度: ${data.votedCount}/${data.totalCount}`;
        }
    }

    // 显示任务完成结果
    showMissionCompleted(data) {
        const missionResult = document.getElementById('missionResult');
        const missionButtons = document.getElementById('missionButtons');
        
        if (missionButtons) missionButtons.classList.add('hidden');
        if (missionResult) {
            missionResult.classList.remove('hidden');
            
            // 计算成功票数和失败票数
            const teamSize = data.currentTeam?.length || data.teamSize || 0;
            const failCount = data.failCount || 0;
            const successCount = teamSize - failCount;
            
            // 构建票型可视化
            let voteVisualization = '';
            for (let i = 0; i < successCount; i++) {
                voteVisualization += '<span style="display: inline-block; width: 30px; height: 30px; background: #28a745; border-radius: 4px; margin: 2px; text-align: center; line-height: 30px; color: white; font-weight: bold;">✓</span>';
            }
            for (let i = 0; i < failCount; i++) {
                voteVisualization += '<span style="display: inline-block; width: 30px; height: 30px; background: #e74c3c; border-radius: 4px; margin: 2px; text-align: center; line-height: 30px; color: white; font-weight: bold;">✗</span>';
            }
            
            // 获取当前轮次
            const currentRound = data.round || data.currentRound || 0;
            
            // 清除之前的定时器
            if (this.missionAutoJumpTimer) {
                clearTimeout(this.missionAutoJumpTimer);
                this.missionAutoJumpTimer = null;
            }
            if (this.missionCountdownTimer) {
                clearInterval(this.missionCountdownTimer);
                this.missionCountdownTimer = null;
            }
            
            // 生成唯一的容器ID
            const containerId = 'mission-result-container-' + Date.now();
            
            if (data.missionResult === 'success') {
                missionResult.innerHTML = `
                    <div id="${containerId}">
                        <div style="color: #28a745; font-size: 24px; font-weight: bold;">✅ 第${currentRound}轮任务成功！</div>
                        <div style="margin-top: 15px; padding: 15px; background: #f8f9fa; border-radius: 8px;">
                            <div style="font-size: 18px; font-weight: 600; margin-bottom: 10px;">📊 任务票型</div>
                            <div style="margin: 10px 0;">${voteVisualization}</div>
                            <div style="margin-top: 10px; font-size: 16px;">
                                <span style="color: #28a745; font-weight: bold;">✓ 成功票: ${successCount}张</span>
                                <span style="color: #e74c3c; font-weight: bold; margin-left: 20px;">✗ 失败票: ${failCount}张</span>
                            </div>
                            <div style="margin-top: 8px; font-size: 14px; color: #666;">队伍人数: ${teamSize}人</div>
                        </div>
                        
                        <!-- 继续按钮和倒计时 -->
                        <div style="margin-top: 25px; text-align: center;">
                            <button id="continue-btn-${containerId}" style="
                                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                                color: white;
                                border: none;
                                padding: 15px 40px;
                                font-size: 18px;
                                font-weight: 600;
                                border-radius: 25px;
                                cursor: pointer;
                                box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
                                transition: all 0.3s ease;
                            " onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 6px 20px rgba(102, 126, 234, 0.6)';" 
                            onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 15px rgba(102, 126, 234, 0.4)';">
                                继续 <span id="countdown-${containerId}">(5秒后自动跳转)</span>
                            </button>
                            <div id="countdown-text-${containerId}" style="margin-top: 10px; color: #666; font-size: 14px;">
                                5秒后自动进入下一轮...
                            </div>
                        </div>
                    </div>
                `;
            } else {
                missionResult.innerHTML = `
                    <div id="${containerId}">
                        <div style="color: #e74c3c; font-size: 24px; font-weight: bold;">❌ 第${currentRound}轮任务失败！</div>
                        <div style="margin-top: 15px; padding: 15px; background: #f8f9fa; border-radius: 8px;">
                            <div style="font-size: 18px; font-weight: 600; margin-bottom: 10px;">📊 任务票型</div>
                            <div style="margin: 10px 0;">${voteVisualization}</div>
                            <div style="margin-top: 10px; font-size: 16px;">
                                <span style="color: #28a745; font-weight: bold;">✓ 成功票: ${successCount}张</span>
                                <span style="color: #e74c3c; font-weight: bold; margin-left: 20px;">✗ 失败票: ${failCount}张</span>
                            </div>
                            <div style="margin-top: 8px; font-size: 14px; color: #666;">队伍人数: ${teamSize}人</div>
                        </div>
                        
                        <!-- 继续按钮和倒计时 -->
                        <div style="margin-top: 25px; text-align: center;">
                            <button id="continue-btn-${containerId}" style="
                                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                                color: white;
                                border: none;
                                padding: 15px 40px;
                                font-size: 18px;
                                font-weight: 600;
                                border-radius: 25px;
                                cursor: pointer;
                                box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
                                transition: all 0.3s ease;
                            " onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 6px 20px rgba(102, 126, 234, 0.6)';" 
                            onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 15px rgba(102, 126, 234, 0.4)';">
                                继续 <span id="countdown-${containerId}">(5秒后自动跳转)</span>
                            </button>
                            <div id="countdown-text-${containerId}" style="margin-top: 10px; color: #666; font-size: 14px;">
                                5秒后自动进入下一轮...
                            </div>
                        </div>
                    </div>
                `;
            }
            
            // 显示任务历史
            if (data.missionResults && data.missionResults.length > 0) {
                const historyDiv = document.createElement('div');
                historyDiv.style.marginTop = '20px';
                historyDiv.innerHTML = '<strong>📜 任务历史:</strong>';
                data.missionResults.forEach((result, index) => {
                    const color = result.result === 'success' ? '#28a745' : '#e74c3c';
                    const text = result.result === 'success' ? '✅ 成功' : '❌ 失败';
                    const failInfo = result.failCount !== undefined ? ` (${result.failCount}张失败票)` : '';
                    historyDiv.innerHTML += `<div style="color: ${color}; margin: 5px 0;">第${index + 1}轮: ${text}${failInfo}</div>`;
                });
                missionResult.appendChild(historyDiv);
            }
            
            // 倒计时功能
            let countdown = 5;
            const countdownSpan = document.getElementById(`countdown-${containerId}`);
            const countdownText = document.getElementById(`countdown-text-${containerId}`);
            const continueBtn = document.getElementById(`continue-btn-${containerId}`);
            
            // 更新倒计时显示
            this.missionCountdownTimer = setInterval(() => {
                countdown--;
                if (countdownSpan) {
                    countdownSpan.textContent = `(${countdown}秒后自动跳转)`;
                }
                if (countdownText) {
                    countdownText.textContent = `${countdown}秒后自动进入下一轮...`;
                }
                
                if (countdown <= 0) {
                    clearInterval(this.missionCountdownTimer);
                    this.missionCountdownTimer = null;
                }
            }, 1000);
            
            // 5秒后自动跳转到组队界面
            this.missionAutoJumpTimer = setTimeout(() => {
                clearInterval(this.missionCountdownTimer);
                this.missionCountdownTimer = null;
                
                // 清除任务结果显示
                if (missionResult) {
                    missionResult.classList.add('hidden');
                }
                
                // 简化逻辑：直接通知服务器进入下一阶段，等待服务器推送最新状态
                if (this.gameCore && this.gameCore.socket) {
                    this.gameCore.socket.emit('mission-completed-auto-advance', {
                        roomId: this.gameCore.roomId,
                        round: data.currentRound || data.round || (this.gameCore.currentRound || 1)
                    });
                    this.showNotification('🔄 任务完成，等待服务器同步下一轮信息...', 'info');
                }
            }, 5000);
            
            // 点击继续按钮立即跳转到组队界面
            if (continueBtn) {
                continueBtn.addEventListener('click', () => {
                    // 清除定时器
                    clearTimeout(this.missionAutoJumpTimer);
                    clearInterval(this.missionCountdownTimer);
                    this.missionAutoJumpTimer = null;
                    this.missionCountdownTimer = null;
                    
                    // 清除任务结果显示
                    if (missionResult) {
                        missionResult.classList.add('hidden');
                    }
                    
                    // 简化逻辑：直接通知服务器进入下一阶段，等待服务器推送最新状态
                    if (this.gameCore && this.gameCore.socket) {
                        this.gameCore.socket.emit('mission-completed-auto-advance', {
                            roomId: this.gameCore.roomId,
                            round: data.currentRound || data.round || (this.gameCore.currentRound || 1)
                        });
                        this.showNotification('🔄 任务完成，等待服务器同步下一轮信息...', 'info');
                    }
                });
            }
        }
    }

    // 更新游戏结果
    updateGameResult(data) {
        const winner = data.winner === 'good' ? '好人' : '坏人';
        document.getElementById('gameWinner').textContent = winner;
        
        // 构建游戏结果文本
        let resultText = data.result || '游戏结束';
        
        // 如果是刺杀结束的游戏，显示刺杀信息
        if (data.assassinationTarget) {
            const target = data.players.find(p => p.id === data.assassinationTarget);
            if (target) {
                const targetRole = this.gameCore.getRoleName(target.role);
                const isMerlin = target.role === 'merlin';
                resultText += `\n\n刺客刺杀了 ${target.name} (${targetRole})`;
                if (isMerlin) {
                    resultText += '\n🎯 刺中梅林！邪恶方胜利！';
                } else {
                    resultText += '\n❌ 未刺中梅林！正义方胜利！';
                }
            }
        }
        
        document.getElementById('gameResult').textContent = resultText;
        
        // 显示角色分配
        const roleList = document.getElementById('roleList');
        if (data.players && data.players[0].role) {
            // 游戏结束，显示所有玩家角色
            roleList.innerHTML = data.players.map(p => {
                const roleName = this.gameCore.getRoleName(p.role);
                const sideText = p.side === 'good' ? '好人' : '坏人';
                const isAssassinationTarget = data.assassinationTarget === p.id;
                const targetMarker = isAssassinationTarget ? ' 🎯' : '';
                return `<div class="role-reveal-item ${p.side}">${p.name} - ${roleName} (${sideText})${targetMarker}</div>`;
            }).join('');
        } else {
            roleList.innerHTML = '<div>角色信息加载中...</div>';
        }
        
        // 显示最终任务历史
        this.updateFinalMissionHistory(data.missionResults);
        
        // 显示最终投票历史
        this.updateFinalVoteHistory(data.voteHistory || data.missionResults);
    }

    // 显示最终任务历史（结算页面）
    updateFinalMissionHistory(missionResults) {
        const container = document.getElementById('finalMissionHistory');
        if (!container) return;
        
        if (!missionResults || missionResults.length === 0) {
            container.innerHTML = '<div class="empty-history">暂无任务记录</div>';
            return;
        }
        
        container.innerHTML = missionResults.map((result, index) => {
            const isSuccess = result.result === 'success';
            const statusClass = isSuccess ? 'success' : 'fail';
            const statusText = isSuccess ? '✅ 成功' : '❌ 失败';
            
            // 任务票型
            let voteTypeText = '';
            if (result.failCount !== undefined) {
                const successCount = (result.teamSize || result.teamMembers?.length || 0) - result.failCount;
                voteTypeText = `<div class="vote-type">✓成功票: ${successCount}张  ✗失败票: ${result.failCount}张</div>`;
            }
            
            return `
                <div class="final-mission-item ${statusClass}">
                    <div class="mission-title">第${result.round}轮 ${statusText}</div>
                    <div class="mission-team">队员: ${result.teamMembers?.join('、') || '-'}</div>
                    ${voteTypeText}
                </div>
            `;
        }).join('');
    }

    // 显示最终投票历史（结算页面）
    updateFinalVoteHistory(voteHistory) {
        const container = document.getElementById('finalVoteHistory');
        if (!container) return;
        
        if (!voteHistory || voteHistory.length === 0) {
            container.innerHTML = '<div class="empty-history">暂无投票记录</div>';
            return;
        }
        
        container.innerHTML = voteHistory.map((vote, index) => {
            // 判断是组队投票还是任务结果
            const isTeamVote = vote.approvePlayers || vote.rejectPlayers;
            
            if (isTeamVote) {
                // 组队投票
                const approveCount = vote.approveCount || vote.approvePlayers?.length || 0;
                const rejectCount = vote.rejectCount || vote.rejectPlayers?.length || 0;
                const passed = approveCount > rejectCount;
                
                let approveText = vote.approvePlayers?.length > 0 
                    ? `<div class="vote-approve">👍 赞成(${approveCount}): ${vote.approvePlayers.join('、')}</div>` 
                    : '';
                let rejectText = vote.rejectPlayers?.length > 0 
                    ? `<div class="vote-reject">👎 反对(${rejectCount}): ${vote.rejectPlayers.join('、')}</div>` 
                    : '';
                
                return `
                    <div class="final-vote-item ${passed ? 'passed' : 'rejected'}">
                        <div class="vote-title">第${vote.round || index + 1}轮组队投票 ${passed ? '✅ 通过' : '❌ 否决'}</div>
                        <div class="vote-team">队伍: ${vote.teamMembers?.join('、') || vote.currentTeam?.map(p => p.name).join('、') || '-'}</div>
                        ${approveText}
                        ${rejectText}
                    </div>
                `;
            } else {
                // 任务结果（简化显示）
                return '';
            }
        }).join('') || '<div class="empty-history">暂无投票记录</div>';
    }

    // 更新玩家列表
    updatePlayerList(players, options = {}) {
        console.log('updatePlayerList 被调用:', players, '选项:', options);
        
        const playerList = document.getElementById('playerList');
        console.log('playerList 元素:', playerList);
        
        if (!playerList) {
            console.error('playerList 元素未找到!');
            return;
        }
        
        playerList.innerHTML = '';
        
        if (!players || players.length === 0) {
            console.log('玩家列表为空');
            playerList.innerHTML = '<div class="no-players">暂无玩家</div>';
            return;
        }
        
        // 检查是否应该显示阵营（角色分配后才显示）
        const showSide = options.showSide || false;
        
        players.forEach((player, index) => {
            const playerItem = document.createElement('div');
            
            // 调试信息
            console.log(`玩家 ${index}:`, player, '类型:', typeof player);
            
            // 确保 player 是对象且有 name 属性
            let playerName = '未知玩家';
            let playerSide = null;
            
            if (typeof player === 'object' && player !== null) {
                playerName = player.name || player.id || `玩家${index + 1}`;
                playerSide = player.side;
            } else if (typeof player === 'string') {
                playerName = player;
            }
            
            // 只有在角色分配后才显示阵营
            if (showSide && playerSide) {
                // 根据阵营添加不同的样式类
                const sideClass = playerSide === 'good' ? 'good-player' : 
                                 playerSide === 'evil' ? 'evil-player' : '';
                playerItem.className = `player-item ${sideClass}`;
                
                // 添加阵营标识
                const sideBadge = playerSide === 'good' ? '<span class="side-badge good">好</span>' : 
                                 playerSide === 'evil' ? '<span class="side-badge evil">坏</span>' : '';
                
                playerItem.innerHTML = `
                    ${sideBadge}
                    <strong>${playerName}</strong>
                `;
            } else {
                // 等待游戏开始时，只显示玩家名字，不显示阵营
                playerItem.className = 'player-item';
                playerItem.innerHTML = `<strong>${playerName}</strong>`;
            }
            
            playerList.appendChild(playerItem);
        });
        
        console.log('玩家列表已更新，共', players.length, '人');
    }

    // 显示加载状态
    showLoading(message = '加载中...') {
        const loadingDiv = document.getElementById('loading');
        if (loadingDiv) {
            loadingDiv.textContent = message;
            loadingDiv.classList.remove('hidden');
        }
    }

    // 隐藏加载状态
    hideLoading() {
        const loadingDiv = document.getElementById('loading');
        if (loadingDiv) {
            loadingDiv.classList.add('hidden');
        }
    }

    // 显示错误信息（使用Toast提示）
    showError(error) {
        console.error('UI错误:', error);
        
        const errorMessage = typeof error === 'string' ? error : (error?.message || '发生未知错误');
        
        // 使用全局Toast函数（如果在index.html中定义）
        if (typeof showErrorToast === 'function') {
            showErrorToast(errorMessage);
        } else {
            // 降级方案：使用页面内错误元素
            const errorDiv = document.getElementById('errorMessage');
            if (errorDiv) {
                errorDiv.textContent = errorMessage;
                errorDiv.classList.remove('hidden');
                setTimeout(() => {
                    errorDiv.classList.add('hidden');
                }, 3000);
            }
        }
    }
    
    // 显示成功信息
    showSuccess(message) {
        console.log('成功:', message);
        
        if (typeof showSuccessToast === 'function') {
            showSuccessToast(message);
        }
    }
    
    // 显示信息提示
    showInfo(message) {
        console.log('信息:', message);
        
        if (typeof showInfoToast === 'function') {
            showInfoToast(message);
        }
    }

    // 隐藏玩家信息栏
    hidePlayerInfoBar() {
        const playerInfoBar = document.getElementById('playerInfoBar');
        if (playerInfoBar) {
            playerInfoBar.classList.add('hidden');
        }
    }

    // 更新玩家角色信息
    updatePlayerRole(role, side) {
        const roleElement = document.getElementById('currentPlayerRole');
        const sideElement = document.getElementById('currentPlayerSide');
        
        if (roleElement) {
            if (role && role !== '-') {
                roleElement.classList.remove('hidden');
                roleElement.querySelector('strong').textContent = this.gameCore.getRoleName(role);
            } else {
                roleElement.classList.add('hidden');
            }
        }
        
        if (sideElement) {
            if (side && side !== '-') {
                sideElement.classList.remove('hidden');
                sideElement.querySelector('strong').textContent = side === 'good' ? '好人' : '坏人';
            } else {
                sideElement.classList.add('hidden');
            }
        }
    }
}

// 导出模块
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UIManager;
} else {
    window.UIManager = UIManager;
}