/**
 * 语音资产生成脚本
 * 批量生成游戏所需音频文件
 */

const TTSFactory = require('../../device/src/audio/tts-factory');
const fs = require('fs').promises;
const path = require('path');

// 语音指令定义
const COMMANDS = {
  // 系统提示
  system: [
    ['ASK-PLAYER-COUNT', '请问创建几人房间？可以说5人到10人'],
    ['DEFAULT-5-PLAYERS', '没有听清楚，默认创建5人房间'],
    ['EXIT-GAME', '正在退出游戏，语音助手继续运行'],
    ['SHUTDOWN', '系统即将关闭，再见'],
    ['BT-CONNECTED', '蓝牙音箱已连接'],
    ['BT-NOT-FOUND', '未找到蓝牙音箱，请确保音箱已开启'],
  ],
  
  // 游戏流程
  game: [
    ['GAME-START', '游戏开始，请查看身份'],
    ['ROLE-CONFIRM', '请确认你的身份'],
    ['NIGHT-START', '夜间阶段开始，请闭眼'],
    ['DAY-START', '天亮了，请睁眼'],
    ['TEAM-BUILD', '请组建队伍'],
    ['VOTE-START', '请投票'],
    ['MISSION-START', '任务开始'],
    ['ASSASSINATION', '进入刺杀阶段'],
  ],
  
  // 数字
  numbers: [
    ['NUM-0', '零'], ['NUM-1', '一'], ['NUM-2', '二'],
    ['NUM-3', '三'], ['NUM-4', '四'], ['NUM-5', '五'],
    ['NUM-6', '六'], ['NUM-7', '七'], ['NUM-8', '八'],
    ['NUM-9', '九'], ['NUM-10', '十'],
  ],
  
  // 片段
  segments: [
    ['SEG-ROOM-CREATED', '房间已创建'],
    ['SEG-PERSON', '人'],
    ['SEG-ROOM', '房间'],
    ['SEG-PLEASE-JOIN', '请玩家加入'],
  ]
};

async function generateAll() {
  console.log('🎙️  开始生成语音资产...\n');
  
  const tts = TTSFactory.getEngine();
  await tts.initialize();
  
  const baseDir = path.join(__dirname, '../assets/commands');
  
  for (const [category, commands] of Object.entries(COMMANDS)) {
    console.log(`生成 ${category} 类别...`);
    const categoryDir = path.join(baseDir, category);
    await fs.mkdir(categoryDir, { recursive: true });
    
    for (const [cmdId, text] of commands) {
      const outputPath = path.join(categoryDir, `${cmdId}.wav`);
      
      try {
        await tts.generate(text, outputPath);
        console.log(`  ✅ ${cmdId}: ${text}`);
      } catch (error) {
        console.error(`  ❌ ${cmdId}: ${error.message}`);
      }
    }
    console.log('');
  }
  
  console.log('✅ 语音资产生成完成！');
}

generateAll().catch(console.error);
