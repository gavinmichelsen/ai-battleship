// Main UI logic

const game = new Game();
let currentShipIndex = 0;
let isHorizontal = true;

// DOM Elements
const playerBoardEl = document.getElementById('player-board');
const enemyBoardEl = document.getElementById('enemy-board');
const rotateBtn = document.getElementById('rotate-btn');
const randomizeBtn = document.getElementById('randomize-btn');
const startBtn = document.getElementById('start-btn');
const restartBtn = document.getElementById('restart-btn');
const statusMessage = document.getElementById('status-message');
const setupControls = document.getElementById('setup-controls');
const gameControls = document.getElementById('game-controls');
const fleetStatus = document.getElementById('fleet-status');
const playerShipList = document.getElementById('player-ship-list');
const enemyShipList = document.getElementById('enemy-ship-list');
const aiDifficultySelect = document.getElementById('ai-difficulty');

// Initialize boards
function initBoards() {
    createBoard(playerBoardEl, 10, handlePlayerBoardClick, handlePlayerBoardHover);
    createBoard(enemyBoardEl, 10, handleEnemyBoardClick);
    updateShipLists();
}

function createBoard(boardEl, size, clickHandler, hoverHandler) {
    boardEl.innerHTML = '';
    for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
            const cell = document.createElement('div');
            cell.classList.add('cell', 'empty');
            cell.dataset.r = r;
            cell.dataset.c = c;
            
            cell.addEventListener('click', () => clickHandler(r, c));
            if (hoverHandler) {
                cell.addEventListener('mouseover', () => hoverHandler(r, c));
                cell.addEventListener('mouseout', clearHoverEffects);
            }
            
            boardEl.appendChild(cell);
        }
    }
}

// Render the current state of a board to the DOM
function renderBoard(board, boardEl, hideShips = false) {
    for (let r = 0; r < board.size; r++) {
        for (let c = 0; c < board.size; c++) {
            const cellEl = boardEl.children[r * board.size + c];
            const cellData = board.grid[r][c];
            
            // Clear existing state classes
            cellEl.className = 'cell';
            
            if (cellData === null) {
                cellEl.classList.add('empty');
            } else if (cellData === 'hit') {
                cellEl.classList.add('hit');
            } else if (cellData === 'miss') {
                cellEl.classList.add('miss');
            } else if (cellData instanceof Ship) {
                if (cellData.isSunk()) {
                    cellEl.classList.add('sunk');
                } else if (!hideShips) {
                    cellEl.classList.add('ship');
                } else {
                    cellEl.classList.add('empty'); // Hide enemy ships
                }
            }
        }
    }
}

// Setup Phase Interactions
function handlePlayerBoardHover(r, c) {
    if (game.state !== 'setup') return;
    
    // We are placing ships manually
    if (currentShipIndex < game.fleetTypes.length) {
        clearHoverEffects();
        const shipDef = game.fleetTypes[currentShipIndex];
        const isValid = game.playerBoard.isValidPlacement(shipDef.length, r, c, isHorizontal);
        
        // Show hover effect
        for (let i = 0; i < shipDef.length; i++) {
            let tr = isHorizontal ? r : r + i;
            let tc = isHorizontal ? c + i : c;
            
            if (tr < 10 && tc < 10) {
                const cellEl = playerBoardEl.children[tr * 10 + tc];
                if (isValid) {
                    cellEl.classList.add('ship-hover');
                } else {
                    cellEl.classList.add('invalid-hover');
                }
            }
        }
    }
}

function clearHoverEffects() {
    const cells = playerBoardEl.querySelectorAll('.cell');
    cells.forEach(cell => {
        cell.classList.remove('ship-hover', 'invalid-hover');
    });
}

function handlePlayerBoardClick(r, c) {
    if (game.state !== 'setup') return;
    
    // Manual placement
    if (currentShipIndex < game.fleetTypes.length) {
        const shipDef = game.fleetTypes[currentShipIndex];
        const ship = new Ship(shipDef.name, shipDef.length);
        
        if (game.playerBoard.placeShip(ship, r, c, isHorizontal)) {
            currentShipIndex++;
            renderBoard(game.playerBoard, playerBoardEl);
            updateSetupStatus();
        }
    }
}

function updateSetupStatus() {
    if (currentShipIndex < game.fleetTypes.length) {
        const shipDef = game.fleetTypes[currentShipIndex];
        statusMessage.textContent = `Place your ${shipDef.name} (${shipDef.length} spaces)`;
        startBtn.disabled = true;
    } else {
        statusMessage.textContent = "All ships placed. Ready to start!";
        startBtn.disabled = false;
        clearHoverEffects();
    }
}

// Event Listeners for Controls
rotateBtn.addEventListener('click', () => {
    isHorizontal = !isHorizontal;
    rotateBtn.textContent = `Rotate Ship (Current: ${isHorizontal ? 'Horizontal' : 'Vertical'})`;
});

randomizeBtn.addEventListener('click', () => {
    game.playerBoard.placeFleetRandomly(game.fleetTypes);
    currentShipIndex = game.fleetTypes.length; // Skip manual placement
    renderBoard(game.playerBoard, playerBoardEl);
    updateSetupStatus();
});

startBtn.addEventListener('click', () => {
    if (game.start()) {
        // Init AI
        const difficulty = aiDifficultySelect.value;
        initAI(difficulty, game);
        
        setupControls.classList.add('hidden');
        gameControls.classList.remove('hidden');
        fleetStatus.classList.remove('hidden');
        enemyBoardEl.classList.remove('disabled');
        
        statusMessage.textContent = "Your turn! Select a target on the enemy board.";
        renderBoard(game.enemyBoard, enemyBoardEl, true); // Hide enemy ships
        updateShipLists();
    }
});

restartBtn.addEventListener('click', () => {
    // Reset everything
    game.playerBoard.clear();
    game.enemyBoard.clear();
    game.state = 'setup';
    currentShipIndex = 0;
    
    setupControls.classList.remove('hidden');
    gameControls.classList.add('hidden');
    fleetStatus.classList.add('hidden');
    enemyBoardEl.classList.add('disabled');
    
    initBoards();
    updateSetupStatus();
});

// Battle Phase Interactions
function handleEnemyBoardClick(r, c) {
    if (game.state !== 'playing' || game.currentTurn !== 'player') return;

    const result = game.playTurn(r, c);
    if (!result) return; // Invalid move (already clicked)

    renderBoard(game.enemyBoard, enemyBoardEl, true);
    updateShipLists();

    if (game.state === 'gameover') {
        endGame(result.winner);
    } else {
        // Enemy's turn
        statusMessage.textContent = "Enemy is thinking...";
        enemyBoardEl.classList.add('disabled');
        
        setTimeout(() => {
            executeAITurn();
        }, 800); // Small delay to simulate thinking
    }
}

function executeAITurn() {
    if (game.state !== 'playing') return;

    // Call AI to get coordinates
    const { r, c } = getAIMove();
    
    const result = game.enemyTurn(r, c);
    
    // Notify AI of result
    notifyAIResult(r, c, result);

    renderBoard(game.playerBoard, playerBoardEl);
    updateShipLists();

    if (game.state === 'gameover') {
        endGame(result.winner);
    } else {
        statusMessage.textContent = "Your turn! Select a target on the enemy board.";
        enemyBoardEl.classList.remove('disabled');
    }
}

function updateShipLists() {
    renderShipList(game.playerBoard.ships, playerShipList, game.fleetTypes);
    // For enemy, we show what ships they have based on fleetTypes, and mark as sunk if they are
    renderShipList(game.enemyBoard.ships, enemyShipList, game.fleetTypes);
}

function renderShipList(shipsOnBoard, listEl, fleetTypes) {
    listEl.innerHTML = '';
    
    fleetTypes.forEach(type => {
        const li = document.createElement('li');
        const indicator = document.createElement('span');
        indicator.classList.add('ship-status-indicator');
        
        const text = document.createElement('span');
        text.classList.add('ship-text');
        text.textContent = type.name;

        // Find if this ship is sunk
        const shipInstance = shipsOnBoard.find(s => s.name === type.name);
        if (shipInstance && shipInstance.isSunk()) {
            indicator.classList.add('sunk');
            text.classList.add('sunk');
        } else if (!shipInstance && game.state === 'setup') {
            // Not placed yet
            indicator.style.backgroundColor = 'var(--disabled)';
        }

        li.appendChild(indicator);
        li.appendChild(text);
        listEl.appendChild(li);
    });
}

function endGame(winner) {
    if (winner === 'player') {
        statusMessage.textContent = "Victory! You destroyed the enemy fleet.";
        statusMessage.style.color = 'var(--success)';
    } else {
        statusMessage.textContent = "Defeat! Your fleet has been destroyed.";
        statusMessage.style.color = 'var(--sunk)';
    }
    
    // Reveal all enemy ships
    renderBoard(game.enemyBoard, enemyBoardEl, false);
    enemyBoardEl.classList.add('disabled');
}

// Initial setup
initBoards();
updateSetupStatus();