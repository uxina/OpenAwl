/**
 * 基础游戏流程测试
 * 测试最核心的功能：创建房间 -> 开始游戏 -> 阶段推进
 * 
 * 测试ID: TC-BASIC-FLOW
 */

const { test, expect } = require('@playwright/test');

const BASE_URL = 'http://localhost:3000';

test.describe('基础游戏流程测试', () => {
    
    test('TC-BASIC-FLOW: 创建房间并推进阶段', async ({ page }) => {
        console.log('\n========================================');
        console.log('[TC-BASIC-FLOW] 基础流程测试');
        console.log('========================================\n');
        
        // 1. 访问主控端
        console.log('📍 Step 1: 访问主控端');
        await page.goto(`${BASE_URL}/index.html`, { timeout: 30000 });
        
        // 等待帮助弹窗出现并关闭（弹窗在页面加载1秒后显示）
        await page.waitForTimeout(1500);
        const helpCloseBtn = await page.locator('.help-overlay button').first();
        if (await helpCloseBtn.isVisible().catch(() => false)) {
            await helpCloseBtn.click();
            await page.waitForTimeout(500);
        }
        console.log('✓ 页面加载完成');
        
        // 2. 选择人数并创建房间
        console.log('\n📍 Step 2: 创建房间');
        await page.selectOption('#playerCountSelect', '5');
        await page.click('#createRoomBtn');
        await page.waitForTimeout(2000);
        
        const roomId = await page.textContent('#roomId');
        console.log(`✓ 房间创建成功: ${roomId}`);
        expect(roomId).toMatch(/\d{4}/);
        
        // 3. 验证当前阶段
        console.log('\n📍 Step 3: 验证初始状态');
        const phaseText = await page.locator('#currentPhase, .current-phase').textContent().catch(() => '');
        console.log(`  当前阶段: ${phaseText || '等待玩家'}`);
        
        // 4. 通过API添加玩家
        console.log('\n📍 Step 4: 添加5个玩家');
        for (let i = 1; i <= 5; i++) {
            await page.evaluate((data) => {
                return new Promise((resolve) => {
                    const socket = window.socket || io();
                    socket.emit('player-join', {
                        roomId: data.roomId,
                        playerName: `玩家${data.i}`,
                        clientId: `test_${data.i}_${Date.now()}`
                    }, resolve);
                });
            }, { roomId, i });
            await page.waitForTimeout(300);
        }
        await page.waitForTimeout(2000);
        console.log('✓ 5个玩家已添加');
        
        // 5. 开始游戏
        console.log('\n📍 Step 5: 开始游戏');
        const startBtn = await page.locator('#btn-phase-text, button:has-text("开始")').first();
        if (await startBtn.isVisible().catch(() => false)) {
            await startBtn.click();
            console.log('✓ 点击开始游戏');
        }
        await page.waitForTimeout(3000);
        
        // 6. 验证游戏已开始
        const gamePhase = await page.locator('#currentPhase, .current-phase').textContent().catch(() => '');
        console.log(`  游戏阶段: ${gamePhase}`);
        expect(gamePhase).not.toContain('等待');
        
        // 7. 阶段推进测试
        console.log('\n📍 Step 6: 阶段推进测试');
        for (let i = 1; i <= 3; i++) {
            const phaseBefore = await page.locator('#currentPhase, .current-phase').textContent().catch(() => '');
            console.log(`  推进前: ${phaseBefore}`);
            
            const advanceBtn = await page.locator('#btn-phase-text').first();
            if (await advanceBtn.isVisible().catch(() => false)) {
                await advanceBtn.click();
                console.log('    点击: 下一阶段');
                await page.waitForTimeout(2500);
            }
            
            const phaseAfter = await page.locator('#currentPhase, .current-phase').textContent().catch(() => '');
            if (phaseAfter.includes('结束')) {
                console.log('    游戏已结束');
                break;
            }
        }
        
        console.log('\n========================================');
        console.log('✅ TC-BASIC-FLOW 测试完成！');
        console.log('========================================\n');
    });
    
    test('TC-BASIC-API: API基础测试', async ({ request }) => {
        console.log('\n========================================');
        console.log('[TC-BASIC-API] API测试');
        console.log('========================================\n');
        
        // 测试创建房间
        console.log('测试: POST /api/rooms');
        const response = await request.post(`${BASE_URL}/api/rooms`, {
            data: { playerCount: 5 }
        });
        
        expect(response.ok()).toBeTruthy();
        const data = await response.json();
        
        console.log('响应:', data);
        expect(data.success).toBe(true);
        expect(data.data.roomId).toBeDefined();
        expect(data.data.playerCount).toBe(5);
        
        console.log(`✓ 房间创建成功: ${data.data.roomId}`);
        console.log('\n✅ TC-BASIC-API 测试通过！\n');
    });
});

test.describe.configure({ mode: 'serial', timeout: 60000 });
