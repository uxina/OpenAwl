#!/bin/bash
# 使用 MegaTTS3 生成夜间流程语音

cd /home/orangepi/MegaTTS3
source venv/bin/activate

python3 << 'PYTHON_SCRIPT'
import os
import sys
import torch
import soundfile as sf
import subprocess

sys.path.insert(0, "/home/orangepi/MegaTTS3")
sys.path.insert(0, "/home/orangepi/MegaTTS3/tts")

from tts.infer_cli import MegaTTS3DiTInfer

REFERENCE_AUDIO = "/home/orangepi/games/zy/optimized/core/public/audio/commands/opening/CMD-001.mp3"
OUTPUT_DIR = "/home/orangepi/games/zy/optimized/core/public/audio/commands/night"
CKPT_ROOT = "/home/orangepi/MegaTTS3/checkpoints"

VOICES = [
    ("CMD-N01", "夜间阶段开始。请所有玩家闭眼，在桌面中央放置拳头，保持大拇指放下。"),
    ("CMD-N02", "请除了奥伯伦以外的所有坏人睁眼，互相确认彼此身份。"),
    ("CMD-N03", "坏人确认完毕，请闭眼。所有玩家放下大拇指。"),
    ("CMD-N05", "请所有坏人竖起你们的大拇指。梅林请睁眼，观察这些竖起大拇指的坏人，记住他们的位置。请收回大拇指，梅林请闭眼。"),
    ("CMD-N05-M", "请除了莫德雷德以外的所有坏人竖起你们的大拇指。梅林请睁眼，观察这些竖起大拇指的坏人，记住他们的位置。请收回大拇指，梅林请闭眼。"),
    ("CMD-N09", "请梅林和莫甘娜竖起你们的大拇指。派西维尔请睁眼，观察这两位玩家，分辨谁是梅林。请收回大拇指，派西维尔请闭眼。"),
    ("CMD-N12", "天亮了，请所有玩家睁眼，夜晚阶段结束，游戏正式开始。"),
]

def convert_to_mp3(wav_path, mp3_path):
    cmd = ["ffmpeg", "-i", wav_path, "-codec:a", "libmp3lame", "-qscale:a", "2", "-ar", "48000", mp3_path, "-y"]
    result = subprocess.run(cmd, capture_output=True)
    return result.returncode == 0

print("=" * 70)
print("  阿瓦隆夜间流程语音生成 (MegaTTS3)")
print("=" * 70)
print(f"参考音频: {REFERENCE_AUDIO}")
print(f"输出目录: {OUTPUT_DIR}")
print()

os.makedirs(OUTPUT_DIR, exist_ok=True)

# 转换参考音频
ref_wav = REFERENCE_AUDIO.replace('.mp3', '.wav')
if not os.path.exists(ref_wav):
    print("转换参考音频为 WAV...")
    subprocess.run(["ffmpeg", "-i", REFERENCE_AUDIO, "-ar", "24000", "-ac", "1", "-acodec", "pcm_s16le", ref_wav, "-y"], capture_output=True)

print("🔄 加载 MegaTTS3 模型...")
infer = MegaTTS3DiTInfer(device="cpu", ckpt_root=CKPT_ROOT, precision=torch.float32)
print("✅ 模型加载完成")
print()

print("🔄 预处理参考音频...")
with open(ref_wav, "rb") as f:
    ref_bytes = f.read()
resource = infer.preprocess(ref_bytes, topk_dur=1)
print("✅ 预处理完成")
print()

success = 0
fail = 0

for vid, text in VOICES:
    wav_out = os.path.join(OUTPUT_DIR, f"{vid}_temp.wav")
    mp3_out = os.path.join(OUTPUT_DIR, f"{vid}.mp3")
    
    print(f"🎙️  {vid}...", end=" ", flush=True)
    
    try:
        wav = infer.forward(resource, text, time_step=32, p_w=1.6, t_w=2.5, dur_disturb=0.1, dur_alpha=1.0)
        sf.write(wav_out, wav, 24000)
        
        if convert_to_mp3(wav_out, mp3_out):
            os.remove(wav_out)
            size = os.path.getsize(mp3_out) / 1024
            print(f"✅ ({size:.1f} KB)")
            success += 1
        else:
            print("❌ MP3失败")
            fail += 1
    except Exception as e:
        print(f"❌ {e}")
        fail += 1

print()
print(f"✅ 完成: {success}/{len(VOICES)}, 失败: {fail}/{len(VOICES)}")
PYTHON_SCRIPT
