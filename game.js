const systemInfo = tt.getSystemInfoSync();
const canvas = tt.createCanvas();
const ctx = canvas.getContext('2d');

// 创建音频实例
const bgMusic = tt.createInnerAudioContext();
bgMusic.src = './libs/bgm.mp3';
bgMusic.loop = true;

bgMusic.onCanplay(() => {
  bgMusic.play();
});

bgMusic.onError((res) => {
  console.error('背景音乐播放失败:', res.errMsg);
});

tt.onShow(() => {
  bgMusic.play();
});

tt.onHide(() => {
  bgMusic.pause();
});

// 星星系统
const stars = Array(50).fill().map(() => ({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    size: Math.random() * 3,
    brightness: Math.random()
}));

// 更新星星动画
function updateStars() {
    stars.forEach(star => {
        star.brightness = Math.abs(Math.sin(Date.now() * 0.001 + Math.random()));
    });
    requestAnimationFrame(updateStars);
}

// 设置画布尺寸
canvas.width = systemInfo.windowWidth;
canvas.height = systemInfo.windowHeight;

// 游戏配置
const GRID_SIZE = 20;
const COLLISION_THRESHOLD = GRID_SIZE / 2;
const BOARD_WIDTH = Math.floor(systemInfo.windowWidth * 0.9 / GRID_SIZE) * GRID_SIZE;
const BOARD_HEIGHT = Math.floor(systemInfo.windowHeight * 0.7 / GRID_SIZE) * GRID_SIZE;
const BOARD_X = (systemInfo.windowWidth - BOARD_WIDTH) / 2;
const BOARD_Y = (systemInfo.windowHeight - BOARD_HEIGHT) / 3;

// 游戏状态
let snake = [{
    x: BOARD_X + 5 * GRID_SIZE,
    y: BOARD_Y + 5 * GRID_SIZE
}];
let direction = 'right';
let food = null;
let score = 0;
let gameOver = false;
let gameLoop = null;
let gamePaused = false;

// 方向控制按钮
const controlSize = 50;
const controls = {
    up: {
        x: systemInfo.windowWidth / 2 - 25, 
        y: systemInfo.windowHeight - 170,
        w: controlSize,
        h: controlSize
    },
    down: {
        x: systemInfo.windowWidth / 2 - 25,
        y: systemInfo.windowHeight - 70,
        w: controlSize,
        h: controlSize
    },
    left: {
        x: (systemInfo.windowWidth / 2) - 75,  
        y: systemInfo.windowHeight - 120,
        w: controlSize,
        h: controlSize
    },
    right: {
        x: (systemInfo.windowWidth / 2) + 25, 
        y: systemInfo.windowHeight - 120,
        w: controlSize,
        h: controlSize
    }
};

// 重新开始按钮
const restartButton = {
    x: 200,
    y: systemInfo.windowHeight - 90,
    w: 100,
    h: 40
};

// 绘制暂停按钮
const pauseButton = {
    x: 105,
    y: 75,
    w: 20,
    h: 20,
};

// 生成随机食物
function generateFood() {
    // 添加边距，避免食物生成在边缘
    const margin = GRID_SIZE;
    const minX = BOARD_X + margin;
    const maxX = BOARD_X + BOARD_WIDTH - margin - GRID_SIZE;
    const minY = BOARD_Y + margin;
    const maxY = BOARD_Y + BOARD_HEIGHT - margin - GRID_SIZE;

    const x = Math.floor(Math.random() * ((maxX - minX) / GRID_SIZE + 1)) * GRID_SIZE + minX;
    const y = Math.floor(Math.random() * ((maxY - minY) / GRID_SIZE + 1)) * GRID_SIZE + minY;
    
    food = { x, y };
}
// 检查碰撞
function checkCollision(head) {
    // 检查墙壁碰撞
    if (head.x < BOARD_X || head.x >= BOARD_X + BOARD_WIDTH ||
        head.y < BOARD_Y || head.y >= BOARD_Y + BOARD_HEIGHT) {
        return true;
    }
    // 检查自身碰撞
    for (let i = 0; i < snake.length; i++) {
        if (head.x === snake[i].x && head.y === snake[i].y) {
            return true;
        }
    }
    return false;
}

// 检查是否碰到食物
function checkFoodCollision(head, food) {
    const distance = Math.sqrt(
        Math.pow(head.x - food.x, 2) +
        Math.pow(head.y - food.y, 2)
    );
    return distance < COLLISION_THRESHOLD;
}

// 游戏更新
function update() {
    if (gameOver || gamePaused) return;

    const head = {
        ...snake[0]
    };
    switch (direction) {
        case 'up':
            head.y -= GRID_SIZE;
            break;
        case 'down':
            head.y += GRID_SIZE;
            break;
        case 'left':
            head.x -= GRID_SIZE;
            break;
        case 'right':
            head.x += GRID_SIZE;
            break;
    }

    // 先检查是否吃到食物
    if (food && checkFoodCollision(head, food)) {
        score++;
        snake.unshift(head);
        generateFood();
        eatSound.play();  // 添加这一行
        return;
    }

    // 检查是否撞墙
    if (head.x < BOARD_X || head.x >= BOARD_X + BOARD_WIDTH ||
        head.y < BOARD_Y || head.y >= BOARD_Y + BOARD_HEIGHT) {
        gameOver = true;
        bgMusic.pause(); // 游戏结束时暂停背景音乐
        tt.showModal({
            title: '游戏结束',
            content: `得分：${score}\n要分享你的成绩吗？`,
            showCancel: true,
            cancelText: '重新开始',
            confirmText: '分享',
            success: (res) => {
                if (res.confirm) {
                    tt.shareAppMessage({
                        title: `我在贪吃蛇游戏中获得了${score}分，快来挑战我吧！`,
                        query: `from=share&score=${score}`, // 更新分数参数
                        success(res) {
                            console.log("分享成功", res);
                            resetGame();
                        },
                        fail(e) {
                            console.log("分享失败", e);
                            resetGame();
                        }
                    });
                } else {
                    resetGame();
                }
            }
        });
        return;
    }

    // 检查是否撞到自己
    for (let i = 0; i < snake.length; i++) {
        if (head.x === snake[i].x && head.y === snake[i].y) {
            gameOver = true;
            bgMusic.pause(); // 游戏结束时暂停背景音乐
            tt.showModal({
                title: '游戏结束',
                content: `得分：${score}`,
                showCancel: false,
                success: () => {
                    resetGame();
                }
            });
            return;
        }
    }

    // 移动蛇
    snake.unshift(head);
    snake.pop();
}

// 绘制游戏
function draw() {
    // 太空背景
    ctx.fillStyle = '#0B0B2A';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 游戏边界 - 太空站风格
    ctx.fillStyle = '#1A1A3A';
    ctx.fillRect(BOARD_X, BOARD_Y, BOARD_WIDTH, BOARD_HEIGHT);
    
    // 绘制星星
    stars.forEach(star => {
        ctx.fillStyle = `rgba(255, 255, 255, ${star.brightness})`;
        ctx.fillRect(star.x, star.y, star.size, star.size);
    });

    // 绘制蛇 - 太空舱风格
    snake.forEach((segment, index) => {
        // 发光效果
        const gradient = ctx.createRadialGradient(
            segment.x + GRID_SIZE/2, 
            segment.y + GRID_SIZE/2, 
            0,
            segment.x + GRID_SIZE/2, 
            segment.y + GRID_SIZE/2, 
            GRID_SIZE
        );
        
        if (index === 0) {
            gradient.addColorStop(0, '#00FF00');
            gradient.addColorStop(1, '#00FF00');
        } else {
            gradient.addColorStop(0, '#00CC00');
            gradient.addColorStop(1, '#00CC00');
        }
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        if (index === 0) {
            ctx.moveTo(segment.x + GRID_SIZE/2, segment.y + GRID_SIZE/2);
            let startAngle = 0;
            let endAngle;
            switch(direction) {
                case 'up':
                    startAngle = 1.75 * Math.PI;
                    break;
                case 'down':
                    startAngle = 0.75 * Math.PI;
                    break;
                case 'left':
                    startAngle = 1.25 * Math.PI;
                    break;
                case 'right':
                    startAngle = 0.25 * Math.PI;
                    break;
            }
            endAngle = startAngle + 1.5 * Math.PI
            ctx.arc(segment.x + GRID_SIZE/2, segment.y + GRID_SIZE/2, GRID_SIZE/2, startAngle, endAngle, false);
            ctx.closePath();
        } else {
            ctx.arc(segment.x + GRID_SIZE/2, segment.y + GRID_SIZE/2, GRID_SIZE/2, 0, 2 * Math.PI);
        }
        ctx.fill();
    });

    // 绘制食物 - 星星样式
    if (food) {
        ctx.fillStyle = '#FFD700';
        const centerX = food.x + GRID_SIZE/2;
        const centerY = food.y + GRID_SIZE/2;
        const spikes = 5;
        const outerRadius = GRID_SIZE/2;
        const innerRadius = GRID_SIZE/4;
        
        ctx.beginPath();
        for(let i = 0; i < spikes * 2; i++) {
            const radius = i % 2 === 0 ? outerRadius : innerRadius;
            const angle = (i * Math.PI) / spikes;
            const x = centerX + Math.cos(angle) * radius;
            const y = centerY + Math.sin(angle) * radius;
            if(i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fill();
    }

    // 绘制分数 - 发光文字
    ctx.fillStyle = '#7AFFAF';
    ctx.font = '20px "Arial"';
    ctx.shadowColor = '#7AFFAF';
    ctx.shadowBlur = 10;
    ctx.fillText(`得分: ${score}`, 30, 80);

    ctx.font = '20px "Arial"';
    ctx.fillText(`⏸`, pauseButton.x + 5, pauseButton.y + 5);
    ctx.shadowBlur = 0;

    // 绘制控制按钮 - 太空舱风格
    for (let key in controls) {
        const btn = controls[key];
        const gradient = ctx.createLinearGradient(btn.x, btn.y, btn.x, btn.y + btn.h);
        gradient.addColorStop(0, '#2A2A4A');
        gradient.addColorStop(1, '#1A1A3A');
        ctx.fillStyle = gradient;
        
        // 圆角矩形实现
        const radius = 10;
        ctx.beginPath();
        ctx.moveTo(btn.x + radius, btn.y);
        ctx.lineTo(btn.x + btn.w - radius, btn.y);
        ctx.arcTo(btn.x + btn.w, btn.y, btn.x + btn.w, btn.y + radius, radius);
        ctx.lineTo(btn.x + btn.w, btn.y + btn.h - radius);
        ctx.arcTo(btn.x + btn.w, btn.y + btn.h, btn.x + btn.w - radius, btn.y + btn.h, radius);
        ctx.lineTo(btn.x + radius, btn.y + btn.h);
        ctx.arcTo(btn.x, btn.y + btn.h, btn.x, btn.y + btn.h - radius, radius);
        ctx.lineTo(btn.x, btn.y + radius);
        ctx.arcTo(btn.x, btn.y, btn.x + radius, btn.y, radius);
        ctx.fill();
    }

    // 绘制方向按钮文字
    ctx.fillStyle = '#7AFFAF';
    ctx.font = '20px Arial';
    if (systemInfo.platform === 'devtools') {
        ctx.fillText('↑', controls.up.x + 20, controls.up.y + 30);
        ctx.fillText('↓', controls.down.x + 20, controls.down.y + 30);
        ctx.fillText('←', controls.left.x + 15, controls.left.y + 30);
        ctx.fillText('→', controls.right.x + 15, controls.right.y + 30);
    } else {
        ctx.fillText('↑', controls.up.x + 16.5, controls.up.y + 30);
        ctx.fillText('↓', controls.down.x + 16.5, controls.down.y + 30);
        ctx.fillText('←', controls.left.x + 15, controls.left.y + 30);
        ctx.fillText('→', controls.right.x + 15, controls.right.y + 30);
    }
}

// 重置游戏
function resetGame() {
    snake = [{
        x: BOARD_X + 5 * GRID_SIZE,
        y: BOARD_Y + 5 * GRID_SIZE
    }];
    direction = 'right';
    score = 0;
    gameOver = false;
    bgMusic.play(); // 重新开始游戏时恢复播放背景音乐
    generateFood();
}

// 检查触摸控制
function handleTouch(touch) {
    const x = touch.screenX;
    const y = touch.screenY;

    // 检查暂停按钮点击
    if (x >= pauseButton.x && x <= pauseButton.x + pauseButton.w &&
        y >= pauseButton.y && y <= pauseButton.y + pauseButton.h) {
        gamePaused = true;
        tt.showModal({
            title: '游戏暂停',
            content: `当前得分为：${score}`,
            showCancel: true,
            cancelText: '重新开始',
            confirmText: '继续',
            success: (res) => {
                if (res.confirm) {
                    gamePaused = false;
                    bgMusic.play();
                } else {
                    gamePaused = false;
                    resetGame();
                }
            }
        });
        return;
    }

    // 检查重新开始按钮点击
    // if (x >= restartButton.x && x <= restartButton.x + restartButton.w &&
    //     y >= restartButton.y && y <= restartButton.y + restartButton.h) {
    //     resetGame();
    //     return;
    // }

    for (let key in controls) {
        const btn = controls[key];
        if (x >= btn.x && x <= btn.x + btn.w &&
            y >= btn.y && y <= btn.y + btn.h) {
            if ((key === 'up' && direction !== 'down') ||
                (key === 'down' && direction !== 'up') ||
                (key === 'left' && direction !== 'right') ||
                (key === 'right' && direction !== 'left')) {
                direction = key;
            }
            break;
        }
    }
}

// 支持PC键盘事件
function handleKeyDown(key) {
    if ((key === 'ArrowUp' && direction !== 'down') ||
        (key === 'ArrowDown' && direction !== 'up') ||
        (key === 'ArrowLeft' && direction !== 'right') ||
        (key === 'ArrowRight' && direction !== 'left')) {
        direction = key.toLowerCase().slice(5,key.length)
    }
}

// 游戏主循环
function gameMainLoop() {
    update();
    draw();
    gameLoop = setTimeout(gameMainLoop, 300);
}

// 触摸事件监听
tt.onTouchStart((event) => {
    handleTouch(event.touches[0]);
});

if (systemInfo.platform === 'devtools') {
    tt.onKeyDown(({ key }) => {
        handleKeyDown(key)
    })
}

// 初始化游戏
const eatSound = tt.createInnerAudioContext();
eatSound.src = './libs/eat.mp3';
updateStars(); // 启动星星动画
resetGame();
gameMainLoop();
