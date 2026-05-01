/**
 * 语音管理器
 * 协调TTS、ASR和游戏事件
 */

class VoiceManager {
  constructor(ttsEngine) {
    this.tts = ttsEngine;
    this.isListening = false;
    this.commandQueue = [];
  }

  /**
   * 播报游戏事件
   */
  async announce(eventType, data) {
    const messages = {
      'room-created': `房间已创建，房间号${data.roomId}`,
      'player-joined': `${data.playerName}加入游戏`,
      'game-started': '游戏开始，请查看身份',
      'phase-changed': `进入${this.getPhaseName(data.gamePhase)}`,
      'vote-completed': data.passed ? '投票通过' : '投票否决',
      'mission-completed': `任务${data.missionResult?.result === 'success' ? '成功' : '失败'}`,
      'game-ended': data.winner === 'good' ? '好人阵营获胜' : '坏人阵营获胜'
    };

    const message = messages[eventType];
    if (message) {
      await this.tts.speak(message);
    }
  }

  /**
   * 获取阶段中文名
   */
  getPhaseName(phase) {
    const names = {
      'waiting': '等待阶段',
      'role-confirm': '身份确认',
      'night': '夜间阶段',
      'team-building': '组建队伍',
      'voting': '投票表决',
      'mission': '任务执行',
      'assassination': '刺杀阶段',
      'ended': '游戏结束'
    };
    return names[phase] || phase;
  }

  /**
   * 播报房间号（逐位播报）
   */
  async announceRoomId(roomId) {
    const digits = roomId.toString().split('');
    const digitNames = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
    const spokenDigits = digits.map(d => digitNames[parseInt(d)]).join(' ');
    await this.tts.speak(`房间号${spokenDigits}`);
  }
}

module.exports = VoiceManager;
