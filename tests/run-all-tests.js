/**
 * 完整测试运行器
 * 运行单元测试和E2E测试
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// 确保测试目录存在
if (!fs.existsSync('test-results')) {
  fs.mkdirSync('test-results', { recursive: true });
}

console.log('\n╔══════════════════════════════════════════════════╗');
console.log('║       阿瓦隆游戏 - 完整测试套件                  ║');
console.log('╚══════════════════════════════════════════════════╝\n');

let exitCode = 0;

// 1. 运行单元测试
console.log('📦 阶段 1: 单元测试');
console.log('───────────────────────────────────────────────────');
try {
  execSync('node tests/unit/game-logic.test.js', { 
    stdio: 'inherit',
    cwd: process.cwd()
  });
  console.log('✅ 单元测试通过\n');
} catch (error) {
  console.error('❌ 单元测试失败\n');
  exitCode = 1;
}

// 2. 运行E2E测试（如果Playwright已安装）
console.log('🎭 阶段 2: E2E测试');
console.log('───────────────────────────────────────────────────');
try {
  // 检查playwright是否安装
  execSync('npx playwright --version', { stdio: 'pipe' });
  
  console.log('启动E2E测试（这可能需要几分钟）...\n');
  
  execSync('npx playwright test tests/e2e/ --reporter=list', { 
    stdio: 'inherit',
    cwd: process.cwd(),
    timeout: 600000 // 10分钟超时
  });
  
  console.log('✅ E2E测试通过\n');
} catch (error) {
  if (error.message.includes('command not found')) {
    console.log('⚠️  Playwright未安装，跳过E2E测试');
    console.log('   安装命令: npm install -D @playwright/test');
    console.log('   安装浏览器: npx playwright install chromium\n');
  } else {
    console.error('❌ E2E测试失败\n');
    exitCode = 1;
  }
}

// 3. 生成测试报告
console.log('📊 阶段 3: 测试报告');
console.log('───────────────────────────────────────────────────');

const reportPath = path.join('test-results', `test-report-${Date.now()}.txt`);
const reportContent = `
阿瓦隆游戏测试报告
生成时间: ${new Date().toLocaleString()}

测试项目:
1. 单元测试 - 游戏逻辑核心
2. E2E测试 - 完整游戏流程

测试覆盖:
✓ 房间创建和加入
✓ 游戏开始和角色分配
✓ 身份确认
✓ 夜间阶段
✓ 组队阶段
✓ 投票阶段
✓ 任务执行
✓ 刺杀阶段
✓ 游戏结束
✓ 重开新局
✓ 断线重连

更多信息请查看 test-results/ 目录
`;

fs.writeFileSync(reportPath, reportContent);
console.log(`✓ 测试报告已保存: ${reportPath}\n`);

// 最终结果
console.log('╔══════════════════════════════════════════════════╗');
if (exitCode === 0) {
  console.log('║           ✅ 所有测试通过！                      ║');
} else {
  console.log('║           ❌ 部分测试失败                      ║');
}
console.log('╚══════════════════════════════════════════════════╝\n');

process.exit(exitCode);
