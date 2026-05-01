#!/bin/bash
# 夜间流程语音生成脚本 - MeloTTS
# 参考 CMD-001.mp3 的参数：48000Hz, 单声道, 音量 -16dB

cd /home/orangepi/games/zy/optimized
source /home/orangepi/MegaTTS3/venv/bin/activate

python3 << 'PYTHON_SCRIPT'
import os
import sys
import subprocess
import torch
import torchaudio
import numpy as np

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

# 目标音量 (参考 CMD-001.mp3)
TARGET_MEAN_DB = -16.0
TARGET_SAMPLE_RATE = 48000
TARGET_CHANNELS = 1
TARGET_BITRATE = "74k"

def adjust_volume(audio_np, target_db):
    """调整音频音量到目标 dB"""
    # 计算当前 RMS
    current_rms = np.sqrt(np.mean(audio_np**2))
    if current_rms == 0:
        return audio_np
    
    # 计算当前 dB
    current_db = 20 * np.log10(current_rms)
    
    # 计算增益
    gain_db = target_db - current_db
    gain_linear = 10 ** (gain_db / 20)
    
    # 应用增益
    adjusted = audio_np * gain_linear
    
    # 防止削波
    max_val = np.max(np.abs(adjusted))
    if max_val > 0.95:
        adjusted = adjusted * (0.95 / max_val)
    
    return adjusted

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
print("  参考 CMD-001.mp3 参数")
print("=" * 70)
print()
print(f"参考音频: {REF_AUDIO}")
print(f"输出目录: {OUTPUT_DIR}")
print()
print("目标参数:")
print(f"  采样率: {TARGET_SAMPLE_RATE} Hz")
print(f"  声道: {TARGET_CHANNELS} (单声道)")
print(f"  目标音量: {TARGET_MEAN_DB} dB")
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
        
        # 加载生成的音频并调整音量
        waveform, sample_rate = torchaudio.load(wav_path)
        audio_np = waveform.numpy().squeeze()
        
        # 调整音量到目标 dB
        adjusted_audio = adjust_volume(audio_np, TARGET_MEAN_DB)
        
        # 保存调整后的 WAV
        adjusted_wav = wav_path.replace("_temp.wav", "_adjusted.wav")
        torchaudio.save(adjusted_wav, torch.from_numpy(adjusted_audio).unsqueeze(0), sample_rate)
        
        # 转换为 MP3 (使用参考音频的参数)
        if save_mp3(adjusted_wav, mp3_path, TARGET_SAMPLE_RATE, TARGET_BITRATE):
            os.remove(wav_path)
            os.remove(adjusted_wav)
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
