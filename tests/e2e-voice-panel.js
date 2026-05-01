/**
 * Playwright E2E - 验证语音面板玩家显示和推进功能
 */
const { chromium } = require('playwright');
const http = require('http');

const BASE = 'http://127.0.0.1:3000';
const API = 'http://localhost:3000';

function api(path, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, API);
    const opts = { hostname: url.hostname, port: url.port, path: url.pathname, method,
      headers: body ? { 'Content-Type': 'application/json' } : {} };
    const req = http.request(opts, (res) => {
      let data = ''; res.on('data', c => data += c);
      res.on('end', () => { try { resolve(JSON.parse(data)); } catch { resolve(data); } });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function run() {
  console.log('🔍 E2E Playwright 验证语音面板功能\n');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();

  // ===== Bug 1 测试: 语音面板创建5人房间后显示玩家加入 =====
  console.log('📋 Bug 1: 语音面板显示玩家加入');

  // Step 1: 语音面板创建房间
  const voicePage = await context.newPage();
  voicePage.on('console', msg => {
    if (msg.type() === 'error') console.log('  [VoicePanel Error]', msg.text());
  });
  await voicePage.goto(BASE + '/voice-panel-v2.html');
  await voicePage.waitForTimeout(2000);

  // 设置人数为5并创建房间
  await voicePage.evaluate(() => {
    gameState.playerCount = 5;
    document.getElementById('player-count').textContent = '5';
  });
  await voicePage.waitForTimeout(500);

  // 点击创建房间按钮
  await voicePage.click('#btn-create');
  await voicePage.waitForTimeout(2000);

  // 获取房间号
  const roomId = await voicePage.evaluate(() => document.getElementById('room-id').textContent);
  console.log('  语音面板创建房间:', roomId);

  // 检查初始玩家显示
  const initialPlayers = await voicePage.evaluate(() => document.getElementById('player-status').textContent);
  console.log('  初始玩家显示:', initialPlayers);

  // Step 2: 打开5个玩家页面并加入房间
  const playerPages = [];
  for (let i = 0; i < 5; i++) {
    const page = await context.newPage();
    await page.goto(BASE + '/player-modular.html?roomId=' + roomId);
    await page.waitForTimeout(1500);

    // 填写房间号
    await page.fill('#roomIdInput', roomId);
    await page.waitForTimeout(500);

    // 选择玩家编号
    try {
      await page.click(`.player-id-btn[data-player-id="${i + 1}"]`);
      await page.waitForTimeout(300);
    } catch (e) {
      console.log('  P' + (i+1) + ' 选择编号失败:', e.message);
    }

    // 点击加入
    try {
      await page.click('#joinRoomBtn');
      await page.waitForTimeout(1000);
      playerPages.push(page);
      console.log(`  P${i + 1} 已点击加入`);
    } catch (e) {
      console.log(`  P${i + 1} 加入失败:`, e.message);
    }
  }

  // 等待语音面板更新
  await voicePage.waitForTimeout(3000);

  // 检查语音面板的玩家显示
  const playerStatus = await voicePage.evaluate(() => document.getElementById('player-status').textContent);
  console.log('  5人加入后语音面板显示:', playerStatus);

  const bug1Fixed = playerStatus.includes('5') || playerStatus.includes('5/5') || playerStatus.includes('5/');
  if (bug1Fixed) {
    console.log('✅ Bug 1: 语音面板正确显示玩家加入\n');
  } else {
    console.log('❌ Bug 1: 语音面板仍显示', playerStatus, '\n');
  }

  // ===== Bug 2 测试: 语音面板推进游戏进度 =====
  console.log('📋 Bug 2: 语音面板推进游戏进度');

  // 检查推进按钮是否可用
  const nextBtnText = await voicePage.evaluate(() => {
    const btn = document.getElementById('smart-next-text');
    return btn ? btn.textContent : 'N/A';
  });
  console.log('  推进按钮文字:', nextBtnText);

  // 点击推进按钮
  try {
    await voicePage.click('#smart-next-text');
    await voicePage.waitForTimeout(2000);
    console.log('  已点击推进按钮');
  } catch (e) {
    console.log('  点击推进按钮失败:', e.message);
  }

  // 检查游戏阶段变化
  const roomInfo = await api('/api/rooms/' + roomId);
  const gamePhase = roomInfo.data ? roomInfo.data.gamePhase : 'unknown';
  console.log('  推进后游戏阶段:', gamePhase);

  const bug2Fixed = gamePhase !== 'waiting';
  if (bug2Fixed) {
    console.log('✅ Bug 2: 语音面板可以推进游戏进度\n');
  } else {
    console.log('❌ Bug 2: 游戏阶段没有变化\n');
  }

  // Cleanup
  await voicePage.close();
  for (const p of playerPages) {
    await p.close();
  }
  await browser.close();

  console.log('='.repeat(50));
  console.log(`Bug 1 (语音面板显示玩家): ${bug1Fixed ? '✅ 已修复' : '❌ 未修复'}`);
  console.log(`Bug 2 (语音面板推进): ${bug2Fixed ? '✅ 已修复' : '❌ 未修复'}`);
  console.log('='.repeat(50));

  process.exit(bug1Fixed && bug2Fixed ? 0 : 1);
}

run().catch(err => {
  console.error('E2E 异常:', err);
  process.exit(1);
});
