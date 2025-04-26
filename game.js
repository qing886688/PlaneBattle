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
let lives = 3;
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

// 发射子弹
function fireBullet() {
    if (specialWeaponCooldown > 0) return;
    
    // 播放射击音效
    playSound('shoot');
    
    // 创建子弹
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
    
    // 设置冷却时间
    specialWeaponCooldown = 10;
}

// 更新游戏
function update(time) {
    const deltaTime = time - lastTime;
    
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
    
    // 更新子弹位置
    for (let i = bullets.length - 1; i >= 0; i--) {
        const bullet = bullets[i];
        bullet.y -= bullet.speed;
        
        // 移除超出屏幕的子弹
        if (bullet.y + bullet.height < 0) {
            bullets.splice(i, 1);
        }
    }
    
    // 随机生成敌机 (根据难度调整生成频率)
    if (Math.random() < 0.02 + (difficulty / 1000)) {
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
            
            // 玩家被击中，减少生命值
            lives--;
            livesElement.textContent = lives;
            
            // 移除敌机
            enemies.splice(i, 1);
            
            // 创建爆炸效果
            
            // 检查游戏是否结束
            if (lives <= 0) {
                gameOver();
                return;
            }
            
            break;
        }
    }
    
    // 更新特殊武器冷却时间
    if (specialWeaponCooldown > 0) {
        specialWeaponCooldown--;
    }
    
    // 更新星星
    updateStars();
    
    // 缓慢增加难度
    difficulty += 0.01;
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
    
    // 绘制子弹
    bullets.forEach(bullet => {
        // 绘制更加精美的子弹
        ctx.fillStyle = bullet.color;
        
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

// 初始化游戏
function init() {
    // 初始化游戏状态
    score = 0;
    lives = 3;
    gameTime = 0;
    killCount = 0;
    
    // 重置玩家位置
    player.x = canvas.width / 2 - player.width / 2;
    player.y = canvas.height - player.height - 20;
    
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
        case 20:
            description = "简单模式：敌人数量适中，攻击频率低，适合休闲游戏。";
            break;
        case 60:
            description = "普通模式：标准游戏体验，敌人生命值和数量均衡，具有一定挑战性。";
            break;
        case 120:
            description = "困难模式：敌人数量增多，速度更快，需要较高的反应速度。";
            break;
        case 200:
            description = "专家模式：敌人生命值提高，攻击更为频繁，需要精准的操作。";
            break;
        case 300:
            description = "大师模式：极具挑战性，敌人数量众多且速度极快，仅适合经验丰富的玩家。";
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