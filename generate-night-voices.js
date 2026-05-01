/**
 * 夜间流程语音生成脚本
 * 使用项目内的 MeloTTS 工厂生成新版夜间流程语音（6步简化版）
 */

const TTSFactory = require('./device/src/audio/tts-factory');
const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

// 配置
const OUTPUT_DIR = path.join(__dirname, 'core/public/audio/commands/night');

// 要生成的语音列表（简化版6步流程 + 8-10人局变体）
const NIGHT_VOICES = [
  { id: 'CMD-N01', text: '夜间阶段开始。请所有玩家闭眼，在桌面中央放置拳头，保持大拇指放下。' },
  { id: 'CMD-N02', text: '请除了奥伯伦以外的所有坏人睁眼，互相确认彼此身份。' },
  { id: 'CMD-N03', text: '坏人确认完毕，请闭眼。所有玩家放下大拇指。' },
  { id: 'CMD-N05', text: '请所有坏人竖起你们的大拇指。梅林请睁眼，观察这些竖起大拇指的坏人，记住他们的位置。请收回大拇指，梅林请闭眼。' },
  { id: 'CMD-N05-M', text: '请除了莫德雷德以外的所有坏人竖起你们的大拇指。梅林请睁眼，观察这些竖起大拇指的坏人，记住他们的位置。请收回大拇指，梅林请闭眼。' },
  { id: 'CMD-N09', text: '请梅林和莫甘娜竖起你们的大拇指。派西维尔请睁眼，观察这两位玩家，分辨谁是梅林。请收回大拇指，派西维尔请闭眼。' },
  { id: 'CMD-N12', text: '天亮了，请所有玩家睁眼，夜晚阶段结束，游戏正式开始。' },
];

async function convertWavToMp3(wavPath, mp3Path) {
  try {
    // 使用 ffmpeg 将 wav 转换为 mp3
    await execAsync(`ffmpeg -i "${wavPath}" -codec:a libmp3lame -qscale:a 2 "${mp3Path}" -y 2>/dev/null`);
    return true;
  } catch (error) {
    console.error(`  转换失败: ${error.message}`);
    return false;
  }
}

async function generateNightVoices() {
  console.log('='.repeat(60));
  console.log('  阿瓦隆 - 夜间流程语音生成 (MeloTTS)');
  console.log('='.repeat(60));
  console.log();

  // 确保输出目录存在
  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  console.log(`📁 输出目录: ${OUTPUT_DIR}`);
  console.log();

  // 初始化 TTS 引擎
  console.log('🔄 初始化 TTS 引擎...');
  const tts = TTSFactory.getEngine('melotts');
  await tts.initialize();
  console.log('✅ TTS 引擎初始化完成');
  console.log();

  // 生成语音
  let successCount = 0;
  let failCount = 0;

  for (const voice of NIGHT_VOICES) {
    const wavPath = path.join(OUTPUT_DIR, `${voice.id}.wav`);
    const mp3Path = path.join(OUTPUT_DIR, `${voice.id}.mp3`);

    process.stdout.write(`🎙️  生成 ${voice.id}... `);

    try {
      // 生成 WAV 文件
      await tts.generate(voice.text, wavPath);

      // 转换为 MP3
      const converted = await convertWavToMp3(wavPath, mp3Path);

      if (converted && (await fs.stat(mp3Path).catch(() => null))) {
        // 删除临时 WAV 文件
        await fs.unlink(wavPath).catch(() => {});

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
  console.log('='.repeat(60));
  console.log(`✅ 生成完成！成功: ${successCount}/${NIGHT_VOICES.length}, 失败: ${failCount}/${NIGHT_VOICES.length}`);
  console.log('='.repeat(60));

  if (failCount > 0) {
    console.log(`\n⚠️  有 ${failCount} 条语音生成失败`);
    process.exit(1);
  } else {
    console.log('\n🎉 所有语音生成成功！');
    console.log(`\n输出目录: ${OUTPUT_DIR}`);
    console.log('\n生成的文件:');
    for (const voice of NIGHT_VOICES) {
      console.log(`  - ${voice.id}.mp3`);
    }
  }
}

// 运行
generateNightVoices().catch(error => {
  console.error('生成失败:', error);
  process.exit(1);
});
