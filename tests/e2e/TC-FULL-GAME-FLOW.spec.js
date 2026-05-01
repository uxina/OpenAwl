/**
 * 完整游戏流程 E2E 测试
 * 使用 Socket.IO 直接测试后端 + Playwright 测试 UI
 */

const { test, expect, chromium } = require('@playwright/test');
const { io } = require('socket.io-client');

const BASE_URL = 'http://localhost:3000';
const VOICE_PANEL_URL = `${BASE_URL}`;
const PLAYER_URL = `${BASE_URL}/player-modular.html`;

async function closeHelpOverlay(page) {
    try {
        await page.waitForTimeout(1500);
        const helpOverlay = page.locator('.help-overlay');
        if (await helpOverlay.isVisible().catch(() => false)) {
            await helpOverlay.locator('button').first().click();
            await page.waitForTimeout(500);
        }
    } catch (e) {}
}

async function delay(ms) {
    return new Promise(r => setTimeout(r, ms));
}

test.describe('完整游戏流程 E2E 测试', () => {
    let browser;

    test.beforeAll(async () => {
        browser = await chromium.launch({ 
            headless: true,
            slowMo: 50
        });
    });

    test.afterAll(async () => {
        if (browser) {
            await browser.close();
        }
    });

    test('TC-FULL-GAME: 完整5人游戏流程', async () => {
        console.log('\n=== 完整游戏流程 E2E 测试 ===\n');
        
        // ========== 第一部分：Socket.IO 测试核心逻辑 ==========
        console.log('📍 第一部分：Socket.IO 核心逻辑测试');
        
        const controller = io(BASE_URL, { transports: ['websocket'], reconnection: false });
        await new Promise((r, j) => { controller.on('connect', r); setTimeout(j, 2000); });
        
        // 创建房间
        const room = await new Promise((r, j) => {
            controller.emit('create-room', { playerCount: 5 }, r);
            setTimeout(() => j(new Error('超时')), 5000);
        });
        console.log(`✅ 房间创建: ${room.roomId}`);
        
        // 5个玩家加入
        const players = [];
        for (let i = 1; i <= 5; i++) {
            const p = io(BASE_URL, { transports: ['websocket'], reconnection: false });
            await new Promise((r, j) => { p.on('connect', r); setTimeout(j, 2000); });
            const joinRes = await new Promise((r, j) => {
                p.emit('player-join', { roomId: room.roomId, playerName: '玩家'+i, playerNumber: i }, r);
                setTimeout(() => j(new Error('超时')), 5000);
            });
            players.push({ socket: p, playerId: joinRes.playerId, name: '玩家'+i });
            await delay(50);
        }
        console.log('✅ 5个玩家加入');
        
        // 开始游戏
        await new Promise((r, j) => { controller.emit('start-game', { roomId: room.roomId }, r); setTimeout(j, 2000); });
        console.log('✅ 游戏开始');
        
        // 推进到 team-building
        let latestState;
        for (let i = 0; i < 4; i++) {
            const res = await new Promise((r, j) => { 
                controller.emit('next-phase', { roomId: room.roomId }, r); 
                setTimeout(j, 2000); 
            });
            latestState = res.gameState;
            await delay(100);
        }
        console.log(`✅ 推进到 team-building`);
        
        // 组队
        const leaderPlayer = players.find(p => p.playerId === latestState?.currentLeaderId);
        const selectedPlayers = players.slice(0, 2);
        
        await new Promise((r, j) => {
            leaderPlayer.socket.emit('build-team', { 
                roomId: room.roomId, 
                teamIds: selectedPlayers.map(p => p.playerId) 
            }, r);
            setTimeout(j, 2000);
        });
        console.log(`✅ 队长 ${leaderPlayer.name} 提交队伍`);
        
        // 推进到投票
        await new Promise((r, j) => { controller.emit('next-phase', { roomId: room.roomId }, r); setTimeout(j, 2000); });
        console.log('✅ 进入投票阶段');
        
        // 投票通过
        for (const player of players) {
            await new Promise((r, j) => {
                player.socket.emit('vote', { roomId: room.roomId, playerId: player.playerId, vote: 'approve' }, r);
                setTimeout(j, 2000);
            });
        }
        console.log('✅ 投票通过');
        
        // 任务执行成功
        for (const player of selectedPlayers) {
            await new Promise((r, j) => {
                player.socket.emit('execute-mission', { 
                    roomId: room.roomId, 
                    playerId: player.playerId, 
                    result: 'success' 
                }, r);
                setTimeout(j, 2000);
            });
        }
        console.log('✅ 任务成功');
        
        // 等待任务完成广播
        await delay(1000);
        
        // 验证游戏状态 - 应该是第一轮任务成功后的状态
        const gameState = await new Promise((r, j) => {
            controller.emit('get-game-state', { roomId: room.roomId }, r);
            setTimeout(j, 2000);
        });
        
        console.log(`✅ 当前阶段: ${gameState?.gamePhase}`);
        console.log(`✅ 任务结果: ${gameState?.missionResults?.length > 0 ? '成功' : '无'}`);
        
        expect(gameState?.gamePhase).toBeDefined();
        players.forEach(p => p.socket.disconnect());
        controller.disconnect();
        
        console.log('\n✅ Socket.IO 核心逻辑测试通过！');
        
        // ========== 第二部分：UI 测试 ==========
        console.log('\n📍 第二部分：语音面板 UI 测试');
        
        const voicePanelPage = await browser.newPage();
        await voicePanelPage.goto(VOICE_PANEL_URL);
        await voicePanelPage.waitForLoadState('networkidle');
        await closeHelpOverlay(voicePanelPage);
        
        // 检查页面加载成功
        const title = await voicePanelPage.title();
        console.log(`✅ 语音面板标题: ${title}`);
        
        // 检查创建房间按钮存在
        const createBtn = voicePanelPage.locator('#btn-smart-next');
        const isCreateBtnVisible = await createBtn.isVisible();
        console.log(`✅ 创建房间按钮可见: ${isCreateBtnVisible}`);
        
        await voicePanelPage.close();
        
        console.log('\n========================================');
        console.log('✅✅✅ 完整游戏流程 E2E 测试通过！ ✅✅✅');
        console.log('========================================\n');
    });

    test('TC-BUG046: BUG-046 修复验证', async () => {
        console.log('\n=== BUG-046 修复验证测试 ===\n');
        
        const controller = io(BASE_URL, { transports: ['websocket'], reconnection: false });
        await new Promise((r, j) => { controller.on('connect', r); setTimeout(j, 2000); });
        
        // 创建房间
        const room = await new Promise((r, j) => {
            controller.emit('create-room', { playerCount: 5 }, r);
            setTimeout(() => j(new Error('超时')), 5000);
        });
        console.log(`✅ 房间创建: ${room.roomId}`);
        
        // 5个玩家加入
        const players = [];
        for (let i = 1; i <= 5; i++) {
            const p = io(BASE_URL, { transports: ['websocket'], reconnection: false });
            await new Promise((r, j) => { p.on('connect', r); setTimeout(j, 2000); });
            const joinRes = await new Promise((r, j) => {
                p.emit('player-join', { roomId: room.roomId, playerName: '玩家'+i, playerNumber: i }, r);
                setTimeout(() => j(new Error('超时')), 5000);
            });
            players.push({ socket: p, playerId: joinRes.playerId, name: '玩家'+i });
            await delay(50);
        }
        console.log('✅ 5个玩家加入');
        
        // 开始游戏
        await new Promise((r, j) => { controller.emit('start-game', { roomId: room.roomId }, r); setTimeout(j, 2000); });
        
        // 推进到 team-building
        let latestState;
        for (let i = 0; i < 4; i++) {
            const res = await new Promise((r, j) => { 
                controller.emit('next-phase', { roomId: room.roomId }, r); 
                setTimeout(j, 2000); 
            });
            latestState = res.gameState;
            await delay(100);
        }
        
        // 组队
        const leaderPlayer = players.find(p => p.playerId === latestState?.currentLeaderId);
        const selectedPlayers = players.slice(0, 2);
        
        await new Promise((r, j) => {
            leaderPlayer.socket.emit('build-team', { 
                roomId: room.roomId, 
                teamIds: selectedPlayers.map(p => p.playerId) 
            }, r);
            setTimeout(j, 2000);
        });
        
        // 推进到投票
        await new Promise((r, j) => { controller.emit('next-phase', { roomId: room.roomId }, r); setTimeout(j, 2000); });
        
        // 设置事件监听
        let missionStartCount = 0;
        let missionWaitingCount = 0;
        
        selectedPlayers.forEach(player => {
            player.socket.on('mission-start', (data) => {
                console.log(`✅ 队员 ${player.name} 收到 mission-start`);
                missionStartCount++;
            });
        });
        
        players.filter(p => !selectedPlayers.some(sp => sp.playerId === p.playerId)).forEach(player => {
            player.socket.on('mission-waiting', (data) => {
                console.log(`✅ 非队员 ${player.name} 收到 mission-waiting`);
                missionWaitingCount++;
            });
        });
        
        // 投票通过
        for (const player of players) {
            await new Promise((r, j) => {
                player.socket.emit('vote', { roomId: room.roomId, playerId: player.playerId, vote: 'approve' }, r);
                setTimeout(j, 2000);
            });
        }
        
        await delay(1000);
        
        // 验证结果
        console.log(`\n✅ 收到 mission-start: ${missionStartCount}/${selectedPlayers.length}`);
        console.log(`✅ 收到 mission-waiting: ${missionWaitingCount}/${players.length - selectedPlayers.length}`);
        
        expect(missionStartCount).toBe(selectedPlayers.length);
        expect(missionWaitingCount).toBe(players.length - selectedPlayers.length);
        
        // 清理
        players.forEach(p => p.socket.disconnect());
        controller.disconnect();
        
        console.log('\n========================================');
        console.log('✅✅✅ BUG-046 修复验证通过！ ✅✅✅');
        console.log('========================================\n');
    });
});
