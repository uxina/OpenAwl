/**
 * MeloTTS引擎封装
 * 离线中文语音合成
 */

const { spawn } = require('child_process');
const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const config = require('../../config/voice-config');

const execAsync = promisify(exec);

class MeloTTSEngine {
  constructor() {
    this.initialized = false;
    this.cacheDir = config.tts.audioOutputPath;
    this.venvPath = config.tts.venvPath;
  }

  async initialize() {
    // 确保缓存目录存在
    await fs.mkdir(this.cacheDir, { recursive: true });
    
    // 设置环境变量
    process.env.HF_HUB_OFFLINE = '1';
    process.env.TRANSFORMERS_OFFLINE = '1';
    
    this.initialized = true;
    console.log('MeloTTS引擎初始化完成');
  }

  /**
   * 生成音频并播放
   */
  async speak(text) {
    const audioPath = await this.generate(text);
    if (audioPath) {
      await this.play(audioPath);
    }
  }

  /**
   * 生成音频文件
   */
  async generate(text, outputPath = null) {
    if (!this.initialized) {
      throw new Error('TTS引擎未初始化');
    }

    // 检查缓存
    const cacheKey = this.getCacheKey(text);
    const cachePath = path.join(this.cacheDir, `melotts_${cacheKey}.wav`);
    
    if (config.tts.useCache && !outputPath) {
      try {
        await fs.access(cachePath);
        return cachePath; // 返回缓存文件
      } catch {
        // 缓存不存在，继续生成
      }
    }

    const finalPath = outputPath || cachePath;

    try {
      // 使用Python生成音频
      const pythonScript = `
import os
os.environ['HF_HUB_OFFLINE'] = '1'
os.environ['TRANSFORMERS_OFFLINE'] = '1'

from melo.api import TTS

model = TTS(language='ZH', device='cpu')
speaker_ids = model.hps.data.spk2id
speaker_id = speaker_ids['ZH']

model.tts_to_file(
    '''${text.replace(/'/g, "\\'")}''',
    speaker_id,
    '${finalPath}',
    sdp_ratio=${config.tts.sdpRatio},
    noise_scale=${config.tts.noiseScale},
    noise_scale_w=${config.tts.noiseScaleW}
)
print('生成完成')
`;

      const pythonPath = path.join(this.venvPath, 'bin/python');
      await execAsync(`echo "${pythonScript}" | ${pythonPath}`);
      
      return finalPath;
    } catch (error) {
      console.error('TTS生成失败:', error);
      return null;
    }
  }

  /**
   * 播放音频
   */
  async play(audioPath) {
    console.log(`[设备端] 尝试播放音频: ${audioPath}`);
    console.log(`[设备端] 当前音频输出设备: ${config.audio.outputDevice}`);
    
    try {
      // 检查音频文件是否存在
      const fs = require('fs');
      if (!fs.existsSync(audioPath)) {
        console.error('[设备端] 音频文件不存在:', audioPath);
        return;
      }
      
      // 获取文件大小
      const stats = fs.statSync(audioPath);
      console.log(`[设备端] 音频文件大小: ${stats.size} bytes`);
      
      // 优先使用蓝牙音箱
      if (config.audio.outputDevice === 'bluetooth') {
        console.log('[设备端] 使用 paplay 播放（蓝牙音箱）');
        await execAsync(`paplay "${audioPath}"`);
        console.log('[设备端] paplay 执行完成');
      } else {
        console.log('[设备端] 使用 aplay 播放（默认设备）');
        await execAsync(`aplay "${audioPath}"`);
        console.log('[设备端] aplay 执行完成');
      }
    } catch (error) {
      console.error('[设备端] 音频播放失败:', error.message);
    }
  }

  /**
   * 生成缓存键
   */
  getCacheKey(text) {
    return crypto.createHash('md5').update(text).digest('hex');
  }
}

module.exports = MeloTTSEngine;
