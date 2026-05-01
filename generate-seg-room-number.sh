#!/bin/bash
# 生成 SEG-ROOM-NUMBER.mp3 片段语音

cd /home/orangepi/games/zy/optimized
source /home/orangepi/MegaTTS3/venv/bin/activate

python3 << 'PYTHON_SCRIPT'
import os
import sys
import subprocess

os.environ['HF_HUB_OFFLINE'] = '1'
os.environ['TRANSFORMERS_OFFLINE'] = '1'

from melo.api import TTS

OUTPUT_DIR = "/home/orangepi/games/zy/optimized/core/public/audio/commands/segments"
TEXT = "房间号"
OUTPUT_FILE = os.path.join(OUTPUT_DIR, "SEG-ROOM-NUMBER.mp3")

# 统一参数
SDP_RATIO = 0.2
NOISE_SCALE = 0.6
NOISE_SCALE_W = 0.8
SPEED = 1.0

def convert_to_mp3(wav_path, mp3_path, sample_rate=48000, bitrate="65k"):
    """转换为 MP3"""
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

print("=" * 50)
print("生成 SEG-ROOM-NUMBER.mp3")
print("=" * 50)
print(f"文本: {TEXT}")
print(f"输出: {OUTPUT_FILE}")
print()

os.makedirs(OUTPUT_DIR, exist_ok=True)

print("🔄 加载 MeloTTS 模型...")
model = TTS(language='ZH', device='cpu')
speaker_ids = model.hps.data.spk2id
speaker_id = speaker_ids['ZH']
print("✅ 模型加载完成")
print()

wav_path = OUTPUT_FILE.replace('.mp3', '_temp.wav')

print(f"🎙️ 生成语音...", end=" ", flush=True)

try:
    # 生成语音
    model.tts_to_file(
        TEXT,
        speaker_id,
        wav_path,
        sdp_ratio=SDP_RATIO,
        noise_scale=NOISE_SCALE,
        noise_scale_w=NOISE_SCALE_W,
        speed=SPEED
    )
    
    # 转换为 MP3
    if convert_to_mp3(wav_path, OUTPUT_FILE):
        os.remove(wav_path)
        size = os.path.getsize(OUTPUT_FILE) / 1024
        print(f"✅ 成功 ({size:.1f} KB)")
    else:
        print("❌ MP3转换失败")
        sys.exit(1)
        
except Exception as e:
    print(f"❌ 失败: {e}")
    sys.exit(1)

print()
print(f"✅ 完成: {OUTPUT_FILE}")
PYTHON_SCRIPT
