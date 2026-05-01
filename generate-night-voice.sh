#!/bin/bash
# ============================================
# 阿瓦隆 - 夜间流程语音生成脚本
# 使用 FactoryTTS 生成新版夜间流程语音
# ============================================

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}==========================================${NC}"
echo -e "${BLUE}  阿瓦隆 - 夜间流程语音生成${NC}"
echo -e "${BLUE}==========================================${NC}"
echo ""

# 配置
AUDIO_DIR="/home/orangepi/games/zy/optimized/core/public/audio/commands/night"
BACKUP_DIR="/home/orangepi/games/zy/optimized/core/public/audio/commands/night-backup-$(date +%Y%m%d-%H%M%S)"
FACTORY_TTS_CMD="factorytts"  # FactoryTTS 命令（根据实际安装方式调整）

# 参考音频（用于音色匹配）
REFERENCE_AUDIO="/home/orangepi/games/zy/optimized/core/public/audio/commands/opening/CMD-001.mp3"

# 检查参考音频是否存在
if [ ! -f "$REFERENCE_AUDIO" ]; then
    echo -e "${RED}❌ 错误: 参考音频不存在: $REFERENCE_AUDIO${NC}"
    exit 1
fi

echo -e "${GREEN}✅ 参考音频: $REFERENCE_AUDIO${NC}"
echo ""

# 创建备份目录
echo -e "${YELLOW}📦 备份旧语音到: $BACKUP_DIR${NC}"
mkdir -p "$BACKUP_DIR"

# 定义要生成的语音列表
declare -A VOICES=(
    ["CMD-N01"]="夜间阶段开始。请所有玩家闭眼，在桌面中央放置拳头，保持大拇指放下。"
    ["CMD-N02"]="请除了奥伯伦以外的所有坏人睁眼，互相确认彼此身份。"
    ["CMD-N03"]="坏人确认完毕，请闭眼。所有玩家放下大拇指。"
    ["CMD-N05"]="请所有坏人竖起你们的大拇指。梅林请睁眼，观察这些竖起大拇指的坏人，记住他们的位置。请收回大拇指，梅林请闭眼。"
    ["CMD-N05-M"]="请除了莫德雷德以外的所有坏人竖起你们的大拇指。梅林请睁眼，观察这些竖起大拇指的坏人，记住他们的位置。请收回大拇指，梅林请闭眼。"
    ["CMD-N09"]="请梅林和莫甘娜竖起你们的大拇指。派西维尔请睁眼，观察这两位玩家，分辨谁是梅林。请收回大拇指，派西维尔请闭眼。"
    ["CMD-N12"]="天亮了，请所有玩家睁眼，夜晚阶段结束，游戏正式开始。"
)

# 备份旧语音文件
echo ""
echo -e "${YELLOW}📋 备份旧语音文件...${NC}"
for file in "$AUDIO_DIR"/CMD-N*.mp3 "$AUDIO_DIR"/CMD-016.mp3 "$AUDIO_DIR"/CMD-017.mp3 "$AUDIO_DIR"/CMD-018.mp3 "$AUDIO_DIR"/CMD-019.mp3 "$AUDIO_DIR"/CMD-020.mp3 "$AUDIO_DIR"/CMD-021.mp3 "$AUDIO_DIR"/CMD-022.mp3; do
    if [ -f "$file" ]; then
        cp "$file" "$BACKUP_DIR/"
        echo -e "  📄 $(basename $file) → backup/"
    fi
done
echo -e "${GREEN}✅ 旧语音已备份${NC}"

# 生成新语音
echo ""
echo -e "${YELLOW}🎙️ 生成新语音 (共 ${#VOICES[@]} 条)...${NC}"
echo ""

SUCCESS_COUNT=0
FAIL_COUNT=0

for voice_id in "${!VOICES[@]}"; do
    text="${VOICES[$voice_id]}"
    output_file="$AUDIO_DIR/${voice_id}.mp3"
    
    echo -n "  生成 $voice_id ... "
    
    # 使用 FactoryTTS 生成语音
    # 注意：根据你的 FactoryTTS 实际安装方式调整此命令
    if command -v $FACTORY_TTS_CMD &> /dev/null; then
        # FactoryTTS CLI 方式
        $FACTORY_TTS_CMD \
            --text "$text" \
            --output "$output_file" \
            --reference "$REFERENCE_AUDIO" \
            --voice "female" \
            --style "calm" \
            --speed 1.0 \
            --format mp3 \
            --sample-rate 48000 \
            --channels 1 \
            --bitrate 128k
        
        if [ $? -eq 0 ] && [ -f "$output_file" ]; then
            echo -e "${GREEN}✅ 成功${NC}"
            ((SUCCESS_COUNT++))
        else
            echo -e "${RED}❌ 失败${NC}"
            ((FAIL_COUNT++))
        fi
    else
        # 如果没有 FactoryTTS CLI，使用 edge-tts 或其他 TTS 工具
        # 这里使用 edge-tts 作为备选方案
        if command -v edge-tts &> /dev/null; then
            edge-tts \
                --text "$text" \
                --output "$output_file" \
                --voice zh-CN-XiaoxiaoNeural
            
            if [ $? -eq 0 ] && [ -f "$output_file" ]; then
                echo -e "${GREEN}✅ 成功 (edge-tts)${NC}"
                ((SUCCESS_COUNT++))
            else
                echo -e "${RED}❌ 失败${NC}"
                ((FAIL_COUNT++))
            fi
        else
            echo -e "${RED}❌ 未找到 TTS 工具${NC}"
            echo -e "     请安装 FactoryTTS 或 edge-tts"
            ((FAIL_COUNT++))
        fi
    fi
    
    # 短暂延迟，避免请求过快
    sleep 0.5
done

echo ""
echo -e "${BLUE}==========================================${NC}"
echo -e "${GREEN}✅ 生成完成！${NC}"
echo -e "  成功: $SUCCESS_COUNT / ${#VOICES[@]}"
echo -e "  失败: $FAIL_COUNT / ${#VOICES[@]}"
echo -e "${BLUE}==========================================${NC}"
echo ""

if [ $FAIL_COUNT -gt 0 ]; then
    echo -e "${YELLOW}⚠️ 有 $FAIL_COUNT 条语音生成失败，请检查:${NC}"
    echo -e "  1. FactoryTTS 是否正确安装？"
    echo -e "  2. 网络连接是否正常？"
    echo -e "  3. API 密钥是否配置？"
else
    echo -e "${GREEN}🎉 所有语音生成成功！${NC}"
fi

echo ""
echo -e "${BLUE}输出目录: $AUDIO_DIR${NC}"
echo -e "${BLUE}备份目录: $BACKUP_DIR${NC}"
echo ""
echo -e "${YELLOW}下一步操作:${NC}"
echo "  1. 测试新生成的语音播放效果"
echo "  2. 确认音色与 CMD-001 一致"
echo "  3. 运行 update-night-config.sh 更新配置"
echo "  4. 确认无误后删除备份目录: rm -rf $BACKUP_DIR"
