# 静音片段重新生成清单

## 问题文件（7个）

这些文件是静音的，需要在 Linux 设备上用 MeloTTS 重新生成：

| 文件名 | 文本内容 | 说明 |
|--------|----------|------|
| SEG-COMMA.mp3 | ， | 逗号停顿 |
| SEG-NUMBER.mp3 | 号 | 用于"X号玩家" |
| SEG-PERIOD.mp3 | 。 | 句号停顿 |
| SEG-ROOM-SET.mp3 | 房间已设置为 | 用于设置房间 |
| SEG-ROUND.mp3 | 第X轮 | 轮次 |
| SEG-SET-PERSON.mp3 | 人局 | 用于"X人局" |

## MeloTTS 生成命令

```bash
cd /home/orangepi/games/zy/device/assets/audio/commands/segments

# 重新生成静音文件
melo-tts "，" -o SEG-COMMA.mp3
melo-tts "号" -o SEG-NUMBER.mp3
melo-tts "。" -o SEG-PERIOD.mp3
melo-tts "房间已设置为" -o SEG-ROOM-SET.mp3
melo-tts "轮" -o SEG-ROUND.mp3
melo-tts "人局" -o SEG-SET-PERSON.mp3
```

## 同步到本地

```bash
# 示例：从远程服务器同步（替换为实际IP和路径）
scp <user>@<server-ip>:<remote-path>/SEG-COMMA.mp3 <local-path>/
scp <user>@<server-ip>:<remote-path>/SEG-NUMBER.mp3 <local-path>/
scp <user>@<server-ip>:<remote-path>/SEG-PERIOD.mp3 <local-path>/
scp <user>@<server-ip>:<remote-path>/SEG-ROOM-SET.mp3 <local-path>/
scp <user>@<server-ip>:<remote-path>/SEG-ROUND.mp3 <local-path>/
scp <user>@<server-ip>:<remote-path>/SEG-SET-PERSON.mp3 <local-path>/
```

## 已标准化的文件

以下文件已通过增益调整标准化到 -16 LUFS：

- SEG-AGREE.mp3: +6.97 dB
- SEG-CURRENT.mp3: +4.35 dB
- SEG-FAIL.mp3: +7.59 dB
- SEG-FIFTH.mp3: +22.61 dB
- SEG-FIRST.mp3: -1.54 dB
- SEG-FOURTH.mp3: +29.49 dB
- SEG-LEADER-IS.mp3: +25.5 dB
- SEG-LEADER.mp3: +3.04 dB
- SEG-MISSION.mp3: +2.39 dB
- SEG-PASS.mp3: +5.02 dB
- SEG-PERSON.mp3: -0.01 dB
- SEG-PLEASE-JOIN.mp3: 0 dB
- SEG-REJECT.mp3: +1.57 dB
- SEG-REJECTED.mp3: +5.44 dB
- SEG-ROOM-CREATED.mp3: +0.41 dB
- SEG-ROOM-NUMBER.mp3: +0.36 dB
- SEG-ROOM.mp3: +0.01 dB
- SEG-ROUND-TEAM.mp3: +21.03 dB
- SEG-SECOND.mp3: +24.92 dB
- SEG-SUCCESS.mp3: +4.29 dB
- SEG-TEAM.mp3: +4.99 dB
- SEG-THIRD.mp3: +29.25 dB
- SEG-VOTE.mp3: +4.12 dB
