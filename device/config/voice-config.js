/**
 * 语音主控配置文件
 */

const path = require('path');

module.exports = {
  // 服务器连接配置
  server: {
    url: process.env.SERVER_URL || 'http://localhost:3000',
    reconnectInterval: 5000,
    maxReconnectAttempts: 10
  },
  
  // TTS配置
  tts: {
    engine: 'melotts', // melotts, edge-tts, piper
    venvPath: '/home/orangepi/MegaTTS3/venv',
    audioOutputPath: path.join(__dirname, '../assets/audio'),
    useCache: true,
    speed: 1.0,
    speaker: 'ZH',
    sdpRatio: 0.2,
    noiseScale: 0.6,
    noiseScaleW: 0.8
  },
  
  // ASR配置
  asr: {
    engine: 'sherpa-onnx', // sherpa-onnx, whisper, faster-whisper
    modelPath: path.join(__dirname, '../models/sherpa-onnx-zh'),
    sampleRate: 16000,
    chunkDuration: 0.5,
    bufferDuration: 2.0
  },
  
  // 音频播放配置
  audio: {
    outputDevice: 'bluetooth', // bluetooth, default
    volume: 80,
    format: 'mp3'
  },
  
  // 唤醒词配置
  wakeWord: {
    enabled: true,
    words: ['裁判', '主持人'],
    timeout: 10000 // 唤醒后监听超时时间(ms)
  },
  
  // 语音指令配置
  commands: {
    configPath: path.join(__dirname, 'voice-commands.json')
  }
};
