#!/usr/bin/env python3
"""
阿瓦隆 - 夜间流程语音生成脚本 (MegaTTS3)
使用项目内的 MegaTTS3 和 CMD-001.mp3 作为参考音频，确保音色一致性
"""

import os
import sys
import torch
import subprocess

# 配置
MEGATTS3_PATH = "/home/orangepi/MegaTTS3"
REFERENCE_AUDIO = "/home/orangepi/games/zy/optimized/core/public/audio/commands/opening/CMD-001.mp3"
OUTPUT_DIR = "/home/orangepi/games/zy/optimized/core/public/audio/commands/night"
VENV_PYTHON = "/home/orangepi/MegaTTS3/venv/bin/python"

# 要生成的语音列表（简化版6步流程 + 8-10人局变体）
VOICES = [
    {"id": "CMD-N01", "text": "夜间阶段开始。请所有玩家闭眼，在桌面中央放置拳头，保持大拇指放下。"},
    {"id": "CMD-N02", "text": "请除了奥伯伦以外的所有坏人睁眼，互相确认彼此身份。"},
    {"id": "CMD-N03", "text": "坏人确认完毕，请闭眼。所有玩家放下大拇指。"},
    {"id": "CMD-N05", "text": "请所有坏人竖起你们的大拇指。梅林请睁眼，观察这些竖起大拇指的坏人，记住他们的位置。请收回大拇指，梅林请闭眼。"},
    {"id": "CMD-N05-M", "text": "请除了莫德雷德以外的所有坏人竖起你们的大拇指。梅林请睁眼，观察这些竖起大拇指的坏人，记住他们的位置。请收回大拇指，梅林请闭眼。"},
    {"id": "CMD-N09", "text": "请梅林和莫甘娜竖起你们的大拇指。派西维尔请睁眼，观察这两位玩家，分辨谁是梅林。请收回大拇指，派西维尔请闭眼。"},
    {"id": "CMD-N12", "text": "天亮了，请所有玩家睁眼，夜晚阶段结束，游戏正式开始。"},
]

def ensure_wav_format(audio_path):
    """确保音频是 WAV 格式"""
    if audio_path.endswith('.wav'):
        return audio_path
    
    wav_path = audio_path.rsplit('.', 1)[0] + '.wav'
    if os.path.exists(wav_path):
        return wav_path
    
    # 转换为 WAV
    print(f"  转换参考音频为 WAV 格式...")
    cmd = [
        "ffmpeg", "-i", audio_path, 
        "-ar", "24000", "-ac", "1", "-acodec", "pcm_s16le",
        wav_path, "-y"
    ]
    subprocess.run(cmd, capture_output=True)
    
    if os.path.exists(wav_path):
        return wav_path
    else:
        raise RuntimeError(f"无法转换参考音频: {audio_path}")

def generate_voice(voice_id, text, ref_wav, output_path):
    """使用 MegaTTS3 生成语音"""
    
    # 构建 Python 脚本
    python_script = f'''
import sys
sys.path.insert(0, "{MEGATTS3_PATH}")
sys.path.insert(0, "{MEGATTS3_PATH}/tts")

import torch
import librosa
import soundfile as sf
from pydub import AudioSegment

from tts.infer_cli import MegaTTS3DiTInfer

# 初始化模型（只加载一次）
infer = MegaTTS3DiTInfer(
    device="cpu",
    ckpt_root="{MEGATTS3_PATH}/checkpoints",
    precision=torch.float32  # CPU 使用 float32
)

# 加载参考音频
with open("{ref_wav}", "rb") as f:
    ref_audio_bytes = f.read()

# 预处理参考音频
resource_context = infer.preprocess(ref_audio_bytes, topk_dur=1)

# 生成语音
wav_pred = infer.forward(
    resource_context=resource_context,
    input_text="""{text}""",
    time_step=32,  # 扩散步数，越大质量越好但越慢
    p_w=1.6,       # phone 宽度
    t_w=2.5,       # tone 宽度
    dur_disturb=0.1,
    dur_alpha=1.0
)

# 保存为 WAV
sf.write("{output_path}", wav_pred, 24000)
print("生成完成")
'''
    
    # 执行脚本
    result = subprocess.run(
        [VENV_PYTHON, "-c", python_script],
        capture_output=True,
        text=True,
        cwd=MEGATTS3_PATH
    )
    
    if result.returncode != 0:
        print(f"  错误: {result.stderr}")
        return False
    
    return os.path.exists(output_path)

def convert_wav_to_mp3(wav_path, mp3_path):
    """将 WAV 转换为 MP3"""
    cmd = [
        "ffmpeg", "-i", wav_path,
        "-codec:a", "libmp3lame",
        "-qscale:a", "2",
        "-ar", "48000",  # 统一采样率
        mp3_path, "-y"
    ]
    result = subprocess.run(cmd, capture_output=True)
    return result.returncode == 0 and os.path.exists(mp3_path)

def main():
    print("=" * 70)
    print("  阿瓦隆 - 夜间流程语音生成 (MegaTTS3)")
    print("  使用参考音频: CMD-001.mp3")
    print("=" * 70)
    print()
    
    # 检查环境
    if not os.path.exists(REFERENCE_AUDIO):
        print(f"❌ 错误: 参考音频不存在: {REFERENCE_AUDIO}")
        sys.exit(1)
    
    if not os.path.exists(VENV_PYTHON):
        print(f"❌ 错误: Python 虚拟环境不存在: {VENV_PYTHON}")
        sys.exit(1)
    
    print(f"✅ 参考音频: {REFERENCE_AUDIO}")
    print(f"📁 输出目录: {OUTPUT_DIR}")
    print()
    
    # 确保输出目录存在
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    
    # 转换参考音频为 WAV
    try:
        ref_wav = ensure_wav_format(REFERENCE_AUDIO)
        print(f"✅ 参考音频 (WAV): {ref_wav}")
    except Exception as e:
        print(f"❌ 参考音频转换失败: {e}")
        sys.exit(1)
    
    print()
    print("🔄 正在加载 MegaTTS3 模型（首次加载需要较长时间）...")
    print()
    
    # 生成语音
    success_count = 0
    fail_count = 0
    
    for voice in VOICES:
        wav_path = os.path.join(OUTPUT_DIR, f"{voice['id']}_new.wav")
        mp3_path = os.path.join(OUTPUT_DIR, f"{voice['id']}.mp3")
        
        print(f"🎙️  生成 {voice['id']}...", end=" ", flush=True)
        
        try:
            # 生成语音
            if generate_voice(voice['id'], voice['text'], ref_wav, wav_path):
                # 转换为 MP3
                if convert_wav_to_mp3(wav_path, mp3_path):
                    # 删除临时 WAV 文件
                    os.remove(wav_path)
                    
                    file_size = os.path.getsize(mp3_path) / 1024
                    print(f"✅ 成功 ({file_size:.1f} KB)")
                    success_count += 1
                else:
                    print("❌ MP3 转换失败")
                    fail_count += 1
            else:
                print("❌ 生成失败")
                fail_count += 1
                
        except Exception as e:
            print(f"❌ 失败: {e}")
            fail_count += 1
    
    print()
    print("=" * 70)
    print(f"✅ 生成完成！成功: {success_count}/{len(VOICES)}, 失败: {fail_count}/{len(VOICES)}")
    print("=" * 70)
    
    if fail_count > 0:
        print(f"\n⚠️  有 {fail_count} 条语音生成失败")
        return 1
    else:
        print("\n🎉 所有语音生成成功！")
        print(f"\n输出目录: {OUTPUT_DIR}")
        print("\n生成的文件:")
        for voice in VOICES:
            print(f"  - {voice['id']}.mp3")
        return 0

if __name__ == "__main__":
    sys.exit(main())
