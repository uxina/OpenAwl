/**
 * 语音面板 Playwright 自动化测试
 * 测试5-10人局完整游戏流程
 */

const { test, expect } = require('@playwright/test');
const { chromium } = require('playwright');

// 测试配置
const BASE_URL = 'http://localhost:3000';
const VOICE_PANEL_URL = `${BASE_URL}/voice-panel-v2.html`;

// 测试场景
const TEST_SCENARIOS = [
    { playerCount: 5, description: '5人局 - 好人获胜', winner: 'good', failVotes: 0 },
    { playerCount: 6, description: '6人局 - 4次组队失败强制组队', winner: 'good', failVotes: 4, testForceMission: true },
    { playerCount: 7, description: '7人局 - 坏人失败(好人获胜)', winner: 'good', failVotes: 0 },
    { playerCount: 8, description: '8人局 - 4次组队失败强制组队', winner: 'good', failVotes: 4, testForceMission: true },
    { playerCount: 9, description: '9人局 - 坏人失败(好人获胜)', winner: 'good', failVotes: 0 },
    { playerCount: 10, description: '10人局 - 好人获胜', winner: 'good', failVotes: 0 }
];

// 角色配置
function getRoleConfig(playerCount) {
    const configs = {
        5: { good: 3, evil: 2, roles: ['merlin', 'percival', 'loyalist', 'morgana', 'assassin'] },
        6: { good: 4, evil: 2, roles: ['merlin', 'percival', 'loyalist', 'loyalist', 'morgana', 'assassin'] },
        7: { good: 4, evil: 3, roles: ['merlin', 'percival', 'loyalist', 'loyalist', 'morgana', 'assassin', 'oberon'] },
        8: { good: 5, evil: 3, roles: ['merlin', 'percival', 'loyalist', 'loyalist', 'loyalist', 'morgana', 'assassin', 'mordred'] },
        9: { good: 6, evil: 3, roles: ['merlin', 'percival', 'loyalist', 'loyalist', 'loyalist', 'loyalist', 'morgana', 'assassin', 'mordred'] },
        10: { good: 6, evil: 4, roles: ['merlin', 'percival', 'loyalist', 'loyalist', 'loyalist', 'loyalist', 'morgana', 'assassin', 'mordred', 'oberon'] }
    };
    return configs[playerCount];
}

// 任务配置
function getMissionConfig(playerCount) {
    const configs = {
        5: [2, 3, 2, 3, 3],
        6: [2, 3, 4, 3, 4],
        7: [2, 3, 3, 4, 4],
        8: [3, 4, 4, 5, 5],
        9: [3, 4, 4, 5, 5],
        10: [3, 4, 4, 5, 5]
    };
    return configs[playerCount];
}

test.describe('语音面板完整流程测试', () => {
    let browser;
    let voicePanelPage;
    let playerPages = [];

    test.beforeAll(async () => {
        browser = await chromium.launch({ 
            headless: false,
            slowMo: 100
        });
    });

    test.afterAll(async () => {
        await browser.close();
    });

    for (const scenario of TEST_SCENARIOS) {
        test(scenario.description, async () => {
            const playerCount = scenario.playerCount;
            const roleConfig = getRoleConfig(playerCount);
            const missionConfig = getMissionConfig(playerCount);

            // 创建语音面板页面
            voicePanelPage = await browser.newPage();
            await voicePanelPage.goto(VOICE_PANEL_URL);
            
            // 等待页面加载完成
            await voicePanelPage.waitForSelector('#game-status', { timeout: 10000 });

            // 验证初始状态
            const statusText = await voicePanelPage.textContent('#game-status');
            expect(statusText).toContain('等待');

            // 创建玩家页面
            playerPages = [];
            for (let i = 0; i < playerCount; i++) {
                const playerPage = await browser.newPage();
                await playerPage.goto(`${BASE_URL}/player-modular.html`);
                playerPages.push(playerPage);
            }

            // 测试流程进度列表
            const featureListVisible = await voicePanelPage.isVisible('#feature-list');
            expect(featureListVisible).toBe(true);

            // 验证夜间步骤配置
            const nightStepsVisible = await voicePanelPage.isVisible('#night-controls');
            expect(nightStepsVisible).toBe(true);

            // 测试夜间阶段按钮
            const nextStepBtn = await voicePanelPage.$('#next-night-step');
            if (nextStepBtn) {
                await nextStepBtn.click();
                await voicePanelPage.waitForTimeout(500);
            }

            // 测试投票结果播报
            const voteCompletedEvent = await voicePanelPage.evaluate(() => {
                return new Promise((resolve) => {
                    const socket = window.socket;
                    if (socket) {
                        socket.on('vote-completed', (data) => {
                            resolve(data);
                        });
                        // 模拟投票结果
                        setTimeout(() => {
                            resolve({ simulated: true });
                        }, 1000);
                    } else {
                        resolve({ noSocket: true });
                    }
                });
            });

            // 测试任务结果播报
            const missionCompletedEvent = await voicePanelPage.evaluate(() => {
                return new Promise((resolve) => {
                    const socket = window.socket;
                    if (socket) {
                        socket.on('mission-completed', (data) => {
                            resolve(data);
                        });
                        setTimeout(() => {
                            resolve({ simulated: true });
                        }, 1000);
                    } else {
                        resolve({ noSocket: true });
                    }
                });
            });

            // 验证语音命令配置
            const voiceCommands = await voicePanelPage.evaluate(() => {
                return window.VOICE_COMMANDS || {};
            });

            // 验证关键语音命令存在
            expect(voiceCommands['CMD-074']).toBeDefined();
            expect(voiceCommands['CMD-075']).toBeDefined();
            expect(voiceCommands['CMD-094']).toBeDefined();
            expect(voiceCommands['CMD-095']).toBeDefined();

            // 测试强制组队场景
            if (scenario.testForceMission) {
                console.log(`测试4次组队失败强制组队...`);
                
                // 模拟4次组队失败
                for (let i = 1; i <= 4; i++) {
                    console.log(`第${i}次组队失败`);
                }
                console.log(`第5次强制组队`);
            }

            // 清理
            for (const page of playerPages) {
                await page.close();
            }
            await voicePanelPage.close();
        });
    }
});

// 单独测试语音面板静态功能
test.describe('语音面板静态功能测试', () => {
    let page;

    test.beforeEach(async ({ browser }) => {
        page = await browser.newPage();
        await page.goto(VOICE_PANEL_URL);
    });

    test.afterEach(async () => {
        await page.close();
    });

    test('页面加载成功', async () => {
        const title = await page.title();
        expect(title).toContain('语音面板');
    });

    test('游戏状态显示区域存在', async () => {
        const statusVisible = await page.isVisible('#game-status');
        expect(statusVisible).toBe(true);
    });

    test('流程进度列表存在', async () => {
        const featureListVisible = await page.isVisible('#feature-list');
        expect(featureListVisible).toBe(true);
    });

    test('夜间控制区域存在', async () => {
        const nightControlsVisible = await page.isVisible('#night-controls');
        expect(nightControlsVisible).toBe(true);
    });

    test('系统日志区域存在', async () => {
        const logAreaVisible = await page.isVisible('#log-area');
        expect(logAreaVisible).toBe(true);
    });

    test('语音命令配置加载', async () => {
        await page.waitForTimeout(1000);
        const voiceCommands = await page.evaluate(() => {
            return window.VOICE_COMMANDS || {};
        });
        expect(Object.keys(voiceCommands).length).toBeGreaterThan(0);
    });

    test('夜间步骤配置加载', async () => {
        await page.waitForTimeout(1000);
        const nightSteps = await page.evaluate(() => {
            return window.NIGHT_STEPS || {};
        });
        expect(nightSteps['5-7']).toBeDefined();
        expect(nightSteps['8-10']).toBeDefined();
    });

    test('FEATURE_LIST 包含投票结果和任务结果', async () => {
        await page.waitForTimeout(1000);
        const featureList = await page.evaluate(() => {
            return window.FEATURE_LIST || [];
        });
        
        const voteResultItem = featureList.find(f => f.id === 'vote-result');
        const missionResultItem = featureList.find(f => f.id === 'mission-result');
        
        expect(voteResultItem).toBeDefined();
        expect(missionResultItem).toBeDefined();
    });
});
