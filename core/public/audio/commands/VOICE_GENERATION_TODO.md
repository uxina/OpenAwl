# 待生成语音清单

## 生成要求
- **工具**: MeloTTS
- **格式**: MP3
- **采样率**: 48000 Hz
- **声道**: Mono (单声道)
- **比特率**: 65 kb/s
- **编码**: libmp3lame

## 待生成语音列表

### 1. 轮次播报相关 (BUG-025)

| 文件名 | 文本内容 | 用途 |
|--------|----------|------|
| `segments/SEG-ROUND-TEAM.mp3` | "轮组队" | 与序数词拼接，如"第一轮组队" |
| `segments/SEG-LEADER-IS.mp3` | "队长是" | 引出队长号码 |
| `segments/SEG-FIRST.mp3` | "第一" | 第1轮 |
| `segments/SEG-SECOND.mp3` | "第二" | 第2轮 |
| `segments/SEG-THIRD.mp3` | "第三" | 第3轮 |
| `segments/SEG-FOURTH.mp3` | "第四" | 第4轮 |
| `segments/SEG-FIFTH.mp3` | "第五" | 第5轮 |

### 2. 其他可能需要的片段

| 文件名 | 文本内容 | 用途 |
|--------|----------|------|
| `segments/SEG-ROUND.mp3` | "轮" | 与数字拼接 |
| `segments/SEG-NUMBER.mp3` | "号" | 与数字拼接表示号码 |

## MeloTTS 生成命令

在Linux设备上执行：

```bash
# 进入音频目录
cd /path/to/device/assets/audio/commands

# 创建segments目录（如果不存在）
mkdir -p segments

# 生成轮次播报相关
melo-tts --text "轮组队" --output segments/SEG-ROUND-TEAM.mp3
melo-tts --text "队长是" --output segments/SEG-LEADER-IS.mp3
melo-tts --text "第一" --output segments/SEG-FIRST.mp3
melo-tts --text "第二" --output segments/SEG-SECOND.mp3
melo-tts --text "第三" --output segments/SEG-THIRD.mp3
melo-tts --text "第四" --output segments/SEG-FOURTH.mp3
melo-tts --text "第五" --output segments/SEG-FIFTH.mp3

# 可选：生成其他片段
melo-tts --text "轮" --output segments/SEG-ROUND.mp3
melo-tts --text "号" --output segments/SEG-NUMBER.mp3
```

## 音频后处理

生成后使用FFmpeg标准化：

```bash
for file in segments/SEG-*.mp3; do
    ffmpeg -i "$file" \
        -acodec libmp3lame \
        -ar 48000 \
        -ac 1 \
        -b:a 65k \
        -af "loudnorm=I=-14:TP=-1.5:LRA=11,afftdn=nf=-25" \
        "${file}.tmp.mp3"
    mv "${file}.tmp.mp3" "$file"
done
```

## 拼接示例

生成后，播报"第一轮组队，队长是3号"的拼接方式：

```javascript
const audioQueue = [
    { path: 'segments/SEG-FIRST.mp3', name: '第一' },
    { path: 'segments/SEG-ROUND-TEAM.mp3', name: '轮组队' },
    { path: 'segments/SEG-LEADER-IS.mp3', name: '队长是' },
    { path: 'numbers/NUM-3.mp3', name: '3' },
    { path: 'segments/SEG-NUMBER.mp3', name: '号' }
];
playAudioQueue(audioQueue);
```

## 状态

- [ ] 已生成所有语音片段
- [ ] 已进行音频后处理
- [ ] 已更新voice-panel-config.js
- [ ] 已测试拼接播报效果
