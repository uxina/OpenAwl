/**
 * 语音面板配置文件
 * 基于 docs/device/avalon-voice-commands.md 定义
 * 所有语音都使用预生成的音频文件
 */

const VoicePanelConfig = {
    // 音频基础路径
    audioBasePath: '/audio/commands',
    
    // 数字音频映射（用于拼接播报）
    numberAudioMap: {
        0: 'numbers/NUM-0.mp3',
        1: 'numbers/NUM-1.mp3',
        2: 'numbers/NUM-2.mp3',
        3: 'numbers/NUM-3.mp3',
        4: 'numbers/NUM-4.mp3',
        5: 'numbers/NUM-5.mp3',
        6: 'numbers/NUM-6.mp3',
        7: 'numbers/NUM-7.mp3',
        8: 'numbers/NUM-8.mp3',
        9: 'numbers/NUM-9.mp3',
        10: 'numbers/NUM-10.mp3'
    },
    
    // 语音片段（用于拼接）
    segmentAudioMap: {
        'room-created': 'segments/SEG-ROOM-CREATED.mp3',
        'person': 'segments/SEG-PERSON.mp3',
        'room': 'segments/SEG-ROOM.mp3',
        'room-number': 'segments/SEG-ROOM-NUMBER.mp3',
        'please-join': 'segments/SEG-PLEASE-JOIN.mp3',
        'comma': 'segments/SEG-COMMA.mp3',
        'round-team': 'segments/SEG-ROUND-TEAM.mp3',
        'leader-is': 'segments/SEG-LEADER-IS.mp3',
        'first': 'segments/SEG-FIRST.mp3',
        'second': 'segments/SEG-SECOND.mp3',
        'third': 'segments/SEG-THIRD.mp3',
        'fourth': 'segments/SEG-FOURTH.mp3',
        'fifth': 'segments/SEG-FIFTH.mp3',
        'round': 'segments/SEG-ROUND.mp3',
        'number': 'segments/SEG-NUMBER.mp3'
    },
    
    // 完整的语音指令映射表
    // 格式: { 指令ID: { folder: 文件夹, text: 文本内容, description: 描述 } }
    voiceCommands: {
        // ========== 开场与准备阶段 ==========
        'CMD-001': { folder: 'opening', text: '欢迎各位来到阿瓦隆之夜！我是今晚的主持人。作为一款经典的阵营对抗游戏，阿瓦隆将考验你们的逻辑推理和演技。好人阵营需要完成3次任务，坏人阵营需要破坏3次任务或刺杀梅林。', description: '开场致辞' },
        'CMD-002': { folder: 'opening', text: '游戏规则：好人阵营（蓝方）包括梅林、派西维尔和忠臣；坏人阵营（红方）包括莫德雷德、莫甘娜、刺客和爪牙。好人需要成功完成3次任务，坏人需要破坏3次任务或在最后刺杀梅林。', description: '介绍规则' },
        'CMD-003': { folder: 'opening', text: '本局角色配置：梅林×1、派西维尔×1、忠臣×{loyalCount}、莫德雷德×1、莫甘娜×1、刺客×1、爪牙×{minionCount}', description: '角色配置说明' },
        'CMD-004': { folder: 'opening', text: '房间已创建，房间号是{roomId}，{playerCount}人局，请玩家加入', description: '创建房间' },
        'CMD-005': { folder: 'opening', text: '设置游戏人数为{playerCount}人', description: '设置人数' },
        'CMD-006': { folder: 'opening', text: '{nickname}加入了游戏，当前{currentCount}/{requiredCount}人', description: '玩家加入' },
        'CMD-007': { folder: 'opening', text: '{nickname}已准备，({readyCount}/{totalCount})', description: '准备就绪' },
        'CMD-008': { folder: 'opening', text: '所有玩家已准备，游戏即将开始。请各位闭上眼睛，进入夜间阶段', description: '全员准备' },
        'CMD-009': { folder: 'opening', text: '现在分发身份牌，拿到后请仔细阅读，不要公开。将身份牌正面朝下放在面前', description: '分发身份' },
        'CMD-010': { folder: 'opening', text: '请确认你的身份，记住你的角色和技能', description: '确认身份' },
        'CMD-011': { folder: 'opening', text: '所有人闭上眼睛，低头趴在桌面上。在我说睁眼之前，请不要偷看', description: '进入夜间' },
        'CMD-012': { folder: 'opening', text: '等待玩家加入，当前{currentCount}/{requiredCount}人', description: '等待玩家' },
        'CMD-013': { folder: 'opening', text: '游戏重置，请重新开始准备', description: '重置游戏' },
        'CMD-014': { folder: 'opening', text: '{nickname}退出了游戏', description: '退出游戏' },
        'CMD-015': { folder: 'opening', text: '需要帮助吗？可以说"介绍规则"、"角色配置"或"查询阶段"', description: '游戏帮助' },
        
        // ========== 夜间阶段（按标准流程重新设计）==========
        // 步骤1：夜间开始 - 所有玩家闭眼
        'CMD-N01': { folder: 'night', text: '夜间阶段开始。请所有玩家闭眼，在桌面中央放置拳头，保持大拇指放下', description: '夜间开始-闭眼' },
        
        // 步骤2：坏人睁眼互认
        'CMD-N02': { folder: 'night', text: '请除了奥伯伦以外的所有坏人睁眼，互相确认彼此身份', description: '坏人睁眼互认' },
        
        // 步骤3：坏人闭眼
        'CMD-N03': { folder: 'night', text: '坏人确认完毕，请闭眼。所有玩家放下大拇指', description: '坏人闭眼-放下大拇指' },
        
        // 步骤4：坏人竖大拇指（5-7人局版本）
        'CMD-N04': { folder: 'night', text: '请所有坏人竖起你们的大拇指', description: '坏人竖大拇指（5-7人局）' },
        
        // 步骤4-M：坏人竖大拇指（8-10人局版本 - 莫德雷德不竖拇指）
        'CMD-N04-M': { folder: 'night', text: '请除了莫德雷德以外的所有坏人竖起你们的大拇指', description: '坏人竖大拇指（8-10人局，无莫德雷德）' },
        
        // 步骤5：梅林睁眼观察（简化版 - 仅睁眼观察）
        'CMD-N05': { folder: 'night', text: '梅林请睁眼，观察这些竖起大拇指的坏人，记住他们的位置', description: '梅林睁眼观察' },
        
        // 步骤5-M（旧版复合语音，保留兼容）
        'CMD-N05-M': { folder: 'night', text: '请除了莫德雷德以外的所有坏人竖起你们的大拇指。梅林请睁眼，观察这些竖起大拇指的坏人，记住他们的位置。请收回大拇指，梅林请闭眼。', description: '【旧版复合】梅林睁眼观察（8-10人局）' },
        
        // 步骤6：梅林闭眼
        'CMD-N06': { folder: 'night', text: '请收回大拇指，梅林请闭眼', description: '梅林闭眼-收回大拇指' },
        
        // 步骤7：放下大拇指（备用）
        'CMD-N07': { folder: 'night', text: '请所有玩家放下大拇指，保持闭眼', description: '放下大拇指' },
        
        // 步骤8：梅林和莫甘娜竖大拇指
        'CMD-N08': { folder: 'night', text: '请梅林和莫甘娜竖起你们的大拇指', description: '梅林莫甘娜竖大拇指' },
        
        // 步骤9：派西维尔睁眼观察（简化版 - 仅睁眼观察）
        'CMD-N09': { folder: 'night', text: '派西维尔请睁眼，观察这两位玩家，分辨谁是梅林', description: '派西维尔睁眼观察' },
        
        // 步骤10：派西维尔闭眼
        'CMD-N10': { folder: 'night', text: '请收回大拇指，派西维尔请闭眼', description: '派西维尔闭眼-收回大拇指' },
        
        // 步骤11：放下大拇指 - 已弃用，合并到 CMD-N09
        'CMD-N11': { folder: 'night', text: '请所有玩家放下大拇指，保持闭眼', description: '【已弃用】放下大拇指' },
        
        // 步骤12：天亮
        'CMD-N12': { folder: 'night', text: '天亮了，请所有玩家睁眼，夜晚阶段结束，游戏正式开始', description: '所有人睁眼' },
        
        // 8-10人局专用：莫德雷德确认爪牙 - 已弃用，莫德雷德参与坏人互认
        'CMD-N13': { folder: 'night', text: '请莫德雷德睁眼，确认你的爪牙', description: '【已弃用】莫德雷德睁眼' },
        'CMD-N14': { folder: 'night', text: '莫德雷德请闭眼', description: '【已弃用】莫德雷德闭眼' },
        
        // 奥伯伦提示（可选）
        'CMD-N15': { folder: 'night', text: '奥伯伦不与其他坏人互认，仅被梅林发现', description: '奥伯伦提示' },
        
        // 夜间线下引导语音（给闭眼玩家的提示，推进游戏流程）- 已弃用，使用 CMD-N01~N12 系列
        'CMD-016': { folder: 'night', text: '夜间阶段开始。请所有玩家闭眼，在桌面中央放置拳头，保持大拇指放下', description: '【已弃用】夜间开始-闭眼引导' },
        'CMD-017': { folder: 'night', text: '请除了奥伯伦以外的所有坏人睁眼，互相确认彼此身份', description: '【已弃用】坏人睁眼互认引导' },
        'CMD-018': { folder: 'night', text: '坏人请闭眼', description: '【已弃用】坏人闭眼引导' },
        'CMD-020': { folder: 'night', text: '梅林请睁眼', description: '【已弃用】梅林睁眼引导' },
        'CMD-021': { folder: 'night', text: '梅林请闭眼', description: '【已弃用】梅林闭眼引导' },
        'CMD-022': { folder: 'night', text: '天亮了，请所有玩家睁眼，夜晚阶段结束，游戏正式开始', description: '【已弃用】所有人睁眼引导' },
        
        // 夜间角色引导（简练版，包含大拇指提示）
        'CMD-044': { folder: 'night', text: '请除了奥伯伦以外的坏人睁眼，互相辨认同伴。请闭上你们的眼睛', description: '引导坏人睁眼' },
        'CMD-045': { folder: 'night', text: '坏人请闭眼', description: '引导坏人闭眼' },
        'CMD-046': { folder: 'night', text: '莫甘娜，你是坏人阵营的重要成员。你的任务是迷惑派西维尔，让他分不清你和梅林。请确认你看到了同伴', description: '引导莫甘娜行动' },
        'CMD-047': { folder: 'night', text: '刺客，你拥有刺杀梅林的能力。如果好人完成3次任务，你将有机会刺杀梅林。请确认你看到了同伴', description: '引导刺客行动' },
        'CMD-048': { folder: 'night', text: '莫德雷德，你是坏人阵营的领袖。梅林看不到你，这是你的优势。请确认你看到了爪牙', description: '引导莫德雷德行动' },
        'CMD-049': { folder: 'night', text: '奥伯伦，你是孤独的角色。你看不到其他坏人，其他坏人也看不到你。但你依然属于坏人阵营', description: '引导奥伯伦说明' },
        'CMD-050': { folder: 'night', text: '梅林请睁眼。请除莫德雷德外所有的坏人，竖起你们的大拇指。梅林请观察，记住这些坏人。请收回大拇指，梅林请闭眼', description: '引导梅林睁眼' },
        'CMD-051': { folder: 'night', text: '梅林请闭眼。记住，你必须隐藏自己的身份，不要让坏人发现你', description: '引导梅林闭眼' },
        'CMD-052': { folder: 'night', text: '梅林，你的身份至关重要。不要暴露自己，通过巧妙的方式帮助好人阵营', description: '梅林提示隐藏' },
        'CMD-053': { folder: 'night', text: '派西维尔请睁眼。请梅林和莫甘娜竖起你们的大拇指。派西维尔请观察，分辨谁是梅林。请收回大拇指，派西维尔请闭眼', description: '引导派西维尔睁眼' },
        'CMD-054': { folder: 'night', text: '派西维尔请闭眼。保护梅林的身份，不要让他被坏人发现', description: '引导派西维尔闭眼' },
        'CMD-055': { folder: 'night', text: '派西维尔，你看到的两人中，一个是梅林，一个是莫甘娜。仔细观察他们的行为，找出真正的梅林', description: '派西维尔提示分辨' },
        'CMD-056': { folder: 'night', text: '忠臣们，你们没有特殊能力，但你们是好人阵营的基石。请支持梅林和派西维尔，共同完成任务', description: '引导忠臣说明' },
        
        // ========== 白天/组队阶段 ==========
        'CMD-041': { folder: 'day', text: '第{round}轮白天开始。请玩家自由讨论，推理身份', description: '白天开始' },
        'CMD-042': { folder: 'day', text: '{leader}是本轮队长，请组织队伍', description: '队长任命' },
        'CMD-043': { folder: 'day', text: '队长顺时针传递给{nextLeader}', description: '队长轮换' },
        'CMD-044D': { folder: 'day', text: '{leader}请选择{teamSize}名队员执行任务', description: '选择队员' },
        'CMD-045D': { folder: 'day', text: '{leader}选择了{teamMembers}，共{teamSize}人', description: '确认队员' },
        'CMD-046': { folder: 'day', text: '从队伍中移除{nickname}', description: '移除队员' },
        'CMD-047': { folder: 'day', text: '清空当前队伍，请重新选择', description: '清空队伍' },
        'CMD-048': { folder: 'day', text: '讨论时间，请大家发言推理', description: '讨论时间' },
        'CMD-052': { folder: 'day', text: '讨论结束，准备投票', description: '讨论结束' },
        'CMD-053D': { folder: 'day', text: '队长请尽快选择队员', description: '催促选择' },
        'CMD-056': { folder: 'day', text: '队长，请选择你认为可靠的队员', description: '队长提示' },
        
        // 队伍配置
        'CMD-057': { folder: 'day', text: '5人局队伍：第1轮2人，第2轮3人，第3轮2人，第4轮3人，第5轮3人', description: '5人局队伍配置' },
        'CMD-058': { folder: 'day', text: '6人局队伍：第1轮2人，第2轮3人，第3轮4人，第4轮3人，第5轮4人', description: '6人局队伍配置' },
        'CMD-059': { folder: 'day', text: '7人局队伍：第1轮2人，第2轮3人，第3轮3人，第4轮4人（需要2张失败票才失败），第5轮4人', description: '7人局队伍配置' },
        'CMD-060': { folder: 'day', text: '8人局队伍：第1轮3人，第2轮4人，第3轮4人，第4轮5人（需要2张失败票才失败），第5轮5人', description: '8人局队伍配置' },
        'CMD-061': { folder: 'day', text: '9人局队伍：第1轮3人，第2轮4人，第3轮4人，第4轮5人（需要2张失败票才失败），第5轮5人', description: '9人局队伍配置' },
        'CMD-062': { folder: 'day', text: '10人局队伍：第1轮3人，第2轮4人，第3轮4人，第4轮5人（需要2张失败票才失败），第5轮5人', description: '10人局队伍配置' },
        
        // ========== 投票阶段 ==========
        'CMD-071': { folder: 'voting', text: '投票开始！请对队伍：{teamMembers}进行投票', description: '投票开始' },
        'CMD-072': { folder: 'voting', text: '我同意这个队伍', description: '同意投票' },
        'CMD-073': { folder: 'voting', text: '我反对这个队伍', description: '反对投票' },
        'CMD-074': { folder: 'voting', text: '投票通过！{agreeCount}票同意，{rejectCount}票反对。队伍执行第{round}轮任务', description: '投票结果通过' },
        'CMD-075': { folder: 'voting', text: '投票否决！{agreeCount}票同意，{rejectCount}票反对。队长轮换，重新组队', description: '投票结果否决' },
        'CMD-076': { folder: 'voting', text: '当前投票：{agreeCount}票同意，{rejectCount}票反对，{pendingCount}人未投票', description: '查看投票情况' },
        'CMD-077': { folder: 'voting', text: '还有{pendingCount}人未投票，请尽快投票', description: '催促投票' },
        'CMD-078': { folder: 'voting', text: '投票倒计时{seconds}秒', description: '投票倒计时' },
        'CMD-082': { folder: 'voting', text: '投票平局，视为否决', description: '投票平局' },
        'CMD-083': { folder: 'voting', text: '已连续{count}次否决，第5次否决后坏人直接获胜', description: '连续否决提示' },
        'CMD-085': { folder: 'voting', text: '投票结束，准备执行任务', description: '投票结束' },
        
        // ========== 任务执行阶段 ==========
        'CMD-091': { folder: 'mission', text: '第{round}轮任务开始！请队员：{teamMembers}选择任务结果', description: '任务开始' },
        'CMD-092': { folder: 'mission', text: '我选择任务成功', description: '选择成功' },
        'CMD-093': { folder: 'mission', text: '我选择任务失败', description: '选择失败' },
        'CMD-094': { folder: 'mission', text: '第{round}轮任务成功！{successCount}个成功，{failCount}个失败', description: '任务结果成功' },
        'CMD-095': { folder: 'mission', text: '第{round}轮任务失败！{successCount}个成功，{failCount}个失败', description: '任务结果失败' },
        'CMD-097': { folder: 'mission', text: '还有{pendingCount}名队员未选择，请尽快', description: '催促执行' },
        'CMD-098': { folder: 'mission', text: '任务执行倒计时{seconds}秒', description: '任务倒计时' },
        'CMD-101': { folder: 'mission', text: '第4轮任务需要2个失败才失败（7人及以上）', description: '第4轮特殊规则' },
        'CMD-103': { folder: 'mission', text: '当前比分：好人{goodWins}胜，坏人{badWins}胜', description: '当前比分' },
        'CMD-105': { folder: 'mission', text: '最终轮！本轮将决定胜负', description: '最终轮提示' },
        'CMD-107': { folder: 'mission', text: '第{round}轮任务结束，准备下一轮', description: '任务结束' },
        
        // ========== 刺杀阶段 ==========
        'CMD-111': { folder: 'assassination', text: '好人阵营已完成3次任务，进入刺杀阶段！刺客请准备', description: '进入刺杀' },
        'CMD-112': { folder: 'assassination', text: '刺杀开始！刺客请选择你认为的梅林', description: '刺杀开始' },
        'CMD-113': { folder: 'assassination', text: '我选择刺杀{nickname}', description: '选择刺杀目标' },
        'CMD-114': { folder: 'assassination', text: '刺客确认刺杀{nickname}吗？这是最后的机会', description: '确认刺杀' },
        'CMD-115': { folder: 'assassination', text: '刺客执行刺杀！{nickname}的身份是...', description: '执行刺杀' },
        'CMD-116': { folder: 'assassination', text: '刺杀成功！{nickname}是梅林！坏人阵营获胜！', description: '刺杀成功' },
        'CMD-117': { folder: 'assassination', text: '刺杀失败！{nickname}不是梅林，是{realRole}！好人阵营获胜！', description: '刺杀失败' },
        'CMD-122': { folder: 'assassination', text: '刺客，请仔细观察，找出真正的梅林', description: '刺客提示' },
        'CMD-123': { folder: 'assassination', text: '梅林，请隐藏好你的身份，不要被刺客发现', description: '梅林提示' },
        
        // ========== 游戏结束与结算 ==========
        'CMD-126': { folder: 'ending', text: '游戏结束！好人阵营获胜！成功守护了阿瓦隆！', description: '好人获胜' },
        'CMD-127': { folder: 'ending', text: '游戏结束！坏人阵营获胜！阿瓦隆沦陷了！', description: '坏人获胜' },
        'CMD-128': { folder: 'ending', text: '身份公布：梅林-{merlin}，派西维尔-{percival}，莫甘娜-{morgana}，刺客-{assassin}，莫德雷德-{mordred}...', description: '公布身份' },
        'CMD-129': { folder: 'ending', text: '本局统计：共{totalRounds}轮，好人成功{goodWins}次，坏人破坏{badWins}次', description: '游戏统计' },
        'CMD-131': { folder: 'ending', text: '感谢各位的参与，这是一场精彩的对决！', description: '感谢参与' },
        'CMD-132': { folder: 'ending', text: '是否再来一局？', description: '再来一局' },
        
        // ========== 查询类指令 ==========
        'CMD-141': { folder: 'query', text: '当前阶段：{currentPhase}', description: '查询阶段' },
        'CMD-142': { folder: 'query', text: '当前第{round}轮，共5轮', description: '查询轮次' },
        'CMD-143': { folder: 'query', text: '当前比分：好人{goodWins}，坏人{badWins}', description: '查询比分' },
        'CMD-144': { folder: 'query', text: '当前队长是{leader}', description: '查询队长' },
        'CMD-145': { folder: 'query', text: '当前队伍：{teamMembers}', description: '查询队员' },
        'CMD-146': { folder: 'query', text: '当前玩家：{playerList}', description: '查询玩家' },
        'CMD-150': { folder: 'query', text: '房间号：{roomId}', description: '查询房间号' },
        'CMD-151': { folder: 'query', text: '当前{currentCount}人，需要{requiredCount}人', description: '查询人数' },
        'CMD-156': { folder: 'query', text: '可用指令：开场、开始游戏、选择队员、投票、查询阶段等', description: '查询帮助' }
    },
    
    // 夜间步骤配置（完整版10步流程）
    // 5-7人局：使用 CMD-N04（所有坏人竖拇指）
    // 8-10人局：使用 CMD-N04-M（莫德雷德不竖拇指）
    nightSteps: {
        '5-7': [
            { cmd: 'CMD-N01', name: '1.夜间开始-闭眼', autoPlay: false },
            { cmd: 'CMD-N02', name: '2.坏人睁眼互认', autoPlay: false },
            { cmd: 'CMD-N03', name: '3.坏人闭眼', autoPlay: false },
            { cmd: 'CMD-N04', name: '4.坏人竖大拇指', autoPlay: false },
            { cmd: 'CMD-N05', name: '5.梅林睁眼观察', autoPlay: false },
            { cmd: 'CMD-N06', name: '6.梅林闭眼', autoPlay: false },
            { cmd: 'CMD-N08', name: '7.梅林莫甘娜竖大拇指', autoPlay: false },
            { cmd: 'CMD-N09', name: '8.派西维尔睁眼观察', autoPlay: false },
            { cmd: 'CMD-N10', name: '9.派西维尔闭眼', autoPlay: false },
            { cmd: 'CMD-N12', name: '10.所有人睁眼', autoPlay: false }
        ],
        '8-10': [
            { cmd: 'CMD-N01', name: '1.夜间开始-闭眼', autoPlay: false },
            { cmd: 'CMD-N02', name: '2.坏人睁眼互认', autoPlay: false },
            { cmd: 'CMD-N03', name: '3.坏人闭眼', autoPlay: false },
            { cmd: 'CMD-N04-M', name: '4.坏人竖大拇指(无莫德雷德)', autoPlay: false },
            { cmd: 'CMD-N05', name: '5.梅林睁眼观察', autoPlay: false },
            { cmd: 'CMD-N06', name: '6.梅林闭眼', autoPlay: false },
            { cmd: 'CMD-N08', name: '7.梅林莫甘娜竖大拇指', autoPlay: false },
            { cmd: 'CMD-N09', name: '8.派西维尔睁眼观察', autoPlay: false },
            { cmd: 'CMD-N10', name: '9.派西维尔闭眼', autoPlay: false },
            { cmd: 'CMD-N12', name: '10.所有人睁眼', autoPlay: false }
        ]
    },
    
    // 队伍配置
    missionConfig: {
        5: [2, 3, 2, 3, 3],
        6: [2, 3, 4, 3, 4],
        7: [2, 3, 3, 4, 4],
        8: [3, 4, 4, 5, 5],
        9: [3, 4, 4, 5, 5],
        10: [3, 4, 4, 5, 5]
    },
    
    // 阶段到默认语音的映射（用于自动播放）
    phaseVoiceMap: {
        'waiting': 'CMD-012',
        'waiting-players': 'CMD-012',
        'ready-to-start': 'CMD-008',
        'opening': 'CMD-001',
        'role-confirm': 'CMD-009',
        'night': 'CMD-N01',
        'day': 'CMD-041',
        'team-building': 'CMD-042',
        'discussion': 'CMD-048',
        'voting': 'CMD-071',
        'mission': 'CMD-091',
        'assassination': 'CMD-111',
        'ended-good': 'CMD-126',
        'ended-evil': 'CMD-127'
    },
    
    // 面板按钮到语音的映射
    panelButtonVoiceMap: {
        // 语音控制按钮
        'wake-up': 'CMD-015',      // 唤醒助手 -> 游戏帮助
        'mute': null,               // 静音（无语音）
        'skip': null,               // 跳过（无语音）
        'repeat': null,             // 重复（播放上一个）
        
        // 快速操作按钮
        'vote-passed': 'CMD-074',   // 投票通过
        'vote-rejected': 'CMD-075', // 投票否决
        'mission-success': 'CMD-094', // 任务成功
        'mission-fail': 'CMD-095',  // 任务失败
        'reset-game': 'CMD-013',    // 重置游戏
        'notify-server': null       // 通知服务器（无语音）
    },
    
    // 获取音频路径
    getAudioPath: function(cmdId) {
        const cmd = this.voiceCommands[cmdId];
        if (!cmd) {
            console.warn(`[VoicePanelConfig] 未找到指令: ${cmdId}`);
            return null;
        }
        return `${this.audioBasePath}/${cmd.folder}/${cmdId}.mp3`;
    },
    
    // 获取指令文本（用于TTS备用）
    getCommandText: function(cmdId, variables = {}) {
        const cmd = this.voiceCommands[cmdId];
        if (!cmd) {
            return null;
        }
        
        let text = cmd.text;
        // 替换变量
        for (const [key, value] of Object.entries(variables)) {
            text = text.replace(`{${key}}`, value);
        }
        return text;
    },
    
    // 获取夜间步骤
    getNightSteps: function(playerCount) {
        const key = playerCount >= 8 ? '8-10' : '5-7';
        return this.nightSteps[key] || this.nightSteps['5-7'];
    },
    
    // 获取队伍人数
    getTeamSize: function(round, playerCount) {
        const config = this.missionConfig[playerCount] || this.missionConfig[5];
        return config[round - 1] || 2;
    }
};

// 导出配置
if (typeof module !== 'undefined' && module.exports) {
    module.exports = VoicePanelConfig;
}
