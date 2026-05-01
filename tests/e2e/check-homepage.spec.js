const { test } = require('@playwright/test');

test('查看当前主页界面', async ({ page }) => {
  // 访问主页
  await page.goto('http://localhost:3000/', { timeout: 30000 });
  
  // 等待页面加载完成
  await page.waitForLoadState('networkidle');
  
  // 截图
  await page.screenshot({ 
    path: 'test-results/homepage-current.png', 
    fullPage: true 
  });
  
  console.log('已截图保存至: test-results/homepage-current.png');
  
  // 获取页面标题
  const title = await page.title();
  console.log('页面标题:', title);
  
  // 获取页面主要内容
  const bodyText = await page.textContent('body');
  console.log('页面内容预览:', bodyText.substring(0, 500));
});
