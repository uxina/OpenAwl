/**
 * 测试运行器
 * 统一入口运行所有测试
 */

const fs = require('fs');
const path = require('path');

class TestRunner {
  constructor() {
    this.results = [];
    this.passed = 0;
    this.failed = 0;
  }

  async runAll() {
    console.log('🧪 开始运行测试...\n');
    
    // 运行单元测试
    await this.runUnitTests();
    
    // 输出结果
    this.printSummary();
  }

  async runUnitTests() {
    console.log('📦 单元测试\n');
    
    const testFiles = [
      './unit/game-logic.test.js',
      './unit/server.test.js',
    ];
    
    for (const file of testFiles) {
      const filePath = path.join(__dirname, file);
      if (fs.existsSync(filePath)) {
        console.log(`  运行: ${file}`);
        try {
          require(filePath);
          this.passed++;
        } catch (error) {
          console.error(`  ❌ 失败: ${error.message}`);
          this.failed++;
        }
      }
    }
  }

  printSummary() {
    console.log('\n' + '='.repeat(50));
    console.log('📊 测试结果');
    console.log('='.repeat(50));
    console.log(`✅ 通过: ${this.passed}`);
    console.log(`❌ 失败: ${this.failed}`);
    console.log(`📈 总计: ${this.passed + this.failed}`);
    console.log('='.repeat(50));
  }
}

// 运行
const runner = new TestRunner();
runner.runAll();
