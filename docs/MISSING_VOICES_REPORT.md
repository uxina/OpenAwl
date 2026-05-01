# 语音文件缺失检查报告

生成时间: 2026-04-08

## 检查方法
对比 `voice-panel-config.js` 中配置的语音与实际存在的语音文件

---

## 统计概览

| 目录 | 配置数量 | 实际文件数 | 状态 |
|------|---------|-----------|------|
| opening/ | 15 | 15 | ✅ 完整 |
| night/ | 7 (活跃) + 11 (弃用) | 7 | ✅ 活跃语音完整 |
| day/ | 17 | 17 | ✅ 完整 |
| voting/ | 10 | 10 | ✅ 完整 |
| mission/ | 11 | 11 | ✅ 完整 |
| assassination/ | 9 | 9 | ✅ 完整 |
| ending/ | 6 | 6 | ✅ 完整 |
| query/ | 10 | 7 | ⚠️ 缺失 3 个 |
| numbers/ | 11 | 11 | ✅ 完整 |
| segments/ | 14 | 14 | ✅ 完整 |
| system/ | 6 | 6 | ✅ 完整 |

---

## 详细缺失清单

### query/ 目录 - 缺失 3 个语音

| 语音ID | 文本内容 | 用途 | 状态 |
|--------|----------|------|------|
| CMD-150 | 房间号：{roomId} | 查询房间号 | ❌ 缺失 |
| CMD-151 | 当前{currentCount}人，需要{requiredCount}人 | 查询人数 | ❌ 缺失 |
| CMD-078 | 投票倒计时{seconds}秒 | 投票倒计时 | ❌ 缺失 |

**注意**: CMD-078 在配置中标记为 voting/ 目录，但实际应属于 query/ 或 voting/

---

## 配置与文件对比详情

### query/ 目录

**配置中有但文件缺失:**
- CMD-150: 房间号：{roomId}
- CMD-151: 当前{currentCount}人，需要{requiredCount}人

**文件存在但配置中未使用:**
- (无)

### voting/ 目录

**配置中有但文件缺失:**
- CMD-078: 投票倒计时{seconds}秒

**注意**: CMD-078 在配置中定义为 voting/ 目录，需要确认文件是否存在

---

## 建议

### 需要补充生成的语音 (3个)

1. **CMD-150.mp3** (query/)
   - 文本: "房间号：{roomId}"
   - 实际生成文本: "房间号：" (变量部分由程序处理)

2. **CMD-151.mp3** (query/)
   - 文本: "当前{currentCount}人，需要{requiredCount}人"
   - 实际生成文本: "当前人数，需要人数" 或分片段生成

3. **CMD-078.mp3** (voting/)
   - 文本: "投票倒计时{seconds}秒"
   - 实际生成文本: "投票倒计时秒" 或分片段生成

### 替代方案

对于包含变量的语音，可以使用片段拼接方式：

**CMD-150 拼接方案:**
```
[SEG-ROOM] + [SEG-NUMBER] + [数字语音]
```
即: "房间" + "号" + "1234"

**CMD-151 拼接方案:**
```
[当前] + [数字] + [人] + [需要] + [数字] + [人]
```

**CMD-078 拼接方案:**
```
[投票] + [倒计时] + [数字] + [秒]
```

---

## 附录：完整语音清单

### opening/ (15个) ✅
- CMD-001.mp3 到 CMD-015.mp3

### night/ (7个活跃) ✅
- CMD-N01.mp3, CMD-N02.mp3, CMD-N03.mp3
- CMD-N05.mp3, CMD-N05-M.mp3
- CMD-N09.mp3, CMD-N12.mp3

### day/ (17个) ✅
- CMD-041.mp3 到 CMD-048.mp3
- CMD-052.mp3, CMD-053D.mp3, CMD-056.mp3
- CMD-057.mp3 到 CMD-062.mp3

### voting/ (10个) ⚠️
- CMD-071.mp3 到 CMD-077.mp3
- CMD-082.mp3, CMD-083.mp3, CMD-085.mp3
- CMD-078.mp3 (缺失)

### mission/ (11个) ✅
- CMD-091.mp3 到 CMD-098.mp3
- CMD-101.mp3, CMD-103.mp3, CMD-105.mp3, CMD-107.mp3

### assassination/ (9个) ✅
- CMD-111.mp3 到 CMD-117.mp3
- CMD-122.mp3, CMD-123.mp3

### ending/ (6个) ✅
- CMD-126.mp3 到 CMD-132.mp3

### query/ (7个存在, 3个缺失) ⚠️
- CMD-141.mp3 到 CMD-146.mp3 (存在)
- CMD-156.mp3 (存在)
- CMD-150.mp3, CMD-151.mp3 (缺失)

### numbers/ (11个) ✅
- NUM-0.mp3 到 NUM-10.mp3

### segments/ (14个) ✅
- SEG-ROOM-CREATED.mp3, SEG-PERSON.mp3, SEG-ROOM.mp3
- SEG-ROOM-NUMBER.mp3, SEG-PLEASE-JOIN.mp3, SEG-COMMA.mp3
- SEG-ROUND-TEAM.mp3, SEG-LEADER-IS.mp3
- SEG-FIRST.mp3, SEG-SECOND.mp3, SEG-THIRD.mp3, SEG-FOURTH.mp3, SEG-FIFTH.mp3
- SEG-ROUND.mp3, SEG-NUMBER.mp3

### system/ (6个) ✅
- ASK-PLAYER-COUNT.mp3, DEFAULT-5-PLAYERS.mp3
- EXIT-GAME.mp3, SHUTDOWN.mp3
- BT-CONNECTED.mp3, BT-NOT-FOUND.mp3

---

## 总结

- **总配置语音数**: 约 113 个
- **实际存在**: 110 个
- **缺失**: 3 个 (CMD-150, CMD-151, CMD-078)
- **缺失率**: 2.7%

**建议优先级:**
1. 🔴 高: CMD-078 (投票倒计时，游戏常用)
2. 🟡 中: CMD-150 (查询房间号)
3. 🟢 低: CMD-151 (查询人数，可用片段拼接替代)
