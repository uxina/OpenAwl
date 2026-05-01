/**
 * E2E 测试 - 验证 voice-panel-v2 重置后创建房间功能
 */

const { chromium } = require('playwright');
const path = require('path');

const SERVER_URL = 'http://localhost:3000';
const VOICE_PANEL_URL = `${SERVER_URL}/voice-panel-v2.html`;

async function runTest() {
  console.log('\n🎮 E2E 测试: 重置后创建房间功能\n');
  console.log('='.repeat(60));

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  // 收集日志
  const logs = [];
  page.on('console', msg => {
    logs.push(msg.text());
    console.log(`   📋 ${msg.text()}`);
  });

  try {
    // 步骤 1: 打开语音面板
    console.log('\n📋 步骤1: 打开语音面板...');
    await page.goto(VOICE_PANEL_URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    console.log('   ✅ 语音面板已加载');

    // 步骤 2: 创建第一个房间
    console.log('\n📋 步骤2: 创建第一个房间...');
    await page.click('#btn-create');
    await page.waitForTimeout(3000);
    
    // 检查房间是否创建成功
    const roomId1 = await page.$eval('#room-id', el => el.textContent);
    if (roomId1 !== '--' && roomId1 !== '----') {
      console.log(`   ✅ 房间创建成功: ${roomId1}`);
    } else {
      console.log('   ❌ 房间创建失败');
      console.log('   日志:');
      logs.filter(l => l.includes('创建') || l.includes('房间')).forEach(l => console.log(`     ${l}`));
    }

    // 步骤 3: 执行重置（长按重置按钮）
    console.log('\n📋 步骤3: 执行重置...');
    
    // 先触发 mousedown，等待 3 秒，然后触发 mouseup
    const btnNew = await page.$('#btn-new');
    await btnNew.dispatchEvent('mousedown');
    console.log('   按住重置按钮...');
    await page.waitForTimeout(3500); // 等待 3.5 秒确保长按触发
    await btnNew.dispatchEvent('mouseup');
    
    await page.waitForTimeout(3000); // 等待重置完成（包括页面刷新）

    // 步骤 4: 等待页面刷新后再次加载
    console.log('\n📋 步骤4: 等待页面刷新...');
    await page.waitForTimeout(2000);
    console.log('   ✅ 页面已刷新');

    // 步骤 5: 尝试再次创建房间
    console.log('\n📋 步骤5: 重置后再次创建房间...');
    await page.click('#btn-create');
    await page.waitForTimeout(3000);
    
    const roomId2 = await page.$eval('#room-id', el => el.textContent);
    if (roomId2 !== '--' && roomId2 !== '----') {
      console.log(`   ✅ 重置后房间创建成功: ${roomId2}`);
    } else {
      console.log('   ❌ 重置后房间创建失败！');
      console.log('   相关日志:');
      logs.filter(l => l.includes('创建') || l.includes('房间') || l.includes('已存在') || l.includes('重置')).forEach(l => console.log(`     ${l}`));
      throw new Error('重置后无法创建房间');
    }

    console.log('\n✅ 测试通过：重置后创建房间功能正常');
    await browser.close();
    return true;

  } catch (error) {
    console.log(`\n❌ 测试失败: ${error.message}`);
    await browser.close();
    return false;
  }
}

runTest().then(success => {
  process.exit(success ? 0 : 1);
}).catch(err => {
  console.error('测试异常:', err);
  process.exit(1);
});
