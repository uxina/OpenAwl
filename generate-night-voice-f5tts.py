#!/usr/bin/env python3
"""
阿瓦隆 - 夜间流程语音生成脚本
使用 F5-TTS 生成新版夜间流程语音（6步简化版）
"""

import os
import sys
import torch
from f5_tts.api import F5TTS

# 配置
AUDIO_DIR = "/home/orangepi/games/zy/optimized/core/public/audio/commands/night"
REFERENCE_AUDIO = "/home/orangepi/games/zy/optimized/core/public/audio/commands/opening/CMD-001.mp3"
REFERENCE_TEXT = "欢迎各位来到阿瓦隆之夜！我是今晚的主持人。作为一款经典的阵营对抗游戏，阿瓦隆将考验你们的逻辑推理和演技。好人阵营需要完成3次任务，坏人阵营需要破坏3次任务或刺杀梅林。"

# 要生成的语音列表（简化版6步流程 + 8-10人局变体）
VOICES = {
    "CMD-N01": "夜间阶段开始。请所有玩家闭眼，在桌面中央放置拳头，保持大拇指放下。",
    "CMD-N02": "请除了奥伯伦以外的所有坏人睁眼，互相确认彼此身份。",
    "CMD-N03": "坏人确认完毕，请闭眼。所有玩家放下大拇指。",
    "CMD-N05": "请所有坏人竖起你们的大拇指。梅林请睁眼，观察这些竖起大拇指的坏人，记住他们的位置。请收回大拇指，梅林请闭眼。",
    "CMD-N05-M": "请除了莫德雷德以外的所有坏人竖起你们的大拇指。梅林请睁眼，观察这些竖起大拇指的坏人，记住他们的位置。请收回大拇指，梅林请闭眼。",
    "CMD-N09": "请梅林和莫甘娜竖起你们的大拇指。派西维尔请睁眼，观察这两位玩家，分辨谁是梅林。请收回大拇指，派西维尔请闭眼。",
    "CMD-N12": "天亮了，请所有玩家睁眼，夜晚阶段结束，游戏正式开始。",
}

def main():
    print("=" * 60)
    print("  阿瓦隆 - 夜间流程语音生成 (F5-TTS)")
    print("=" * 60)
    print()

    # 检查参考音频
    if not os.path.exists(REFERENCE_AUDIO):
        print(f"❌ 错误: 参考音频不存在: {REFERENCE_AUDIO}")
        sys.exit(1)
    
    print(f"✅ 参考音频: {REFERENCE_AUDIO}")
    print(f"📁 输出目录: {AUDIO_DIR}")
    print()

    # 确保输出目录存在
    os.makedirs(AUDIO_DIR, exist_ok=True)

    # 初始化 F5-TTS 模型
    print("🔄 加载 F5-TTS 模型...")
    device = "cuda" if torch.cuda.is_available() else "cpu"
    print(f"   使用设备: {device}")
    
    tts = F5TTS(device=device)
    print("✅ 模型加载完成")
    print()

    # 生成语音
    success_count = 0
    fail_count = 0

    for voice_id, text in VOICES.items():
        output_file = os.path.join(AUDIO_DIR, f"{voice_id}.mp3")
        
        print(f"🎙️ 生成 {voice_id}...", end=" ", flush=True)
        
        try:
            # 使用 F5-TTS 生成语音
            wav, sr = tts.infer(
                ref_file=REFERENCE_AUDIO,
                ref_text=REFERENCE_TEXT,
                gen_text=text,
                speed=1.0,
                file_wave=output_file
            )
            
            if os.path.exists(output_file):
                file_size = os.path.getsize(output_file) / 1024
                print(f"✅ 成功 ({file_size:.1f} KB)")
                success_count += 1
            else:
                print("❌ 失败 (文件未生成)")
                fail_count += 1
                
        except Exception as e:
            print(f"❌ 失败: {e}")
            fail_count += 1

    print()
    print("=" * 60)
    print(f"✅ 生成完成！成功: {success_count}/{len(VOICES)}, 失败: {fail_count}/{len(VOICES)}")
    print("=" * 60)
    
    if fail_count > 0:
        print(f"\n⚠️ 有 {fail_count} 条语音生成失败，请检查错误信息")
        return 1
    else:
        print(f"\n🎉 所有语音生成成功！")
        print(f"\n输出目录: {AUDIO_DIR}")
        return 0

if __name__ == "__main__":
    sys.exit(main())
