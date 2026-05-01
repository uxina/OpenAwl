/**
 * 语音主控设备入口
 * 整合TTS、ASR、游戏连接功能
 */

const io = require('socket.io-client');
const config = require('../config/voice-config');
const TTSFactory = require('./audio/tts-factory');
const VoiceManager = require('./core/voice-manager');
const { exec } = require('child_process');
const { promisify } = require('util');

// 带超时的 exec 函数
const execAsync = (command, timeout = 10000) => {
  return new Promise((resolve, reject) => {
    const child = exec(command, { timeout }, (error, stdout, stderr) => {
      if (error) {
        reject(error);
      } else {
        resolve({ stdout, stderr });
      }
    });
  });
};

class VoiceController {
  constructor() {
    this.socket = null;
    this.tts = null;
    this.voiceManager = null;
    this.roomId = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.bluetoothSpeakerMac = null;
    this.bluetoothSpeakerName = null;
    this.bluetoothConnected = false;
    this.currentPlayProcess = null;
  }

  // 初始化蓝牙音频输出
  async initializeBluetooth() {
    console.log(' 初始化蓝牙音频输出...');
    
    try {
      // 获取已配对设备列表
      const { stdout } = await execAsync('bluetoothctl paired-devices');
      const lines = stdout.trim().split('\n').filter(l => l.includes('Device'));
      
      if (lines.length === 0) {
        console.log('⚠️  没有已配对设备，请先运行 bluetooth.sh 配对音箱');
        return;
      }
      
      // 查找音箱设备（优先查找 HAVIT 或其他常见品牌）
      let speakerMac = null;
      let speakerName = null;
      
      for (const line of lines) {
        const match = line.match(/Device\s+([0-9A-F:]+)\s+(.+)/i);
        if (match) {
          const mac = match[1];
          const name = match[2];
          // 查找音箱关键字
          if (/hav|speaker|audio|sound|音响|音箱|bluetooth/i.test(name)) {
            speakerMac = mac;
            speakerName = name;
            break;
          }
          // 记录第一个设备作为备选
          if (!speakerMac) {
            speakerMac = mac;
            speakerName = name;
          }
        }
      }
      
      if (!speakerMac) {
        console.log('⚠️  未找到可连接的蓝牙音箱');
        return;
      }
      
      this.bluetoothSpeakerMac = speakerMac;
      this.bluetoothSpeakerName = speakerName;
      console.log(`📱 找到音箱: ${speakerName} (${speakerMac})`);
      
      // 信任设备
      await execAsync(`bluetoothctl trust ${speakerMac}`);
      
      // 连接设备
      console.log('🔗 正在连接蓝牙音箱...');
      try {
        await execAsync(`bluetoothctl connect ${speakerMac}`);
      } catch (e) {
        // 可能已经连接
        console.log('   连接命令执行完成');
      }
      
      // 等待连接稳定
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // 验证连接状态
      const { stdout: info } = await execAsync(`bluetoothctl info ${speakerMac}`);
      if (info.includes('Connected: yes')) {
        this.bluetoothConnected = true;
        console.log('✅ 蓝牙音箱已连接');
      } else {
        console.log('⚠️  蓝牙音箱未连接，将使用默认音频设备');
      }
      
      // 设置PulseAudio默认输出到蓝牙音箱
      if (this.bluetoothConnected) {
        try {
          // 获取蓝牙音箱的PulseAudio sink名称
          const { stdout: sinks } = await execAsync('pactl list short sinks');
          const bluetoothSink = sinks.split('\n').find(s => 
            s.includes(speakerMac.replace(/:/g, '_')) || s.includes('bluez')
          );
          
          if (bluetoothSink) {
            const sinkName = bluetoothSink.split('\t')[1];
            await execAsync(`pactl set-default-sink ${sinkName}`);
            console.log(`✅ 已设置默认音频输出: ${sinkName}`);
          } else {
            console.log('⚠️  未找到蓝牙音箱的音频设备');
          }
        } catch (e) {
          console.log('⚠️  设置默认音频输出失败');
        }
      }
      
    } catch (error) {
      console.log('⚠️  蓝牙初始化失败:', error.message);
    }
  }
  
  async initialize() {
    console.log('🎙️  阿瓦隆语音主控启动中...');
    
    // 初始化蓝牙音频输出
    await this.initializeBluetooth();
    
    // 初始化TTS
    this.tts = TTSFactory.getEngine();
    await this.tts.initialize();
    console.log('✅ TTS引擎初始化完成');
    
    // 初始化语音管理器
    this.voiceManager = new VoiceManager(this.tts);
    
    // 连接服务器
    await this.connectToServer();
    
    // 播放启动提示
    await this.speak('语音主控已启动，等待指令');
  }

  connectToServer() {
    return new Promise((resolve, reject) => {
      this.socket = io(config.server.url);
      
      this.socket.on('connect', () => {
        console.log('✅ 已连接到游戏服务器');
        this.isConnected = true;
        this.reconnectAttempts = 0;
        
        // 通知服务器本设备状态（蓝牙连接状态）
        this.notifyDeviceStatus();
        
        resolve();
      });
      
      this.socket.on('disconnect', () => {
        console.log('⚠️  与服务器断开连接');
        this.isConnected = false;
        this.handleReconnect();
      });
      
      this.socket.on('connect_error', (error) => {
        console.error('连接错误:', error.message);
        reject(error);
      });
      
      // 监听游戏事件
      this.setupGameEventListeners();
    });
  }
  
  // 通知服务器本设备状态
  notifyDeviceStatus() {
    if (this.socket && this.isConnected) {
      const status = {
        bluetoothConnected: this.bluetoothConnected,
        bluetoothSpeakerName: this.bluetoothSpeakerName || null,
        bluetoothSpeakerMac: this.bluetoothSpeakerMac || null
      };
      console.log('[设备端] 通知服务器设备状态:', status);
      this.socket.emit('device-status', status);
    }
  }

  handleReconnect() {
    if (this.reconnectAttempts < config.server.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`尝试重新连接 (${this.reconnectAttempts}/${config.server.maxReconnectAttempts})...`);
      setTimeout(() => this.connectToServer(), config.server.reconnectInterval);
    } else {
      console.error('达到最大重连次数，请检查服务器状态');
    }
  }

  setupGameEventListeners() {
    // 房间创建
    this.socket.on('room-created', (data) => {
      this.roomId = data.roomId;
      this.speak(`房间已创建，房间号${data.roomId}，${data.playerCount}人局`);
    });
    
    // 玩家加入
    this.socket.on('player-joined', (data) => {
      this.speak(`${data.playerName}加入，当前${data.playerCount}人`);
    });
    
    // 游戏开始
    this.socket.on('game-started', () => {
      this.speak('游戏开始，请查看身份');
    });
    
    // 阶段变更
    this.socket.on('phase-changed', (data) => {
      const phaseNames = {
        'role-confirm': '身份确认',
        'night': '夜间阶段',
        'team-building': '组建队伍',
        'voting': '投票表决',
        'mission': '任务执行',
        'assassination': '刺杀阶段',
        'ended': '游戏结束'
      };
      const phaseName = phaseNames[data.gamePhase] || data.gamePhase;
      this.speak(`进入${phaseName}`);
    });
    
    // 投票结果
    this.socket.on('vote-completed', (data) => {
      const result = data.passed ? '通过' : '否决';
      this.speak(`投票${result}，${data.approveCount}票赞成，${data.rejectCount}票反对`);
    });
    
    // 任务结果
    this.socket.on('mission-completed', (data) => {
      const result = data.missionResult.result === 'success' ? '成功' : '失败';
      this.speak(`任务${result}，${data.missionResult.failCount}张失败票`);
    });
    
    // 游戏结束
    this.socket.on('game-ended', (data) => {
      const winner = data.winner === 'good' ? '好人阵营' : '坏人阵营';
      this.speak(`游戏结束，${winner}获胜`);
    });
    
    // 接收来自服务器的音频播放指令
    this.socket.on('device-play-audio', (data) => {
      console.log(`[设备端] 收到音频播放指令: ${data.commandId}`);
      this.handleDeviceAudioCommand(data.commandId);
    });
    
    // 接收来自服务器的蓝牙连接指令
    this.socket.on('device-bluetooth-connect', async (data) => {
      console.log('[设备端] 收到蓝牙连接指令');
      try {
        const result = await this.connectBluetoothSpeaker();
        console.log('[设备端] 蓝牙连接结果:', result);
        this.socket.emit('bluetooth-connect-response', result);
      } catch (error) {
        console.error('[设备端] 蓝牙连接异常:', error.message);
        this.socket.emit('bluetooth-connect-response', { 
          success: false, 
          message: '蓝牙连接异常: ' + error.message 
        });
      }
    });
  }
  
  // 连接蓝牙音箱
  async connectBluetoothSpeaker() {
    console.log('[设备端] ================== 开始连接蓝牙音箱 ==================');
    console.log('[设备端] 步骤1: 执行 bluetoothctl paired-devices 查询已配对设备');
    
    try {
      // 获取已配对设备列表
      const { stdout } = await execAsync('bluetoothctl paired-devices');
      console.log('[设备端] bluetoothctl paired-devices 返回:', stdout || '(空)');
      const lines = stdout.trim().split('\n').filter(l => l.includes('Device'));
      
      if (lines.length === 0) {
        console.log('[设备端] 没有已配对设备');
        return { success: false, message: '没有已配对设备，请先运行 bluetooth.sh 配对音箱' };
      }
      
      console.log(`[设备端] 发现 ${lines.length} 个已配对设备`);
      
      // 查找音箱设备
      let speakerMac = null;
      let speakerName = null;
      
      for (const line of lines) {
        const match = line.match(/Device\s+([0-9A-F:]+)\s+(.+)/i);
        if (match) {
          const mac = match[1];
          const name = match[2];
          console.log(`[设备端] 检查设备: ${name} (${mac})`);
          // 优先查找音箱关键字
          if (/hav|speaker|audio|sound|音响|音箱|bluetooth/i.test(name)) {
            speakerMac = mac;
            speakerName = name;
            console.log(`[设备端] 匹配到音箱关键字: ${name}`);
            break;
          }
          // 记录第一个设备作为备选
          if (!speakerMac) {
            speakerMac = mac;
            speakerName = name;
            console.log(`[设备端] 暂定第一个设备作为音箱: ${name}`);
          }
        }
      }
      
      if (!speakerMac) {
        console.log('[设备端] 未找到可连接的蓝牙音箱');
        return { success: false, message: '未找到可连接的蓝牙音箱' };
      }
      
      console.log(`[设备端] 选择音箱: ${speakerName} (${speakerMac})`);
      console.log(`[设备端] 步骤2: 执行 bluetoothctl trust ${speakerMac}`);
      
      // 信任设备
      await execAsync(`bluetoothctl trust ${speakerMac}`);
      console.log('[设备端] trust 命令执行完成');
      
      // 连接设备
      console.log(`[设备端] 步骤3: 执行 bluetoothctl connect ${speakerMac}`);
      try {
        await execAsync(`bluetoothctl connect ${speakerMac}`);
        console.log('[设备端] connect 命令执行完成');
      } catch (e) {
        console.log('[设备端] connect 命令可能已执行或超时:', e.message);
      }
      
      // 等待连接稳定
      console.log('[设备端] 等待3秒让连接稳定...');
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // 验证连接状态
      console.log(`[设备端] 步骤4: 执行 bluetoothctl info ${speakerMac}`);
      const { stdout: info } = await execAsync(`bluetoothctl info ${speakerMac}`);
      console.log('[设备端] 连接状态检查完成');
      
      if (info.includes('Connected: yes')) {
        this.bluetoothConnected = true;
        this.bluetoothSpeakerMac = speakerMac;
        console.log('[设备端] ✅ 蓝牙音箱已连接!');
        
        // 设置PulseAudio默认输出
        try {
          console.log('[设备端] 步骤5: 设置 PulseAudio 默认输出');
          const { stdout: sinks } = await execAsync('pactl list short sinks');
          console.log('[设备端] 可用的 sinks:', sinks);
          const bluetoothSink = sinks.split('\n').find(s => 
            s.includes(speakerMac.replace(/:/g, '_')) || s.includes('bluez')
          );
          
          if (bluetoothSink) {
            const sinkName = bluetoothSink.split('\t')[1];
            await execAsync(`pactl set-default-sink ${sinkName}`);
            console.log(`[设备端] ✅ 已设置默认音频输出: ${sinkName}`);
          } else {
            console.log('[设备端] 未找到蓝牙音频 sink');
          }
        } catch (e) {
          console.log('[设备端] 设置默认音频输出失败:', e.message);
        }
        
        console.log('[设备端] ================== 蓝牙连接成功 ==================');
        return { success: true, speakerName: speakerName, speakerMac: speakerMac };
      } else {
        console.log('[设备端] ❌ 蓝牙音箱未成功连接');
        console.log('[设备端] info 输出:', info.substring(0, 200));
        return { success: false, message: '蓝牙音箱连接失败，请检查设备状态' };
      }
      
    } catch (error) {
      console.log('[设备端] ❌ 蓝牙连接失败:', error.message);
      return { success: false, message: error.message };
    }
  }
  
  // 处理设备端音频命令
  async handleDeviceAudioCommand(commandId) {
    console.log(`[设备端] handleDeviceAudioCommand 被调用，commandId="${commandId}"`);
    const voiceInfo = this.getVoiceInfo(commandId);
    const voiceText = this.getVoiceText(commandId);

    if (voiceInfo) {
      // 构建音频文件路径
      const audioPath = `/home/orangepi/awl/Open-Board-Games/core/public/audio/commands/${voiceInfo.folder}/${commandId}.mp3`;
      console.log(`[设备端] 音频文件路径: ${audioPath}`);
      // 停止上一个播放并开始新播放
      this.stopCurrentPlayback();
      const success = await this.playAudioFile(audioPath);
      if (!success && voiceText) {
        console.log(`[设备端] mp3文件不存在，使用TTS备选播放: ${voiceText}`);
        await this.speak(voiceText);
      }
    } else if (voiceText) {
      // 如果没有配置 folder，使用 TTS
      console.log(`[设备端] 没有找到音频配置，使用TTS播放: ${voiceText}`);
      this.stopCurrentPlayback();
      await this.speak(voiceText);
    } else {
      console.log(`[设备端] 未找到命令 ${commandId} 对应的音频`);
    }
  }

  // 播放音频文件
  async playAudioFile(audioPath) {
    console.log(`[设备端] 尝试播放音频文件: ${audioPath}`);

    try {
      const fs = require('fs');
      const path = require('path');

      // 如果主路径不存在，尝试其他可能的 folder
      let actualPath = audioPath;
      if (!fs.existsSync(audioPath)) {
        console.log(`[设备端] 文件不存在，尝试查找备选路径...`);
        const basePath = '/home/orangepi/awl/Open-Board-Games/core/public/audio/commands';
        const fileName = path.basename(audioPath);
        const commandId = fileName.replace('.mp3', '');

        // 尝试在所有 folder 中查找
        const folders = ['night', 'day', 'opening', 'voting', 'mission', 'assassination', 'ending', 'numbers', 'segments', 'system', 'query'];
        for (const folder of folders) {
          const altPath = `${basePath}/${folder}/${fileName}`;
          if (fs.existsSync(altPath)) {
            actualPath = altPath;
            console.log(`[设备端] 找到备选文件: ${actualPath}`);
            break;
          }
        }
      }

      if (!fs.existsSync(actualPath)) {
        console.error('[设备端] 音频文件不存在:', audioPath);
        return false;
      }

      const stats = fs.statSync(actualPath);
      console.log(`[设备端] 音频文件大小: ${stats.size} bytes`);

      // 使用 ffplay 直接播放 mp3 到 PulseAudio
      // -nodisp: 不显示窗口
      // -af aresample=44100: 设置采样率
      const { spawn } = require('child_process');
      this.currentPlayProcess = spawn('ffplay', ['-nodisp', '-autoexit', '-af', 'aresample=44100', actualPath]);

      this.currentPlayProcess.on('close', (code) => {
        console.log(`[设备端] 音频播放完成，退出码: ${code}`);
        this.currentPlayProcess = null;
      });

      this.currentPlayProcess.on('error', (error) => {
        console.error('[设备端] 音频播放进程错误:', error.message);
        this.currentPlayProcess = null;
      });

      return true;

    } catch (error) {
      console.error('[设备端] 音频播放失败:', error.message);
      return false;
    }
  }

  // 停止当前播放的语音
  stopCurrentPlayback() {
    console.log('[设备端] 停止上一个播放');

    // 停止播放进程
    if (this.currentPlayProcess) {
      this.currentPlayProcess.kill('SIGKILL');
      this.currentPlayProcess = null;
    }

    // 也杀死所有 ffplay 和 ffmpeg 进程确保停止
    try {
      exec('pkill -9 ffplay 2>/dev/null');
      exec('pkill -9 ffmpeg 2>/dev/null');
    } catch (e) {
      // 忽略错误
    }
  }

  // 获取语音命令对应的信息（folder用于构建音频文件路径）
  getVoiceInfo(commandId) {
    const voiceMap = {
      // 开场阶段
      'CMD-001': { folder: 'opening' },
      'CMD-003': { folder: 'opening' },
      'CMD-004': { folder: 'opening' },
      'CMD-005': { folder: 'opening' },
      'CMD-006': { folder: 'opening' },
      'CMD-008': { folder: 'opening' },
      'CMD-009': { folder: 'opening' },
      'CMD-011': { folder: 'opening' },
      'CMD-013': { folder: 'opening' },
      'CMD-010': { folder: 'opening' },
      // 夜间阶段
      'CMD-020': { folder: 'night' },
      'CMD-022': { folder: 'day' },
      'CMD-044': { folder: 'night' },
      'CMD-045': { folder: 'day' },
      'CMD-050': { folder: 'night' },
      'CMD-051': { folder: 'night' },
      'CMD-053': { folder: 'night' },
      'CMD-054': { folder: 'night' },
      // 夜间阶段（新6步流程）
      'CMD-N01': { folder: 'night' },
      'CMD-N02': { folder: 'night' },
      'CMD-N03': { folder: 'night' },
      'CMD-N04': { folder: 'night' },
      'CMD-N05': { folder: 'night' },
      'CMD-N06': { folder: 'night' },
      'CMD-N08': { folder: 'night' },
      'CMD-N09': { folder: 'night' },
      'CMD-N10': { folder: 'night' },
      'CMD-N12': { folder: 'night' },
      // 白天阶段
      'CMD-041': { folder: 'day' },
      'CMD-042': { folder: 'day' },
      'CMD-048': { folder: 'day' },
      'CMD-052': { folder: 'day' },
      // 投票阶段
      'CMD-071': { folder: 'voting' },
      'CMD-074': { folder: 'voting' },
      'CMD-075': { folder: 'voting' },
      'CMD-076': { folder: 'voting' },
      'CMD-077': { folder: 'voting' },
      // 任务阶段
      'CMD-091': { folder: 'mission' },
      'CMD-094': { folder: 'mission' },
      'CMD-095': { folder: 'mission' },
      'CMD-097': { folder: 'mission' },
      'CMD-101': { folder: 'mission' },
      // 刺杀阶段
      'CMD-111': { folder: 'assassination' },
      'CMD-112': { folder: 'assassination' },
      'CMD-114': { folder: 'assassination' },
      'CMD-115': { folder: 'assassination' },
      'CMD-116': { folder: 'assassination' },
      'CMD-117': { folder: 'assassination' },
      // 结束阶段
      'CMD-126': { folder: 'ending' },
      'CMD-127': { folder: 'ending' },
      'CMD-128': { folder: 'ending' },
      'CMD-129': { folder: 'ending' },
      'CMD-131': { folder: 'ending' },
      'CMD-132': { folder: 'ending' },
      // 数字
      'NUM-1': { folder: 'numbers' },
      'NUM-2': { folder: 'numbers' },
      'NUM-3': { folder: 'numbers' },
      'NUM-4': { folder: 'numbers' },
      'NUM-5': { folder: 'numbers' },
      'NUM-6': { folder: 'numbers' },
      'NUM-7': { folder: 'numbers' },
      'NUM-8': { folder: 'numbers' },
      'NUM-9': { folder: 'numbers' },
      'NUM-10': { folder: 'numbers' },
      // 片段
      'SEG-ROOM': { folder: 'segments' },
      'SEG-NUMBER': { folder: 'segments' },
      'SEG-PERSON': { folder: 'segments' },
      'SEG-SET-PERSON': { folder: 'segments' }
    };
    return voiceMap[commandId] || null;
  }

  // 获取语音命令对应的文本（用于TTS备选）
  getVoiceText(commandId) {
    const textMap = {
      // 开场阶段
      'CMD-001': '欢迎各位来到阿瓦隆之夜！',
      'CMD-003': '本局角色配置说明。',
      'CMD-004': '房间已创建，请玩家加入。',
      'CMD-005': '设置游戏人数完成。',
      'CMD-006': '玩家加入了游戏。',
      'CMD-008': '所有玩家已准备，游戏即将开始。',
      'CMD-009': '现在分发身份牌。',
      'CMD-011': '所有人闭上眼睛。',
      'CMD-013': '重置游戏。',
      'CMD-010': '请确认你的身份，记住你的角色和技能。',
      // 夜间阶段
      'CMD-020': '请莫德雷德睁开眼睛，确认你的爪牙。',
      'CMD-022': '天亮了！',
      'CMD-044': '除奥伯伦外，所有坏人睁开眼睛，互相确认身份。',
      'CMD-045': '坏人阵营，请闭眼。',
      'CMD-050': '梅林，请睁眼。你将看到所有坏人阵营的成员，除了莫德雷德。',
      'CMD-051': '梅林，请闭眼。记住，你必须隐藏自己的身份，不要让坏人发现你。',
      'CMD-053': '派西维尔，请睁眼。你将看到两位玩家，一位是梅林，一位是莫甘娜。',
      'CMD-054': '派西维尔，请闭眼。保护梅林的身份，不要让他被坏人发现。',
      // 夜间阶段（新6步流程）
      'CMD-N01': '夜间阶段开始。请所有玩家闭眼，在桌面中央放置拳头，保持大拇指放下。',
      'CMD-N02': '请除了奥伯伦以外的所有坏人睁眼，互相确认彼此身份。',
      'CMD-N03': '坏人确认完毕，请闭眼。所有玩家放下大拇指。',
      'CMD-N04': '请所有坏人竖起你们的大拇指。',
      'CMD-N05': '梅林请睁眼，观察这些竖起大拇指的坏人，记住他们的位置。',
      'CMD-N06': '请收回大拇指，梅林请闭眼。',
      'CMD-N08': '请梅林和莫甘娜竖起你们的大拇指。',
      'CMD-N09': '派西维尔请睁眼，观察这两位玩家，分辨谁是梅林。',
      'CMD-N10': '请收回大拇指，派西维尔请闭眼。',
      'CMD-N12': '天亮了，请所有玩家睁眼，夜晚阶段结束，游戏正式开始。',
      // 白天阶段
      'CMD-041': '白天开始。请玩家自由讨论，推理身份。',
      'CMD-042': '本轮队长，请组织队伍。',
      'CMD-048': '讨论时间，请大家发言推理。',
      'CMD-052': '讨论结束，准备投票。',
      // 投票阶段
      'CMD-071': '投票开始！请对队伍进行投票。',
      'CMD-074': '投票通过，队伍执行任务。',
      'CMD-075': '投票否决，更换队长。',
      'CMD-076': '当前投票情况。',
      'CMD-077': '还有人未投票，请尽快投票。',
      // 任务阶段
      'CMD-091': '任务开始！请队员选择任务结果。',
      'CMD-094': '任务成功！',
      'CMD-095': '任务失败！',
      'CMD-097': '还有队员未选择，请尽快。',
      'CMD-101': '第四轮任务需要2个失败才失败。',
      // 刺杀阶段
      'CMD-111': '好人阵营已完成3次任务，进入刺杀阶段！刺客请准备。',
      'CMD-112': '刺杀开始！刺客请选择你认为的梅林。',
      'CMD-114': '刺客确认刺杀吗？这是最后的机会。',
      'CMD-115': '刺客执行刺杀！',
      'CMD-116': '刺杀成功！是梅林！坏人阵营获胜！',
      'CMD-117': '刺杀失败！不是梅林！好人阵营获胜！',
      // 结束阶段
      'CMD-126': '游戏结束！好人阵营获胜！成功守护了阿瓦隆！',
      'CMD-127': '游戏结束！坏人阵营获胜！阿瓦隆沦陷了！',
      'CMD-128': '身份公布。',
      'CMD-129': '本局统计。',
      'CMD-131': '感谢各位的参与，这是一场精彩的对决！',
      'CMD-132': '是否再来一局？',
      // 数字
      'NUM-1': '一', 'NUM-2': '二', 'NUM-3': '三',
      'NUM-4': '四', 'NUM-5': '五', 'NUM-6': '六',
      'NUM-7': '七', 'NUM-8': '八', 'NUM-9': '九',
      'NUM-10': '十',
      // 片段
      'SEG-ROOM': '房间', 'SEG-NUMBER': '号',
      'SEG-PERSON': '人', 'SEG-SET-PERSON': '人局'
    };
    return textMap[commandId] || null;
  }

  // 语音播报
  async speak(text) {
    if (this.tts) {
      await this.tts.speak(text);
    }
  }

  // 创建房间
  createRoom(playerCount = 5) {
    this.socket.emit('create-room', { playerCount }, (response) => {
      if (response.success) {
        console.log(`房间创建成功: ${response.roomId}`);
      } else {
        console.error('房间创建失败:', response.message);
      }
    });
  }

  // 开始游戏
  startGame() {
    this.socket.emit('start-game', { roomId: this.roomId });
  }

  // 推进阶段
  nextPhase() {
    this.socket.emit('next-phase', { roomId: this.roomId });
  }

  // 重置游戏
  resetGame() {
    this.socket.emit('reset-game', { roomId: this.roomId });
  }
}

// 启动
const controller = new VoiceController();
controller.initialize().catch(console.error);

module.exports = VoiceController;
