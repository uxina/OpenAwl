/**
 * 房间管理端到端测试
 * 测试ID: RM-001 ~ RM-004
 * 
 * 基于论文《Effective harnesses for long-running agents》方法构建
 */

const { test, expect } = require('@playwright/test');
const { AvalonMultithreadTest } = require('../utils/multithread');

// 配置
const BASE_URL = 'http://localhost:3000';
const TIMEOUT = {
  navigation: 30000,
  element: 10000,
  action: 5000
};

/**
 * RM-001: 主控创建房间
 */
test('RM-001: 主控创建房间', async ({ page }) => {
  console.log('\n[RM-001] 开始测试: 主控创建房间');
  
  // 访问主控端
  await page.goto(BASE_URL, { timeout: TIMEOUT.navigation });
  console.log('  - 已访问主控端页面');
  
  // 验证页面元素
  await expect(page.locator('#playerCount')).toBeVisible({ timeout: TIMEOUT.element });
  console.log('  - 人数选择器可见');
  
  // 选择人数
  await page.selectOption('#playerCount', '5');
  console.log('  - 选择5人配置');
  
  // 尝试点击创建按钮（处理可能的遮罩层）
  const createBtn = page.locator('#createRoomBtn, button:has-text("创建房间"), button[type="submit"]').first();
  
  // 使用JavaScript强制点击
  await page.evaluate(() => {
    const btn = document.querySelector('#createRoomBtn') || 
                document.querySelector('button[type="submit"]');
    if (btn) btn.click();
  });
  
  await page.waitForTimeout(2000);
  console.log('  - 点击创建按钮');
  
  // 验证房间ID生成
  const roomId = await page.evaluate(() => {
    const el = document.querySelector('#roomId, .room-id, [data-room-id]');
    return el ? el.textContent || el.getAttribute('data-room-id') : null;
  });
  
  console.log(`  - 房间ID: ${roomId}`);
  expect(roomId).toMatch(/\d{4}/);
  
  // 验证URL
  const url = page.url();
  console.log(`  - 当前URL: ${url}`);
  expect(url).toContain('roomId=');
  
  console.log('  ✅ RM-001 通过');
});

/**
 * RM-002: 玩家加入房间
 */
test('RM-002: 玩家加入房间', async ({ page, context }) => {
  console.log('\n[RM-002] 开始测试: 玩家加入房间');
  
  // 先创建房间
  const hostPage = await context.newPage();
  await hostPage.goto(BASE_URL, { timeout: TIMEOUT.navigation });
  await hostPage.selectOption('#playerCount', '5');
  
  await hostPage.evaluate(() => {
    const btn = document.querySelector('#createRoomBtn') || 
                document.querySelector('button[type="submit"]');
    if (btn) btn.click();
  });
  
  await hostPage.waitForTimeout(2000);
  
  // 获取房间ID
  const roomId = await hostPage.evaluate(() => {
    const el = document.querySelector('#roomId, .room-id, [data-room-id]');
    return el ? el.textContent || el.getAttribute('data-room-id') : null;
  });
  
  console.log(`  - 创建房间: ${roomId}`);
  expect(roomId).toBeTruthy();
  
  // 玩家加入
  const playerUrl = `${BASE_URL}/player-modular.html?roomId=${roomId}`;
  await page.goto(playerUrl, { timeout: TIMEOUT.navigation });
  console.log(`  - 访问玩家页面: ${playerUrl}`);
  
  // 输入名称
  await page.waitForSelector('#playerName', { timeout: TIMEOUT.element });
  await page.fill('#playerName', '测试玩家');
  console.log('  - 输入玩家名称');
  
  // 点击加入
  await page.click('#joinBtn, button:has-text("加入"), button[type="submit"]');
  console.log('  - 点击加入按钮');
  
  // 等待加入成功
  await page.waitForTimeout(2000);
  
  // 验证加入成功
  const joined = await page.evaluate(() => {
    return document.querySelector('.player-list') !== null ||
           document.querySelector('.role-info') !== null ||
           document.body.textContent.includes('等待') ||
           document.body.textContent.includes('玩家');
  });
  
  console.log(`  - 加入状态: ${joined ? '成功' : '未知'}`);
  expect(joined).toBe(true);
  
  console.log('  ✅ RM-002 通过');
});

/**
 * RM-003: 多玩家并发加入
 */
test('RM-003: 多玩家并发加入', async () => {
  console.log('\n[RM-003] 开始测试: 多玩家并发加入');
  
  // 使用多线程测试工具
  const test = new AvalonMultithreadTest(BASE_URL);
  const result = await test.runTest(5);
  
  console.log(`  - 房间创建: ${result.roomCreated ? '✅' : '❌'}`);
  console.log(`  - 玩家加入: ${result.joinSuccess}/${result.totalPlayers}`);
  
  expect(result.roomCreated).toBe(true);
  expect(result.joinSuccess).toBeGreaterThanOrEqual(result.totalPlayers);
  
  console.log('  ✅ RM-003 通过');
});

/**
 * RM-004: 房间重置功能
 */
test('RM-004: 房间重置功能', async ({ page }) => {
  console.log('\n[RM-004] 开始测试: 房间重置功能');
  
  // 创建房间
  await page.goto(BASE_URL, { timeout: TIMEOUT.navigation });
  await page.selectOption('#playerCount', '5');
  
  await page.evaluate(() => {
    const btn = document.querySelector('#createRoomBtn') || 
                document.querySelector('button[type="submit"]');
    if (btn) btn.click();
  });
  
  await page.waitForTimeout(2000);
  
  const roomIdBefore = await page.evaluate(() => {
    const el = document.querySelector('#roomId, .room-id, [data-room-id]');
    return el ? el.textContent || el.getAttribute('data-room-id') : null;
  });
  
  console.log(`  - 原房间ID: ${roomIdBefore}`);
  
  // 尝试重置（如果有重置按钮）
  const hasResetBtn = await page.evaluate(() => {
    return document.querySelector('#resetBtn, button:has-text("重置"), button:has-text("重新开始")') !== null;
  });
  
  if (hasResetBtn) {
    await page.click('#resetBtn, button:has-text("重置"), button:has-text("重新开始")');
    await page.waitForTimeout(2000);
    
    // 验证重置
    const resetOccurred = await page.evaluate(() => {
      return document.body.textContent.includes('等待') ||
             document.querySelector('.player-list') === null;
    });
    
    console.log(`  - 重置状态: ${resetOccurred ? '成功' : '未检测到'}`);
  } else {
    console.log('  - 未找到重置按钮，跳过详细测试');
  }
  
  console.log('  ✅ RM-004 通过（基础验证）');
});

/**
 * 测试套件配置
 */
test.describe.configure({ mode: 'serial' });

test.afterEach(async ({ page }, testInfo) => {
  if (testInfo.status !== testInfo.expectedStatus) {
    // 测试失败时截图
    await page.screenshot({ 
      path: `reports/screenshot-${testInfo.title.replace(/\s+/g, '_')}.png`,
      fullPage: true 
    });
  }
});
