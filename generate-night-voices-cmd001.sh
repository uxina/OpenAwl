#!/bin/bash
# 夜间流程语音生成脚本 - MeloTTS
# 参考 CMD-001.mp3 的音频格式参数

cd /home/orangepi/games/zy/optimized
source /home/orangepi/MegaTTS3/venv/bin/activate

python3 << 'PYTHON_SCRIPT'
import os
import sys
import subprocess

os.environ['HF_HUB_OFFLINE'] = '1'
os.environ['TRANSFORMERS_OFFLINE'] = '1'

from melo.api import TTS

OUTPUT_DIR = "/home/orangepi/games/zy/optimized/core/public/audio/commands/night"
REF_AUDIO = "/home/orangepi/games/zy/optimized/core/public/audio/commands/opening/CMD-001.mp3"

VOICES = [
    ("CMD-N01", "夜间阶段开始。请所有玩家闭眼，在桌面中央放置拳头，保持大拇指放下。"),
    ("CMD-N02", "请除了奥伯伦以外的所有坏人睁眼，互相确认彼此身份。"),
    ("CMD-N03", "坏人确认完毕，请闭眼。所有玩家放下大拇指。"),
    ("CMD-N05", "请所有坏人竖起你们的大拇指。梅林请睁眼，观察这些竖起大拇指的坏人，记住他们的位置。请收回大拇指，梅林请闭眼。"),
    ("CMD-N05-M", "请除了莫德雷德以外的所有坏人竖起你们的大拇指。梅林请睁眼，观察这些竖起大拇指的坏人，记住他们的位置。请收回大拇指，梅林请闭眼。"),
    ("CMD-N09", "请梅林和莫甘娜竖起你们的大拇指。派西维尔请睁眼，观察这两位玩家，分辨谁是梅林。请收回大拇指，派西维尔请闭眼。"),
    ("CMD-N12", "天亮了，请所有玩家睁眼，夜晚阶段结束，游戏正式开始。"),
]

# 统一参数
SDP_RATIO = 0.2
NOISE_SCALE = 0.6
NOISE_SCALE_W = 0.8
SPEED = 1.0

# 参考 CMD-001.mp3 的音频参数
TARGET_SAMPLE_RATE = 48000
TARGET_CHANNELS = 1
TARGET_BITRATE = "74k"

def save_mp3(wav_path, mp3_path, sample_rate=48000, bitrate="74k"):
    """转换为 MP3，使用参考音频的参数"""
    cmd = [
        "ffmpeg", "-y",
        "-i", wav_path,
        "-ar", str(sample_rate),
        "-ac", "1",
        "-codec:a", "libmp3lame",
        "-b:a", bitrate,
        mp3_path
    ]
    result = subprocess.run(cmd, capture_output=True)
    return result.returncode == 0

print("=" * 70)
print("  阿瓦隆夜间流程语音生成 (MeloTTS)")
print("  参考 CMD-001.mp3 音频格式参数")
print("=" * 70)
print()
print(f"参考音频: {REF_AUDIO}")
print(f"输出目录: {OUTPUT_DIR}")
print()
print("音频参数:")
print(f"  采样率: {TARGET_SAMPLE_RATE} Hz")
print(f"  声道: {TARGET_CHANNELS} (单声道)")
print(f"  比特率: {TARGET_BITRATE}")
print()
print("TTS 参数:")
print(f"  sdp_ratio: {SDP_RATIO}")
print(f"  noise_scale: {NOISE_SCALE}")
print(f"  noise_scale_w: {NOISE_SCALE_W}")
print(f"  speed: {SPEED}")
print()

os.makedirs(OUTPUT_DIR, exist_ok=True)

print("🔄 加载 MeloTTS 模型...")
model = TTS(language='ZH', device='cpu')
speaker_ids = model.hps.data.spk2id
speaker_id = speaker_ids['ZH']
print("✅ 模型加载完成")
print()

success = 0
fail = 0

for vid, text in VOICES:
    wav_path = os.path.join(OUTPUT_DIR, f"{vid}_temp.wav")
    mp3_path = os.path.join(OUTPUT_DIR, f"{vid}.mp3")
    
    print(f"🎙️  {vid}...", end=" ", flush=True)
    
    try:
        # 生成语音（使用统一参数）
        model.tts_to_file(
            text,
            speaker_id,
            wav_path,
            sdp_ratio=SDP_RATIO,
            noise_scale=NOISE_SCALE,
            noise_scale_w=NOISE_SCALE_W,
            speed=SPEED
        )
        
        # 转换为 MP3 (使用参考音频的参数)
        if save_mp3(wav_path, mp3_path, TARGET_SAMPLE_RATE, TARGET_BITRATE):
            os.remove(wav_path)
            size = os.path.getsize(mp3_path) / 1024
            print(f"✅ ({size:.1f} KB)")
            success += 1
        else:
            print("❌ MP3转换失败")
            fail += 1
    except Exception as e:
        print(f"❌ {e}")
        fail += 1

print()
print(f"✅ 完成: {success}/{len(VOICES)}, 失败: {fail}/{len(VOICES)}")
print()
print("生成的文件:")
for vid, _ in VOICES:
    print(f"  {OUTPUT_DIR}/{vid}.mp3")
PYTHON_SCRIPT
