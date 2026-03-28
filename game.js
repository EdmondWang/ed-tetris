const systemInfo = tt.getSystemInfoSync();
const canvas = tt.createCanvas();
const ctx = canvas.getContext('2d');

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

const stars = Array(50).fill().map(() => ({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    size: Math.random() * 3,
    brightness: Math.random()
}));

function updateStars() {
    stars.forEach(star => {
        star.brightness = Math.abs(Math.sin(Date.now() * 0.001 + Math.random()));
    });
    requestAnimationFrame(updateStars);
}

canvas.width = systemInfo.windowWidth;
canvas.height = systemInfo.windowHeight;

const BLOCK_SIZE = 25;
const BOARD_COLS = 10;
const BOARD_ROWS = 20;
const BOARD_WIDTH = BOARD_COLS * BLOCK_SIZE;
const BOARD_HEIGHT = BOARD_ROWS * BLOCK_SIZE;
const BOARD_X = (systemInfo.windowWidth - BOARD_WIDTH - 120) / 2;
const BOARD_Y = (systemInfo.windowHeight - BOARD_HEIGHT) / 2;

const TETROMINOES = {
    I: {
        shape: [[1, 1, 1, 1]],
        color: '#00F0FF',
        glow: '#00FFFF'
    },
    O: {
        shape: [
            [1, 1],
            [1, 1]
        ],
        color: '#FFD700',
        glow: '#FFFF00'
    },
    T: {
        shape: [
            [0, 1, 0],
            [1, 1, 1]
        ],
        color: '#A855F7',
        glow: '#C084FC'
    },
    L: {
        shape: [
            [1, 0],
            [1, 0],
            [1, 1]
        ],
        color: '#FF8C00',
        glow: '#FFA500'
    },
    J: {
        shape: [
            [0, 1],
            [0, 1],
            [1, 1]
        ],
        color: '#4169E1',
        glow: '#6495ED'
    },
    S: {
        shape: [
            [0, 1, 1],
            [1, 1, 0]
        ],
        color: '#32CD32',
        glow: '#00FF00'
    },
    Z: {
        shape: [
            [1, 1, 0],
            [0, 1, 1]
        ],
        color: '#FF4757',
        glow: '#FF6B7A'
    }
};

class Tetromino {
    constructor(type) {
        this.type = type;
        this.shape = TETROMINOES[type].shape.map(row => [...row]);
        this.color = TETROMINOES[type].color;
        this.glow = TETROMINOES[type].glow;
        this.x = Math.floor(BOARD_COLS / 2) - Math.floor(this.shape[0].length / 2);
        this.y = 0;
    }

    move(dx, dy) {
        this.x += dx;
        this.y += dy;
    }

    rotate() {
        const rows = this.shape.length;
        const cols = this.shape[0].length;
        const rotated = [];
        
        for (let i = 0; i < cols; i++) {
            rotated[i] = [];
            for (let j = 0; j < rows; j++) {
                rotated[i][j] = this.shape[rows - 1 - j][i];
            }
        }
        
        this.shape = rotated;
    }

    checkCollision(board) {
        for (let row = 0; row < this.shape.length; row++) {
            for (let col = 0; col < this.shape[row].length; col++) {
                if (this.shape[row][col]) {
                    const newX = this.x + col;
                    const newY = this.y + row;
                    
                    if (newX < 0 || newX >= BOARD_COLS || newY >= BOARD_ROWS) {
                        return true;
                    }
                    
                    if (newY >= 0 && board[newY][newX]) {
                        return true;
                    }
                }
            }
        }
        return false;
    }
}

class GameBoard {
    constructor() {
        this.board = Array(BOARD_ROWS).fill(null).map(() => Array(BOARD_COLS).fill(null));
        this.boardColors = Array(BOARD_ROWS).fill(null).map(() => Array(BOARD_COLS).fill(null));
        this.boardGlows = Array(BOARD_ROWS).fill(null).map(() => Array(BOARD_COLS).fill(null));
        this.score = 0;
        this.level = 1;
        this.lines = 0;
        this.gameOver = false;
        this.gamePaused = false;
    }

    placePiece(piece) {
        for (let row = 0; row < piece.shape.length; row++) {
            for (let col = 0; col < piece.shape[row].length; col++) {
                if (piece.shape[row][col]) {
                    const boardY = piece.y + row;
                    const boardX = piece.x + col;
                    if (boardY >= 0 && boardY < BOARD_ROWS && boardX >= 0 && boardX < BOARD_COLS) {
                        this.board[boardY][boardX] = piece.color;
                        this.boardColors[boardY][boardX] = piece.color;
                        this.boardGlows[boardY][boardX] = piece.glow;
                    }
                }
            }
        }
    }

    checkLines() {
        let linesCleared = 0;
        
        for (let row = BOARD_ROWS - 1; row >= 0; row--) {
            if (this.board[row].every(cell => cell !== null)) {
                this.board.splice(row, 1);
                this.boardColors.splice(row, 1);
                this.boardGlows.splice(row, 1);
                this.board.unshift(Array(BOARD_COLS).fill(null));
                this.boardColors.unshift(Array(BOARD_COLS).fill(null));
                this.boardGlows.unshift(Array(BOARD_COLS).fill(null));
                linesCleared++;
                row++;
            }
        }
        
        if (linesCleared > 0) {
            this.lines += linesCleared;
            this.score += linesCleared * 100 * this.level;
            this.level = Math.floor(this.lines / 10) + 1;
            updateDropInterval();
        }
        
        return linesCleared;
    }

    reset() {
        this.board = Array(BOARD_ROWS).fill(null).map(() => Array(BOARD_COLS).fill(null));
        this.boardColors = Array(BOARD_ROWS).fill(null).map(() => Array(BOARD_COLS).fill(null));
        this.boardGlows = Array(BOARD_ROWS).fill(null).map(() => Array(BOARD_COLS).fill(null));
        this.score = 0;
        this.level = 1;
        this.lines = 0;
        this.gameOver = false;
        this.gamePaused = false;
    }
}

let board = new GameBoard();
let currentPiece = null;
let nextPiece = null;
let gameLoop = null;
let dropInterval = 1000;

const placeSound = tt.createInnerAudioContext();
placeSound.src = './libs/eat.mp3';

function getRandomPiece() {
    const types = Object.keys(TETROMINOES);
    const randomType = types[Math.floor(Math.random() * types.length)];
    return new Tetromino(randomType);
}

function spawnPiece() {
    if (nextPiece === null) {
        nextPiece = getRandomPiece();
    }
    
    currentPiece = nextPiece;
    nextPiece = getRandomPiece();
    
    if (currentPiece.checkCollision(board.board)) {
        board.gameOver = true;
        bgMusic.pause();
        tt.showModal({
            title: '游戏结束',
            content: `得分：${board.score}\n消除行数：${board.lines}`,
            showCancel: false,
            success: () => {
                resetGame();
            }
        });
    }
}

function movePieceLeft() {
    currentPiece.move(-1, 0);
    if (currentPiece.checkCollision(board.board)) {
        currentPiece.move(1, 0);
    }
}

function movePieceRight() {
    currentPiece.move(1, 0);
    if (currentPiece.checkCollision(board.board)) {
        currentPiece.move(-1, 0);
    }
}

function softDrop() {
    currentPiece.move(0, 1);
    if (currentPiece.checkCollision(board.board)) {
        currentPiece.move(0, -1);
        return false;
    }
    return true;
}

function rotatePiece() {
    const originalShape = currentPiece.shape.map(row => [...row]);
    const originalX = currentPiece.x;
    const originalY = currentPiece.y;
    
    currentPiece.rotate();
    
    if (currentPiece.checkCollision(board.board)) {
        let adjusted = false;
        
        for (let i = 1; i < 4; i++) {
            currentPiece.x += 1;
            if (!currentPiece.checkCollision(board.board)) {
                adjusted = true;
                break;
            }
        }
        
        if (!adjusted) {
            currentPiece.x = originalX;
            for (let i = 1; i < 4; i++) {
                currentPiece.x -= 1;
                if (!currentPiece.checkCollision(board.board)) {
                    adjusted = true;
                    break;
                }
            }
        }
        
        if (!adjusted) {
            currentPiece.shape = originalShape;
            currentPiece.x = originalX;
            currentPiece.y = originalY;
        }
    }
}

function hardDrop() {
    while (softDrop()) {
        board.score += 2;
    }
}

function update() {
    if (board.gameOver || board.gamePaused) return;
    
    if (!softDrop()) {
        board.placePiece(currentPiece);
        const linesCleared = board.checkLines();
        if (linesCleared > 0) {
            placeSound.play();
        }
        spawnPiece();
    }
}

function drawBlock(x, y, color, glowColor) {
    const screenX = BOARD_X + x * BLOCK_SIZE;
    const screenY = BOARD_Y + y * BLOCK_SIZE;
    
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = 10;
    
    const gradient = ctx.createLinearGradient(screenX, screenY, screenX + BLOCK_SIZE, screenY + BLOCK_SIZE);
    gradient.addColorStop(0, color);
    gradient.addColorStop(1, adjustColor(color, -30));
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.roundRect(screenX + 1, screenY + 1, BLOCK_SIZE - 2, BLOCK_SIZE - 2, 2);
    ctx.fill();
    
    ctx.shadowBlur = 0;
    ctx.strokeStyle = adjustColor(color, 50);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(screenX + 1, screenY + 1, BLOCK_SIZE - 2, BLOCK_SIZE - 2, 2);
    ctx.stroke();
    
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.beginPath();
    ctx.roundRect(screenX + 2, screenY + 2, BLOCK_SIZE - 4, (BLOCK_SIZE - 4) / 2, 1);
    ctx.fill();
}

function adjustColor(color, amount) {
    const hex = color.replace('#', '');
    const r = Math.max(0, Math.min(255, parseInt(hex.substr(0, 2), 16) + amount));
    const g = Math.max(0, Math.min(255, parseInt(hex.substr(2, 2), 16) + amount));
    const b = Math.max(0, Math.min(255, parseInt(hex.substr(4, 2), 16) + amount));
    return `rgb(${r}, ${g}, ${b})`;
}

function drawBoard() {
    ctx.fillStyle = '#1A1A3A';
    ctx.fillRect(BOARD_X, BOARD_Y, BOARD_WIDTH, BOARD_HEIGHT);
    
    ctx.shadowColor = '#7AFFAF';
    ctx.shadowBlur = 10;
    ctx.strokeStyle = '#7AFFAF';
    ctx.lineWidth = 2;
    ctx.strokeRect(BOARD_X, BOARD_Y, BOARD_WIDTH, BOARD_HEIGHT);
    ctx.shadowBlur = 0;
    
    ctx.strokeStyle = 'rgba(122, 255, 175, 0.1)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= BOARD_COLS; i++) {
        ctx.beginPath();
        ctx.moveTo(BOARD_X + i * BLOCK_SIZE, BOARD_Y);
        ctx.lineTo(BOARD_X + i * BLOCK_SIZE, BOARD_Y + BOARD_HEIGHT);
        ctx.stroke();
    }
    for (let i = 0; i <= BOARD_ROWS; i++) {
        ctx.beginPath();
        ctx.moveTo(BOARD_X, BOARD_Y + i * BLOCK_SIZE);
        ctx.lineTo(BOARD_X + BOARD_WIDTH, BOARD_Y + i * BLOCK_SIZE);
        ctx.stroke();
    }
    
    for (let row = 0; row < BOARD_ROWS; row++) {
        for (let col = 0; col < BOARD_COLS; col++) {
            if (board.board[row][col]) {
                drawBlock(col, row, board.boardColors[row][col], board.boardGlows[row][col]);
            }
        }
    }
}

function drawPiece(piece, offsetX = 0, offsetY = 0) {
    if (!piece) return;
    
    for (let row = 0; row < piece.shape.length; row++) {
        for (let col = 0; col < piece.shape[row].length; col++) {
            if (piece.shape[row][col]) {
                drawBlock(piece.x + col + offsetX, piece.y + row + offsetY, piece.color, piece.glow);
            }
        }
    }
}

function drawPreview() {
    const previewX = BOARD_X + BOARD_WIDTH + 20;
    const previewY = BOARD_Y;
    const previewSize = 100;
    const previewBlockSize = 20;
    
    ctx.fillStyle = '#1A1A3A';
    ctx.fillRect(previewX, previewY, previewSize, previewSize);
    
    ctx.shadowColor = '#00D4FF';
    ctx.shadowBlur = 10;
    ctx.strokeStyle = '#00D4FF';
    ctx.lineWidth = 2;
    ctx.strokeRect(previewX, previewY, previewSize, previewSize);
    ctx.shadowBlur = 0;
    
    ctx.fillStyle = '#7AFFAF';
    ctx.font = '16px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('下一个', previewX + previewSize / 2, previewY - 10);
    ctx.textAlign = 'left';
    
    if (nextPiece) {
        const pieceWidth = nextPiece.shape[0].length * previewBlockSize;
        const pieceHeight = nextPiece.shape.length * previewBlockSize;
        const offsetX = Math.floor((previewSize - pieceWidth) / 2);
        const offsetY = Math.floor((previewSize - pieceHeight) / 2);
        
        for (let row = 0; row < nextPiece.shape.length; row++) {
            for (let col = 0; col < nextPiece.shape[row].length; col++) {
                if (nextPiece.shape[row][col]) {
                    const x = previewX + offsetX + col * previewBlockSize;
                    const y = previewY + offsetY + row * previewBlockSize;
                    
                    ctx.shadowColor = nextPiece.glow;
                    ctx.shadowBlur = 10;
                    
                    const gradient = ctx.createLinearGradient(x, y, x + previewBlockSize, y + previewBlockSize);
                    gradient.addColorStop(0, nextPiece.color);
                    gradient.addColorStop(1, adjustColor(nextPiece.color, -30));
                    
                    ctx.fillStyle = gradient;
                    ctx.beginPath();
                    ctx.roundRect(x + 1, y + 1, previewBlockSize - 2, previewBlockSize - 2, 2);
                    ctx.fill();
                    
                    ctx.shadowBlur = 0;
                    ctx.strokeStyle = adjustColor(nextPiece.color, 50);
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.roundRect(x + 1, y + 1, previewBlockSize - 2, previewBlockSize - 2, 2);
                    ctx.stroke();
                    
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
                    ctx.beginPath();
                    ctx.roundRect(x + 2, y + 2, previewBlockSize - 4, (previewBlockSize - 4) / 2, 1);
                    ctx.fill();
                }
            }
        }
    }
}

function drawScore() {
    const scoreX = 30;
    const scoreY = 80;
    
    ctx.shadowColor = '#7AFFAF';
    ctx.shadowBlur = 10;
    ctx.fillStyle = '#7AFFAF';
    ctx.font = '20px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('得分', scoreX, scoreY);
    
    ctx.font = '24px Arial';
    ctx.fillText(board.score.toString(), scoreX, scoreY + 30);
    
    const levelX = systemInfo.windowWidth - 30;
    ctx.shadowColor = '#00D4FF';
    ctx.shadowBlur = 10;
    ctx.fillStyle = '#00D4FF';
    ctx.font = '20px Arial';
    ctx.textAlign = 'right';
    ctx.fillText('等级', levelX, scoreY);
    
    ctx.font = '24px Arial';
    ctx.fillText(board.level.toString(), levelX, scoreY + 30);
    
    ctx.shadowBlur = 0;
    ctx.textAlign = 'left';
}

function drawPauseButton() {
    const pauseButton = {
        x: 30,
        y: 75,
        w: 20,
        h: 20
    };
    
    ctx.shadowColor = '#7AFFAF';
    ctx.shadowBlur = 10;
    ctx.fillStyle = '#7AFFAF';
    ctx.font = '20px "Arial"';
    ctx.fillText('⏸', pauseButton.x + 5, pauseButton.y + 5);
    ctx.shadowBlur = 0;
}

function drawControls() {
    const buttonSize = 60;
    const buttonMargin = 10;
    const bottomY = systemInfo.windowHeight - 100;
    
    const leftButton = { x: BOARD_X - buttonSize - buttonMargin, y: bottomY, w: buttonSize, h: buttonSize, text: '←' };
    const rightButton = { x: BOARD_X + BOARD_WIDTH + buttonMargin, y: bottomY, w: buttonSize, h: buttonSize, text: '→' };
    const rotateButton = { x: systemInfo.windowWidth / 2 - buttonSize / 2, y: bottomY, w: buttonSize, h: buttonSize, text: '↻' };
    const dropButton = { x: systemInfo.windowWidth / 2 - buttonSize / 2, y: bottomY + buttonSize + buttonMargin, w: buttonSize, h: buttonSize, text: '↓' };
    
    const buttons = [leftButton, rightButton, rotateButton, dropButton];
    
    buttons.forEach(btn => {
        const gradient = ctx.createLinearGradient(btn.x, btn.y, btn.x, btn.y + btn.h);
        gradient.addColorStop(0, '#2A2A4A');
        gradient.addColorStop(1, '#1A1A3A');
        
        ctx.fillStyle = gradient;
        ctx.strokeStyle = 'rgba(122, 255, 175, 0.3)';
        ctx.lineWidth = 1;
        
        ctx.beginPath();
        ctx.roundRect(btn.x, btn.y, btn.w, btn.h, 10);
        ctx.fill();
        ctx.stroke();
        
        ctx.fillStyle = '#7AFFAF';
        ctx.font = '24px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(btn.text, btn.x + btn.w / 2, btn.y + btn.h / 2);
    });
    
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
}

function draw() {
    ctx.fillStyle = '#0B0B2A';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    stars.forEach(star => {
        ctx.fillStyle = `rgba(255, 255, 255, ${star.brightness})`;
        ctx.fillRect(star.x, star.y, star.size, star.size);
    });
    
    drawBoard();
    drawPiece(currentPiece);
    drawPreview();
    drawScore();
    drawPauseButton();
    drawControls();
}

function resetGame() {
    board.reset();
    currentPiece = null;
    nextPiece = null;
    dropInterval = 1000;
    spawnPiece();
    bgMusic.play();
}

function handleTouch(touch) {
    const x = touch.screenX;
    const y = touch.screenY;
    
    const pauseButton = {
        x: 30,
        y: 75,
        w: 20,
        h: 20
    };
    
    if (x >= pauseButton.x && x <= pauseButton.x + pauseButton.w &&
        y >= pauseButton.y && y <= pauseButton.y + pauseButton.h) {
        board.gamePaused = true;
        tt.showModal({
            title: '游戏暂停',
            content: `当前得分：${board.score}`,
            showCancel: true,
            cancelText: '重新开始',
            confirmText: '继续',
            success: (res) => {
                if (res.confirm) {
                    board.gamePaused = false;
                    bgMusic.play();
                } else {
                    board.gamePaused = false;
                    resetGame();
                }
            }
        });
        return;
    }
    
    const buttonSize = 60;
    const buttonMargin = 10;
    const bottomY = systemInfo.windowHeight - 100;
    
    const leftButton = { x: BOARD_X - buttonSize - buttonMargin, y: bottomY, w: buttonSize, h: buttonSize };
    const rightButton = { x: BOARD_X + BOARD_WIDTH + buttonMargin, y: bottomY, w: buttonSize, h: buttonSize };
    const rotateButton = { x: systemInfo.windowWidth / 2 - buttonSize / 2, y: bottomY, w: buttonSize, h: buttonSize };
    const dropButton = { x: systemInfo.windowWidth / 2 - buttonSize / 2, y: bottomY + buttonSize + buttonMargin, w: buttonSize, h: buttonSize };
    
    if (x >= leftButton.x && x <= leftButton.x + leftButton.w &&
        y >= leftButton.y && y <= leftButton.y + leftButton.h) {
        movePieceLeft();
    } else if (x >= rightButton.x && x <= rightButton.x + rightButton.w &&
        y >= rightButton.y && y <= rightButton.y + rightButton.h) {
        movePieceRight();
    } else if (x >= rotateButton.x && x <= rotateButton.x + rotateButton.w &&
        y >= rotateButton.y && y <= rotateButton.y + rotateButton.h) {
        rotatePiece();
    } else if (x >= dropButton.x && x <= dropButton.x + dropButton.w &&
        y >= dropButton.y && y <= dropButton.y + dropButton.h) {
        hardDrop();
    }
}

function handleKeyDown(key) {
    if (board.gamePaused) return;
    
    switch (key) {
        case 'ArrowLeft':
            movePieceLeft();
            break;
        case 'ArrowRight':
            movePieceRight();
            break;
        case 'ArrowUp':
            rotatePiece();
            break;
        case 'ArrowDown':
            softDrop();
            break;
        case ' ':
            hardDrop();
            break;
    }
}

function gameMainLoop() {
    update();
    draw();
    gameLoop = setTimeout(gameMainLoop, dropInterval);
}

function updateDropInterval() {
    dropInterval = Math.max(100, 1000 - (board.level - 1) * 100);
}

tt.onTouchStart((event) => {
    handleTouch(event.touches[0]);
});

if (systemInfo.platform === 'devtools') {
    tt.onKeyDown(({ key }) => {
        handleKeyDown(key);
    });
}

updateStars();
resetGame();
gameMainLoop();