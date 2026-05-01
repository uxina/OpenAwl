/**
 * 语音片段配置表
 * 用于音频拼接
 * 生成时间: 2026-04-03
 */

const VoiceSnippets = {
    // 基础片段（已存在）
    'SEG-ROOM-NUMBER': { 
        text: '房间号为', 
        file: 'segments/SEG-ROOM-NUMBER.mp3',
        description: '播报房间号前缀'
    },
    'SEG-PLEASE-JOIN': { 
        text: '请玩家加入', 
        file: 'segments/SEG-PLEASE-JOIN.mp3',
        description: '邀请玩家加入'
    },
    'SEG-ROOM': { 
        text: '房间', 
        file: 'segments/SEG-ROOM.mp3',
        description: '房间'
    },
    'SEG-PERSON': { 
        text: '人', 
        file: 'segments/SEG-PERSON.mp3',
        description: '人数单位'
    },
    'SEG-ROOM-CREATED': { 
        text: '房间已创建', 
        file: 'segments/SEG-ROOM-CREATED.mp3',
        description: '房间创建成功'
    },
    
    // 新增片段（本次生成）
    'SEG-SET-PERSON': { 
        text: '设置人数为', 
        file: 'segments/SEG-SET-PERSON.mp3',
        description: '设置人数前缀'
    },
    'SEG-COMMA': { 
        text: '，', 
        file: 'segments/SEG-COMMA.mp3',
        description: '逗号停顿',
        isPause: true,
        duration: 300
    },
    'SEG-PERIOD': { 
        text: '。', 
        file: 'segments/SEG-PERIOD.mp3',
        description: '句号停顿',
        isPause: true,
        duration: 500
    },
    'SEG-CURRENT': { 
        text: '当前', 
        file: 'segments/SEG-CURRENT.mp3',
        description: '当前状态'
    },
    'SEG-ROUND': { 
        text: '轮', 
        file: 'segments/SEG-ROUND.mp3',
        description: '轮次单位'
    },
    'SEG-LEADER': { 
        text: '队长', 
        file: 'segments/SEG-LEADER.mp3',
        description: '队长'
    },
    'SEG-TEAM': { 
        text: '队伍', 
        file: 'segments/SEG-TEAM.mp3',
        description: '队伍'
    },
    'SEG-VOTE': { 
        text: '投票', 
        file: 'segments/SEG-VOTE.mp3',
        description: '投票'
    },
    'SEG-MISSION': { 
        text: '任务', 
        file: 'segments/SEG-MISSION.mp3',
        description: '任务'
    },
    'SEG-SUCCESS': { 
        text: '成功', 
        file: 'segments/SEG-SUCCESS.mp3',
        description: '成功'
    },
    'SEG-FAIL': { 
        text: '失败', 
        file: 'segments/SEG-FAIL.mp3',
        description: '失败'
    },
    'SEG-AGREE': { 
        text: '同意', 
        file: 'segments/SEG-AGREE.mp3',
        description: '同意'
    },
    'SEG-REJECT': { 
        text: '反对', 
        file: 'segments/SEG-REJECT.mp3',
        description: '反对'
    },
    'SEG-PASS': { 
        text: '通过', 
        file: 'segments/SEG-PASS.mp3',
        description: '通过'
    },
    'SEG-REJECTED': { 
        text: '否决', 
        file: 'segments/SEG-REJECTED.mp3',
        description: '否决'
    }
};

// 数字音频映射
const NumberAudioMap = {
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
};

// 音频拼接示例
const AudioConcatExamples = {
    // 房间号播报: "房间号为 1 2 3 4 请玩家加入"
    announceRoomNumber: (roomId) => {
        const queue = [
            { id: 'SEG-ROOM-NUMBER' },
            ...roomId.split('').map(d => ({ number: parseInt(d) })),
            { id: 'SEG-PLEASE-JOIN' }
        ];
        return queue;
    },
    
    // 人数设置: "设置人数为 5 人"
    announcePlayerCount: (count) => {
        const queue = [
            { id: 'SEG-SET-PERSON' },
            { number: count },
            { id: 'SEG-PERSON' }
        ];
        return queue;
    },
    
    // 轮次播报: "当前第 3 轮"
    announceRound: (round) => {
        const queue = [
            { id: 'SEG-CURRENT' },
            { text: '第' },  // 需要生成 SEG-NUMBER-PREFIX
            { number: round },
            { id: 'SEG-ROUND' }
        ];
        return queue;
    },
    
    // 队长播报: "队长是 1 号"
    announceLeader: (leaderNum) => {
        const queue = [
            { id: 'SEG-LEADER' },
            { text: '是' },  // 需要生成 SEG-IS
            { number: leaderNum },
            { text: '号' }   // 需要生成 SEG-NUMBER-SUFFIX
        ];
        return queue;
    },
    
    // 投票结果: "投票 通过"
    announceVoteResult: (passed) => {
        const queue = [
            { id: 'SEG-VOTE' },
            passed ? { id: 'SEG-PASS' } : { id: 'SEG-REJECTED' }
        ];
        return queue;
    },
    
    // 任务结果: "任务 成功"
    announceMissionResult: (success) => {
        const queue = [
            { id: 'SEG-MISSION' },
            success ? { id: 'SEG-SUCCESS' } : { id: 'SEG-FAIL' }
        ];
        return queue;
    }
};

// 获取音频路径
function getSnippetAudioPath(snippetId) {
    const snippet = VoiceSnippets[snippetId];
    if (!snippet) {
        console.warn(`[VoiceSnippets] 未找到片段: ${snippetId}`);
        return null;
    }
    return `/audio/commands/${snippet.file}`;
}

// 获取数字音频路径
function getNumberAudioPath(number) {
    const path = NumberAudioMap[number];
    if (!path) {
        console.warn(`[VoiceSnippets] 未找到数字: ${number}`);
        return null;
    }
    return `/audio/commands/${path}`;
}

// 构建音频队列
function buildAudioQueue(items) {
    const queue = [];
    
    for (const item of items) {
        if (item.id) {
            // 片段
            const path = getSnippetAudioPath(item.id);
            if (path) {
                const snippet = VoiceSnippets[item.id];
                queue.push({
                    path: path,
                    name: snippet.text,
                    isPause: snippet.isPause || false,
                    duration: snippet.duration || 0
                });
            }
        } else if (item.number !== undefined) {
            // 数字
            const path = getNumberAudioPath(item.number);
            if (path) {
                queue.push({
                    path: path,
                    name: item.number.toString()
                });
            }
        } else if (item.text) {
            // 文本（需要TTS）
            queue.push({
                text: item.text,
                name: item.text,
                useTTS: true
            });
        }
    }
    
    return queue;
}

// 导出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        VoiceSnippets,
        NumberAudioMap,
        AudioConcatExamples,
        getSnippetAudioPath,
        getNumberAudioPath,
        buildAudioQueue
    };
}
