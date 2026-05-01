/**
 * 夜间流程语音生成脚本 - MeloTTS
 * 使用统一的参数确保音色一致性
 */

const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs').promises;
const path = require('path');

const execAsync = promisify(exec);

// 配置
const VENV_PYTHON = '/home/orangepi/MegaTTS3/venv/bin/python';
const OUTPUT_DIR = path.join(__dirname, 'core/public/audio/commands/night');

// 要生成的语音列表（简化版6步流程 + 8-10人局变体）
const VOICES = [
  { id: 'CMD-N01', text: '夜间阶段开始。请所有玩家闭眼，在桌面中央放置拳头，保持大拇指放下。' },
  { id: 'CMD-N02', text: '请除了奥伯伦以外的所有坏人睁眼，互相确认彼此身份。' },
  { id: 'CMD-N03', text: '坏人确认完毕，请闭眼。所有玩家放下大拇指。' },
  { id: 'CMD-N05', text: '请所有坏人竖起你们的大拇指。梅林请睁眼，观察这些竖起大拇指的坏人，记住他们的位置。请收回大拇指，梅林请闭眼。' },
  { id: 'CMD-N05-M', text: '请除了莫德雷德以外的所有坏人竖起你们的大拇指。梅林请睁眼，观察这些竖起大拇指的坏人，记住他们的位置。请收回大拇指，梅林请闭眼。' },
  { id: 'CMD-N09', text: '请梅林和莫甘娜竖起你们的大拇指。派西维尔请睁眼，观察这两位玩家，分辨谁是梅林。请收回大拇指，派西维尔请闭眼。' },
  { id: 'CMD-N12', text: '天亮了，请所有玩家睁眼，夜晚阶段结束，游戏正式开始。' },
];

// 统一的 TTS 参数（确保音色一致性）
const TTS_PARAMS = {
  sdp_ratio: 0.2,      // 时长预测噪声比例
  noise_scale: 0.6,    // 噪声尺度
  noise_scale_w: 0.8,  // 噪声宽度
  speed: 1.0           // 语速
};

async function convertWavToMp3(wavPath, mp3Path) {
  try {
    await execAsync(`ffmpeg -i "${wavPath}" -codec:a libmp3lame -qscale:a 2 -ar 48000 "${mp3Path}" -y 2>/dev/null`);
    return true;
  } catch (error) {
    return false;
  }
}

async function generateVoice(voiceId, text, outputPath) {
  const wavPath = outputPath.replace('.mp3', '_temp.wav');
  
  // 构建 Python 脚本 - 使用统一参数
  const pythonScript = `
import os
os.environ['HF_HUB_OFFLINE'] = '1'
os.environ['TRANSFORMERS_OFFLINE'] = '1'

from melo.api import TTS

# 初始化模型（只加载一次，复用）
model = TTS(language='ZH', device='cpu')
speaker_ids = model.hps.data.spk2id
speaker_id = speaker_ids['ZH']

# 使用统一参数生成
model.tts_to_file(
    '''${text.replace(/'/g, "\\'")}''',
    speaker_id,
    '${wavPath}',
    sdp_ratio=${TTS_PARAMS.sdp_ratio},
    noise_scale=${TTS_PARAMS.noise_scale},
    noise_scale_w=${TTS_PARAMS.noise_scale_w},
    speed=${TTS_PARAMS.speed}
)
print('生成完成')
`;

  try {
    await execAsync(`echo "${pythonScript}" | ${VENV_PYTHON}`);
    
    if (await fs.stat(wavPath).catch(() => null)) {
      // 转换为 MP3
      if (await convertWavToMp3(wavPath, outputPath)) {
        await fs.unlink(wavPath);
        return true;
      }
    }
    return false;
  } catch (error) {
    console.error(`  错误: ${error.message}`);
    return false;
  }
}

async function main() {
  console.log('='.repeat(70));
  console.log('  阿瓦隆 - 夜间流程语音生成 (MeloTTS)');
  console.log('  使用统一参数确保音色一致性');
  console.log('='.repeat(70));
  console.log();
  console.log('TTS 参数:');
  console.log(`  sdp_ratio: ${TTS_PARAMS.sdp_ratio}`);
  console.log(`  noise_scale: ${TTS_PARAMS.noise_scale}`);
  console.log(`  noise_scale_w: ${TTS_PARAMS.noise_scale_w}`);
  console.log(`  speed: ${TTS_PARAMS.speed}`);
  console.log();
  console.log(`📁 输出目录: ${OUTPUT_DIR}`);
  console.log();

  // 确保输出目录存在
  await fs.mkdir(OUTPUT_DIR, { recursive: true });

  let successCount = 0;
  let failCount = 0;

  for (const voice of VOICES) {
    const mp3Path = path.join(OUTPUT_DIR, `${voice.id}.mp3`);
    
    process.stdout.write(`🎙️  生成 ${voice.id}... `);
    
    try {
      if (await generateVoice(voice.id, voice.text, mp3Path)) {
        const stats = await fs.stat(mp3Path);
        const sizeKB = (stats.size / 1024).toFixed(1);
        console.log(`✅ 成功 (${sizeKB} KB)`);
        successCount++;
      } else {
        console.log('❌ 失败');
        failCount++;
      }
    } catch (error) {
      console.log(`❌ 失败: ${error.message}`);
      failCount++;
    }
  }

  console.log();
  console.log('='.repeat(70));
  console.log(`✅ 生成完成！成功: ${successCount}/${VOICES.length}, 失败: ${failCount}/${VOICES.length}`);
  console.log('='.repeat(70));
  
  if (failCount > 0) {
    console.log(`\n⚠️  有 ${failCount} 条语音生成失败`);
    process.exit(1);
  } else {
    console.log('\n🎉 所有语音生成成功！');
    console.log(`\n输出目录: ${OUTPUT_DIR}`);
  }
}

main().catch(error => {
  console.error('生成失败:', error);
  process.exit(1);
});
