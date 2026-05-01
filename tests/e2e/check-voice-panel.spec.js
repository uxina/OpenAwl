const { test } = require('@playwright/test');

test('查看语音面板V2界面（关闭弹窗后）', async ({ page }) => {
  // 访问主页
  await page.goto('http://localhost:3000/', { timeout: 30000 });
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(3000);
  
  // 关闭帮助弹窗
  try {
    const helpButton = page.getByText('我知道了');
    if (await helpButton.isVisible({ timeout: 2000 })) {
      await helpButton.click();
      console.log('已关闭帮助弹窗');
      await page.waitForTimeout(2000);
    }
  } catch (e) {
    console.log('未检测到帮助弹窗');
  }
  
  // 截图
  await page.screenshot({ 
    path: 'test-results/voice-panel-v2-full.png', 
    fullPage: true 
  });
  
  const title = await page.title();
  console.log('页面标题:', title);
  
  // 获取页面内容
  const bodyText = await page.textContent('body');
  console.log('页面内容（前500字符）:', bodyText.substring(0, 500));
});
