#!/bin/bash
# 夜间流程语音生成脚本 - MeloTTS
# 使用统一参数，模型只加载一次

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

def convert_to_mp3(wav_path, mp3_path):
    cmd = ["ffmpeg", "-i", wav_path, "-codec:a", "libmp3lame", "-qscale:a", "2", "-ar", "48000", mp3_path, "-y"]
    result = subprocess.run(cmd, capture_output=True)
    return result.returncode == 0

print("=" * 70)
print("  阿瓦隆夜间流程语音生成 (MeloTTS)")
print("  使用统一参数确保音色一致性")
print("=" * 70)
print()
print(f"输出目录: {OUTPUT_DIR}")
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
        
        # 转换为 MP3
        if convert_to_mp3(wav_path, mp3_path):
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
PYTHON_SCRIPT
