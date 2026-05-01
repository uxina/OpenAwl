#!/bin/bash
# 蓝牙音箱配对辅助脚本

echo "╔════════════════════════════════════════════════╗"
echo "║     蓝牙音箱配对辅助工具                        ║"
echo "╚════════════════════════════════════════════════╝"
echo ""

# 检查蓝牙服务
echo "1. 检查蓝牙服务状态..."
if ! systemctl is-active --quiet bluetooth; then
    echo "   启动蓝牙服务..."
    sudo systemctl start bluetooth
    sleep 2
fi
echo "   ✅ 蓝牙服务运行正常"
echo ""

# 显示当前配对设备
echo "2. 检查已配对设备..."
PAIRED_DEVICES=$(bluetoothctl devices)
if [ -z "$PAIRED_DEVICES" ]; then
    echo "   ⚠️  没有已配对设备"
else
    echo "   已配对设备:"
    echo "$PAIRED_DEVICES" | while read line; do
        if [ -n "$line" ]; then
            echo "      📱 $line"
        fi
    done
fi
echo ""

# 扫描新设备
echo "3. 扫描蓝牙设备（15秒）..."
echo "   请确保蓝牙音箱已开启并进入配对模式"
echo "   扫描中..."

# 开始扫描
bluetoothctl scan on &
SCAN_PID=$!
sleep 15
kill $SCAN_PID 2>/dev/null
bluetoothctl scan off 2>/dev/null

echo ""
echo "4. 发现的设备:"
DEVICES=$(bluetoothctl devices)
if [ -z "$DEVICES" ]; then
    echo "   ❌ 未发现任何蓝牙设备"
    echo ""
    echo "可能的解决方案:"
    echo "   1. 确保蓝牙音箱已开启"
    echo "   2. 确保音箱处于配对模式"
    echo "   3. 将音箱靠近Orange Pi（1米内）"
    echo "   4. 重启蓝牙服务: sudo systemctl restart bluetooth"
    exit 1
else
    echo "$DEVICES" | while read line; do
        if [ -n "$line" ]; then
            echo "      📱 $line"
        fi
    done
fi
echo ""

# 自动识别音箱设备
echo "5. 识别音箱设备..."
SPEAKER_KEYWORDS="speaker sound audio 音箱 音响 soundcore jbl bose sony havit earphone headphone headset earbuds"
SPEAKER_MAC=""
SPEAKER_NAME=""

while read line; do
    if [ -n "$line" ]; then
        for keyword in $SPEAKER_KEYWORDS; do
            if echo "$line" | grep -qi "$keyword"; then
                SPEAKER_MAC=$(echo "$line" | awk '{print $2}')
                SPEAKER_NAME=$(echo "$line" | cut -d' ' -f3-)
                break 2
            fi
        done
    fi
done <<< "$DEVICES"

if [ -z "$SPEAKER_MAC" ]; then
    echo "   ⚠️  未自动识别到音箱设备"
    echo ""
    echo "请手动输入设备MAC地址进行配对"
    echo "格式: XX:XX:XX:XX:XX:XX"
    read -p "MAC地址: " SPEAKER_MAC
    
    if [ -z "$SPEAKER_MAC" ]; then
        echo "   ❌ 未输入MAC地址，退出"
        exit 1
    fi
else
    echo "   ✅ 识别到音箱: $SPEAKER_NAME ($SPEAKER_MAC)"
fi
echo ""

# 配对设备
echo "6. 配对设备 $SPEAKER_MAC..."
bluetoothctl pair "$SPEAKER_MAC"
if [ $? -ne 0 ]; then
    echo "   ⚠️  配对命令执行失败，尝试继续..."
fi
sleep 2

# 信任设备
echo "7. 信任设备..."
bluetoothctl trust "$SPEAKER_MAC"
sleep 1

# 连接设备
echo "8. 连接设备..."
bluetoothctl connect "$SPEAKER_MAC"
if [ $? -eq 0 ]; then
    echo "   ✅ 连接成功！"
else
    echo "   ⚠️  连接命令返回值非零，检查实际状态..."
fi

sleep 2

# 验证连接
echo ""
echo "9. 验证连接状态..."
DEVICE_INFO=$(bluetoothctl info "$SPEAKER_MAC")
if echo "$DEVICE_INFO" | grep -q "Connected: yes"; then
    echo "   ✅ 蓝牙音箱已成功连接！"
    echo ""
    echo "设备信息:"
    echo "$DEVICE_INFO" | grep -E "Name|Alias|Connected|Paired|Trusted" | sed 's/^/   /'
    echo ""
    echo "现在可以使用语音助手的'连接蓝牙音箱'功能了！"
else
    echo "   ❌ 连接可能未成功"
    echo ""
    echo "设备信息:"
    echo "$DEVICE_INFO" | sed 's/^/   /'
    echo ""
    echo "建议:"
    echo "   1. 重启蓝牙音箱并重新进入配对模式"
    echo "   2. 运行: sudo systemctl restart bluetooth"
    echo "   3. 再次运行此脚本"
fi

echo ""
echo "按回车键退出..."
read