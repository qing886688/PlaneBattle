// 获取游戏元素
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const startButton = document.getElementById('startButton');
const pauseButton = document.getElementById('pauseButton');
const scoreElement = document.getElementById('score');
const livesElement = document.getElementById('lives');
const fpsElement = document.getElementById('fps');
const killCountElement = document.getElementById('killCount');
const gameOverScreen = document.getElementById('gameOverScreen');
const finalScoreElement = document.getElementById('finalScore');
const audioLoadingMessage = document.getElementById('audioLoadingMessage');
const restartButton = document.getElementById('restartButton');
const difficultySelectScreen = document.getElementById('difficultySelectScreen');
const difficultyDescription = document.getElementById('difficultyDescription');
const hitFlashElement = document.getElementById('hitFlash');
const radarContainer = document.getElementById('radar');

// 虚拟控制元素
const virtualControls = document.getElementById('virtualControls');
const joystickBase = document.getElementById('joystickBase');
const joystickHandle = document.getElementById('joystickHandle');
const fireButton = document.getElementById('fireButton');

// 设置画布尺寸
let canvasWidth = 480;
let canvasHeight = 600;
let canvasScale = 1;

// 初始化画布大小
function resizeCanvas() {
    const container = document.querySelector('.canvas-container');
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;
    
    // 保持宽高比为4:5
    const aspectRatio = 4/5;
    
    // 根据容器尺寸计算最佳画布尺寸
    if (containerWidth / containerHeight > aspectRatio) {
        // 高度受限
        canvas.style.height = '100%';
        canvas.style.width = 'auto';
        canvasScale = containerHeight / canvasHeight;
    } else {
        // 宽度受限
        canvas.style.width = '100%';
        canvas.style.height = 'auto';
        canvasScale = containerWidth / canvasWidth;
    }
    
    // 保持内部分辨率不变
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
}

// 监听窗口大小变化
window.addEventListener('resize', resizeCanvas);

// 游戏状态
let gameRunning = false;
let gamePaused = false;
let score = 0;
let lives = 5; // 初始生命值从3增加到5
let animationId;
let gameTime = 0;
let lastTime = 0;
let killCount = 0;
let frameCount = 0;
let lastFpsTime = 0;
let fps = 0;
let difficulty = 0; // 初始难度值
let selectedDifficulty = null; // 用户选择的难度
let gameStartTime = 0; // 游戏开始时间
let gameElapsedTime = 0; // 游戏已进行时间（秒）
let radarDots = [];
let levelUpAnimationActive = false;
let explosionElements = [];
let lastDifficultyLevel = "";
let gameState = 'waiting'; // 游戏状态: waiting, playing, gameover
let difficultyLevel = 1;
let powerupCounter = 0;
let lastComboTime = 0;
let autoAttack = true; // 自动攻击开关
let lastAutoAttackTime = 0; // 上次自动攻击时间
let autoAttackDelay = 120; // 自动攻击间隔(毫秒)，从150降低到120
let autoAttackPower = 2.0; // 自动攻击威力从1.5提高到2.0

// 虚拟摇杆相关变量
let isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
let joystickActive = false;
let joystickTouchId = null;
let joystickBaseX = 0;
let joystickBaseY = 0;
let joystickX = 0;
let joystickY = 0;
let joystickSize = 80; // 摇杆大小
let joystickLimit = 40; // 摇杆移动限制
let joystickCenter = { x: 0, y: 0 }; // 摇杆中心点
let joystickKnob = { x: 0, y: 0 }; // 摇杆控制点
let fireButtonX = 0; // 发射按钮X坐标
let fireButtonY = 0; // 发射按钮Y坐标
let fireButtonRadius = 30; // 发射按钮半径
let fireButtonActive = false; // 发射按钮状态
let fireButtonTouchId = null; // 发射按钮触摸ID

// 粒子系统
let particles = [];
let explosions = [];
let stars = [];

// 玩家飞机
const player = {
    x: canvas.width / 2 - 25,
    y: canvas.height - 60,
    width: 50,
    height: 50,
    speed: 6, // 增加玩家移动速度，从5改为6
    color: '#3498db',
    trailTimer: 0,
    bulletPaths: 1, // 子弹弹道数量
    maxBulletPaths: 7 // 最大弹道数量
};

// 敌机列表
let enemies = [];

// 子弹列表
let bullets = [];

// 按键状态
const keys = {
    ArrowLeft: false,
    ArrowRight: false,
    ArrowUp: false,
    ArrowDown: false,
    Space: false
};

// 图像资源
const images = {
    background: new Image(),
    player: new Image(),
    enemy: new Image(),
    bullet: new Image(),
    explosion: new Image()
};

// 音效
const sounds = {
    shoot: null,
    explosion: null,
    background: null,
    gameOver: null,
    powerup: null,
    shield: null,
    bomb: null,
    hit: null,
    levelUp: null,
    achievement: null,
    homing: null
};

// 添加音量控制
let soundEnabled = true;
let audioContext = null;
let audioLoaded = false;

// 使用AudioContext生成音效
function initAudio() {
    try {
        // 创建音频上下文
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        // 隐藏加载提示
        audioLoadingMessage.classList.remove('show');
        
        // 标记音频已加载
        audioLoaded = true;
        
        console.log("音频系统初始化成功");
    } catch (e) {
        console.error("音频系统初始化失败:", e);
    }
}

// 在游戏状态部分添加新的奖励相关变量
let powerups = [];  // 道具数组
let achievements = []; // 成就数组
let comboCount = 0; // 连击计数
let comboTimer = 0; // 连击计时器
let comboMultiplier = 1; // 连击倍数
let specialWeaponCooldown = 0; // 特殊武器冷却
let shieldActive = false; // 护盾状态
let shieldTime = 0; // 护盾持续时间

// 道具类型
const POWERUP_TYPES = {
    HEALTH: 0,      // 生命值
    WEAPON: 1,      // 武器升级
    BOMB: 2,        // 清屏炸弹
    SHIELD: 3,      // 护盾
    SCORE: 4,       // 分数加成
    SPECIAL: 5,      // 特殊武器
    HOMING: 6       // 追踪子弹
};

// 道具掉落概率（百分比）
const POWERUP_DROP_CHANCE = 25; // 25%的掉落概率

// 成就系统
const ACHIEVEMENTS = [
    { id: 'firstkill', name: '初战告捷', description: '击败第一架敌机', achieved: false, score: 50 },
    { id: 'kill10', name: '小试牛刀', description: '击败10架敌机', threshold: 10, count: 0, achieved: false, score: 100 },
    { id: 'kill50', name: '空战高手', description: '击败50架敌机', threshold: 50, count: 0, achieved: false, score: 300 },
    { id: 'kill100', name: '空战专家', description: '击败100架敌机', threshold: 100, count: 0, achieved: false, score: 500 },
    { id: 'combo10', name: '连击高手', description: '达成10连击', threshold: 10, achieved: false, score: 200 },
    { id: 'score1000', name: '初露锋芒', description: '得分超过1000', threshold: 1000, achieved: false, score: 100 },
    { id: 'score5000', name: '战场主宰', description: '得分超过5000', threshold: 5000, achieved: false, score: 500 },
    { id: 'bomber', name: '炸弹专家', description: '使用3次炸弹', threshold: 3, count: 0, achieved: false, score: 200 },
    { id: 'collector', name: '收集者', description: '收集10个道具', threshold: 10, count: 0, achieved: false, score: 300 },
    { id: 'survivor', name: '幸存者', description: '在一局游戏中存活3分钟', threshold: 180, achieved: false, score: 500 }
];

// 加载图像和音效
function loadResources() {
    // 暂时使用现有代码，后续可扩展图像加载
}

// 生成射击音效
function createShootSound() {
    if (!audioContext) return null;
    
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.type = 'square';
    oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(300, audioContext.currentTime + 0.1);
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.1);
    
    return { oscillator, gainNode };
}

// 解锁音频
function unlockAudio() {
    if (audioContext && audioContext.state === 'suspended') {
        audioContext.resume();
    }
}

// 播放声音
function playSound(sound) {
    if (!soundEnabled || !audioContext) return;
    
    switch(sound) {
        case 'shoot':
            createShootSound();
            break;
        case 'levelUp':
            createLevelUpSound();
            break;
        case 'powerup':
            createPowerupSound();
            break;
        case 'special':
            createSpecialWeaponSound();
            break;
        case 'achievement':
            createAchievementSound();
            break;
        case 'homing':
            createHomingSoundEffect();
            break;
        // 其他声音类型...
    }
}

// 创建等级提升音效
function createLevelUpSound() {
    if (!audioContext) return null;
    
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(300, audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(800, audioContext.currentTime + 0.15);
    oscillator.frequency.exponentialRampToValueAtTime(600, audioContext.currentTime + 0.3);
    
    gainNode.gain.setValueAtTime(0.01, audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.1);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.3);
}

// 创建星星背景
function createStars() {
    stars = [];
    for (let i = 0; i < 100; i++) {
        stars.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            size: Math.random() * 3 + 1,
            speed: Math.random() * 0.5 + 0.1,
            opacity: Math.random() * 0.8 + 0.2,
            pulse: Math.random() * 0.03
        });
    }
}

// 更新星星
function updateStars() {
    for (let i = 0; i < stars.length; i++) {
        const star = stars[i];
        star.y += star.speed;
        
        // 星星闪烁效果
        star.opacity += Math.sin(gameTime * 0.1) * star.pulse;
        
        // 重置超出屏幕的星星
        if (star.y > canvas.height) {
            star.y = 0;
            star.x = Math.random() * canvas.width;
        }
    }
}

// 绘制星星背景
function drawStars() {
    for (let i = 0; i < stars.length; i++) {
        const star = stars[i];
        ctx.fillStyle = `rgba(255, 255, 255, ${star.opacity})`;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fill();
    }
}

// 生成敌机
function spawnEnemy() {
    // 基于当前难度计算敌机的尺寸 (难度越高尺寸越小，更难命中)
    const baseSize = 40 - (difficulty * 0.3);
    const size = Math.max(30, baseSize + Math.random() * 20);
    
    const enemyType = Math.floor(Math.random() * 3);  // 0, 1, 2 三种敌机类型
    
    let color, health;
    
    switch(enemyType) {
        case 0: // 轻型战机
            color = '#8a2be2';
            // 初始生命值为1，减缓随难度增加的速度
            health = 1 + Math.floor(difficulty / 200);
            break;
        case 1: // 中型战机
            color = '#e74c3c';
            // 初始生命值为1，减缓随难度增加的速度
            health = 1 + Math.floor(difficulty / 180);
            break;
        case 2: // 重型战机
            color = '#c0392b';
            // 初始生命值为2，减缓随难度增加的速度
            health = 2 + Math.floor(difficulty / 150);
            break;
    }
    
    // 根据难度调整敌机速度
    const baseSpeed = 1 + (difficulty / 500);
    const randomSpeed = Math.random() * 1.2;
    
    const enemy = {
        x: Math.random() * (canvas.width - size),
        y: -size,
        width: size,
        height: size,
        speed: baseSpeed + randomSpeed,
        color: color,
        health: health,
        maxHealth: health,
        rotationSpeed: (Math.random() - 0.5) * 0.1,
        rotation: 0,
        type: enemyType,
        scoreValue: 5 + Math.floor(difficulty / 100) // 降低基础得分并减缓得分增长，从10+difficulty/80改为5+difficulty/100
    };
    enemies.push(enemy);
}

// 发射子弹
function fireBullet() {
    if (specialWeaponCooldown > 0) return;
    
    // 播放射击音效
    playSound('shoot');
    
    // 根据弹道数量创建子弹
    if (player.bulletPaths === 1) {
        // 单发子弹，直线向上
        const bullet = {
            x: player.x + player.width / 2 - 5,
            y: player.y,
            width: 10,
            height: 20,
            speed: 8,
            color: autoAttack ? '#00ffaa' : '#2ecc71',
            power: autoAttack ? autoAttackPower : 1.5,
            type: 'normal'
        };
        bullets.push(bullet);
    } else {
        // 多弹道子弹，扇形分布
        const spreadAngle = Math.min(60, (player.bulletPaths - 1) * 10); // 扇形角度，最大60度
        const startAngle = -spreadAngle / 2; // 起始角度
        const angleStep = spreadAngle / (player.bulletPaths - 1); // 角度步进
        
        for (let i = 0; i < player.bulletPaths; i++) {
            let angle = 0;
            
            // 如果弹道数量大于1，计算角度
            if (player.bulletPaths > 1) {
                angle = (startAngle + i * angleStep) * Math.PI / 180; // 转换为弧度
            }
            
            // 创建子弹
            const bullet = {
                x: player.x + player.width / 2 - 5,
                y: player.y,
                width: 10,
                height: 20,
                speed: 8,
                speedX: Math.sin(angle) * 2, // 水平速度
                speedY: -Math.cos(angle) * 8, // 垂直速度
                color: autoAttack ? '#00ffaa' : '#2ecc71',
                power: autoAttack ? autoAttackPower : 1.5,
                type: 'normal',
                angle: angle
            };
            bullets.push(bullet);
        }
    }
    
    // 设置冷却时间
    specialWeaponCooldown = autoAttack ? 2 : 8;
}

// 创建道具
function createPowerup(x, y) {
    // 随机选择一种道具类型
    const type = Math.floor(Math.random() * (Object.keys(POWERUP_TYPES).length));
    
    // 道具的颜色和效果
    let color, effectText, label;
    
    switch(type) {
        case POWERUP_TYPES.HEALTH:
            color = '#ff0000'; // 更鲜艳的红色
            effectText = '生命+1';
            label = 'HP';
            break;
        case POWERUP_TYPES.WEAPON:
            color = '#00ff00'; // 更鲜艳的绿色
            effectText = '武器升级';
            label = '↑↑';
            break;
        case POWERUP_TYPES.BOMB:
            color = '#ff6600'; // 更鲜艳的橙色
            effectText = '清屏炸弹';
            label = 'B';
            break;
        case POWERUP_TYPES.SHIELD:
            color = '#00ffff'; // 更鲜艳的青色
            effectText = '护盾';
            label = 'S';
            break;
        case POWERUP_TYPES.SCORE:
            color = '#ffff00'; // 更鲜艳的黄色
            effectText = '分数+50';
            label = '$';
            break;
        case POWERUP_TYPES.SPECIAL:
            color = '#ff00ff'; // 更鲜艳的紫色
            effectText = '特殊武器';
            label = '★';
            break;
        case POWERUP_TYPES.HOMING:
            color = '#0088ff'; // 蓝色
            effectText = '追踪子弹';
            label = '◉';
            break;
    }
    
    // 创建道具对象
    const powerup = {
        x: x,
        y: y,
        width: 25, // 增大尺寸
        height: 25, // 增大尺寸
        type: type,
        color: color,
        effectText: effectText,
        label: label,
        speed: 1.5, // 降低下落速度，便于收集
        rotation: 0,
        pulseSize: 0,
        pulseDirection: 1,
        glowIntensity: 0, // 添加发光强度
        glowDirection: 0.05 // 发光变化速率
    };
    
    // 添加到道具数组
    powerups.push(powerup);
    
    return powerup;
}

// 绘制道具
function drawPowerups() {
    for (let i = 0; i < powerups.length; i++) {
        const powerup = powerups[i];
        
        // 保存当前上下文状态
        ctx.save();
        
        // 设置中心点和旋转
        ctx.translate(powerup.x + powerup.width/2, powerup.y + powerup.height/2);
        ctx.rotate(powerup.rotation);
        
        // 更新发光效果
        powerup.glowIntensity += powerup.glowDirection;
        if (powerup.glowIntensity > 0.8 || powerup.glowIntensity < 0.2) {
            powerup.glowDirection *= -1;
        }
        
        // 绘制外部发光效果
        const outerGlow = ctx.createRadialGradient(0, 0, 0, 0, 0, powerup.width);
        outerGlow.addColorStop(0, powerup.color);
        outerGlow.addColorStop(0.5, powerup.color);
        outerGlow.addColorStop(1, 'rgba(255, 255, 255, 0)');
        
        ctx.globalAlpha = 0.3 + powerup.glowIntensity * 0.4; // 发光强度随时间变化
        ctx.fillStyle = outerGlow;
        ctx.beginPath();
        ctx.arc(0, 0, powerup.width * 1.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1.0;
        
        // 绘制脉冲效果
        const pulseSize = 3 + powerup.pulseSize; // 脉冲效果大小
        const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, powerup.width/2 + pulseSize);
        gradient.addColorStop(0, powerup.color);
        gradient.addColorStop(0.6, powerup.color);
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(0, 0, powerup.width/2 + pulseSize, 0, Math.PI * 2);
        ctx.fill();
        
        // 绘制道具主体
        ctx.fillStyle = powerup.color;
        
        // 不同类型的道具有不同形状
        switch(powerup.type) {
            case POWERUP_TYPES.HEALTH: // 生命值 - 十字形
                // 绘制圆形背景
                ctx.fillStyle = '#ffffff';
                ctx.beginPath();
                ctx.arc(0, 0, powerup.width/2 * 0.9, 0, Math.PI * 2);
                ctx.fill();
                
                // 绘制红十字
                ctx.fillStyle = powerup.color;
                const crossSize = powerup.width * 0.35;
                const crossThickness = powerup.width * 0.15;
                ctx.fillRect(-crossThickness/2, -crossSize/2, crossThickness, crossSize);
                ctx.fillRect(-crossSize/2, -crossThickness/2, crossSize, crossThickness);
                break;
                
            case POWERUP_TYPES.WEAPON: // 武器升级 - 更明显的箭头形状
                // 绘制圆形背景
                ctx.fillStyle = '#ffffff';
                ctx.beginPath();
                ctx.arc(0, 0, powerup.width/2 * 0.9, 0, Math.PI * 2);
                ctx.fill();
                
                // 绘制上箭头
                ctx.fillStyle = powerup.color;
                ctx.beginPath();
                ctx.moveTo(0, -powerup.height/2 * 0.6);
                ctx.lineTo(powerup.width/2 * 0.5, -powerup.height/2 * 0.1);
                ctx.lineTo(-powerup.width/2 * 0.5, -powerup.height/2 * 0.1);
                ctx.closePath();
                ctx.fill();
                
                // 绘制第二个上箭头（叠加效果）
                ctx.beginPath();
                ctx.moveTo(0, -powerup.height/2 * 0.1);
                ctx.lineTo(powerup.width/2 * 0.5, powerup.height/2 * 0.4);
                ctx.lineTo(-powerup.width/2 * 0.5, powerup.height/2 * 0.4);
                ctx.closePath();
                ctx.fill();
                break;
                
            case POWERUP_TYPES.BOMB: // 炸弹 - 更明显的炸弹图标
                // 绘制圆形背景
                ctx.fillStyle = '#000000';
                ctx.beginPath();
                ctx.arc(0, 0, powerup.width/2 * 0.8, 0, Math.PI * 2);
                ctx.fill();
                
                // 绘制炸弹引线
                ctx.strokeStyle = '#ffcc00';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.moveTo(0, -powerup.height/2 * 0.4);
                ctx.quadraticCurveTo(
                    powerup.width/2 * 0.5, -powerup.height/2 * 0.8,
                    powerup.width/2 * 0.7, -powerup.height/2 * 0.5
                );
                ctx.stroke();
                
                // 绘制火花
                ctx.fillStyle = '#ffcc00';
                ctx.beginPath();
                const sparkSize = 3 + Math.sin(Date.now() / 100) * 2; // 闪烁效果
                ctx.arc(powerup.width/2 * 0.7, -powerup.height/2 * 0.5, sparkSize, 0, Math.PI * 2);
                ctx.fill();
                break;
                
            case POWERUP_TYPES.SHIELD: // 护盾 - 更明显的盾牌
                // 绘制外环
                ctx.strokeStyle = powerup.color;
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.arc(0, 0, powerup.width/2 * 0.8, 0, Math.PI * 2);
                ctx.stroke();
                
                // 绘制内环
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(0, 0, powerup.width/2 * 0.6, 0, Math.PI * 2);
                ctx.stroke();
                
                // 绘制十字形
                ctx.strokeStyle = powerup.color;
                ctx.beginPath();
                ctx.moveTo(0, -powerup.height/2 * 0.5);
                ctx.lineTo(0, powerup.height/2 * 0.5);
                ctx.moveTo(-powerup.width/2 * 0.5, 0);
                ctx.lineTo(powerup.width/2 * 0.5, 0);
                ctx.stroke();
                break;
                
            case POWERUP_TYPES.SCORE: // 分数 - 更明显的金币
                // 绘制金币
                ctx.fillStyle = '#ffcc00';
                ctx.beginPath();
                ctx.arc(0, 0, powerup.width/2 * 0.8, 0, Math.PI * 2);
                ctx.fill();
                
                // 绘制金币边缘
                ctx.strokeStyle = '#ff9900';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(0, 0, powerup.width/2 * 0.8, 0, Math.PI * 2);
                ctx.stroke();
                
                // 绘制金币符号
                ctx.fillStyle = '#ffffff';
                ctx.font = 'bold 14px Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('$', 0, 0);
                break;
                
            case POWERUP_TYPES.SPECIAL: // 特殊武器 - 更明显的星形
                // 绘制星形
                drawStar(0, 0, 5, powerup.width/2 * 0.9, powerup.width/4 * 0.5);
                
                // 添加渐变效果
                const specialGradient = ctx.createLinearGradient(
                    -powerup.width/2, -powerup.height/2,
                    powerup.width/2, powerup.height/2
                );
                specialGradient.addColorStop(0, '#ff00ff');
                specialGradient.addColorStop(0.5, '#ffaaff');
                specialGradient.addColorStop(1, '#ff00ff');
                
                ctx.fillStyle = specialGradient;
                drawStar(0, 0, 5, powerup.width/2 * 0.8, powerup.width/4 * 0.4);
                break;
                
            case POWERUP_TYPES.HOMING: // 追踪子弹 - 雷达/目标样式
                // 绘制圆形背景
                ctx.fillStyle = '#ffffff';
                ctx.beginPath();
                ctx.arc(0, 0, powerup.width/2 * 0.9, 0, Math.PI * 2);
                ctx.fill();
                
                // 绘制目标标记
                ctx.strokeStyle = powerup.color;
                ctx.lineWidth = 2;
                
                // 外圈
                ctx.beginPath();
                ctx.arc(0, 0, powerup.width/2 * 0.7, 0, Math.PI * 2);
                ctx.stroke();
                
                // 内圈
                ctx.beginPath();
                ctx.arc(0, 0, powerup.width/2 * 0.4, 0, Math.PI * 2);
                ctx.stroke();
                
                // 中心点
                ctx.fillStyle = powerup.color;
                ctx.beginPath();
                ctx.arc(0, 0, powerup.width/2 * 0.15, 0, Math.PI * 2);
                ctx.fill();
                
                // 十字瞄准线
                ctx.beginPath();
                ctx.moveTo(-powerup.width/2 * 0.9, 0);
                ctx.lineTo(-powerup.width/2 * 0.2, 0);
                ctx.moveTo(powerup.width/2 * 0.2, 0);
                ctx.lineTo(powerup.width/2 * 0.9, 0);
                ctx.moveTo(0, -powerup.height/2 * 0.9);
                ctx.lineTo(0, -powerup.height/2 * 0.2);
                ctx.moveTo(0, powerup.height/2 * 0.2);
                ctx.lineTo(0, powerup.height/2 * 0.9);
                ctx.stroke();
                break;
                
            default: // 默认方形
                ctx.fillRect(-powerup.width/2, -powerup.height/2, powerup.width, powerup.height);
        }
        
        // 恢复上下文
        ctx.restore();
        
        // 绘制漂浮的文本标签 (不受物体旋转影响)
        ctx.save();
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // 绘制标签背景
        const labelWidth = ctx.measureText(powerup.label).width + 8;
        const labelHeight = 16;
        const labelX = powerup.x + powerup.width/2;
        const labelY = powerup.y - 15;
        const radius = 5;
        
        // 绘制标签背景 (使用兼容所有浏览器的圆角矩形绘制方法)
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.beginPath();
        ctx.moveTo(labelX - labelWidth/2 + radius, labelY - labelHeight/2);
        ctx.lineTo(labelX + labelWidth/2 - radius, labelY - labelHeight/2);
        ctx.arc(labelX + labelWidth/2 - radius, labelY - labelHeight/2 + radius, radius, Math.PI * 1.5, 0, false);
        ctx.lineTo(labelX + labelWidth/2, labelY + labelHeight/2 - radius);
        ctx.arc(labelX + labelWidth/2 - radius, labelY + labelHeight/2 - radius, radius, 0, Math.PI * 0.5, false);
        ctx.lineTo(labelX - labelWidth/2 + radius, labelY + labelHeight/2);
        ctx.arc(labelX - labelWidth/2 + radius, labelY + labelHeight/2 - radius, radius, Math.PI * 0.5, Math.PI, false);
        ctx.lineTo(labelX - labelWidth/2, labelY - labelHeight/2 + radius);
        ctx.arc(labelX - labelWidth/2 + radius, labelY - labelHeight/2 + radius, radius, Math.PI, Math.PI * 1.5, false);
        ctx.fill();
        
        // 绘制标签边框
        ctx.strokeStyle = powerup.color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(labelX - labelWidth/2 + radius, labelY - labelHeight/2);
        ctx.lineTo(labelX + labelWidth/2 - radius, labelY - labelHeight/2);
        ctx.arc(labelX + labelWidth/2 - radius, labelY - labelHeight/2 + radius, radius, Math.PI * 1.5, 0, false);
        ctx.lineTo(labelX + labelWidth/2, labelY + labelHeight/2 - radius);
        ctx.arc(labelX + labelWidth/2 - radius, labelY + labelHeight/2 - radius, radius, 0, Math.PI * 0.5, false);
        ctx.lineTo(labelX - labelWidth/2 + radius, labelY + labelHeight/2);
        ctx.arc(labelX - labelWidth/2 + radius, labelY + labelHeight/2 - radius, radius, Math.PI * 0.5, Math.PI, false);
        ctx.lineTo(labelX - labelWidth/2, labelY - labelHeight/2 + radius);
        ctx.arc(labelX - labelWidth/2 + radius, labelY - labelHeight/2 + radius, radius, Math.PI, Math.PI * 1.5, false);
        ctx.stroke();
        
        // 绘制标签文本
        ctx.fillStyle = '#ffffff';
        ctx.fillText(powerup.label, labelX, labelY);
        ctx.restore();
    }
}

// 绘制星形函数
function drawStar(cx, cy, spikes, outerRadius, innerRadius) {
    let rot = Math.PI / 2 * 3;
    let x = cx;
    let y = cy;
    const step = Math.PI / spikes;

    ctx.beginPath();
    ctx.moveTo(cx, cy - outerRadius);
    
    for (let i = 0; i < spikes; i++) {
        x = cx + Math.cos(rot) * outerRadius;
        y = cy + Math.sin(rot) * outerRadius;
        ctx.lineTo(x, y);
        rot += step;

        x = cx + Math.cos(rot) * innerRadius;
        y = cy + Math.sin(rot) * innerRadius;
        ctx.lineTo(x, y);
        rot += step;
    }
    
    ctx.lineTo(cx, cy - outerRadius);
    ctx.closePath();
    ctx.fill();
}

// 更新道具
function updatePowerups() {
    for (let i = powerups.length - 1; i >= 0; i--) {
        const powerup = powerups[i];
        
        // 更新位置
        powerup.y += powerup.speed;
        
        // 更新旋转
        powerup.rotation += 0.02;
        
        // 更新脉冲效果
        powerup.pulseSize += 0.1 * powerup.pulseDirection;
        if (powerup.pulseSize > 2) {
            powerup.pulseDirection = -1;
        } else if (powerup.pulseSize < 0) {
            powerup.pulseDirection = 1;
        }
        
        // 移除超出屏幕的道具
        if (powerup.y > canvas.height) {
            powerups.splice(i, 1);
            continue;
        }
        
        // 检测玩家与道具碰撞
        if (player.x < powerup.x + powerup.width &&
            player.x + player.width > powerup.x &&
            player.y < powerup.y + powerup.height &&
            player.y + player.height > powerup.y) {
            
            // 播放收集音效
            playSound('powerup');
            
            // 根据道具类型应用效果
            applyPowerupEffect(powerup);
            
            // 更新收集者成就
            updateCollectorAchievement();
            
            // 移除道具
            powerups.splice(i, 1);
        }
    }
}

// 应用道具效果
function applyPowerupEffect(powerup) {
    // 创建文本效果
    createFloatingText(powerup.x, powerup.y, powerup.effectText, powerup.color);
    
    // 根据类型应用不同效果
    switch(powerup.type) {
        case POWERUP_TYPES.HEALTH: // 生命值+1
            lives++;
            livesElement.textContent = lives;
            break;
            
        case POWERUP_TYPES.WEAPON: // 武器升级 - 增加弹道
            if (player.bulletPaths < player.maxBulletPaths) {
                player.bulletPaths++;
                createFloatingText(player.x + player.width/2, player.y, `弹道+1 (${player.bulletPaths}/${player.maxBulletPaths})`, '#55ff55');
            } else {
                // 已达最大弹道，提高子弹威力
                autoAttackPower += 0.5;
                createFloatingText(player.x + player.width/2, player.y, `弹道已满! 威力+0.5`, '#ff9900');
                
                // 10秒后恢复威力
                setTimeout(() => {
                    autoAttackPower = Math.max(2.0, autoAttackPower - 0.5);
                }, 10000);
            }
            break;
            
        case POWERUP_TYPES.BOMB: // 清屏炸弹 - 消灭所有敌机
            // 记录当前敌机数量
            const enemyCount = enemies.length;
            
            // 为每个敌机创建爆炸效果
            for (let i = enemies.length - 1; i >= 0; i--) {
                const enemy = enemies[i];
                createExplosion(enemy.x + enemy.width/2, enemy.y + enemy.height/2, enemy.width);
                
                // 增加得分
                score += enemy.scoreValue;
            }
            
            // 清空敌机数组
            enemies = [];
            
            // 更新分数显示
            scoreElement.textContent = score;
            
            // 摇晃屏幕
            shakeScreen(1.0);
            
            // 更新炸弹专家成就
            updateBomberAchievement();
            break;
            
        case POWERUP_TYPES.SHIELD: // 激活护盾
            shieldActive = true;
            shieldTime = 10; // 10秒护盾时间
            
            // 创建护盾定时器
            setTimeout(() => {
                shieldActive = false;
            }, shieldTime * 1000);
            break;
            
        case POWERUP_TYPES.SCORE: // 分数+50
            score += 50;
            scoreElement.textContent = score;
            break;
            
        case POWERUP_TYPES.SPECIAL: // 特殊武器 - 发射多方向子弹
            fireSpecialWeapon();
            break;
            
        case POWERUP_TYPES.HOMING: // 追踪子弹
            // 发射一组追踪子弹
            fireHomingBullets();
            break;
    }
}

// 创建浮动文本效果
function createFloatingText(x, y, text, color = 'white') {
    const floatingText = {
        x: x,
        y: y,
        text: text,
        color: color,
        alpha: 1,
        size: 20,
        lifetime: 50,
        currentLife: 0
    };
    
    particles.push(floatingText);
}

// 更新收集者成就
function updateCollectorAchievement() {
    // 查找收集者成就
    const collectorAchievement = ACHIEVEMENTS.find(a => a.id === 'collector');
    
    if (collectorAchievement && !collectorAchievement.achieved) {
        collectorAchievement.count = (collectorAchievement.count || 0) + 1;
        
        // 检查是否达成成就
        if (collectorAchievement.count >= collectorAchievement.threshold) {
            collectorAchievement.achieved = true;
            
            // 显示成就通知
            showAchievementNotification(collectorAchievement);
            
            // 增加得分
            score += collectorAchievement.score;
            scoreElement.textContent = score;
        }
    }
}

// 更新炸弹专家成就
function updateBomberAchievement() {
    // 查找炸弹专家成就
    const bomberAchievement = ACHIEVEMENTS.find(a => a.id === 'bomber');
    
    if (bomberAchievement && !bomberAchievement.achieved) {
        bomberAchievement.count = (bomberAchievement.count || 0) + 1;
        
        // 检查是否达成成就
        if (bomberAchievement.count >= bomberAchievement.threshold) {
            bomberAchievement.achieved = true;
            
            // 显示成就通知
            showAchievementNotification(bomberAchievement);
            
            // 增加得分
            score += bomberAchievement.score;
            scoreElement.textContent = score;
        }
    }
}

// 显示成就通知
function showAchievementNotification(achievement) {
    // 创建成就通知元素
    const notification = document.createElement('div');
    notification.className = 'achievement-notification';
    notification.innerHTML = `
        <div class="achievement-icon">🏆</div>
        <div class="achievement-content">
            <div class="achievement-title">成就解锁: ${achievement.name}</div>
            <div class="achievement-desc">${achievement.description}</div>
            <div class="achievement-score">+${achievement.score}分</div>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    // 动画效果
    setTimeout(() => {
        notification.classList.add('show');
    }, 100);
    
    // 3秒后移除
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 500);
    }, 3000);
    
    // 播放成就音效
    playSound('achievement');
}

// 发射特殊武器 - 多方向子弹
function fireSpecialWeapon() {
    // 多方向子弹数量
    const bulletCount = 8;
    
    // 创建多方向子弹
    for (let i = 0; i < bulletCount; i++) {
        const angle = (Math.PI * 2 / bulletCount) * i;
        
        // 创建子弹
        const bullet = {
            x: player.x + player.width / 2 - 5,
            y: player.y + player.height / 2 - 5,
            width: 10,
            height: 10,
            speedX: Math.cos(angle) * 8,
            speedY: Math.sin(angle) * 8,
            color: '#ff00ff', // 紫色特殊子弹
            power: 2.5, // 高伤害
            type: 'special',
            angle: angle
        };
        
        bullets.push(bullet);
    }
    
    // 播放特殊武器音效
    playSound('special');
    
    // 摇晃屏幕
    shakeScreen(0.3);
}

// 发射追踪子弹
function fireHomingBullets() {
    // 追踪子弹数量
    const bulletCount = 3;
    
    // 创建追踪子弹
    for (let i = 0; i < bulletCount; i++) {
        // 创建子弹
        const bullet = {
            x: player.x + player.width / 2 - 5,
            y: player.y,
            width: 10,
            height: 10,
            speed: 5,
            color: '#0088ff', // 蓝色追踪子弹
            power: 2.5, // 高伤害
            type: 'homing',
            rotation: 0,
            rotationSpeed: 0.1,
            target: null,
            maxTurnRate: 0.15, // 最大转向角度
            lifespan: 200, // 子弹寿命
            currentLife: 0
        };
        
        bullets.push(bullet);
    }
    
    // 播放追踪子弹音效
    playSound('special');
    
    // 屏幕轻微震动
    shakeScreen(0.2);
}

// 更新游戏
function update(time) {
    const deltaTime = time - lastTime;
    
    // 如果不是使用虚拟摇杆（即键盘控制），则更新玩家位置
    if (!isMobile || !joystickActive) {
        // 更新玩家位置
        if (keys.ArrowLeft && player.x > 0) {
            player.x -= player.speed;
        }
        if (keys.ArrowRight && player.x < canvas.width - player.width) {
            player.x += player.speed;
        }
        if (keys.ArrowUp && player.y > 0) {
            player.y -= player.speed;
        }
        if (keys.ArrowDown && player.y < canvas.height - player.height) {
            player.y += player.speed;
        }
        if (keys.Space) {
            fireBullet();
        }
    }

    // 自动攻击
    if (autoAttack && time - lastAutoAttackTime > autoAttackDelay) {
        fireBullet();
        lastAutoAttackTime = time;
    }
    
    // 更新子弹位置
    for (let i = bullets.length - 1; i >= 0; i--) {
        const bullet = bullets[i];
        
        // 根据子弹类型更新位置
        if (bullet.type === 'homing') {
            // 追踪子弹逻辑
            bullet.currentLife++;
            
            // 如果子弹存在时间过长或没有目标，移除子弹
            if (bullet.currentLife > bullet.lifespan) {
                bullets.splice(i, 1);
                continue;
            }
            
            // 查找最近的敌机作为目标
            if (!bullet.target || !enemies.includes(bullet.target)) {
                bullet.target = findNearestEnemy(bullet.x, bullet.y);
            }
            
            if (bullet.target) {
                // 计算目标方向
                const dx = bullet.target.x + bullet.target.width/2 - bullet.x;
                const dy = bullet.target.y + bullet.target.height/2 - bullet.y;
                const targetAngle = Math.atan2(dy, dx);
                
                // 旋转子弹朝向目标
                let angleDiff = targetAngle - bullet.rotation;
                
                // 调整角度差异范围在-PI到PI之间
                while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
                while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
                
                // 限制转向速率
                bullet.rotation += Math.sign(angleDiff) * Math.min(Math.abs(angleDiff), bullet.maxTurnRate);
                
                // 根据旋转角度更新位置
                bullet.x += Math.cos(bullet.rotation) * bullet.speed;
                bullet.y += Math.sin(bullet.rotation) * bullet.speed;
            } else {
                // 如果没有目标，直线向上移动
                bullet.y -= bullet.speed;
            }
            
            // 移除超出屏幕的子弹
            if (bullet.x < 0 || bullet.x > canvas.width || 
                bullet.y < 0 || bullet.y > canvas.height) {
                bullets.splice(i, 1);
            }
        } else if (bullet.type === 'special') {
            // 特殊子弹按角度移动
            bullet.x += bullet.speedX;
            bullet.y += bullet.speedY;
            
            // 移除超出屏幕的子弹
            if (bullet.x < 0 || bullet.x > canvas.width || 
                bullet.y < 0 || bullet.y > canvas.height) {
                bullets.splice(i, 1);
            }
        } else if (bullet.speedX !== undefined) {
            // 多弹道子弹移动
            bullet.x += bullet.speedX;
            bullet.y += bullet.speedY;
            
            // 移除超出屏幕的子弹
            if (bullet.x < 0 || bullet.x > canvas.width || 
                bullet.y < 0 || bullet.y > canvas.height) {
                bullets.splice(i, 1);
            }
        } else {
            // 普通子弹向上移动
            bullet.y -= bullet.speed;
            
            // 移除超出屏幕的子弹
            if (bullet.y + bullet.height < 0) {
                bullets.splice(i, 1);
            }
        }
    }
    
    // 随机生成敌机 (根据难度调整生成频率)
    if (Math.random() < 0.01 + (difficulty / 2000)) { // 进一步降低敌机生成概率，从0.015+difficulty/1500改为0.01+difficulty/2000
        spawnEnemy();
    }
    
    // 更新敌机位置
    for (let i = enemies.length - 1; i >= 0; i--) {
        const enemy = enemies[i];
        enemy.y += enemy.speed;
        
        // 移除超出屏幕的敌机
        if (enemy.y > canvas.height) {
            enemies.splice(i, 1);
        }
    }
    
    // 检测子弹与敌机碰撞
    for (let i = bullets.length - 1; i >= 0; i--) {
        const bullet = bullets[i];
        
        for (let j = enemies.length - 1; j >= 0; j--) {
            const enemy = enemies[j];
            
            // 碰撞检测
            if (bullet.x < enemy.x + enemy.width &&
                bullet.x + bullet.width > enemy.x &&
                bullet.y < enemy.y + enemy.height &&
                bullet.y + bullet.height > enemy.y) {
                
                // 敌机受到伤害
                enemy.health -= bullet.power;
                
                // 创建击中特效
                createHitEffect(bullet.x, bullet.y);
                
                // 敌机被击败
                if (enemy.health <= 0) {
                    // 更新得分
                    score += enemy.scoreValue;
                    scoreElement.textContent = score;
                    
                    // 更新击杀数
                    killCount++;
                    killCountElement.textContent = `击毁: ${killCount}`;
                    
                    // 创建爆炸效果
                    createExplosion(enemy.x + enemy.width/2, enemy.y + enemy.height/2, enemy.width);
                    
                    // 随机掉落道具
                    if (Math.random() * 100 < POWERUP_DROP_CHANCE) {
                        createPowerup(enemy.x + enemy.width/2, enemy.y + enemy.height/2);
                    }
                    
                    // 移除敌机
                    enemies.splice(j, 1);
                }
                
                // 移除子弹
                bullets.splice(i, 1);
                break;
            }
        }
    }
    
    // 检测玩家与敌机碰撞
    for (let i = enemies.length - 1; i >= 0; i--) {
        const enemy = enemies[i];
        
        if (player.x < enemy.x + enemy.width &&
            player.x + player.width > enemy.x &&
            player.y < enemy.y + enemy.height &&
            player.y + player.height > enemy.y) {
            
            // 如果有护盾，不减少生命值
            if (shieldActive) {
                // 创建护盾反弹效果
                createExplosion(enemy.x + enemy.width/2, enemy.y + enemy.height/2, enemy.width * 0.7);
                
                // 移除敌机
                enemies.splice(i, 1);
            } else {
                // 玩家被击中，减少生命值
                lives--;
                livesElement.textContent = lives;
                
                // 移除敌机
                enemies.splice(i, 1);
                
                // 创建爆炸效果
                createExplosion(enemy.x + enemy.width/2, enemy.y + enemy.height/2, enemy.width);
                
                // 无敌时间 - 短暂闪烁效果
                let invincibleTime = 0;
                let blinkCount = 0;
                const blinkInterval = setInterval(() => {
                    if (invincibleTime >= 1000) { // 1秒无敌时间
                        clearInterval(blinkInterval);
                        canvas.style.filter = 'none';
                        return;
                    }
                    
                    // 闪烁效果
                    if (blinkCount % 2 === 0) {
                        canvas.style.filter = 'brightness(1.5)';
                    } else {
                        canvas.style.filter = 'none';
                    }
                    
                    blinkCount++;
                    invincibleTime += 100;
                }, 100);
                
                // 检查游戏是否结束
                if (lives <= 0) {
                    gameOver();
                    return;
                }
            }
            
            break;
        }
    }
    
    // 更新道具
    updatePowerups();
    
    // 更新特殊武器冷却时间
    if (specialWeaponCooldown > 0) {
        specialWeaponCooldown--;
    }
    
    // 更新星星
    updateStars();
    
    // 缓慢增加难度
    difficulty += 0.006;
    // 每10秒更新难度显示
    if (Math.floor(gameTime) % 10 === 0 && Math.floor(gameTime) > 0) {
        updateDifficultyLevel();
    }
}

// 绘制游戏
function draw() {
    // 清空画布
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // 绘制背景
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // 绘制星星
    drawStars();
    
    // 绘制道具
    drawPowerups();
    
    // 绘制子弹
    bullets.forEach(bullet => {
        // 绘制更加精美的子弹
        ctx.fillStyle = bullet.color;
        
        // 根据子弹类型选择不同的渲染方式
        if (bullet.type === 'homing') {
            // 保存上下文
            ctx.save();
            
            // 设置位置和旋转
            ctx.translate(bullet.x, bullet.y);
            ctx.rotate(bullet.rotation);
            
            // 创建发光效果
            const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, bullet.width);
            gradient.addColorStop(0, 'white');
            gradient.addColorStop(0.3, bullet.color);
            gradient.addColorStop(1, 'rgba(0,0,0,0)');
            
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(0, 0, bullet.width, 0, Math.PI * 2);
            ctx.fill();
            
            // 绘制箭头形子弹
            ctx.fillStyle = 'white';
            ctx.beginPath();
            ctx.moveTo(bullet.width/2, 0);
            ctx.lineTo(-bullet.width/2, bullet.width/2);
            ctx.lineTo(-bullet.width/2, -bullet.width/2);
            ctx.closePath();
            ctx.fill();
            
            // 绘制追踪线(如果有目标)
            if (bullet.target) {
                ctx.setLineDash([3, 3]);
                ctx.strokeStyle = 'rgba(0, 136, 255, 0.4)';
                ctx.lineWidth = 1;
                ctx.beginPath();
                
                const targetX = bullet.target.x + bullet.target.width/2 - bullet.x;
                const targetY = bullet.target.y + bullet.target.height/2 - bullet.y;
                const distance = Math.sqrt(targetX*targetX + targetY*targetY);
                
                // 有限的追踪线长度
                const maxLineLength = 80;
                const lineLength = Math.min(distance, maxLineLength);
                const angle = Math.atan2(targetY, targetX);
                
                ctx.moveTo(0, 0);
                ctx.lineTo(Math.cos(angle) * lineLength, Math.sin(angle) * lineLength);
                ctx.stroke();
                ctx.setLineDash([]);
            }
            
            // 恢复上下文
            ctx.restore();
        } else if (bullet.type === 'special') {
            // 保存上下文
            ctx.save();
            
            // 设置位置和旋转
            ctx.translate(bullet.x + bullet.width/2, bullet.y + bullet.height/2);
            ctx.rotate(bullet.angle);
            
            // 创建发光效果
            const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, bullet.width/2 * 1.5);
            gradient.addColorStop(0, 'white');
            gradient.addColorStop(0.3, bullet.color);
            gradient.addColorStop(1, 'rgba(0,0,0,0)');
            
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(0, 0, bullet.width/2 * 1.5, 0, Math.PI * 2);
            ctx.fill();
            
            // 绘制闪电形状
            ctx.fillStyle = 'white';
            ctx.beginPath();
            ctx.moveTo(-bullet.width/3, -bullet.height/2);
            ctx.lineTo(0, 0);
            ctx.lineTo(bullet.width/3, -bullet.height/2);
            ctx.closePath();
            ctx.fill();
            
            // 恢复上下文
            ctx.restore();
        } else {
            // 创建发光效果
            const gradient = ctx.createRadialGradient(
                bullet.x + bullet.width/2, 
                bullet.y + bullet.height/2, 
                0, 
                bullet.x + bullet.width/2, 
                bullet.y + bullet.height/2, 
                bullet.width
            );
            gradient.addColorStop(0, 'white');
            gradient.addColorStop(0.3, bullet.color);
            gradient.addColorStop(1, 'rgba(0,0,0,0)');
            
            // 绘制子弹光晕
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(bullet.x + bullet.width/2, bullet.y + bullet.height/2, bullet.width, 0, Math.PI * 2);
            ctx.fill();
            
            // 绘制子弹主体
            ctx.fillStyle = 'white';
            ctx.fillRect(bullet.x + bullet.width/2 - 2, bullet.y, 4, bullet.height);
        }
    });
    
    // 绘制敌机
    enemies.forEach(enemy => {
        // 根据敌机类型绘制不同形状
        ctx.fillStyle = enemy.color;
        
        switch(enemy.type) {
            case 0: // 轻型战机 - 小三角形
                ctx.beginPath();
                ctx.moveTo(enemy.x + enemy.width/2, enemy.y);
                ctx.lineTo(enemy.x, enemy.y + enemy.height);
                ctx.lineTo(enemy.x + enemy.width, enemy.y + enemy.height);
                ctx.closePath();
                ctx.fill();
                
                // 绘制机翼
                ctx.fillStyle = 'rgba(255,255,255,0.5)';
                ctx.beginPath();
                ctx.moveTo(enemy.x, enemy.y + enemy.height * 0.7);
                ctx.lineTo(enemy.x - enemy.width * 0.3, enemy.y + enemy.height * 0.5);
                ctx.lineTo(enemy.x, enemy.y + enemy.height * 0.4);
                ctx.closePath();
                ctx.fill();
                
                ctx.beginPath();
                ctx.moveTo(enemy.x + enemy.width, enemy.y + enemy.height * 0.7);
                ctx.lineTo(enemy.x + enemy.width * 1.3, enemy.y + enemy.height * 0.5);
                ctx.lineTo(enemy.x + enemy.width, enemy.y + enemy.height * 0.4);
                ctx.closePath();
                ctx.fill();
                break;
                
            case 1: // 中型战机 - 五边形
                ctx.beginPath();
                ctx.moveTo(enemy.x + enemy.width/2, enemy.y);
                ctx.lineTo(enemy.x, enemy.y + enemy.height * 0.4);
                ctx.lineTo(enemy.x, enemy.y + enemy.height * 0.8);
                ctx.lineTo(enemy.x + enemy.width, enemy.y + enemy.height * 0.8);
                ctx.lineTo(enemy.x + enemy.width, enemy.y + enemy.height * 0.4);
                ctx.closePath();
                ctx.fill();
                
                // 添加细节
                ctx.fillStyle = 'rgba(0,0,0,0.5)';
                ctx.fillRect(enemy.x + enemy.width * 0.3, enemy.y + enemy.height * 0.3, 
                            enemy.width * 0.4, enemy.height * 0.4);
                break;
                
            case 2: // 重型战机 - 六边形
                ctx.beginPath();
                ctx.moveTo(enemy.x + enemy.width * 0.3, enemy.y);
                ctx.lineTo(enemy.x + enemy.width * 0.7, enemy.y);
                ctx.lineTo(enemy.x + enemy.width, enemy.y + enemy.height * 0.5);
                ctx.lineTo(enemy.x + enemy.width * 0.7, enemy.y + enemy.height);
                ctx.lineTo(enemy.x + enemy.width * 0.3, enemy.y + enemy.height);
                ctx.lineTo(enemy.x, enemy.y + enemy.height * 0.5);
                ctx.closePath();
                ctx.fill();
                
                // 添加引擎效果
                ctx.fillStyle = 'rgba(255,100,0,0.8)';
                ctx.beginPath();
                ctx.arc(enemy.x + enemy.width * 0.3, enemy.y + enemy.height * 0.7, 
                      enemy.width * 0.1, 0, Math.PI * 2);
                ctx.fill();
                
                ctx.beginPath();
                ctx.arc(enemy.x + enemy.width * 0.7, enemy.y + enemy.height * 0.7, 
                      enemy.width * 0.1, 0, Math.PI * 2);
                ctx.fill();
                break;
        }
        
        // 绘制敌机生命值
        if (enemy.health < enemy.maxHealth) {
            // 背景
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.fillRect(enemy.x, enemy.y - 10, enemy.width, 5);
            
            // 血条
            const healthPercent = enemy.health / enemy.maxHealth;
            ctx.fillStyle = healthPercent > 0.5 ? 'lime' : 'red';
            ctx.fillRect(enemy.x, enemy.y - 10, enemy.width * healthPercent, 5);
        }
    });
    
    // 绘制玩家飞机 - 使用三角形
    ctx.fillStyle = player.color;
    
    // 绘制机身
    ctx.beginPath();
    ctx.moveTo(player.x + player.width/2, player.y);
    ctx.lineTo(player.x, player.y + player.height);
    ctx.lineTo(player.x + player.width, player.y + player.height);
    ctx.closePath();
    ctx.fill();
    
    // 绘制机翼
    ctx.fillStyle = '#1a6ba0';
    ctx.beginPath();
    ctx.moveTo(player.x - player.width * 0.2, player.y + player.height * 0.7);
    ctx.lineTo(player.x + player.width * 1.2, player.y + player.height * 0.7);
    ctx.lineTo(player.x + player.width/2, player.y + player.height * 0.9);
    ctx.closePath();
    ctx.fill();
    
    // 绘制驾驶舱
    ctx.fillStyle = 'rgba(200, 230, 255, 0.7)';
    ctx.beginPath();
    ctx.arc(player.x + player.width/2, player.y + player.height * 0.4, 
            player.width * 0.15, 0, Math.PI * 2);
    ctx.fill();
    
    // 绘制引擎火焰
    if (gameRunning && !gamePaused) {
        ctx.fillStyle = 'orange';
        ctx.beginPath();
        ctx.moveTo(player.x + player.width * 0.3, player.y + player.height);
        ctx.lineTo(player.x + player.width * 0.5, player.y + player.height + Math.random() * 15 + 5);
        ctx.lineTo(player.x + player.width * 0.7, player.y + player.height);
        ctx.closePath();
        ctx.fill();
    }
    
    // 绘制护盾效果
    if (shieldActive) {
        ctx.strokeStyle = 'rgba(0, 200, 255, 0.7)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(player.x + player.width/2, player.y + player.height/2, 
                player.width * 0.8, 0, Math.PI * 2);
        ctx.stroke();
        
        // 添加光晕效果
        const shieldGradient = ctx.createRadialGradient(
            player.x + player.width/2, player.y + player.height/2, 0,
            player.x + player.width/2, player.y + player.height/2, player.width
        );
        shieldGradient.addColorStop(0, 'rgba(0, 200, 255, 0)');
        shieldGradient.addColorStop(0.7, 'rgba(0, 200, 255, 0.1)');
        shieldGradient.addColorStop(1, 'rgba(0, 200, 255, 0.2)');
        
        ctx.fillStyle = shieldGradient;
        ctx.beginPath();
        ctx.arc(player.x + player.width/2, player.y + player.height/2, 
                player.width, 0, Math.PI * 2);
        ctx.fill();
    }
    
    // 绘制虚拟摇杆（仅在移动设备上）
    if (isMobile && gameRunning && !gamePaused) {
        drawVirtualJoystick();
    }
}

// 游戏主循环
function gameLoop(time) {
    if (!gamePaused && gameRunning) {
        // 计算游戏时间
        const deltaTime = time - lastTime;
        gameTime += deltaTime / 1000;
        
        // 更新FPS
        updateFPS(time);
        
        // 更新游戏时间显示
        const minutes = Math.floor(gameTime / 60);
        const seconds = Math.floor(gameTime % 60);
        document.getElementById('gameTime').textContent = 
            `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        // 更新和绘制游戏
        update(time);
        draw();
        
        lastTime = time;
    }
    animationId = requestAnimationFrame(gameLoop);
}

// 键盘控制
window.addEventListener('keydown', (e) => {
    if (e.code === 'ArrowLeft' || e.code === 'ArrowRight' || 
        e.code === 'ArrowUp' || e.code === 'ArrowDown') {
        keys[e.code] = true;
        e.preventDefault();
    }
    if (e.code === 'Space') {
        keys.Space = true;
        e.preventDefault();
    }
    
    // 按 'A' 键切换自动攻击
    if (e.code === 'KeyA') {
        autoAttack = !autoAttack;
        
        // 显示自动攻击状态提示
        const autoAttackStatus = document.createElement('div');
        autoAttackStatus.className = 'achievement-notification show';
        autoAttackStatus.innerHTML = `
            <div class="achievement-icon">${autoAttack ? '🔄' : '🛑'}</div>
            <div class="achievement-content">
                <div class="achievement-title">自动攻击${autoAttack ? '开启' : '关闭'}</div>
                <div class="achievement-desc">攻击间隔: ${autoAttackDelay}ms 伤害: ${autoAttackPower}</div>
            </div>
        `;
        
        document.body.appendChild(autoAttackStatus);
        
        // 3秒后移除提示
        setTimeout(() => {
            autoAttackStatus.classList.remove('show');
            setTimeout(() => {
                document.body.removeChild(autoAttackStatus);
            }, 500);
        }, 3000);
    }
});

window.addEventListener('keyup', (e) => {
    if (e.code === 'ArrowLeft' || e.code === 'ArrowRight' || 
        e.code === 'ArrowUp' || e.code === 'ArrowDown') {
        keys[e.code] = false;
    }
    if (e.code === 'Space') {
        keys.Space = false;
    }
});

// 更新FPS计数
function updateFPS(time) {
    if (!lastFpsTime) {
        lastFpsTime = time;
        fps = 0;
        return;
    }
    
    frameCount++;
    
    // 每秒更新一次FPS值
    if (time - lastFpsTime > 1000) {
        fps = Math.round((frameCount * 1000) / (time - lastFpsTime));
        frameCount = 0;
        lastFpsTime = time;
        
        // 更新FPS显示
        fpsElement.textContent = `FPS: ${fps}`;
    }
}

// 根据难度值更新难度级别显示
function updateDifficultyLevel() {
    const difficultyElement = document.getElementById('difficultyLevel');
    let levelText = "";
    let levelClass = "";
    
    // 移除所有可能的难度类
    difficultyElement.classList.remove(
        'difficulty-novice',
        'difficulty-easy',
        'difficulty-normal',
        'difficulty-hard',
        'difficulty-expert',
        'difficulty-master'
    );
    
    // 调整难度值范围，让各难度级别可以持续更长时间
    if (difficulty < 20) {
        levelText = "新手";
        levelClass = "difficulty-novice";
    } else if (difficulty < 60) {
        levelText = "简单";
        levelClass = "difficulty-easy";
    } else if (difficulty < 120) {
        levelText = "普通";
        levelClass = "difficulty-normal";
    } else if (difficulty < 200) {
        levelText = "困难";
        levelClass = "difficulty-hard";
    } else if (difficulty < 320) {
        levelText = "专家";
        levelClass = "difficulty-expert";
    } else {
        levelText = "大师";
        levelClass = "difficulty-master";
    }
    
    // 检查难度级别变化并播放动画
    if (lastDifficultyLevel && lastDifficultyLevel !== levelText) {
        showLevelUpAnimation(levelText);
    }
    lastDifficultyLevel = levelText;
    
    difficultyElement.textContent = levelText;
    difficultyElement.classList.add(levelClass);
}

// 初始化游戏
function init() {
    // 初始化游戏状态
    score = 0;
    lives = 5;
    gameTime = 0;
    killCount = 0;
    
    // 重置玩家位置和弹道
    player.x = canvas.width / 2 - player.width / 2;
    player.y = canvas.height - player.height - 20;
    player.bulletPaths = 1; // 重置弹道数量
    
    // 清空所有游戏对象
    enemies = [];
    bullets = [];
    particles = [];
    powerups = [];
    explosions = [];
    
    // 重置游戏状态
    gameState = 'playing';
    difficultyLevel = 1;
    
    // 难度值保持用户选择的难度，不重置
    
    // 更新得分显示
    scoreElement.textContent = score;
    livesElement.textContent = lives;
    killCountElement.textContent = `击毁: ${killCount}`;
    
    // 创建星空背景
    stars = [];
    createStars();
    
    // 重置道具相关
    powerupCounter = 0;
    specialWeaponCooldown = 0;
    shieldActive = false;
    shieldTime = 0;
    
    // 重置combo计数
    comboCount = 0;
    lastComboTime = 0;
    
    // 隐藏游戏结束画面
    hideGameOverScreen();
    
    // 更新难度级别显示
    updateDifficultyLevel();
}

// 开始游戏
function startGame() {
    console.log("游戏开始");
    resizeCanvas();
    init();
    gameRunning = true;
    gamePaused = false;
    startButton.textContent = '重新开始';
    pauseButton.textContent = '暂停';
    lastTime = performance.now();
    if (animationId) {
        cancelAnimationFrame(animationId);
    }
    
    // 隐藏游戏结束画面
    hideGameOverScreen();
    
    // 播放音效
    if (soundEnabled && audioContext) {
        unlockAudio();
        playSound('levelUp');
    }
    
    gameLoop(lastTime);
}

// 暂停游戏
function togglePause() {
    if (gameRunning) {
        gamePaused = !gamePaused;
        pauseButton.textContent = gamePaused ? '继续' : '暂停';
        
        if (!gamePaused) {
            lastTime = performance.now();
        }
    }
}

// 隐藏游戏结束画面
function hideGameOverScreen() {
    gameOverScreen.style.opacity = '0';
    gameOverScreen.style.pointerEvents = 'none';
}

// 屏幕震动效果，添加震动强度参数
function shakeScreen(intensity = 0.5) {
    let shakeAmount = 15 * intensity; // 根据强度调整震动幅度
    let shakeDuration = 400 * intensity; // 根据强度调整震动时长
    let shakeStartTime = Date.now();
    
    // 设置震动间隔
    let shakeInterval = setInterval(() => {
        let elapsed = Date.now() - shakeStartTime;
        if (elapsed >= shakeDuration) {
            clearInterval(shakeInterval);
            // 重置画布位置
            canvas.style.transform = 'translate(0px, 0px)';
            return;
        }
        
        // 计算衰减系数
        let factor = (shakeDuration - elapsed) / shakeDuration;
        let currentShake = shakeAmount * factor;
        
        // 随机偏移画布
        let offsetX = (Math.random() - 0.5) * currentShake * 2;
        let offsetY = (Math.random() - 0.5) * currentShake * 2;
        
        canvas.style.transform = `translate(${offsetX}px, ${offsetY}px)`;
    }, 16); // 约60fps
}

// 游戏结束
function gameOver() {
    console.log("游戏结束");
    gameRunning = false;
    
    // 显示最终得分
    finalScoreElement.textContent = score;
    
    // 显示游戏结束画面
    gameOverScreen.style.display = 'flex';
    gameOverScreen.style.opacity = '1';
    gameOverScreen.style.pointerEvents = 'auto';
    
    // 大爆炸效果
    shakeScreen();
}

// 显示难度选择界面
function showDifficultySelectScreen() {
    difficultySelectScreen.style.display = 'flex';
    difficultySelectScreen.style.opacity = '1';
    difficultySelectScreen.style.pointerEvents = 'auto';
}

// 隐藏难度选择界面
function hideDifficultySelectScreen() {
    difficultySelectScreen.style.opacity = '0';
    difficultySelectScreen.style.pointerEvents = 'none';
}

// 初始化难度选择界面的事件监听
function initDifficultySelection() {
    const difficultyOptions = document.querySelectorAll('.difficulty-option');
    
    difficultyOptions.forEach(option => {
        option.addEventListener('mouseover', function() {
            const diffValue = parseInt(this.getAttribute('data-difficulty'));
            updateDifficultyDescription(diffValue);
        });
        
        option.addEventListener('click', function() {
            // 移除其他按钮的选中状态
            difficultyOptions.forEach(opt => opt.classList.remove('selected'));
            
            // 为当前按钮添加选中状态
            this.classList.add('selected');
            
            // 保存所选难度
            selectedDifficulty = parseInt(this.getAttribute('data-difficulty'));
            
            // 延迟一小段时间后开始游戏，让用户看到选中效果
            setTimeout(() => {
                startGameWithSelectedDifficulty();
            }, 500);
        });
    });
}

// 显示等级提升动画
function showLevelUpAnimation(level) {
    if (levelUpAnimationActive) return;
    
    // 播放难度提升音效
    playSound('levelUp');
    
    levelUpAnimationActive = true;
    
    const difficultyElement = document.getElementById('difficultyLevel');
    difficultyElement.style.animation = 'levelUp 1s';
    
    // 创建等级提升通知
    const levelUpNotice = document.createElement('div');
    levelUpNotice.className = 'achievement-notification show';
    levelUpNotice.innerHTML = `
        <div class="achievement-icon">🏆</div>
        <div class="achievement-content">
            <div class="achievement-title">难度提升!</div>
            <div class="achievement-desc">当前难度: ${level}</div>
        </div>
    `;
    
    document.body.appendChild(levelUpNotice);
    
    // 一段时间后移除
    setTimeout(() => {
        levelUpNotice.classList.remove('show');
        setTimeout(() => {
            document.body.removeChild(levelUpNotice);
        }, 500);
        
        difficultyElement.style.animation = '';
        levelUpAnimationActive = false;
    }, 3000);
}

// 根据所选难度更新描述文本
function updateDifficultyDescription(diffValue) {
    let description = "";
    
    switch(diffValue) {
        case 0:
            description = "新手模式：适合初次游戏的玩家，敌人数量少，速度慢，游戏节奏轻松。";
            break;
        case 15:
            description = "简单模式：敌人数量适中，攻击频率低，适合休闲游戏。";
            break;
        case 40:
            description = "普通模式：标准游戏体验，敌人生命值和数量均衡，具有一定挑战性。";
            break;
        case 80:
            description = "困难模式：敌人数量增多，速度较快，需要一定的反应速度。";
            break;
        case 150:
            description = "专家模式：敌人生命值较高，攻击较为频繁，需要精准的操作。";
            break;
        case 250:
            description = "大师模式：挑战性较高，敌人数量较多且速度较快，适合有经验的玩家。";
            break;
        default:
            description = "选择游戏难度来开始游戏";
    }
    
    difficultyDescription.textContent = description;
}

// 使用选择的难度开始游戏
function startGameWithSelectedDifficulty() {
    if (selectedDifficulty !== null) {
        // 设置初始难度值
        difficulty = selectedDifficulty;
        
        // 隐藏难度选择界面
        hideDifficultySelectScreen();
        
        // 开始游戏
        startGame();
    }
}

// 初始化难度选择功能
initDifficultySelection();

// 页面加载完成后初始化画布大小
window.addEventListener('load', function() {
    // 初始化画布大小
    resizeCanvas();
    
    // 预先加载资源
    loadResources();
    
    // 初始化音频
    initAudio();
    
    // 初始化星空背景
    createStars();
    
    // 初始化虚拟摇杆（仅在移动设备上）
    if (isMobile) {
        initVirtualJoystick();
    }
    
    // 显示游戏就绪状态
    console.log("游戏初始化完成，等待开始");
    
    // 显示难度选择界面
    showDifficultySelectScreen();
});

// 事件监听
startButton.addEventListener('click', function() {
    console.log("点击了开始按钮");
    if (!gameRunning) {
        // 如果游戏未运行，显示难度选择界面
        showDifficultySelectScreen();
    } else {
        // 如果游戏已经在运行，直接重新开始游戏
        startGame();
    }
});

pauseButton.addEventListener('click', function() {
    console.log("点击了暂停按钮");
    togglePause();
});

// 重新开始按钮事件监听
restartButton.addEventListener('click', function() {
    console.log("点击了重新开始按钮");
    hideGameOverScreen();
    showDifficultySelectScreen();
});

// 创建爆炸效果
function createExplosion(x, y, size) {
    // 播放爆炸音效
    playSound('explosion');
    
    // 创建爆炸粒子
    const particleCount = Math.floor(size * 3); // 进一步增加粒子数量
    
    for (let i = 0; i < particleCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 6 + 3; // 增加粒子速度范围
        const particleSize = Math.random() * 6 + 2; // 增加粒子大小范围
        const lifetime = Math.random() * 50 + 40; // 增加粒子寿命
        
        particles.push({
            x: x,
            y: y,
            size: particleSize,
            speed: speed,
            angle: angle,
            color: getExplosionColor(),
            alpha: 1,
            lifetime: lifetime,
            currentLife: 0,
            rotation: Math.random() * Math.PI * 2,
            rotationSpeed: (Math.random() - 0.5) * 0.3 // 增加旋转速度
        });
    }
    
    // 创建爆炸冲击波 - 更大尺寸
    explosions.push({
        x: x,
        y: y,
        size: 0,
        maxSize: size * 3, // 进一步增加冲击波最大尺寸
        alpha: 0.8,
        growing: true,
        color: 'rgba(255, 200, 50, 0.8)'
    });
    
    // 添加第二个冲击波 - 不同颜色
    explosions.push({
        x: x,
        y: y,
        size: 0,
        maxSize: size * 2.2,
        alpha: 0.6,
        growing: true,
        color: 'rgba(255, 100, 50, 0.7)'
    });
    
    // 添加第三个冲击波 - 白色闪光
    explosions.push({
        x: x,
        y: y,
        size: 0,
        maxSize: size * 1.5,
        alpha: 0.9,
        growing: true,
        color: 'rgba(255, 255, 255, 0.9)'
    });
    
    // 屏幕震动效果 - 更敏感的震动触发和更强的震动效果
    if (size > 25) {
        const intensity = Math.min(1, size / 50); // 根据爆炸大小调整震动强度
        shakeScreen(intensity);
    }
}

// 获取爆炸颜色 - 更丰富的颜色选择
function getExplosionColor() {
    const colors = [
        '#ff0000', '#ff3300', '#ff5500', '#ff7700', 
        '#ff9900', '#ffaa00', '#ffcc00', '#ffff00', 
        '#ffffff', '#ffddaa', '#ffaaaa', '#ffee88',
        '#ff88aa', '#ff6633', '#ffcc77', '#ffffaa'
    ];
    return colors[Math.floor(Math.random() * colors.length)];
}

// 创建击中特效
function createHitEffect(x, y) {
    // 简单的击中特效
    const sparkCount = 5;
    
    for (let i = 0; i < sparkCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 2 + 1;
        
        particles.push({
            x: x,
            y: y,
            size: Math.random() * 3 + 1,
            speed: speed,
            angle: angle,
            color: '#ffffff',
            alpha: 1,
            lifetime: 10,
            currentLife: 0
        });
    }
}

// 绘制粒子系统 - 增强粒子效果
function drawParticles() {
    // 绘制粒子
    for (let i = 0; i < particles.length; i++) {
        const particle = particles[i];
        
        // 检查是否为浮动文本
        if (particle.text) {
            // 绘制浮动文本
            ctx.save();
            ctx.globalAlpha = particle.alpha;
            ctx.font = `bold ${particle.size}px Arial`;
            ctx.fillStyle = particle.color;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(particle.text, particle.x, particle.y - particle.currentLife * 0.5);
            ctx.restore();
            continue;
        }
        
        ctx.save();
        ctx.translate(particle.x, particle.y);
        ctx.rotate(particle.rotation);
        
        // 使用渐变色添加发光效果
        const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, particle.size * 1.5);
        gradient.addColorStop(0, 'rgba(255, 255, 255, ' + particle.alpha + ')');
        gradient.addColorStop(0.4, particle.color.replace(')', ', ' + particle.alpha + ')').replace('rgb', 'rgba'));
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = gradient;
        
        // 绘制粒子形状
        ctx.beginPath();
        
        // 根据粒子大小选择不同形状
        if (particle.size > 4) {
            // 星形粒子
            const spikes = Math.floor(particle.size / 2) + 3; // 根据大小动态调整尖角数量
            const outerRadius = particle.size;
            const innerRadius = particle.size / 2;
            
            for (let j = 0; j < spikes * 2; j++) {
                const radius = j % 2 === 0 ? outerRadius : innerRadius;
                const angle = (Math.PI * 2 / (spikes * 2)) * j;
                const x = Math.cos(angle) * radius;
                const y = Math.sin(angle) * radius;
                
                if (j === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }
            }
            ctx.closePath();
        } else {
            // 圆形粒子
            ctx.arc(0, 0, particle.size, 0, Math.PI * 2);
        }
        
        ctx.fill();
        
        // 添加边缘发光效果
        if (particle.size > 3) {
            ctx.strokeStyle = 'rgba(255, 255, 255, ' + particle.alpha * 0.5 + ')';
            ctx.lineWidth = 1;
            ctx.stroke();
        }
        
        // 更新粒子旋转
        particle.rotation += particle.rotationSpeed;
        
        ctx.restore();
    }
    
    // 绘制爆炸冲击波
    for (let i = 0; i < explosions.length; i++) {
        const explosion = explosions[i];
        
        // 使用渐变色绘制冲击波
        const gradient = ctx.createRadialGradient(
            explosion.x, explosion.y, explosion.size * 0.5,
            explosion.x, explosion.y, explosion.size
        );
        gradient.addColorStop(0, 'rgba(255, 255, 255, 0)');
        gradient.addColorStop(0.5, explosion.color || 'rgba(255, 200, 50, ' + explosion.alpha + ')');
        gradient.addColorStop(1, 'rgba(255, 100, 0, 0)');
        
        ctx.strokeStyle = gradient;
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.arc(explosion.x, explosion.y, explosion.size, 0, Math.PI * 2);
        ctx.stroke();
        
        // 添加发光效果
        ctx.fillStyle = 'rgba(255, 200, 100, ' + explosion.alpha * 0.2 + ')';
        ctx.beginPath();
        ctx.arc(explosion.x, explosion.y, explosion.size * 0.7, 0, Math.PI * 2);
        ctx.fill();
    }
    
    // 重置全局透明度
    ctx.globalAlpha = 1;
}

// 更新粒子系统
function updateParticles() {
    // 更新粒子
    for (let i = particles.length - 1; i >= 0; i--) {
        const particle = particles[i];
        
        // 浮动文本的特殊处理
        if (particle.text) {
            // 更新生命周期
            particle.currentLife++;
            
            // 减少透明度
            particle.alpha = 1 - (particle.currentLife / particle.lifetime);
            
            // 移除过期文本
            if (particle.currentLife >= particle.lifetime || particle.alpha <= 0) {
                particles.splice(i, 1);
            }
            continue;
        }
        
        // 更新位置
        particle.x += Math.cos(particle.angle) * particle.speed;
        particle.y += Math.sin(particle.angle) * particle.speed;
        
        // 增加生命周期
        particle.currentLife++;
        
        // 减少速度
        particle.speed *= 0.97;
        
        // 减少大小
        if (particle.currentLife > particle.lifetime * 0.7) {
            particle.size *= 0.95;
        }
        
        // 减少透明度
        particle.alpha = 1 - (particle.currentLife / particle.lifetime);
        
        // 移除死亡粒子
        if (particle.currentLife >= particle.lifetime || particle.size < 0.5) {
            particles.splice(i, 1);
        }
    }
    
    // 更新爆炸冲击波
    for (let i = explosions.length - 1; i >= 0; i--) {
        const explosion = explosions[i];
        
        if (explosion.growing) {
            explosion.size += 8;
            if (explosion.size >= explosion.maxSize) {
                explosion.growing = false;
            }
        } else {
            explosion.alpha -= 0.03;
            if (explosion.alpha <= 0) {
                explosions.splice(i, 1);
            }
        }
    }
}

// 创建道具音效
function createPowerupSound() {
    if (!audioContext) return null;
    
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(300, audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(1200, audioContext.currentTime + 0.1);
    oscillator.frequency.exponentialRampToValueAtTime(600, audioContext.currentTime + 0.2);
    
    gainNode.gain.setValueAtTime(0.01, audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.2, audioContext.currentTime + 0.05);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.2);
    
    return { oscillator, gainNode };
}

// 创建特殊武器音效
function createSpecialWeaponSound() {
    if (!audioContext) return null;
    
    const oscillator = audioContext.createOscillator();
    const oscillator2 = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.type = 'square';
    oscillator.frequency.setValueAtTime(200, audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(600, audioContext.currentTime + 0.15);
    
    oscillator2.type = 'sawtooth';
    oscillator2.frequency.setValueAtTime(400, audioContext.currentTime);
    oscillator2.frequency.exponentialRampToValueAtTime(800, audioContext.currentTime + 0.1);
    
    gainNode.gain.setValueAtTime(0.01, audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.2, audioContext.currentTime + 0.05);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
    
    oscillator.connect(gainNode);
    oscillator2.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.start();
    oscillator2.start();
    oscillator.stop(audioContext.currentTime + 0.3);
    oscillator2.stop(audioContext.currentTime + 0.3);
    
    return { oscillator, oscillator2, gainNode };
}

// 创建成就音效
function createAchievementSound() {
    if (!audioContext) return null;
    
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(400, audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(600, audioContext.currentTime + 0.1);
    oscillator.frequency.exponentialRampToValueAtTime(800, audioContext.currentTime + 0.2);
    oscillator.frequency.exponentialRampToValueAtTime(1000, audioContext.currentTime + 0.3);
    
    gainNode.gain.setValueAtTime(0.01, audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.1);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.4);
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.4);
    
    return { oscillator, gainNode };
}

// 查找最近的敌机
function findNearestEnemy(x, y) {
    if (enemies.length === 0) return null;
    
    let nearestEnemy = null;
    let shortestDistance = Infinity;
    
    for (let i = 0; i < enemies.length; i++) {
        const enemy = enemies[i];
        const dx = enemy.x + enemy.width/2 - x;
        const dy = enemy.y + enemy.height/2 - y;
        const distance = Math.sqrt(dx*dx + dy*dy);
        
        if (distance < shortestDistance) {
            shortestDistance = distance;
            nearestEnemy = enemy;
        }
    }
    
    return nearestEnemy;
}

// 创建追踪子弹音效
function createHomingSoundEffect() {
    if (!audioContext) return null;
    
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(600, audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(1000, audioContext.currentTime + 0.15);
    oscillator.frequency.exponentialRampToValueAtTime(400, audioContext.currentTime + 0.3);
    
    gainNode.gain.setValueAtTime(0.01, audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.2, audioContext.currentTime + 0.1);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.3);
    
    return { oscillator, gainNode };
}

// 初始化虚拟摇杆
function initVirtualJoystick() {
    console.log("初始化虚拟摇杆");
    
    // 向HTML中添加跨游戏提示
    const gameTips = document.querySelector('.game-tips');
    gameTips.textContent = "拖动左侧虚拟摇杆移动飞机，点击右侧按钮射击";
    
    // 显示虚拟控制
    if (isMobile) {
        virtualControls.style.display = 'block';
    }
    
    // 更新摇杆位置
    updateJoystickPosition();
    
    // 设置发射按钮点击事件（用于非触屏设备测试）
    fireButton.addEventListener('click', function() {
        if (gameRunning && !gamePaused) {
            fireBullet();
        }
    });
    
    // 监听窗口大小变化
    window.addEventListener('resize', updateJoystickPosition);
    
    // 添加触摸事件处理
    setupTouchEvents();
}

// 更新摇杆位置
function updateJoystickPosition() {
    // 获取摇杆容器位置
    const baseRect = joystickBase.getBoundingClientRect();
    joystickCenter = {
        x: baseRect.left + baseRect.width / 2,
        y: baseRect.top + baseRect.height / 2
    };
    
    // 重置摇杆手柄位置
    joystickHandle.style.left = '50%';
    joystickHandle.style.top = '50%';
}

// 设置触摸事件
function setupTouchEvents() {
    // 摇杆触摸事件
    joystickBase.addEventListener('touchstart', handleJoystickStart, false);
    document.addEventListener('touchmove', handleJoystickMove, { passive: false });
    document.addEventListener('touchend', handleJoystickEnd, false);
    document.addEventListener('touchcancel', handleJoystickEnd, false);
    
    // 发射按钮触摸事件
    fireButton.addEventListener('touchstart', handleFireButtonTouch, false);
    fireButton.addEventListener('touchend', handleFireButtonEnd, false);
    
    // 阻止页面滚动
    document.addEventListener('touchmove', function(e) {
        if (gameRunning) {
            e.preventDefault();
        }
    }, { passive: false });
    
    // 阻止双击缩放
    document.addEventListener('dblclick', function(e) {
        e.preventDefault();
    }, { passive: false });
    
    console.log("触摸事件已设置");
}

// 处理摇杆触摸开始
function handleJoystickStart(e) {
    if (!gameRunning || gamePaused) return;
    
    e.preventDefault();
    joystickActive = true;
    joystickTouchId = e.changedTouches[0].identifier;
    
    // 获取基础位置
    const baseRect = joystickBase.getBoundingClientRect();
    joystickCenter = {
        x: baseRect.left + baseRect.width / 2,
        y: baseRect.top + baseRect.height / 2
    };
    
    // 初始移动
    handleJoystickMove(e);
}

// 处理摇杆触摸移动
function handleJoystickMove(e) {
    if (!joystickActive || !gameRunning || gamePaused) return;
    
    e.preventDefault();
    
    // 寻找匹配的触摸点
    let touch = null;
    for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === joystickTouchId) {
            touch = e.changedTouches[i];
            break;
        }
    }
    
    if (!touch) return;
    
    // 计算与摇杆中心的距离和角度
    const dx = touch.clientX - joystickCenter.x;
    const dy = touch.clientY - joystickCenter.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // 摇杆移动范围限制
    const maxDistance = joystickBase.clientWidth / 2 - joystickHandle.clientWidth / 2;
    const limitedDistance = Math.min(distance, maxDistance);
    const angle = Math.atan2(dy, dx);
    
    // 计算摇杆手柄位置
    const moveX = Math.cos(angle) * limitedDistance;
    const moveY = Math.sin(angle) * limitedDistance;
    
    // 设置摇杆手柄位置
    joystickHandle.style.transform = `translate(${moveX}px, ${moveY}px)`;
    
    // 计算移动值（-1到1范围）
    const moveRatioX = moveX / maxDistance;
    const moveRatioY = moveY / maxDistance;
    
    // 应用到玩家位置
    const moveSpeed = player.speed * 1.5; // 让移动更平滑
    player.x = Math.max(0, Math.min(canvas.width - player.width, 
                         player.x + moveRatioX * moveSpeed));
    player.y = Math.max(0, Math.min(canvas.height - player.height, 
                         player.y + moveRatioY * moveSpeed));
}

// 处理摇杆触摸结束
function handleJoystickEnd(e) {
    // 寻找匹配的触摸点
    for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === joystickTouchId) {
            joystickActive = false;
            joystickTouchId = null;
            
            // 重置摇杆手柄位置
            joystickHandle.style.transform = 'translate(0, 0)';
            break;
        }
    }
}

// 处理发射按钮触摸
function handleFireButtonTouch(e) {
    if (!gameRunning || gamePaused) return;
    
    e.preventDefault();
    fireButtonActive = true;
    fireButtonTouchId = e.changedTouches[0].identifier;
    
    // 添加按钮按下样式
    fireButton.classList.add('active');
    
    // 发射子弹
    fireBullet();
    
    // 如果不是自动攻击模式，设置连续发射
    if (!autoAttack) {
        if (fireInterval) clearInterval(fireInterval);
        fireInterval = setInterval(function() {
            if (fireButtonActive && gameRunning && !gamePaused) {
                fireBullet();
            } else {
                clearInterval(fireInterval);
                fireInterval = null;
            }
        }, 200);
    }
}

// 处理发射按钮触摸结束
function handleFireButtonEnd(e) {
    // 寻找匹配的触摸点
    for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === fireButtonTouchId) {
            fireButtonActive = false;
            fireButtonTouchId = null;
            
            // 移除按钮按下样式
            fireButton.classList.remove('active');
            
            // 清除连续发射定时器
            if (fireInterval) {
                clearInterval(fireInterval);
                fireInterval = null;
            }
            break;
        }
    }
}

// 设置发射连续定时器
let fireInterval = null;

// ... existing code ...

// 页面加载完成后初始化画布大小
window.addEventListener('load', function() {
    // 初始化画布大小
    resizeCanvas();
    
    // 预先加载资源
    loadResources();
    
    // 初始化音频
    initAudio();
    
    // 初始化星空背景
    createStars();
    
    // 初始化虚拟摇杆（仅在移动设备上）
    if (isMobile) {
        initVirtualJoystick();
    }
    
    // 显示游戏就绪状态
    console.log("游戏初始化完成，等待开始");
    
    // 显示难度选择界面
    showDifficultySelectScreen();
});

// ... existing code ... 