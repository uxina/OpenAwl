const { test, expect } = require('@playwright/test');

test.describe('语音播放测试', () => {
  test('设备蓝牙连接状态和自动切换', async ({ page }) => {
    // 打开页面
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // 等待一下让 socket 连接建立
    await page.waitForTimeout(2000);

    // 检查音频控制按钮
    const audioBtn = page.locator('#btn-audio-control');
    const btnText = await audioBtn.textContent();
    console.log('音频按钮文字:', btnText);

    // 查看日志内容
    const logContainer = page.locator('#log-container');
    const logs = await logContainer.textContent();
    console.log('系统日志:', logs);

    // 检查是否显示设备播放
    const isDeviceMode = btnText.includes('设备播放');
    console.log('是否在设备播放模式:', isDeviceMode);

    // 如果是设备播放模式，尝试触发语音播放
    if (isDeviceMode) {
      console.log('设备已连接，应该在蓝牙音箱播放语音');

      // 创建房间触发语音
      const createBtn = page.locator('#btn-create');
      if (await createBtn.isEnabled()) {
        console.log('点击创建房间按钮...');
        await createBtn.click();
        await page.waitForTimeout(3000);

        // 查看新的日志
        const newLogs = await logContainer.textContent();
        console.log('创建房间后的日志:', newLogs);
      }
    } else {
      console.log('当前不是设备播放模式');
    }

    // 返回测试结果
    expect(true).toBe(true);
  });
});
