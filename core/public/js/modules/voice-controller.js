/**
 * 语音控制面板模块
 * 提供预生成音频播放控制功能
 */

class VoiceController {
    constructor(gameCore, socket) {
        this.gameCore = gameCore;
        this.socket = socket;
        this.currentAudio = null;
        this.isPlaying = false;
        this.currentPhase = 'waiting';
        this.currentRound = 1;
        this.gameState = null;
        this.lastPlayedText = '';
        
        // 音频基础路径 (相对于网站根目录)
        this.audioBasePath = '/audio/commands';
        
        // 游戏配置
        this.missionConfig = {
            5: [2, 3, 2, 3, 3],
            6: [2, 3, 4, 3, 4],
            7: [2, 3, 3, 4, 4],
            8: [3, 4, 4, 5, 5],
            9: [3, 4, 4, 5, 5],
            10: [3, 4, 4, 5, 5]
        };
        
        // 语音ID映射表（文本 -> 音频文件）
        this.voiceMap = {
            // 准备阶段
            '房间已创建，请玩家加入。': { id: 'CMD-004', folder: 'opening' },
            '设置游戏人数完成。': { id: 'CMD-005', folder: 'opening' },
            '现在分发身份牌，拿到后请仔细阅读，不要公开。将身份牌正面朝下放在面前。': { id: 'CMD-009', folder: 'opening' },
            '请确认你的身份，记住你的角色和技能。': { id: 'CMD-010', folder: 'opening' },
            '所有玩家已准备，游戏即将开始。请各位闭上眼睛，进入夜间阶段。': { id: 'CMD-008', folder: 'opening' },
            
            // 夜间阶段
            '所有人闭上眼睛，低头趴在桌面上。在我说睁眼之前，请不要偷看。': { id: 'CMD-011', folder: 'opening' },
            '除奥伯伦外，所有坏人睁开眼睛，互相确认身份。记住你的同伴，但不要出声。': { id: 'CMD-044', folder: 'night' },
            '坏人阵营，请闭眼。': { id: 'CMD-045', folder: 'night' },
            '请莫德雷德睁开眼睛，确认你的爪牙。莫德雷德请闭眼。': { id: 'CMD-020', folder: 'night' },
            '梅林，请睁眼。你将看到所有坏人阵营的成员，除了莫德雷德。请仔细观察，记住他们的面孔。': { id: 'CMD-050', folder: 'night' },
            '梅林，请闭眼。记住，你必须隐藏自己的身份，不要让坏人发现你。': { id: 'CMD-051', folder: 'night' },
            '派西维尔，请睁眼。你将看到两位玩家，一位是梅林，一位是莫甘娜。你需要分辨谁是真正的梅林。': { id: 'CMD-053', folder: 'night' },
            '派西维尔，请闭眼。保护梅林的身份，不要让他被坏人发现。': { id: 'CMD-054', folder: 'night' },
            '所有人请睁眼，欢迎来到阿瓦隆的白天。': { id: 'CMD-022', folder: 'night' },
            
            // 白天/组队阶段
            '白天开始。请玩家自由讨论，推理身份。': { id: 'CMD-041', folder: 'day' },
            '本轮队长，请组织队伍。': { id: 'CMD-042', folder: 'day' },
            '请选择队员执行任务。': { id: 'CMD-044', folder: 'day' },
            '队长选择了队员。': { id: 'CMD-045', folder: 'day' },
            '讨论时间，请大家发言推理。': { id: 'CMD-048', folder: 'day' },
            '讨论结束，准备投票。': { id: 'CMD-052', folder: 'day' },
            
            // 投票阶段
            '投票开始！请对队伍进行投票。': { id: 'CMD-071', folder: 'voting' },
            '还有人未投票，请尽快投票。': { id: 'CMD-077', folder: 'voting' },
            '当前投票情况。': { id: 'CMD-076', folder: 'voting' },
            '投票通过，队伍执行任务。': { id: 'CMD-074', folder: 'voting' },
            '投票否决，更换队长。': { id: 'CMD-075', folder: 'voting' },
            
            // 任务阶段
            '任务开始！请队员选择任务结果。': { id: 'CMD-091', folder: 'mission' },
            '还有队员未选择，请尽快。': { id: 'CMD-097', folder: 'mission' },
            '第四轮任务需要2个失败才失败。': { id: 'CMD-101', folder: 'mission' },
            '任务成功！': { id: 'CMD-094', folder: 'mission' },
            '任务失败！': { id: 'CMD-095', folder: 'mission' },
            
            // 刺杀阶段
            '好人阵营已完成3次任务，进入刺杀阶段！刺客请准备。': { id: 'CMD-111', folder: 'assassination' },
            '刺杀开始！刺客请选择你认为的梅林。': { id: 'CMD-112', folder: 'assassination' },
            '刺客确认刺杀吗？这是最后的机会。': { id: 'CMD-114', folder: 'assassination' },
            '刺客执行刺杀！': { id: 'CMD-115', folder: 'assassination' },
            '刺杀成功！是梅林！坏人阵营获胜！': { id: 'CMD-116', folder: 'assassination' },
            '刺杀失败！不是梅林！好人阵营获胜！': { id: 'CMD-117', folder: 'assassination' },
            
            // 结束阶段
            '游戏结束！好人阵营获胜！成功守护了阿瓦隆！': { id: 'CMD-126', folder: 'ending' },
            '游戏结束！坏人阵营获胜！阿瓦隆沦陷了！': { id: 'CMD-127', folder: 'ending' },
            '身份公布。': { id: 'CMD-128', folder: 'ending' },
            '本局统计。': { id: 'CMD-129', folder: 'ending' },
            '感谢各位的参与，这是一场精彩的对决！': { id: 'CMD-131', folder: 'ending' },
            '是否再来一局？': { id: 'CMD-132', folder: 'ending' },
        };
        
        // 夜间步骤配置（使用音频ID）
        this.nightSteps = {
            '5-7': [
                { id: 'CMD-011', name: '1.闭眼', folder: 'opening' },
                { id: 'CMD-044', name: '2.坏人睁眼', folder: 'night' },
                { id: 'CMD-045', name: '坏人闭眼', folder: 'night', auto: true },
                { id: 'CMD-050', name: '3.梅林睁眼', folder: 'night' },
                { id: 'CMD-051', name: '梅林闭眼', folder: 'night', auto: true },
                { id: 'CMD-053', name: '4.派西睁眼', folder: 'night' },
                { id: 'CMD-054', name: '派西闭眼', folder: 'night', auto: true },
                { id: 'CMD-022', name: '5.天亮了', folder: 'night' }
            ],
            '8-10': [
                { id: 'CMD-011', name: '1.闭眼', folder: 'opening' },
                { id: 'CMD-044', name: '2.坏人睁眼', folder: 'night' },
                { id: 'CMD-045', name: '坏人闭眼', folder: 'night', auto: true },
                { id: 'CMD-020', name: '3.莫德雷德', folder: 'night' },
                { id: 'CMD-050', name: '4.梅林睁眼', folder: 'night' },
                { id: 'CMD-051', name: '梅林闭眼', folder: 'night', auto: true },
                { id: 'CMD-053', name: '5.派西睁眼', folder: 'night' },
                { id: 'CMD-054', name: '派西闭眼', folder: 'night', auto: true },
                { id: 'CMD-022', name: '6.天亮了', folder: 'night' }
            ]
        };
        
        this.init();
    }
    
    init() {
        this.createPanelButton();
        this.createPanelModal();
        this.bindEvents();
    }
    
    // 创建控制面板按钮 - 已禁用，按钮已在index.html中静态创建
    createPanelButton() {
        // 按钮已在 index.html 中静态创建，无需动态创建
        console.log('[VoiceController] 语音面板按钮由HTML静态提供');
    }
    
    // 创建控制面板模态框
    createPanelModal() {
        const modal = document.createElement('div');
        modal.id = 'voice-panel-modal';
        modal.className = 'voice-panel-modal';
        modal.innerHTML = `
            <div class="voice-panel-overlay" onclick="voiceController.closePanel()"></div>
            <div class="voice-panel-content">
                <div class="voice-panel-header">
                    <h2>🎭 阿瓦隆语音控制面板</h2>
                    <button class="close-btn" onclick="voiceController.closePanel()">×</button>
                </div>
                
                <!-- 状态显示区 -->
                <div class="voice-status-bar">
                    <div class="status-item">
                        <span class="status-label">当前阶段:</span>
                        <span class="status-value" id="voice-current-phase">等待中</span>
                    </div>
                    <div class="status-item">
                        <span class="status-label">第几轮:</span>
                        <span class="status-value" id="voice-current-round">-</span>
                    </div>
                    <div class="status-item">
                        <span class="status-label">比分:</span>
                        <span class="status-value" id="voice-score">好人0胜 | 坏人0胜</span>
                    </div>
                </div>
                
                <!-- 核心流程控制 -->
                <div class="voice-section">
                    <h3>核心流程控制</h3>
                    <div class="voice-btn-group main-controls">
                        <button class="voice-btn phase-btn" data-phase="role-confirm" onclick="voiceController.playById('CMD-009', 'opening')">
                            <span class="btn-icon">🎴</span>
                            <span class="btn-text">身份确认</span>
                        </button>
                        <button class="voice-btn phase-btn" data-phase="night" onclick="voiceController.playById('CMD-011', 'opening')">
                            <span class="btn-icon">🌙</span>
                            <span class="btn-text">夜间行动</span>
                        </button>
                        <button class="voice-btn phase-btn" data-phase="team-building" onclick="voiceController.playById('CMD-041', 'day')">
                            <span class="btn-icon">👥</span>
                            <span class="btn-text">队长组队</span>
                        </button>
                        <button class="voice-btn phase-btn" data-phase="voting" onclick="voiceController.playById('CMD-071', 'voting')">
                            <span class="btn-icon">🗳️</span>
                            <span class="btn-text">任务投票</span>
                        </button>
                    </div>
                </div>
                
                <!-- 子流程控制 - 动态显示 -->
                <div class="voice-section" id="sub-controls-section" style="display: none;">
                    <h3 id="sub-controls-title">子流程控制</h3>
                    <div class="voice-btn-group sub-controls" id="sub-controls-container">
                        <!-- 动态生成 -->
                    </div>
                </div>
                
                <!-- 语音控制 -->
                <div class="voice-section">
                    <h3>语音控制</h3>
                    <div class="voice-btn-group voice-controls">
                        <button class="voice-btn control-btn" onclick="voiceController.wakeUp()">
                            <span class="btn-icon">🎙️</span>
                            <span class="btn-text">唤醒助手</span>
                        </button>
                        <button class="voice-btn control-btn mute" onclick="voiceController.mute()">
                            <span class="btn-icon">🔇</span>
                            <span class="btn-text">静音</span>
                        </button>
                        <button class="voice-btn control-btn" onclick="voiceController.skip()">
                            <span class="btn-icon">⏭️</span>
                            <span class="btn-text">跳过播报</span>
                        </button>
                        <button class="voice-btn control-btn" onclick="voiceController.repeat()">
                            <span class="btn-icon">🔄</span>
                            <span class="btn-text">重复当前</span>
                        </button>
                    </div>
                    <div class="voice-btn-group">
                        <button class="voice-btn next-btn" onclick="voiceController.nextStep()">
                            <span class="btn-icon">⏭️</span>
                            <span class="btn-text">智能下一环节</span>
                        </button>
                    </div>
                </div>
                
                <!-- 当前播放 -->
                <div class="voice-section current-playing-section" id="current-playing-section" style="display: none;">
                    <h3>当前播放</h3>
                    <div class="current-text" id="current-text">-</div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        
        // 添加样式
        this.addStyles();
    }
    
    // 添加样式
    addStyles() {
        const style = document.createElement('style');
        style.textContent = `
            /* 控制面板按钮 */
            .voice-panel-btn {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                border: none;
                padding: 10px 20px;
                border-radius: 20px;
                font-size: 14px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.3s ease;
                box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
            }
            
            .voice-panel-btn:hover {
                transform: translateY(-2px);
                box-shadow: 0 6px 20px rgba(102, 126, 234, 0.5);
            }
            
            /* 模态框 */
            .voice-panel-modal {
                display: none;
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                z-index: 10000;
            }
            
            .voice-panel-modal.active {
                display: flex;
                align-items: center;
                justify-content: center;
            }
            
            .voice-panel-overlay {
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.6);
                backdrop-filter: blur(5px);
            }
            
            .voice-panel-content {
                position: relative;
                background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
                border-radius: 20px;
                width: 90%;
                max-width: 600px;
                max-height: 90vh;
                overflow-y: auto;
                box-shadow: 0 25px 50px rgba(0, 0, 0, 0.5);
                animation: slideUp 0.3s ease;
            }
            
            @keyframes slideUp {
                from { opacity: 0; transform: translateY(50px); }
                to { opacity: 1; transform: translateY(0); }
            }
            
            .voice-panel-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 20px 24px;
                border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            }
            
            .voice-panel-header h2 {
                margin: 0;
                color: #fff;
                font-size: 20px;
                font-weight: 600;
            }
            
            .close-btn {
                background: rgba(255, 255, 255, 0.1);
                border: none;
                color: #fff;
                width: 36px;
                height: 36px;
                border-radius: 50%;
                font-size: 24px;
                cursor: pointer;
                transition: all 0.2s;
            }
            
            .close-btn:hover {
                background: rgba(255, 255, 255, 0.2);
            }
            
            /* 状态栏 */
            .voice-status-bar {
                display: flex;
                justify-content: space-around;
                padding: 16px 24px;
                background: rgba(255, 255, 255, 0.05);
                border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            }
            
            .status-item {
                text-align: center;
            }
            
            .status-label {
                display: block;
                font-size: 12px;
                color: rgba(255, 255, 255, 0.5);
                margin-bottom: 4px;
            }
            
            .status-value {
                display: block;
                font-size: 14px;
                color: #fff;
                font-weight: 600;
            }
            
            /* 分区 */
            .voice-section {
                padding: 20px 24px;
                border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            }
            
            .voice-section:last-child {
                border-bottom: none;
            }
            
            .voice-section h3 {
                margin: 0 0 16px 0;
                color: rgba(255, 255, 255, 0.8);
                font-size: 14px;
                font-weight: 500;
                text-transform: uppercase;
                letter-spacing: 1px;
            }
            
            /* 按钮组 */
            .voice-btn-group {
                display: grid;
                grid-template-columns: repeat(4, 1fr);
                gap: 12px;
            }
            
            .voice-btn-group.voice-controls {
                margin-bottom: 12px;
            }
            
            .voice-btn {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                padding: 16px 12px;
                border: none;
                border-radius: 12px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                cursor: pointer;
                transition: all 0.2s ease;
                min-height: 80px;
            }
            
            .voice-btn:hover {
                transform: translateY(-2px);
                box-shadow: 0 8px 25px rgba(102, 126, 234, 0.4);
            }
            
            .voice-btn:active {
                transform: translateY(0);
            }
            
            .voice-btn .btn-icon {
                font-size: 24px;
                margin-bottom: 6px;
            }
            
            .voice-btn .btn-text {
                font-size: 12px;
                font-weight: 500;
            }
            
            /* 不同颜色按钮 */
            .voice-btn.phase-btn[data-phase="role-confirm"] {
                background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
            }
            
            .voice-btn.phase-btn[data-phase="night"] {
                background: linear-gradient(135deg, #4a00e0 0%, #8e2de2 100%);
            }
            
            .voice-btn.phase-btn[data-phase="team-building"] {
                background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
            }
            
            .voice-btn.phase-btn[data-phase="voting"] {
                background: linear-gradient(135deg, #fa709a 0%, #fee140 100%);
            }
            
            .voice-btn.control-btn.mute {
                background: linear-gradient(135deg, #eb3349 0%, #f45c43 100%);
            }
            
            .voice-btn.next-btn {
                background: linear-gradient(135deg, #00c6ff 0%, #0072ff 100%);
                grid-column: span 4;
                flex-direction: row;
                gap: 8px;
                min-height: 56px;
            }
            
            .voice-btn.next-btn .btn-icon {
                font-size: 20px;
                margin-bottom: 0;
            }
            
            /* 子流程按钮 */
            .sub-controls .voice-btn {
                background: linear-gradient(135deg, #434343 0%, #000000 100%);
                min-height: 60px;
            }
            
            .sub-controls .voice-btn:hover {
                background: linear-gradient(135deg, #555 0%, #222 100%);
            }
            
            /* 当前播放 */
            .current-playing-section {
                background: rgba(0, 195, 255, 0.1);
            }
            
            .current-text {
                color: #00c6ff;
                font-size: 14px;
                line-height: 1.6;
                padding: 12px;
                background: rgba(0, 0, 0, 0.3);
                border-radius: 8px;
                min-height: 48px;
            }
            
            /* 响应式 */
            @media (max-width: 480px) {
                .voice-btn-group {
                    grid-template-columns: repeat(2, 1fr);
                }
                
                .voice-btn.next-btn {
                    grid-column: span 2;
                }
                
                .voice-status-bar {
                    flex-direction: column;
                    gap: 8px;
                }
            }
        `;
        document.head.appendChild(style);
    }
    
    // 绑定事件
    bindEvents() {
        // 监听游戏状态变化
        if (this.socket) {
            this.socket.on('game-started', (data) => {
                this.gameState = data;
                this.updateStatus();
            });
            
            this.socket.on('phase-changed', (data) => {
                this.gameState = data;
                this.currentPhase = data.gamePhase;
                this.currentRound = data.currentRound || 1;
                this.updateStatus();
                this.updateSubControls();
            });
            
            this.socket.on('controller-phase-changed', (data) => {
                this.gameState = data;
                this.currentPhase = data.gamePhase;
                this.currentRound = data.currentRound || 1;
                this.updateStatus();
                this.updateSubControls();
            });
            
            this.socket.on('mission-completed', (data) => {
                this.gameState = data;
                this.updateStatus();
            });
        }
    }
    
    // 打开面板
    openPanel() {
        const modal = document.getElementById('voice-panel-modal');
        if (modal) {
            modal.classList.add('active');
            this.updateStatus();
            this.updateSubControls();
        }
    }
    
    // 关闭面板
    closePanel() {
        const modal = document.getElementById('voice-panel-modal');
        if (modal) {
            modal.classList.remove('active');
        }
    }
    
    // 更新状态显示
    updateStatus() {
        const phaseNames = {
            'waiting': '等待中',
            'role-confirm': '身份确认',
            'night': '夜间行动',
            'team-building': '队长组队',
            'voting': '任务投票',
            'mission': '任务执行',
            'assassination': '刺杀阶段',
            'ended': '游戏结束'
        };
        
        const phaseEl = document.getElementById('voice-current-phase');
        const roundEl = document.getElementById('voice-current-round');
        const scoreEl = document.getElementById('voice-score');
        
        if (phaseEl) phaseEl.textContent = phaseNames[this.currentPhase] || '等待中';
        if (roundEl) roundEl.textContent = this.currentRound || '-';
        
        if (scoreEl && this.gameState) {
            const goodWins = this.gameState.missionResults?.filter(r => r).length || 0;
            const badWins = this.gameState.missionResults?.filter(r => !r).length || 0;
            scoreEl.textContent = `好人${goodWins}胜 | 坏人${badWins}胜`;
        }
    }
    
    // 更新子流程控制按钮
    updateSubControls() {
        const section = document.getElementById('sub-controls-section');
        const title = document.getElementById('sub-controls-title');
        const container = document.getElementById('sub-controls-container');
        
        if (!section || !container) return;
        
        // 根据当前阶段显示不同的子控制
        if (this.currentPhase === 'night') {
            section.style.display = 'block';
            title.textContent = '夜间行动步骤';
            
            const playerCount = this.gameState?.players?.length || 5;
            const stepsKey = playerCount >= 8 ? '8-10' : '5-7';
            const steps = this.nightSteps[stepsKey];
            
            container.innerHTML = steps.map((step, index) => `
                <button class="voice-btn ${step.auto ? 'auto-step' : ''}" 
                        onclick="voiceController.playNightStep(${index}, '${stepsKey}')"
                        ${step.auto ? 'disabled' : ''}>
                    <span class="btn-text">${step.name}</span>
                </button>
            `).join('');
            
        } else if (this.currentPhase === 'team-building') {
            section.style.display = 'block';
            title.textContent = '组队控制';
            
            const playerCount = this.gameState?.players?.length || 5;
            const requiredTeamSize = this.getRequiredTeamSize(this.currentRound, playerCount);
            
            container.innerHTML = `
                <button class="voice-btn" onclick="voiceController.playById('CMD-041', 'day')">
                    <span class="btn-text">白天开始</span>
                </button>
                <button class="voice-btn" onclick="voiceController.playTeamConfig()">
                    <span class="btn-text">播报配置</span>
                </button>
                <button class="voice-btn" onclick="voiceController.playById('CMD-042', 'day')">
                    <span class="btn-text">任命队长</span>
                </button>
                <button class="voice-btn" onclick="voiceController.playCurrentRound(${this.currentRound}, ${requiredTeamSize})">
                    <span class="btn-text">当前轮次</span>
                </button>
                <button class="voice-btn" onclick="voiceController.playById('CMD-044', 'day')">
                    <span class="btn-text">选择队员</span>
                </button>
                <button class="voice-btn" onclick="voiceController.playById('CMD-048', 'day')">
                    <span class="btn-text">讨论时间</span>
                </button>
                <button class="voice-btn" onclick="voiceController.playById('CMD-052', 'day')">
                    <span class="btn-text">讨论结束</span>
                </button>
            `;
            
        } else if (this.currentPhase === 'voting') {
            section.style.display = 'block';
            title.textContent = '投票控制';
            
            container.innerHTML = `
                <button class="voice-btn" onclick="voiceController.playById('CMD-071', 'voting')">
                    <span class="btn-text">投票开始</span>
                </button>
                <button class="voice-btn" onclick="voiceController.playById('CMD-077', 'voting')">
                    <span class="btn-text">催促投票</span>
                </button>
                <button class="voice-btn" onclick="voiceController.playById('CMD-076', 'voting')">
                    <span class="btn-text">查看票型</span>
                </button>
            `;
            
        } else {
            section.style.display = 'none';
        }
    }
    
    // 播放指定ID的音频
    playById(audioId, folder) {
        const audioPath = `${this.audioBasePath}/${folder}/${audioId}.mp3`;
        this.playAudio(audioPath, audioId);
    }
    
    // 播放音频文件
    playAudio(audioPath, audioId) {
        // 停止当前播放
        this.stop();
        
        // 创建音频对象
        const audio = new Audio(audioPath);
        
        audio.onplay = () => {
            this.isPlaying = true;
            // 显示当前播放
            const section = document.getElementById('current-playing-section');
            const textEl = document.getElementById('current-text');
            if (section && textEl) {
                section.style.display = 'block';
                textEl.textContent = `正在播放: ${audioId}`;
            }
        };
        
        audio.onended = () => {
            this.isPlaying = false;
            this.lastPlayedText = audioId;
        };
        
        audio.onerror = () => {
            console.error(`音频加载失败: ${audioPath}`);
            this.isPlaying = false;
            // 尝试使用TTS作为备用
            this.playTTSFallback(audioId);
        };
        
        this.currentAudio = audio;
        audio.play().catch(err => {
            console.error('播放失败:', err);
            this.playTTSFallback(audioId);
        });
    }
    
    // TTS备用方案
    playTTSFallback(text) {
        if ('speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = 'zh-CN';
            utterance.rate = 0.9;
            window.speechSynthesis.speak(utterance);
        }
    }
    
    // 播放夜间步骤
    playNightStep(index, stepsKey) {
        const steps = this.nightSteps[stepsKey];
        if (steps && steps[index]) {
            const step = steps[index];
            this.playById(step.id, step.folder);
            
            // 自动播放下一个（如果是auto步骤）
            if (step.auto && index + 1 < steps.length) {
                setTimeout(() => {
                    this.playNightStep(index + 1, stepsKey);
                }, 500);
            }
        }
    }
    
    // 播放队伍配置
    playTeamConfig() {
        const playerCount = this.gameState?.players?.length || 5;
        // 根据人数选择对应的配置语音
        const configMap = {
            5: 'CMD-057',
            6: 'CMD-058',
            7: 'CMD-059',
            8: 'CMD-060',
            9: 'CMD-061',
            10: 'CMD-062'
        };
        const audioId = configMap[playerCount] || 'CMD-057';
        this.playById(audioId, 'day');
    }
    
    // 播放当前轮次（动态TTS）
    playCurrentRound(round, requiredSize) {
        const text = `第${round}轮任务，需要选择${requiredSize}名队员。`;
        this.playTTSFallback(text);
        
        // 显示当前播放
        const section = document.getElementById('current-playing-section');
        const textEl = document.getElementById('current-text');
        if (section && textEl) {
            section.style.display = 'block';
            textEl.textContent = text;
        }
    }
    
    // 获取需要的队伍人数
    getRequiredTeamSize(round, playerCount) {
        const config = this.missionConfig[playerCount] || this.missionConfig[5];
        return config[round - 1] || 2;
    }
    
    // 唤醒助手
    wakeUp() {
        this.playTTSFallback('我在听，请说');
    }
    
    // 静音
    mute() {
        this.stop();
    }
    
    // 跳过播报
    skip() {
        this.stop();
    }
    
    // 重复当前
    repeat() {
        if (this.lastPlayedText) {
            // 检查是否是预定义语音
            const voiceInfo = this.voiceMap[this.lastPlayedText];
            if (voiceInfo) {
                this.playById(voiceInfo.id, voiceInfo.folder);
            } else {
                // 否则使用TTS
                this.playTTSFallback(this.lastPlayedText);
            }
        }
    }
    
    // 停止播放
    stop() {
        if (this.currentAudio) {
            this.currentAudio.pause();
            this.currentAudio.currentTime = 0;
        }
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
        }
        this.isPlaying = false;
    }
    
    // 智能下一环节
    nextStep() {
        // 根据当前状态判断下一环节
        const playerCount = this.gameState?.players?.length || 5;
        const goodWins = this.gameState?.missionResults?.filter(r => r).length || 0;
        const badWins = this.gameState?.missionResults?.filter(r => !r).length || 0;
        
        switch(this.currentPhase) {
            case 'waiting':
                this.playById('CMD-009', 'opening');
                break;
            case 'role-confirm':
                this.playById('CMD-011', 'opening');
                break;
            case 'night':
                this.playById('CMD-041', 'day');
                break;
            case 'team-building':
                this.playById('CMD-071', 'voting');
                break;
            case 'voting':
                // 假设投票通过，进入任务执行
                this.playById('CMD-074', 'voting');
                setTimeout(() => {
                    this.playById('CMD-091', 'mission');
                }, 2000);
                break;
            case 'mission':
                if (goodWins >= 3) {
                    this.playById('CMD-111', 'assassination');
                } else if (badWins >= 3) {
                    this.playById('CMD-127', 'ending');
                } else {
                    const nextRound = this.currentRound + 1;
                    const requiredSize = this.getRequiredTeamSize(nextRound, playerCount);
                    this.playCurrentRound(nextRound, requiredSize);
                }
                break;
            default:
                this.playTTSFallback('请手动选择下一环节');
        }
    }
}

// 全局实例
let voiceController = null;

// 初始化函数
function initVoiceController() {
    console.log('[VoiceController] 初始化...');
    
    // 获取 gameCore 和 socket（如果存在）
    const gameCore = window.gameCore || null;
    const socket = window.socket || null;
    
    // 创建控制器实例
    voiceController = new VoiceController(gameCore, socket);
    
    console.log('[VoiceController] 初始化完成');
}

// 多种方式确保初始化
if (document.readyState === 'loading') {
    // DOM 还在加载中
    document.addEventListener('DOMContentLoaded', initVoiceController);
} else {
    // DOM 已经加载完成
    initVoiceController();
}

// 备用：延迟初始化（确保其他脚本已加载）
setTimeout(() => {
    if (!voiceController) {
        console.log('[VoiceController] 延迟初始化...');
        initVoiceController();
    }
}, 2000);

// 导出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = VoiceController;
}
