// 获取游戏元素
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const startButton = document.getElementById('startButton');
const pauseButton = document.getElementById('pauseButton');
const scoreElement = document.getElementById('score');
const livesElement = document.getElementById('lives');
const fpsElement = document.getElementById('fps');
const killCountElement = document.getElementById('killCount');

// 设置画布尺寸
canvas.width = 480;
canvas.height = 600;

// 游戏状态
let gameRunning = false;
let gamePaused = false;
let score = 0;
let lives = 3;
let animationId;
let gameTime = 0;
let lastTime = 0;
let killCount = 0;
let frameCount = 0;
let lastFpsTime = 0;
let fps = 0;

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
    speed: 5,
    color: '#3498db',
    trailTimer: 0
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
    achievement: null
};

// 添加音量控制
let soundEnabled = true;
let audioContext = null;

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

// 生成爆炸音效
function createExplosionSound() {
    if (!audioContext) return null;
    
    const noiseLength = 0.5;
    const bufferSize = audioContext.sampleRate * noiseLength;
    const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
    const data = buffer.getChannelData(0);
    
    // 填充白噪声数据
    for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
    }
    
    // 创建噪声播放源
    const noise = audioContext.createBufferSource();
    noise.buffer = buffer;
    
    // 创建低通滤波器，让爆炸声更浑厚
    const filter = audioContext.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 200;
    filter.frequency.exponentialRampToValueAtTime(50, audioContext.currentTime + noiseLength);
    
    // 音量控制节点
    const gainNode = audioContext.createGain();
    gainNode.gain.setValueAtTime(0.7, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + noiseLength);
    
    // 连接节点
    noise.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    // 开始播放
    noise.start();
    noise.stop(audioContext.currentTime + noiseLength);
    
    return { noise, gainNode, filter };
}

// 生成道具音效
function createPowerupSound() {
    if (!audioContext) return null;
    
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(300, audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(600, audioContext.currentTime + 0.1);
    
    gainNode.gain.setValueAtTime(0.5, audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.2);
    
    return { oscillator, gainNode };
}

// 生成护盾音效
function createShieldSound() {
    if (!audioContext) return null;
    
    const oscillator = audioContext.createOscillator();
    const oscillator2 = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(200, audioContext.currentTime);
    oscillator.frequency.linearRampToValueAtTime(400, audioContext.currentTime + 0.3);
    
    oscillator2.type = 'sine';
    oscillator2.frequency.setValueAtTime(300, audioContext.currentTime);
    oscillator2.frequency.linearRampToValueAtTime(600, audioContext.currentTime + 0.3);
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
    
    oscillator.connect(gainNode);
    oscillator2.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.start();
    oscillator2.start();
    oscillator.stop(audioContext.currentTime + 0.3);
    oscillator2.stop(audioContext.currentTime + 0.3);
    
    return { oscillator, oscillator2, gainNode };
}

// 生成炸弹音效
function createBombSound() {
    if (!audioContext) return null;
    
    const noiseLength = 1.0;
    const bufferSize = audioContext.sampleRate * noiseLength;
    const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
    const data = buffer.getChannelData(0);
    
    // 填充白噪声数据
    for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
    }
    
    // 创建噪声播放源
    const noise = audioContext.createBufferSource();
    noise.buffer = buffer;
    
    // 创建低通滤波器
    const filter = audioContext.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(800, audioContext.currentTime);
    filter.frequency.exponentialRampToValueAtTime(80, audioContext.currentTime + noiseLength);
    
    // 音量控制节点
    const gainNode = audioContext.createGain();
    gainNode.gain.setValueAtTime(1.0, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + noiseLength);
    
    // 连接节点
    noise.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    // 开始播放
    noise.start();
    noise.stop(audioContext.currentTime + noiseLength);
    
    return { noise, gainNode, filter };
}

// 生成受击音效
function createHitSound() {
    if (!audioContext) return null;
    
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.type = 'sawtooth';
    oscillator.frequency.setValueAtTime(150, audioContext.currentTime);
    oscillator.frequency.linearRampToValueAtTime(50, audioContext.currentTime + 0.2);
    
    gainNode.gain.setValueAtTime(0.6, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.2);
    
    return { oscillator, gainNode };
}

// 生成升级音效
function createLevelUpSound() {
    if (!audioContext) return null;
    
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(300, audioContext.currentTime);
    oscillator.frequency.linearRampToValueAtTime(500, audioContext.currentTime + 0.1);
    oscillator.frequency.linearRampToValueAtTime(700, audioContext.currentTime + 0.2);
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.6, audioContext.currentTime + 0.1);
    gainNode.gain.linearRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.3);
    
    return { oscillator, gainNode };
}

// 生成成就音效
function createAchievementSound() {
    if (!audioContext) return null;
    
    const oscillator1 = audioContext.createOscillator();
    const oscillator2 = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator1.type = 'sine';
    oscillator1.frequency.setValueAtTime(400, audioContext.currentTime);
    oscillator1.frequency.linearRampToValueAtTime(600, audioContext.currentTime + 0.1);
    
    oscillator2.type = 'sine';
    oscillator2.frequency.setValueAtTime(500, audioContext.currentTime + 0.1);
    oscillator2.frequency.linearRampToValueAtTime(800, audioContext.currentTime + 0.2);
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.6, audioContext.currentTime + 0.1);
    gainNode.gain.linearRampToValueAtTime(0.01, audioContext.currentTime + 0.4);
    
    oscillator1.connect(gainNode);
    oscillator2.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator1.start();
    oscillator2.start(audioContext.currentTime + 0.1);
    oscillator1.stop(audioContext.currentTime + 0.2);
    oscillator2.stop(audioContext.currentTime + 0.4);
    
    return { oscillator1, oscillator2, gainNode };
}

// 播放音效的函数
function playSound(sound) {
    if (!soundEnabled || !audioContext) return;
    
    // 添加视觉反馈
    const soundButton = document.getElementById('toggleSound');
    soundButton.classList.add('sound-playing');
    
    // 移除动画类以便可以重新触发
    setTimeout(() => {
        soundButton.classList.remove('sound-playing');
    }, 700);
    
    // 根据音效类型生成声音
    switch (sound) {
        case 'shoot':
            createShootSound();
            break;
        case 'explosion':
            createExplosionSound();
            break;
        case 'powerup':
            createPowerupSound();
            break;
        case 'shield':
            createShieldSound();
            break;
        case 'bomb':
            createBombSound();
            break;
        case 'hit':
            createHitSound();
            break;
        case 'levelUp':
            createLevelUpSound();
            break;
        case 'achievement':
            createAchievementSound();
            break;
        case 'gameOver':
            // 游戏结束音效（组合多个声音）
            createExplosionSound();
            setTimeout(() => createHitSound(), 300);
            break;
    }
}

// 停止指定音效 (用于旧的Audio接口)
function stopSound(sound) {
    // 由于我们使用AudioContext生成即时声音，这里不需要实现
}

// 添加用户交互音频解锁
function unlockAudio() {
    if (audioContext) {
        // 创建一个临时的空白音频节点，触发音频系统
        const buffer = audioContext.createBuffer(1, 1, 22050);
        const source = audioContext.createBufferSource();
        source.buffer = buffer;
        source.connect(audioContext.destination);
        source.start(0);
        console.log("音频系统已解锁");
    }
}

// 添加音频加载状态管理
let audioLoaded = false;
const audioLoadingMessage = document.getElementById('audioLoadingMessage');

// 修改初始化页面加载函数
window.addEventListener('load', function() {
    console.log("页面加载完成");
    createStars();
    draw();
    
    // 初始化音频系统
    initAudio();
    
    // 添加音频切换按钮的监听
    document.getElementById('toggleSound').addEventListener('click', function() {
        soundEnabled = !soundEnabled;
        this.textContent = soundEnabled ? '🔊' : '🔇';
        
        if (soundEnabled) {
            unlockAudio();
            playSound('powerup');
        }
    });
    
    // 用户交互时解锁音频
    document.addEventListener('click', unlockAudio, { once: true });
});

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
    SPECIAL: 5      // 特殊武器
};

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

// 在游戏状态部分添加新的难度变量
let difficulty = 0; // 初始难度值
let gameStartTime = 0; // 游戏开始时间
let gameElapsedTime = 0; // 游戏已进行时间（秒）

// 全局变量部分添加
const hitFlashElement = document.getElementById('hitFlash');
const gameOverScreen = document.getElementById('gameOverScreen');
const finalScoreElement = document.getElementById('finalScore');
const restartButton = document.getElementById('restartButton');
const radarContainer = document.getElementById('radar');
let radarDots = [];
let levelUpAnimationActive = false;
let explosionElements = [];
let lastDifficultyLevel = "";

// 加载图像和音效
function loadResources() {
    // 暂时使用现有代码，后续可扩展图像加载
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

// 创建粒子
function createParticle(x, y, color, speedModifier = 1) {
    return {
        x,
        y,
        size: Math.random() * 5 + 2,
        color,
        speedX: (Math.random() - 0.5) * (3 * speedModifier),
        speedY: (Math.random() - 0.5) * (3 * speedModifier),
        life: Math.random() * 40 + 40,
        maxLife: Math.random() * 40 + 40,
        rotation: Math.random() * Math.PI * 2
    };
}

// 创建爆炸效果
function createExplosion(x, y, color, amount) {
    // 创建标准的粒子爆炸效果
    const explosion = {
        particles: [],
        x,
        y,
        time: 0
    };
    
    for (let i = 0; i < amount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 5 + 2;
        explosion.particles.push({
            x: 0,
            y: 0,
            speedX: Math.cos(angle) * speed,
            speedY: Math.sin(angle) * speed,
            size: Math.random() * 4 + 2,
            color,
            life: Math.random() * 30 + 20,
            maxLife: Math.random() * 30 + 20,
            rotation: Math.random() * Math.PI * 2
        });
    }
    
    explosions.push(explosion);
    
    // 为大型爆炸添加DOM视觉效果
    if (amount > 20) {
        // 获取画布相对于视口的位置
        const canvasBounds = canvas.getBoundingClientRect();
        const explosionX = canvasBounds.left + x;
        const explosionY = canvasBounds.top + y;
        
        // 创建DOM爆炸效果
        createDOMExplosion(x, y, amount * 2, color);
        
        // 添加屏幕震动效果
        if (amount > 50) {
            shakeScreen();
        }
    }
}

// 更新粒子
function updateParticles() {
    // 玩家飞机尾焰粒子
    player.trailTimer++;
    if (player.trailTimer >= 2) {
        player.trailTimer = 0;
        for (let i = 0; i < 2; i++) {
            const particle = createParticle(
                player.x + player.width / 2 - 5 + Math.random() * 10,
                player.y + player.height - 5,
                `hsl(${Math.random() * 60 + 180}, 100%, 50%)`,
                0.5
            );
            particle.speedX = (Math.random() - 0.5) * 1;
            particle.speedY = Math.random() * 2 + 1;
            particles.push(particle);
        }
    }
    
    // 更新现有粒子
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.speedX;
        p.y += p.speedY;
        p.life--;
        p.size *= 0.97;
        
        if (p.life <= 0 || p.size < 0.5) {
            particles.splice(i, 1);
        }
    }
    
    // 更新爆炸效果
    for (let i = explosions.length - 1; i >= 0; i--) {
        const exp = explosions[i];
        exp.time++;
        
        for (let j = 0; j < exp.particles.length; j++) {
            const p = exp.particles[j];
            p.x += p.speedX;
            p.y += p.speedY;
            p.life--;
            p.size *= 0.96;
            p.speedX *= 0.98;
            p.speedY *= 0.98;
        }
        
        // 移除完成的爆炸
        if (exp.time > 50) {
            explosions.splice(i, 1);
        }
    }
    
    // 子弹射击粒子
    bullets.forEach(bullet => {
        if (Math.random() < 0.2) {
            const particle = createParticle(
                bullet.x + bullet.width / 2,
                bullet.y + bullet.height,
                `hsl(${Math.random() * 60 + 100}, 100%, 70%)`,
                0.3
            );
            particle.speedX = (Math.random() - 0.5) * 0.5;
            particle.speedY = Math.random() * 1;
            particle.life = 10 + Math.random() * 10;
            particles.push(particle);
        }
    });
}

// 绘制粒子
function drawParticles() {
    // 绘制普通粒子
    particles.forEach(p => {
        ctx.save();
        ctx.globalAlpha = p.life / p.maxLife;
        ctx.fillStyle = p.color;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        ctx.restore();
    });
    
    // 绘制爆炸效果
    explosions.forEach(exp => {
        exp.particles.forEach(p => {
            ctx.save();
            ctx.globalAlpha = p.life / p.maxLife;
            ctx.fillStyle = p.color;
            ctx.translate(exp.x + p.x, exp.y + p.y);
            ctx.rotate(p.rotation);
            ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
            ctx.restore();
        });
    });
}

// 更新FPS计数器
function updateFPS(time) {
    if (!lastFpsTime) {
        lastFpsTime = time;
        fps = 0;
        return;
    }
    
    const delta = time - lastFpsTime;
    frameCount++;
    
    if (delta >= 1000) {
        fps = Math.round((frameCount * 1000) / delta);
        frameCount = 0;
        lastFpsTime = time;
        fpsElement.textContent = `FPS: ${fps}`;
    }
}

// 初始化游戏
function init() {
    score = 0;
    lives = 3;
    killCount = 0;
    enemies = [];
    bullets = [];
    particles = [];
    explosions = [];
    powerups = [];
    comboCount = 0;
    comboTimer = 0;
    comboMultiplier = 1;
    specialWeaponCooldown = 0;
    shieldActive = false;
    shieldTime = 0;
    difficulty = 0; // 重置难度
    gameTime = 0;
    gameStartTime = performance.now();
    gameElapsedTime = 0;
    lastTime = performance.now();
    
    // 初始化成就
    achievements = JSON.parse(JSON.stringify(ACHIEVEMENTS));
    
    scoreElement.textContent = score;
    livesElement.textContent = lives;
    killCountElement.textContent = `击毁: 0`;
    document.getElementById('gameTime').textContent = "00:00";
    player.x = canvas.width / 2 - 25;
    player.y = canvas.height - 60;
    
    createStars();
    
    // 重置动画相关
    radarDots = [];
    explosionElements = [];
    updateRadar();
    clearExplosions();
    hideGameOverScreen();
}

// 生成敌机
function spawnEnemy() {
    // 基于当前难度计算敌机的尺寸 (难度越高尺寸越小，更难命中)
    const baseSize = 40 - (difficulty * 0.5);
    const size = Math.max(25, baseSize + Math.random() * 20);
    
    const enemyType = Math.floor(Math.random() * 3);  // 0, 1, 2 三种敌机类型
    
    let color, health;
    
    switch(enemyType) {
        case 0: // 轻型战机
            color = '#8a2be2';
            // 初始生命值为1，随难度缓慢增加
            health = 1 + Math.floor(difficulty / 120);
            break;
        case 1: // 中型战机
            color = '#e74c3c';
            // 初始生命值为1，随难度略快增加
            health = 1 + Math.floor(difficulty / 100);
            break;
        case 2: // 重型战机
            color = '#c0392b';
            // 初始生命值为2，随难度更快增加
            health = 2 + Math.floor(difficulty / 80);
            break;
    }
    
    // 根据难度调整敌机速度
    const baseSpeed = 1 + (difficulty / 300);
    const randomSpeed = Math.random() * 1.5;
    
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
        scoreValue: 10 + Math.floor(difficulty / 60) // 随难度增加分数价值
    };
    enemies.push(enemy);
}

// 生成子弹
function fireBullet() {
    if (score < 100) {
        // 初始阶段 - 单发普通子弹
        const bullet = {
            x: player.x + player.width / 2 - 5,
            y: player.y,
            width: 10,
            height: 20,
            speed: 7,
            color: '#2ecc71',
            power: 1,
            type: 'normal'
        };
        bullets.push(bullet);
    } else if (score < 300) {
        // 中期 - 三发子弹
        // 中间主弹
        bullets.push({
            x: player.x + player.width / 2 - 5,
            y: player.y,
            width: 10,
            height: 20,
            speed: 7,
            color: '#2ecc71',
            power: 1,
            type: 'normal'
        });
        
        // 左侧子弹
        bullets.push({
            x: player.x + player.width / 2 - 20,
            y: player.y + 10,
            width: 8,
            height: 15,
            speed: 6.5,
            color: '#2ecc71',
            power: 1,
            type: 'side'
        });
        
        // 右侧子弹
        bullets.push({
            x: player.x + player.width / 2 + 12,
            y: player.y + 10,
            width: 8,
            height: 15,
            speed: 6.5,
            color: '#2ecc71',
            power: 1,
            type: 'side'
        });
    } else if (score < 600) {
        // 高级阶段 - 五发配置
        // 中间主弹
        bullets.push({
            x: player.x + player.width / 2 - 5,
            y: player.y - 5,
            width: 10,
            height: 20,
            speed: 8,
            color: '#3498db',
            power: 2,
            type: 'normal'
        });
        
        // 左右两侧子弹
        bullets.push({
            x: player.x + player.width / 2 - 20,
            y: player.y + 10,
            width: 8,
            height: 15,
            speed: 7,
            color: '#2ecc71',
            power: 1,
            type: 'side'
        });
        
        bullets.push({
            x: player.x + player.width / 2 + 12,
            y: player.y + 10,
            width: 8,
            height: 15,
            speed: 7,
            color: '#2ecc71',
            power: 1,
            type: 'side'
        });
        
        // 外侧跟踪弹
        bullets.push({
            x: player.x + player.width / 2 - 30,
            y: player.y + 15,
            width: 6,
            height: 12,
            speed: 6,
            color: '#e67e22',
            power: 1,
            type: 'homing',
            angle: -0.2
        });
        
        bullets.push({
            x: player.x + player.width / 2 + 24,
            y: player.y + 15,
            width: 6,
            height: 12,
            speed: 6,
            color: '#e67e22',
            power: 1,
            type: 'homing',
            angle: 0.2
        });
    } else {
        // 精英阶段 - 歼20全火力
        // 中间主弹 - 激光
        bullets.push({
            x: player.x + player.width / 2 - 2,
            y: player.y - 15,
            width: 4,
            height: 30,
            speed: 12,
            color: '#9b59b6',
            power: 3,
            type: 'laser'
        });
        
        // 机翼弹
        bullets.push({
            x: player.x + player.width / 2 - 22,
            y: player.y,
            width: 8,
            height: 16,
            speed: 8,
            color: '#3498db',
            power: 2,
            type: 'normal'
        });
        
        bullets.push({
            x: player.x + player.width / 2 + 14,
            y: player.y,
            width: 8,
            height: 16,
            speed: 8,
            color: '#3498db',
            power: 2,
            type: 'normal'
        });
        
        // 跟踪导弹
        bullets.push({
            x: player.x + player.width / 2 - 35,
            y: player.y + 10,
            width: 8,
            height: 14,
            speed: 5,
            color: '#e74c3c',
            power: 2,
            type: 'missile',
            angle: -0.1,
            tracking: true
        });
        
        bullets.push({
            x: player.x + player.width / 2 + 27,
            y: player.y + 10,
            width: 8,
            height: 14,
            speed: 5,
            color: '#e74c3c',
            power: 2,
            type: 'missile',
            angle: 0.1,
            tracking: true
        });
    }
    
    // 创建发射粒子效果
    for (let i = 0; i < 10; i++) {
        const particle = createParticle(
            player.x + player.width / 2,
            player.y,
            `hsl(${Math.random() * 60 + 100}, 100%, 70%)`,
            1
        );
        particle.speedY = -Math.random() * 2 - 1;
        particles.push(particle);
    }
    
    // 添加射击音效
    playSound('shoot');
}

// 更新游戏状态
function update(time) {
    // 计算增量时间
    const deltaTime = time - lastTime;
    lastTime = time;
    gameTime += deltaTime;
    
    // 更新游戏已进行时间（秒）
    gameElapsedTime = Math.floor((gameTime) / 1000);
    
    // 更新游戏时间显示
    const minutes = Math.floor(gameElapsedTime / 60);
    const seconds = gameElapsedTime % 60;
    const timeStr = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    document.getElementById('gameTime').textContent = timeStr;
    
    // 计算难度值 - 随时间缓慢增加
    // 每30秒增加难度值30，但开始的1分钟内难度增加较慢
    if (gameElapsedTime < 60) {
        difficulty = gameElapsedTime * 0.5; // 前1分钟缓慢增加
    } else {
        difficulty = 30 + (gameElapsedTime - 60) * 1; // 之后每秒增加1点难度
    }
    
    // 更新难度级别显示
    updateDifficultyLevel();
    
    // 更新FPS
    updateFPS(time);
    
    // 移动玩家
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

    // 移动子弹
    for (let bulletIndex = bullets.length - 1; bulletIndex >= 0; bulletIndex--) {
        const bullet = bullets[bulletIndex];
        
        // 根据子弹类型更新位置
        switch (bullet.type) {
            case 'normal':
                bullet.y -= bullet.speed;
                break;
                
            case 'side':
                bullet.y -= bullet.speed;
                bullet.x += Math.sin((bullet.y) * 0.05) * 2;
                break;
                
            case 'homing':
                // 简单的跟踪逻辑
                bullet.y -= bullet.speed * Math.cos(bullet.angle);
                bullet.x += bullet.speed * Math.sin(bullet.angle);
                
                // 轻微矫正角度
                if (bullet.angle > 0) {
                    bullet.angle = Math.max(bullet.angle - 0.01, 0);
                } else if (bullet.angle < 0) {
                    bullet.angle = Math.min(bullet.angle + 0.01, 0);
                }
                break;
                
            case 'laser':
                bullet.y -= bullet.speed;
                // 激光效果 - 拉长
                bullet.height += 1;
                break;
                
            case 'missile':
                bullet.y -= bullet.speed * Math.cos(bullet.angle);
                bullet.x += bullet.speed * Math.sin(bullet.angle);
                
                // 如果有敌人，尝试跟踪最近的敌人
                if (bullet.tracking && enemies.length > 0) {
                    // 寻找最近的敌人
                    let closestEnemy = null;
                    let minDist = Infinity;
                    
                    for (const enemy of enemies) {
                        const dx = enemy.x + enemy.width/2 - bullet.x;
                        const dy = enemy.y + enemy.height/2 - bullet.y;
                        const dist = Math.sqrt(dx * dx + dy * dy);
                        
                        if (dist < minDist) {
                            minDist = dist;
                            closestEnemy = enemy;
                        }
                    }
                    
                    // 如果有敌人且在一定范围内，调整导弹方向
                    if (closestEnemy && minDist < 300) {
                        const dx = closestEnemy.x + closestEnemy.width/2 - bullet.x;
                        const dy = closestEnemy.y + closestEnemy.height/2 - bullet.y;
                        const targetAngle = Math.atan2(dx, -dy);
                        
                        // 缓慢调整导弹角度朝向目标
                        const angleDiff = targetAngle - bullet.angle;
                        
                        // 归一化角度差
                        const normAngleDiff = Math.atan2(Math.sin(angleDiff), Math.cos(angleDiff));
                        
                        // 调整导弹角度
                        bullet.angle += normAngleDiff * 0.05;
                    }
                }
                break;
        }
        
        // 移除超出屏幕的子弹
        if (bullet.y < -bullet.height || 
            bullet.x < -bullet.width || 
            bullet.x > canvas.width + bullet.width) {
            bullets.splice(bulletIndex, 1);
        }
    }

    // 移动敌机
    for (let enemyIndex = enemies.length - 1; enemyIndex >= 0; enemyIndex--) {
        const enemy = enemies[enemyIndex];
        enemy.y += enemy.speed;
        enemy.rotation += enemy.rotationSpeed;
        
        // 检测敌机与子弹碰撞
        for (let bulletIndex = bullets.length - 1; bulletIndex >= 0; bulletIndex--) {
            const bullet = bullets[bulletIndex];
            if (
                bullet.x < enemy.x + enemy.width &&
                bullet.x + bullet.width > enemy.x &&
                bullet.y < enemy.y + enemy.height &&
                bullet.y + bullet.height > enemy.y
            ) {
                // 击中敌机，减少敌机生命值
                enemy.health -= bullet.power;
                
                // 创建击中效果
                for (let i = 0; i < 5; i++) {
                    const particle = createParticle(
                        bullet.x + bullet.width / 2,
                        bullet.y,
                        enemy.color,
                        1.5
                    );
                    particles.push(particle);
                }
                
                // 移除子弹
                bullets.splice(bulletIndex, 1);
                
                // 敌机被摧毁
                if (enemy.health <= 0) {
                    enemies.splice(enemyIndex, 1);
                    
                    // 播放爆炸音效
                    playSound('explosion');
                    
                    // 创建爆炸效果
                    createExplosion(
                        enemy.x + enemy.width / 2,
                        enemy.y + enemy.height / 2,
                        enemy.color,
                        30
                    );
                    
                    // 增加连击
                    comboCount++;
                    comboTimer = 120; // 2秒连击窗口期
                    
                    // 更新连击倍数
                    comboMultiplier = Math.min(5, 1 + Math.floor(comboCount / 5));
                    
                    // 击杀得分加成 - 使用敌机的scoreValue
                    const baseScore = enemy.scoreValue * enemy.maxHealth;
                    const comboBonus = Math.floor(baseScore * (comboMultiplier - 1) * 0.5);
                    const totalScore = baseScore + comboBonus;
                    
                    score += totalScore;
                    killCount++;
                    scoreElement.textContent = score;
                    killCountElement.textContent = `击毁: ${killCount}`;
                    
                    // 显示浮动连击得分
                    if (comboCount > 1) {
                        const floatingCombo = document.createElement('div');
                        floatingCombo.className = 'floating-score';
                        floatingCombo.textContent = `+${totalScore} (x${comboMultiplier})`;
                        floatingCombo.style.left = `${enemy.x + enemy.width/2}px`;
                        floatingCombo.style.top = `${enemy.y}px`;
                        document.body.appendChild(floatingCombo);
                        
                        setTimeout(() => {
                            floatingCombo.style.opacity = '0';
                            floatingCombo.style.transform = 'translateY(-50px)';
                            setTimeout(() => {
                                document.body.removeChild(floatingCombo);
                            }, 1000);
                        }, 10);
                    }
                    
                    // 闪烁分数
                    scoreElement.style.textShadow = "0 0 15px rgba(255, 204, 0, 1)";
                    setTimeout(() => {
                        scoreElement.style.textShadow = "0 0 5px rgba(255, 204, 0, 0.7)";
                    }, 300);
                    
                    // 检查是否达成成就
                    checkAchievements();
                    
                    // 随机掉落道具
                    dropPowerup(
                        enemy.x + enemy.width / 2,
                        enemy.y + enemy.height / 2
                    );
                    
                    // 打断当前循环，因为敌机已经被移除
                    break;
                }
            }
        }
        
        // 如果敌机已被移除，则跳过后续碰撞检测
        if (enemyIndex >= enemies.length) continue;
        
        // 检测敌机与玩家碰撞
        if (
            player.x < enemy.x + enemy.width &&
            player.x + player.width > enemy.x &&
            player.y < enemy.y + enemy.height &&
            player.y + player.height > enemy.y
        ) {
            // 玩家被敌机撞击
            enemies.splice(enemyIndex, 1);
            
            // 播放击中音效
            playSound('hit');
            
            // 创建爆炸效果
            createExplosion(
                enemy.x + enemy.width / 2,
                enemy.y + enemy.height / 2,
                enemy.color,
                20
            );
            
            // 创建玩家受伤效果
            for (let i = 0; i < 20; i++) {
                const particle = createParticle(
                    player.x + player.width / 2,
                    player.y + player.height / 2,
                    player.color,
                    2
                );
                particles.push(particle);
            }
            
            // 显示命中闪烁
            showHitFlash();
            
            // 屏幕震动
            shakeScreen();
            
            lives--;
            livesElement.textContent = lives;
            
            // 生命值闪烁效果
            livesElement.style.textShadow = "0 0 15px rgba(255, 0, 0, 1)";
            setTimeout(() => {
                livesElement.style.textShadow = "0 0 5px rgba(255, 204, 0, 0.7)";
            }, 300);
            
            // 屏幕闪烁
            canvas.style.boxShadow = "0 0 20px rgba(255, 0, 0, 0.7)";
            setTimeout(() => {
                canvas.style.boxShadow = "0 0 15px rgba(0, 100, 255, 0.6)";
            }, 200);
            
            if (lives <= 0) {
                gameOver();
            }
            
            continue;
        }
        
        // 移除超出屏幕的敌机
        if (enemy.y > canvas.height) {
            enemies.splice(enemyIndex, 1);
        }
    }
    
    // 更新星星
    updateStars();
    
    // 更新粒子系统
    updateParticles();
    
    // 随机生成敌机 - 根据难度调整生成频率
    const baseSpawnRate = 0.005; // 初始生成率非常低
    const difficultyFactor = Math.min(0.03, difficulty / 1000); // 随难度增加，但有上限
    
    if (Math.random() < (baseSpawnRate + difficultyFactor) && gameRunning) {
        spawnEnemy();
    }
    
    // 自动发射子弹 - 在低难度时提高发射频率，帮助新手
    let bulletRate = 0.15;
    if (difficulty < 30) { // 游戏初期
        bulletRate = 0.25; // 更高的发射频率
    }
    
    if (Math.random() < bulletRate && gameRunning) {
        fireBullet();
    }

    // 更新连击系统
    if (comboTimer > 0) {
        comboTimer--;
        if (comboTimer <= 0) {
            comboCount = 0;
            comboMultiplier = 1;
        }
    }
    
    // 更新护盾
    if (shieldActive) {
        shieldTime--;
        if (shieldTime <= 0) {
            shieldActive = false;
        }
    }
    
    // 更新特殊武器冷却
    if (specialWeaponCooldown > 0) {
        specialWeaponCooldown--;
    }
    
    // 更新道具
    for (let i = powerups.length - 1; i >= 0; i--) {
        const powerup = powerups[i];
        powerup.y += powerup.speed;
        powerup.rotation += powerup.rotationSpeed;
        
        // 脉动效果
        powerup.pulseSize += 0.1 * powerup.pulseDirection;
        if (powerup.pulseSize > 1) powerup.pulseDirection = -1;
        if (powerup.pulseSize < 0) powerup.pulseDirection = 1;
        
        // 检测玩家碰到道具
        if (
            player.x < powerup.x + powerup.width &&
            player.x + player.width > powerup.x &&
            player.y < powerup.y + powerup.height &&
            player.y + player.height > powerup.y
        ) {
            // 播放道具音效
            playSound('powerup');
            
            // 根据道具类型给予不同奖励
            switch (powerup.type) {
                case POWERUP_TYPES.HEALTH:
                    lives++;
                    livesElement.textContent = lives;
                    livesElement.style.textShadow = "0 0 15px rgba(0, 255, 0, 1)";
                    setTimeout(() => {
                        livesElement.style.textShadow = "0 0 5px rgba(255, 204, 0, 0.7)";
                    }, 300);
                    break;
                    
                case POWERUP_TYPES.WEAPON:
                    // 立即加分
                    score += 100;
                    scoreElement.textContent = score;
                    // 临时提升攻击力，射出更多子弹
                    for (let j = 0; j < 10; j++) {
                        setTimeout(() => {
                            if (gameRunning && !gamePaused) {
                                fireBullet();
                            }
                        }, j * 100);
                    }
                    break;
                    
                case POWERUP_TYPES.BOMB:
                    useBomb();
                    break;
                    
                case POWERUP_TYPES.SHIELD:
                    activateShield();
                    break;
                    
                case POWERUP_TYPES.SCORE:
                    // 得分加倍
                    const bonusScore = 200 * comboMultiplier;
                    score += bonusScore;
                    scoreElement.textContent = score;
                    
                    // 显示浮动分数
                    const floatingScore = document.createElement('div');
                    floatingScore.className = 'floating-score';
                    floatingScore.textContent = `+${bonusScore}`;
                    floatingScore.style.left = `${powerup.x}px`;
                    floatingScore.style.top = `${powerup.y}px`;
                    document.body.appendChild(floatingScore);
                    
                    setTimeout(() => {
                        floatingScore.style.opacity = '0';
                        floatingScore.style.transform = 'translateY(-50px)';
                        setTimeout(() => {
                            document.body.removeChild(floatingScore);
                        }, 1000);
                    }, 10);
                    break;
                    
                case POWERUP_TYPES.SPECIAL:
                    // 触发歼20的特殊武器 - 超级激光束
                    for (let angle = -0.3; angle <= 0.3; angle += 0.1) {
                        bullets.push({
                            x: player.x + player.width / 2 - 2,
                            y: player.y - 15,
                            width: 4,
                            height: 40,
                            speed: 15,
                            color: '#9b59b6',
                            power: 5,
                            type: 'laser',
                            angle: angle
                        });
                    }
                    break;
            }
            
            // 更新收集者成就
            for (let j = 0; j < achievements.length; j++) {
                if (achievements[j].id === 'collector' && !achievements[j].achieved) {
                    achievements[j].count++;
                    if (achievements[j].count >= achievements[j].threshold) {
                        achievements[j].achieved = true;
                        score += achievements[j].score;
                        showAchievementNotification(achievements[j]);
                    }
                }
            }
            
            // 为拾取道具创建粒子效果
            for (let j = 0; j < 15; j++) {
                const particleColor = getColorForPowerupType(powerup.type);
                const particle = createParticle(
                    powerup.x + powerup.width / 2,
                    powerup.y + powerup.height / 2,
                    particleColor,
                    1.5
                );
                particles.push(particle);
            }
            
            // 移除道具
            powerups.splice(i, 1);
        }
        
        // 移除超出屏幕的道具
        if (powerup.y > canvas.height) {
            powerups.splice(i, 1);
        }
    }
    
    // 更新雷达
    updateRadar();
}

// 绘制游戏
function draw() {
    // 清空画布
    ctx.fillStyle = 'rgba(10, 10, 20, 0.3)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // 绘制星星背景
    drawStars();
    
    // 绘制粒子效果
    drawParticles();
    
    // 绘制玩家 - 歼20战机样式
    ctx.save();
    ctx.translate(player.x + player.width / 2, player.y + player.height / 2);
    
    // 玩家发光效果
    const glow = 20 + Math.sin(gameTime * 0.01) * 5;
    ctx.shadowColor = player.color;
    ctx.shadowBlur = glow;
    
    // 飞机主体颜色 - 灰色调
    const mainColor = '#7a8ca0';
    const accentColor = '#4e5d6c';
    const engineColor = '#f39c12';
    
    // 绘制歼20机身主体 - 菱形几何形状
    ctx.fillStyle = mainColor;
    
    // 机身主体
    ctx.beginPath();
    // 机头
    ctx.moveTo(0, -player.height/1.8);
    // 机翼前缘
    ctx.lineTo(player.width/1.9, -player.height/4);
    // 机翼尖端
    ctx.lineTo(player.width/1.6, player.height/5);
    // 机翼后缘
    ctx.lineTo(player.width/3, player.height/2.5);
    // 机尾
    ctx.lineTo(0, player.height/3);
    // 对称部分
    ctx.lineTo(-player.width/3, player.height/2.5);
    ctx.lineTo(-player.width/1.6, player.height/5);
    ctx.lineTo(-player.width/1.9, -player.height/4);
    ctx.closePath();
    ctx.fill();
    
    // 机头细节 - 前锥形
    ctx.fillStyle = accentColor;
    ctx.beginPath();
    ctx.moveTo(0, -player.height/1.8);
    ctx.lineTo(player.width/6, -player.height/3);
    ctx.lineTo(-player.width/6, -player.height/3);
    ctx.closePath();
    ctx.fill();
    
    // 机腹细节
    ctx.fillStyle = accentColor;
    ctx.beginPath();
    ctx.moveTo(0, -player.height/4);
    ctx.lineTo(player.width/5, player.height/5);
    ctx.lineTo(-player.width/5, player.height/5);
    ctx.closePath();
    ctx.fill();
    
    // 驾驶舱玻璃罩
    ctx.fillStyle = '#add8e6';
    ctx.beginPath();
    ctx.moveTo(0, -player.height/2);
    ctx.lineTo(player.width/10, -player.height/3);
    ctx.lineTo(0, -player.height/4);
    ctx.lineTo(-player.width/10, -player.height/3);
    ctx.closePath();
    ctx.fill();
    
    // 垂直尾翼
    ctx.fillStyle = accentColor;
    ctx.beginPath();
    ctx.moveTo(0, -player.height/7);
    ctx.lineTo(0, player.height/4);
    ctx.lineTo(0, -player.height/10);
    ctx.closePath();
    ctx.fill();
    
    // 引擎喷口
    ctx.fillStyle = '#333';
    ctx.beginPath();
    ctx.arc(player.width/8, player.height/4, player.width/15, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(-player.width/8, player.height/4, player.width/15, 0, Math.PI * 2);
    ctx.fill();
    
    // 引擎火焰
    const flameSize = 7 + Math.sin(gameTime * 0.1) * 2;
    
    // 左引擎火焰
    const gradient1 = ctx.createRadialGradient(
        -player.width/8, player.height/4, 0,
        -player.width/8, player.height/4, flameSize
    );
    gradient1.addColorStop(0, '#ff9500');
    gradient1.addColorStop(0.5, '#ff5500');
    gradient1.addColorStop(1, 'rgba(255, 0, 0, 0)');
    
    ctx.fillStyle = gradient1;
    ctx.beginPath();
    ctx.arc(-player.width/8, player.height/4, flameSize, 0, Math.PI * 2);
    ctx.fill();
    
    // 右引擎火焰
    const gradient2 = ctx.createRadialGradient(
        player.width/8, player.height/4, 0,
        player.width/8, player.height/4, flameSize
    );
    gradient2.addColorStop(0, '#ff9500');
    gradient2.addColorStop(0.5, '#ff5500');
    gradient2.addColorStop(1, 'rgba(255, 0, 0, 0)');
    
    ctx.fillStyle = gradient2;
    ctx.beginPath();
    ctx.arc(player.width/8, player.height/4, flameSize, 0, Math.PI * 2);
    ctx.fill();
    
    // 机身细节 - 线条
    ctx.strokeStyle = '#555';
    ctx.lineWidth = 0.5;
    
    // 翼面线条
    ctx.beginPath();
    ctx.moveTo(player.width/2.2, -player.height/5);
    ctx.lineTo(player.width/2, player.height/6);
    ctx.stroke();
    
    ctx.beginPath();
    ctx.moveTo(-player.width/2.2, -player.height/5);
    ctx.lineTo(-player.width/2, player.height/6);
    ctx.stroke();
    
    ctx.restore();
    
    // 绘制子弹
    bullets.forEach(bullet => {
        ctx.save();
        ctx.shadowColor = bullet.color;
        ctx.shadowBlur = 10;
        ctx.fillStyle = bullet.color;
        
        switch (bullet.type) {
            case 'normal':
                // 普通子弹 - 三角形
                ctx.beginPath();
                ctx.moveTo(bullet.x + bullet.width / 2, bullet.y);
                ctx.lineTo(bullet.x + bullet.width, bullet.y + bullet.height);
                ctx.lineTo(bullet.x, bullet.y + bullet.height);
                ctx.closePath();
                ctx.fill();
                break;
                
            case 'side':
                // 侧弹 - 圆形
                ctx.beginPath();
                ctx.arc(bullet.x + bullet.width / 2, bullet.y + bullet.height / 2, bullet.width / 2, 0, Math.PI * 2);
                ctx.fill();
                break;
                
            case 'homing':
                // 跟踪弹 - 小箭头
                ctx.translate(bullet.x + bullet.width / 2, bullet.y + bullet.height / 2);
                ctx.rotate(bullet.angle);
                
                ctx.beginPath();
                ctx.moveTo(0, -bullet.height / 2);
                ctx.lineTo(bullet.width / 2, bullet.height / 2);
                ctx.lineTo(-bullet.width / 2, bullet.height / 2);
                ctx.closePath();
                ctx.fill();
                break;
                
            case 'laser':
                // 激光 - 发光棱柱
                const gradient = ctx.createLinearGradient(
                    bullet.x, bullet.y, 
                    bullet.x, bullet.y + bullet.height
                );
                gradient.addColorStop(0, '#9b59b6');
                gradient.addColorStop(0.5, '#8e44ad');
                gradient.addColorStop(1, '#9b59b6');
                
                ctx.fillStyle = gradient;
                ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
                
                // 激光发光内核
                ctx.fillStyle = '#ecf0f1';
                ctx.fillRect(bullet.x + bullet.width / 2 - 1, bullet.y, 2, bullet.height);
                break;
                
            case 'missile':
                // 导弹 - 小火箭
                ctx.translate(bullet.x + bullet.width / 2, bullet.y + bullet.height / 2);
                ctx.rotate(bullet.angle);
                
                // 导弹主体
                ctx.fillStyle = '#e74c3c';
                ctx.beginPath();
                ctx.moveTo(0, -bullet.height / 2);
                ctx.lineTo(bullet.width / 2, bullet.height / 2);
                ctx.lineTo(-bullet.width / 2, bullet.height / 2);
                ctx.closePath();
                ctx.fill();
                
                // 尾焰
                const missileGradient = ctx.createRadialGradient(
                    0, bullet.height / 2, 0,
                    0, bullet.height / 2, bullet.width
                );
                missileGradient.addColorStop(0, '#f39c12');
                missileGradient.addColorStop(0.5, '#e67e22');
                missileGradient.addColorStop(1, 'rgba(231, 76, 60, 0)');
                
                ctx.fillStyle = missileGradient;
                ctx.beginPath();
                ctx.arc(0, bullet.height / 2, bullet.width / 2 + Math.random() * 2, 0, Math.PI * 2);
                ctx.fill();
                break;
        }
        
        ctx.restore();
    });
    
    // 绘制敌机
    enemies.forEach(enemy => {
        ctx.save();
        ctx.translate(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2);
        ctx.rotate(enemy.rotation);
        
        // 敌机发光效果
        ctx.shadowColor = enemy.color;
        ctx.shadowBlur = 15;
        
        // 根据敌机类型绘制不同样式
        switch(enemy.type) {
            case 0: // 轻型战机 - F-16风格
                // 机身
                ctx.fillStyle = '#a0a0a0';
                ctx.beginPath();
                ctx.moveTo(0, -enemy.height / 2);
                ctx.lineTo(enemy.width / 4, -enemy.height / 4);
                ctx.lineTo(enemy.width / 2.5, enemy.height / 3);
                ctx.lineTo(0, enemy.height / 2);
                ctx.lineTo(-enemy.width / 2.5, enemy.height / 3);
                ctx.lineTo(-enemy.width / 4, -enemy.height / 4);
                ctx.closePath();
                ctx.fill();
                
                // 驾驶舱
                ctx.fillStyle = '#87ceeb';
                ctx.beginPath();
                ctx.ellipse(0, -enemy.height / 6, enemy.width / 8, enemy.height / 6, 0, 0, Math.PI * 2);
                ctx.fill();
                
                // 垂直尾翼
                ctx.fillStyle = '#7d7d7d';
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.lineTo(0, -enemy.height / 3);
                ctx.lineTo(enemy.width / 10, 0);
                ctx.closePath();
                ctx.fill();
                break;
                
            case 1: // 中型战机 - F/A-18风格
                // 机身主体
                ctx.fillStyle = '#d3d3d3';
                ctx.beginPath();
                ctx.moveTo(0, -enemy.height / 2);
                ctx.bezierCurveTo(
                    enemy.width / 3, -enemy.height / 3,
                    enemy.width / 2, enemy.height / 4,
                    enemy.width / 4, enemy.height / 2
                );
                ctx.lineTo(-enemy.width / 4, enemy.height / 2);
                ctx.bezierCurveTo(
                    -enemy.width / 2, enemy.height / 4,
                    -enemy.width / 3, -enemy.height / 3,
                    0, -enemy.height / 2
                );
                ctx.closePath();
                ctx.fill();
                
                // 双垂直尾翼
                ctx.fillStyle = '#a9a9a9';
                ctx.beginPath();
                ctx.moveTo(enemy.width / 6, enemy.height / 6);
                ctx.lineTo(enemy.width / 6, -enemy.height / 6);
                ctx.lineTo(enemy.width / 3, enemy.height / 6);
                ctx.closePath();
                ctx.fill();
                
                ctx.beginPath();
                ctx.moveTo(-enemy.width / 6, enemy.height / 6);
                ctx.lineTo(-enemy.width / 6, -enemy.height / 6);
                ctx.lineTo(-enemy.width / 3, enemy.height / 6);
                ctx.closePath();
                ctx.fill();
                
                // 驾驶舱
                ctx.fillStyle = '#add8e6';
                ctx.beginPath();
                ctx.ellipse(0, -enemy.height / 4, enemy.width / 6, enemy.height / 8, 0, 0, Math.PI * 2);
                ctx.fill();
                break;
                
            case 2: // 重型战机 - 轰炸机风格
                // 机身
                ctx.fillStyle = '#696969';
                ctx.beginPath();
                ctx.moveTo(0, -enemy.height / 2);
                ctx.lineTo(enemy.width / 2, 0);
                ctx.lineTo(enemy.width / 3, enemy.height / 2);
                ctx.lineTo(-enemy.width / 3, enemy.height / 2);
                ctx.lineTo(-enemy.width / 2, 0);
                ctx.closePath();
                ctx.fill();
                
                // 机翼
                ctx.fillStyle = '#808080';
                ctx.beginPath();
                ctx.moveTo(-enemy.width / 3, 0);
                ctx.lineTo(-enemy.width / 1.2, enemy.height / 4);
                ctx.lineTo(-enemy.width / 2, enemy.height / 4);
                ctx.lineTo(-enemy.width / 6, 0);
                ctx.closePath();
                ctx.fill();
                
                ctx.beginPath();
                ctx.moveTo(enemy.width / 3, 0);
                ctx.lineTo(enemy.width / 1.2, enemy.height / 4);
                ctx.lineTo(enemy.width / 2, enemy.height / 4);
                ctx.lineTo(enemy.width / 6, 0);
                ctx.closePath();
                ctx.fill();
                
                // 驾驶舱
                ctx.fillStyle = '#b0c4de';
                ctx.beginPath();
                ctx.arc(0, -enemy.height / 4, enemy.width / 8, 0, Math.PI * 2);
                ctx.fill();
                
                // 引擎
                ctx.fillStyle = '#ff4500';
                ctx.beginPath();
                ctx.arc(enemy.width / 4, enemy.height / 3, enemy.width / 12, 0, Math.PI * 2);
                ctx.fill();
                
                ctx.beginPath();
                ctx.arc(-enemy.width / 4, enemy.height / 3, enemy.width / 12, 0, Math.PI * 2);
                ctx.fill();
                break;
        }
        
        // 敌机生命条
        if (enemy.health < enemy.maxHealth) {
            const healthPercent = enemy.health / enemy.maxHealth;
            ctx.fillStyle = `hsl(${healthPercent * 120}, 100%, 50%)`;
            ctx.fillRect(-enemy.width / 2, -enemy.height / 2 - 10, enemy.width * healthPercent, 5);
            ctx.strokeStyle = 'white';
            ctx.strokeRect(-enemy.width / 2, -enemy.height / 2 - 10, enemy.width, 5);
        }
        
        ctx.restore();
    });
    
    // 绘制爆炸效果
    drawParticles();

    // 绘制道具
    powerups.forEach(powerup => {
        ctx.save();
        ctx.translate(powerup.x + powerup.width / 2, powerup.y + powerup.height / 2);
        ctx.rotate(powerup.rotation);
        
        // 道具发光效果
        const color = getColorForPowerupType(powerup.type);
        ctx.shadowColor = color;
        ctx.shadowBlur = 15;
        
        // 道具轮廓
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, powerup.width / 2, 0, Math.PI * 2);
        ctx.stroke();
        
        // 道具内部
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(0, 0, powerup.width / 2 - 2, 0, Math.PI * 2);
        ctx.fill();
        
        // 根据道具类型绘制不同图标
        ctx.fillStyle = 'white';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = '16px Arial';
        
        switch (powerup.type) {
            case POWERUP_TYPES.HEALTH:
                ctx.fillText('♥', 0, 0);
                break;
            case POWERUP_TYPES.WEAPON:
                ctx.fillText('⚔', 0, 0);
                break;
            case POWERUP_TYPES.BOMB:
                ctx.fillText('💣', 0, 0);
                break;
            case POWERUP_TYPES.SHIELD:
                ctx.fillText('🛡', 0, 0);
                break;
            case POWERUP_TYPES.SCORE:
                ctx.fillText('⭐', 0, 0);
                break;
            case POWERUP_TYPES.SPECIAL:
                ctx.fillText('⚡', 0, 0);
                break;
        }
        
        // 脉动光环
        ctx.globalAlpha = 0.3 - powerup.pulseSize * 0.3;
        ctx.beginPath();
        ctx.arc(0, 0, powerup.width / 2 + powerup.pulseSize * 10, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
    });
    
    // 绘制护盾（如果激活）
    if (shieldActive) {
        ctx.save();
        
        // 创建环状渐变
        const gradient = ctx.createRadialGradient(
            player.x + player.width / 2, player.y + player.height / 2, player.width / 2,
            player.x + player.width / 2, player.y + player.height / 2, player.width * 1.2
        );
        gradient.addColorStop(0, 'rgba(100, 200, 255, 0)');
        gradient.addColorStop(0.5, 'rgba(100, 200, 255, 0.3)');
        gradient.addColorStop(0.8, 'rgba(100, 200, 255, 0.1)');
        gradient.addColorStop(1, 'rgba(100, 200, 255, 0)');
        
        // 绘制护盾
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(
            player.x + player.width / 2, 
            player.y + player.height / 2, 
            player.width * 1.2, 
            0, 
            Math.PI * 2
        );
        ctx.fill();
        
        // 绘制护盾外环
        ctx.strokeStyle = 'rgba(100, 200, 255, 0.8)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(
            player.x + player.width / 2, 
            player.y + player.height / 2, 
            player.width * 1.2, 
            0, 
            Math.PI * 2
        );
        ctx.stroke();
        
        ctx.restore();
    }
    
    // 绘制连击信息
    if (comboCount > 1) {
        ctx.save();
        
        ctx.font = '20px Arial';
        ctx.fillStyle = `hsl(${Math.min(comboCount * 5, 360)}, 100%, 60%)`;
        ctx.textAlign = 'center';
        ctx.shadowColor = 'black';
        ctx.shadowBlur =.5;
        
        ctx.fillText(`${comboCount} 连击! x${comboMultiplier}`, canvas.width / 2, 50);
        
        ctx.restore();
    }
    
    // 绘制炸弹冷却
    if (specialWeaponCooldown > 0) {
        ctx.save();
        
        const cooldownPercent = specialWeaponCooldown / 300;
        const cooldownAngle = cooldownPercent * Math.PI * 2;
        
        ctx.fillStyle = 'rgba(50, 50, 50, 0.5)';
        ctx.beginPath();
        ctx.arc(30, canvas.height - 30, 20, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = 'rgba(255, 100, 100, 0.7)';
        ctx.beginPath();
        ctx.moveTo(30, canvas.height - 30);
        ctx.arc(30, canvas.height - 30, 20, -Math.PI / 2, -Math.PI / 2 + cooldownAngle);
        ctx.closePath();
        ctx.fill();
        
        ctx.font = '12px Arial';
        ctx.fillStyle = 'white';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('炸弹', 30, canvas.height - 30);
        
        ctx.restore();
    }
}

// 游戏主循环
function gameLoop(time) {
    if (!gamePaused && gameRunning) {
        update(time);
        draw();
    }
    animationId = requestAnimationFrame(gameLoop);
}

// 游戏结束
function gameOver() {
    gameRunning = false;
    cancelAnimationFrame(animationId);
    
    // 停止背景音乐，播放游戏结束音效
    sounds.background.pause();
    playSound('gameOver');
    
    // 显示游戏结束画面
    finalScoreElement.textContent = score;
    gameOverScreen.style.display = 'flex';
    
    // 大爆炸效果
    createDOMExplosion(
        canvas.width / 2,
        canvas.height / 2,
        300,
        'rgba(255, 255, 0, 0.8)'
    );
    
    // 屏幕震动
    shakeScreen();
}

// 隐藏游戏结束画面
function hideGameOverScreen() {
    gameOverScreen.style.display = 'none';
}

// 开始游戏
function startGame() {
    console.log("游戏开始");
    init();
    gameRunning = true;
    gamePaused = false;
    startButton.textContent = '重新开始';
    pauseButton.textContent = '暂停';
    lastTime = performance.now();
    if (animationId) {
        cancelAnimationFrame(animationId);
    }
    
    // 播放音效
    if (soundEnabled && audioContext) {
        unlockAudio();
        playSound('levelUp');
    }
    
    gameLoop(lastTime);
}

// 暂停/继续游戏
function togglePause() {
    if (gameRunning) {
        gamePaused = !gamePaused;
        pauseButton.textContent = gamePaused ? '继续' : '暂停';
        
        // 播放音效
        if (soundEnabled && audioContext) {
            playSound(gamePaused ? 'hit' : 'powerup');
        }
        
        if (!gamePaused) {
            lastTime = performance.now();
        }
    }
}

// 事件监听
startButton.addEventListener('click', function() {
    console.log("点击了开始按钮");
    startGame();
});

pauseButton.addEventListener('click', function() {
    console.log("点击了暂停按钮");
    togglePause();
});

// 键盘控制
window.addEventListener('keydown', (e) => {
    if (e.code === 'ArrowLeft' || e.code === 'ArrowRight' || 
        e.code === 'ArrowUp' || e.code === 'ArrowDown') {
        keys[e.code] = true;
        e.preventDefault();
    }
    if (e.code === 'Space') {
        fireBullet();
        e.preventDefault();
    }
    if (e.code === 'KeyB') {
        useBomb();
        e.preventDefault();
    }
});

window.addEventListener('keyup', (e) => {
    if (e.code === 'ArrowLeft' || e.code === 'ArrowRight' || 
        e.code === 'ArrowUp' || e.code === 'ArrowDown') {
        keys[e.code] = false;
    }
});

// 创建道具
function createPowerup(x, y, type) {
    return {
        x: x,
        y: y,
        width: 25,
        height: 25,
        speed: 1 + Math.random() * 1.5,
        type: type,
        rotation: 0,
        rotationSpeed: (Math.random() - 0.5) * 0.1,
        pulseSize: 0,
        pulseDirection: 1
    };
}

// 随机掉落道具
function dropPowerup(x, y) {
    if (Math.random() < 0.3) { // 30%的几率掉落道具
        const typeRandom = Math.random();
        let powerupType;
        
        if (typeRandom < 0.3) {
            powerupType = POWERUP_TYPES.SCORE; // 30%几率掉落分数
        } else if (typeRandom < 0.5) {
            powerupType = POWERUP_TYPES.WEAPON; // 20%几率掉落武器升级
        } else if (typeRandom < 0.7) {
            powerupType = POWERUP_TYPES.HEALTH; // 20%几率掉落生命
        } else if (typeRandom < 0.85) {
            powerupType = POWERUP_TYPES.SHIELD; // 15%几率掉落护盾
        } else if (typeRandom < 0.95) {
            powerupType = POWERUP_TYPES.BOMB; // 10%几率掉落炸弹
        } else {
            powerupType = POWERUP_TYPES.SPECIAL; // 5%几率掉落特殊武器
        }
        
        powerups.push(createPowerup(x, y, powerupType));
    }
}

// 使用炸弹清屏
function useBomb() {
    if (specialWeaponCooldown <= 0) {
        // 播放炸弹音效
        playSound('bomb');
        
        // 创建炸弹爆炸效果
        createExplosion(canvas.width / 2, canvas.height / 2, '#ff0000', 200);
        
        // 摧毁所有敌机
        let destroyedCount = 0;
        for (let i = enemies.length - 1; i >= 0; i--) {
            destroyedCount++;
            createExplosion(
                enemies[i].x + enemies[i].width / 2,
                enemies[i].y + enemies[i].height / 2,
                enemies[i].color,
                15
            );
            
            // 得分增加
            score += 5 * enemies[i].maxHealth;
            killCount++;
        }
        
        // 清空敌机数组
        enemies = [];
        
        // 更新分数显示
        scoreElement.textContent = score;
        killCountElement.textContent = `击毁: ${killCount}`;
        
        // 更新炸弹成就
        for (let i = 0; i < achievements.length; i++) {
            if (achievements[i].id === 'bomber' && !achievements[i].achieved) {
                achievements[i].count++;
                if (achievements[i].count >= achievements[i].threshold) {
                    achievements[i].achieved = true;
                    score += achievements[i].score;
                    showAchievementNotification(achievements[i]);
                }
            }
        }
        
        // 设置冷却时间
        specialWeaponCooldown = 300;  // 帧数计时
        
        // 震动屏幕效果
        canvas.style.boxShadow = "0 0 30px rgba(255, 0, 0, 0.8)";
        setTimeout(() => {
            canvas.style.boxShadow = "0 0 15px rgba(0, 100, 255, 0.6)";
        }, 300);
        
        return destroyedCount;
    }
    return 0;
}

// 激活护盾
function activateShield() {
    // 播放护盾音效
    playSound('shield');
    
    shieldActive = true;
    shieldTime = 600;  // 10秒持续时间（60帧/秒）
}

// 显示成就通知
function showAchievementNotification(achievement) {
    // 播放成就音效
    playSound('achievement');
    
    // 创建通知元素
    const notification = document.createElement('div');
    notification.className = 'achievement-notification';
    notification.innerHTML = `
        <div class="achievement-icon">🏆</div>
        <div class="achievement-content">
            <div class="achievement-title">${achievement.name}</div>
            <div class="achievement-desc">${achievement.description}</div>
            <div class="achievement-reward">+${achievement.score}分</div>
        </div>
    `;
    
    // 添加到DOM
    document.body.appendChild(notification);
    
    // 动画效果
    setTimeout(() => {
        notification.classList.add('show');
    }, 10);
    
    // 一段时间后移除
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 500);
    }, 3000);
}

// 检查成就
function checkAchievements() {
    let achievementUnlocked = false;
    
    // 检查每个成就
    for (let i = 0; i < achievements.length; i++) {
        const achievement = achievements[i];
        if (achievement.achieved) continue;
        
        switch (achievement.id) {
            case 'firstkill':
                if (killCount >= 1) {
                    achievement.achieved = true;
                    achievementUnlocked = true;
                }
                break;
            case 'kill10':
            case 'kill50':
            case 'kill100':
                achievement.count = killCount;
                if (achievement.count >= achievement.threshold) {
                    achievement.achieved = true;
                    achievementUnlocked = true;
                }
                break;
            case 'combo10':
                if (comboCount >= achievement.threshold) {
                    achievement.achieved = true;
                    achievementUnlocked = true;
                }
                break;
            case 'score1000':
            case 'score5000':
                if (score >= achievement.threshold) {
                    achievement.achieved = true;
                    achievementUnlocked = true;
                }
                break;
            case 'survivor':
                // 幸存者成就使用游戏时间（秒）而不是毫秒
                if (gameElapsedTime >= achievement.threshold) {
                    achievement.achieved = true;
                    achievementUnlocked = true;
                }
                break;
        }
        
        if (achievement.achieved) {
            score += achievement.score;
            scoreElement.textContent = score;
            showAchievementNotification(achievement);
        }
    }
    
    return achievementUnlocked;
}

// 获取道具颜色
function getColorForPowerupType(type) {
    switch (type) {
        case POWERUP_TYPES.HEALTH:
            return '#e74c3c'; // 红色
        case POWERUP_TYPES.WEAPON:
            return '#3498db'; // 蓝色
        case POWERUP_TYPES.BOMB:
            return '#e67e22'; // 橙色
        case POWERUP_TYPES.SHIELD:
            return '#2ecc71'; // 绿色
        case POWERUP_TYPES.SCORE:
            return '#f1c40f'; // 黄色
        case POWERUP_TYPES.SPECIAL:
            return '#9b59b6'; // 紫色
        default:
            return 'white';
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
    
    // 根据难度值设置不同等级
    if (difficulty < 15) {
        levelText = "新手";
        levelClass = "difficulty-novice";
    } else if (difficulty < 45) {
        levelText = "简单";
        levelClass = "difficulty-easy";
    } else if (difficulty < 90) {
        levelText = "普通";
        levelClass = "difficulty-normal";
    } else if (difficulty < 150) {
        levelText = "困难";
        levelClass = "difficulty-hard";
    } else if (difficulty < 240) {
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

// 添加创建DOM爆炸效果功能
function createDOMExplosion(x, y, size, color) {
    const explosion = document.createElement('div');
    explosion.className = 'explosion';
    explosion.style.left = `${x}px`;
    explosion.style.top = `${y}px`;
    explosion.style.width = `${size}px`;
    explosion.style.height = `${size}px`;
    
    // 使用自定义颜色
    if (color) {
        explosion.style.backgroundImage = `radial-gradient(circle, ${color} 0%, rgba(255,100,0,0.5) 30%, rgba(255,0,0,0) 70%)`;
    }
    
    document.querySelector('.canvas-container').appendChild(explosion);
    
    // 存储爆炸元素以便清理
    explosionElements.push(explosion);
    
    // 在动画结束后移除元素
    setTimeout(() => {
        if (explosion.parentNode) {
            explosion.parentNode.removeChild(explosion);
        }
        const index = explosionElements.indexOf(explosion);
        if (index !== -1) {
            explosionElements.splice(index, 1);
        }
    }, 500);
}

// 清理所有爆炸效果
function clearExplosions() {
    explosionElements.forEach(explosion => {
        if (explosion.parentNode) {
            explosion.parentNode.removeChild(explosion);
        }
    });
    explosionElements = [];
}

// 为雷达添加敌机点
function updateRadar() {
    // 清除现有的雷达点
    const existingDots = radarContainer.querySelectorAll('.radar-dot');
    existingDots.forEach(dot => dot.remove());
    
    // 为每个敌机添加一个点
    enemies.forEach(enemy => {
        const radarX = (enemy.x / canvas.width) * 100;
        const radarY = (enemy.y / canvas.height) * 100;
        
        const dot = document.createElement('div');
        dot.className = 'radar-dot';
        dot.style.left = `${radarX}%`;
        dot.style.top = `${radarY}%`;
        
        radarContainer.appendChild(dot);
    });
}

// 显示击中闪烁
function showHitFlash() {
    hitFlashElement.style.display = 'block';
    hitFlashElement.style.animation = 'none';
    
    // 触发重新计算样式
    void hitFlashElement.offsetWidth;
    
    hitFlashElement.style.animation = 'hitFlash 0.2s ease-out';
    
    setTimeout(() => {
        hitFlashElement.style.display = 'none';
    }, 200);
}

// 屏幕震动效果
function shakeScreen() {
    const container = document.querySelector('.game-container');
    container.classList.add('screen-shake');
    
    setTimeout(() => {
        container.classList.remove('screen-shake');
    }, 500);
}

// 显示升级动画
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

// 添加重启按钮监听器
restartButton.addEventListener('click', function() {
    hideGameOverScreen();
    startGame();
});

// 在createGameOverSound函数中添加游戏结束音效
function createGameOverSound() {
    // 创建低频的游戏结束音效
    let oscillator = audioContext.createOscillator();
    let gainNode = audioContext.createGain();
    
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(220, audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(110, audioContext.currentTime + 1.5);
    
    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.2);
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 1.5);
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.start();
    oscillator.stop(audioContext.currentTime + 1.5);
}

// 修改游戏结束处理函数
function handleGameOver() {
    if (gameRunning) {
        gameRunning = false;
        
        // 播放游戏结束音效
        if (soundEnabled && audioContext) {
            createGameOverSound();
        }
        
        // 创建爆炸动画
        createExplosion(player.x, player.y, 2);
        createExplosion(player.x + player.width / 2, player.y, 2);
        createExplosion(player.x - player.width / 2, player.y, 2);
        
        // 震动屏幕
        shakeScreen(20, 500);
        
        // 切换界面状态
        setTimeout(() => {
            showGameOverScreen();
        }, 2000);
    }
}