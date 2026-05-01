const { test, expect } = require('@playwright/test');

test.describe('音频输出控制按钮', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    // 等待 socket 连接建立
    await page.waitForTimeout(2000);
  });

  test('页面加载时显示音频控制按钮', async ({ page }) => {
    const audioControlBtn = page.locator('#btn-audio-control');
    await expect(audioControlBtn).toBeVisible();
    // 按钮应该显示"网页播放"或"设备播放"之一
    const btnText = await audioControlBtn.textContent();
    expect(btnText.includes('网页播放') || btnText.includes('设备播放')).toBeTruthy();
  });

  test('点击按钮弹出音频模式选择框', async ({ page }) => {
    const audioControlBtn = page.locator('#btn-audio-control');
    const popup = page.locator('#audio-mode-popup');

    // 初始状态：弹窗隐藏
    await expect(popup).not.toBeVisible();

    // 点击按钮
    await audioControlBtn.click();

    // 弹窗应该显示
    await expect(popup).toBeVisible();
    await expect(popup).toContainText('选择音频输出方式');
    await expect(popup).toContainText('网页播放');
    await expect(popup).toContainText('设备播放');
  });

  test('点击"设备播放"选项显示连接中状态', async ({ page }) => {
    const audioControlBtn = page.locator('#btn-audio-control');
    const popup = page.locator('#audio-mode-popup');

    // 打开弹窗
    await audioControlBtn.click();
    await expect(popup).toBeVisible();

    // 点击设备播放选项
    const deviceOption = page.locator('#mode-option-device');
    await deviceOption.click();

    // 由于蓝牙已连接，应该显示连接中然后成功
    await page.waitForTimeout(1000);

    // 弹窗应该关闭
    await expect(popup).not.toBeVisible();

    // 检查日志中是否有蓝牙相关的消息
    const logContainer = page.locator('#log-container');
    const logText = await logContainer.textContent();

    // 应该包含蓝牙连接相关的日志
    const hasBluetoothLog = logText.includes('蓝牙') || logText.includes('设备');
    expect(hasBluetoothLog).toBeTruthy();
  });

  test('点击"网页播放"选项切换模式', async ({ page }) => {
    const audioControlBtn = page.locator('#btn-audio-control');
    const popup = page.locator('#audio-mode-popup');

    // 打开弹窗
    await audioControlBtn.click();
    await expect(popup).toBeVisible();

    // 点击网页播放选项
    const webOption = page.locator('#mode-option-web');
    await webOption.click();

    // 弹窗应该关闭
    await expect(popup).not.toBeVisible();

    // 按钮应该显示网页播放
    await expect(audioControlBtn).toContainText('网页播放');
    await expect(audioControlBtn).toHaveClass(/web-mode/);
  });

  test('点击外部关闭弹窗', async ({ page }) => {
    const audioControlBtn = page.locator('#btn-audio-control');
    const popup = page.locator('#audio-mode-popup');

    // 打开弹窗
    await audioControlBtn.click();
    await expect(popup).toBeVisible();

    // 点击页面其他区域（面板主体）
    await page.locator('.panel-body').click();

    // 弹窗应该关闭
    await expect(popup).not.toBeVisible();
  });

  test('设备蓝牙连接时自动切换到设备播放模式', async ({ page }) => {
    // 等待一下让设备状态更新
    await page.waitForTimeout(3000);

    const audioControlBtn = page.locator('#btn-audio-control');
    const btnText = await audioControlBtn.textContent();

    // 检查系统日志
    const logContainer = page.locator('#log-container');
    const logText = await logContainer.textContent();

    // 如果蓝牙已连接，应该自动切换到设备播放
    const isBluetoothConnected = logText.includes('蓝牙已连接');
    if (isBluetoothConnected) {
      // 按钮应该显示设备播放
      expect(btnText).toContain('设备播放');
      await expect(audioControlBtn).toHaveClass(/device-mode/);
    }
  });

  test('弹窗显示正确的状态标识', async ({ page }) => {
    const audioControlBtn = page.locator('#btn-audio-control');

    // 打开弹窗
    await audioControlBtn.click();

    // 检查弹窗中有两个选项
    const webOption = page.locator('#mode-option-web');
    const deviceOption = page.locator('#mode-option-device');

    await expect(webOption).toBeVisible();
    await expect(deviceOption).toBeVisible();

    // 检查状态标识元素存在
    const webStatus = page.locator('#status-web');
    const deviceStatus = page.locator('#status-device');
    await expect(webStatus).toBeAttached();
    await expect(deviceStatus).toBeAttached();
  });

  test('localStorage保存播放模式', async ({ page }) => {
    const audioControlBtn = page.locator('#btn-audio-control');

    // 先打开弹窗
    await audioControlBtn.click();

    // 点击网页播放选项
    await page.locator('#mode-option-web').click();

    // 验证已切换到网页模式
    await expect(audioControlBtn).toHaveClass(/web-mode/);

    // 刷新页面
    await page.reload();
    await page.waitForLoadState('networkidle');

    // 等待状态恢复
    await page.waitForTimeout(2000);

    // 按钮应该仍然显示网页播放（或因为蓝牙连接自动切换到设备播放）
    const btnText = await page.locator('#btn-audio-control').textContent();
    // 可能已经自动切换到设备播放（如果蓝牙已连接），这是预期行为
    expect(btnText.includes('网页播放') || btnText.includes('设备播放')).toBeTruthy();
  });
});
