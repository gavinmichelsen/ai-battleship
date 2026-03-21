// Main UI logic

const game = new Game();
let selectedShip = null;
let turnCount = 0;
let playerHitCount = 0;
let enemyHitCount = 0;
let aiTurnTimeoutId = null;
let gameOverTimeoutId = null;

// DOM Elements
const playerBoardEl = document.getElementById('player-board');
const enemyBoardEl = document.getElementById('enemy-board');
const rotateBtn = document.getElementById('rotate-btn');
const randomizeBtn = document.getElementById('randomize-btn');
const clearBtn = document.getElementById('clear-btn');
const startBtn = document.getElementById('start-btn');
const restartBtn = document.getElementById('restart-btn');
const statusMessage = document.getElementById('status-message');
const setupControls = document.getElementById('setup-controls');
const gameControls = document.getElementById('game-controls');
const fleetStatus = document.getElementById('fleet-status');
const playerShipList = document.getElementById('player-ship-list');
const enemyShipList = document.getElementById('enemy-ship-list');
const aiDifficultySelect = document.getElementById('ai-difficulty');
const shipyardContainer = document.getElementById('shipyard-container');
const shipyard = document.getElementById('shipyard');
const phaseText = document.getElementById('phase-text');
const shipsPlacedText = document.getElementById('ships-placed-text');
const difficultyText = document.getElementById('difficulty-text');
const turnIndicator = document.getElementById('turn-indicator');
const scoreSection = document.getElementById('score-section');
const playerHitsEl = document.getElementById('player-hits');
const enemyHitsEl = document.getElementById('enemy-hits');
const toastContainer = document.getElementById('toast-container');
const advisorToggleBtn = document.getElementById('advisor-toggle');
const advisorPanel = document.getElementById('advisor-panel');
const advisorTarget = document.getElementById('advisor-target');
const advisorConfidence = document.getElementById('advisor-confidence');
const advisorTip = document.getElementById('advisor-tip');
const gameoverOverlay = document.getElementById('gameover-overlay');
const gameoverHeading = document.getElementById('gameover-heading');
const gameoverSubtitle = document.getElementById('gameover-subtitle');
const gameoverIcon = document.getElementById('gameover-icon');
const gameoverTurns = document.getElementById('gameover-turns');
const gameoverPlayerHits = document.getElementById('gameover-player-hits');
const gameoverEnemyHits = document.getElementById('gameover-enemy-hits');
const gameoverRestartBtn = document.getElementById('gameover-restart-btn');

// Build coordinate labels for a board
function buildCoordLabels(colLabelsId, rowLabelsId) {
    const cols = 'ABCDEFGHIJ';
    const colContainer = document.getElementById(colLabelsId);
    const rowContainer = document.getElementById(rowLabelsId);
    colContainer.innerHTML = '<span></span>'; // corner spacer
    for (let i = 0; i < 10; i++) {
        const s = document.createElement('span');
        s.textContent = cols[i];
        colContainer.appendChild(s);
    }
    rowContainer.innerHTML = '';
    for (let i = 1; i <= 10; i++) {
        const s = document.createElement('span');
        s.textContent = i;
        rowContainer.appendChild(s);
    }
}

// Initialize boards
function initBoards() {
    buildCoordLabels('player-col-labels', 'player-row-labels');
    buildCoordLabels('enemy-col-labels', 'enemy-row-labels');
    createBoard(playerBoardEl, 10, handlePlayerBoardClick, handlePlayerBoardHover);
    createBoard(enemyBoardEl, 10, handleEnemyBoardClick);
    createShipyard();
    updateShipLists();
}

function createShipyard() {
    shipyard.innerHTML = '';
    game.fleetTypes.forEach(type => {
        const wrapper = document.createElement('div');
        wrapper.classList.add('shipyard-item');
        wrapper.dataset.name = type.name;
        wrapper.dataset.length = type.length;
        wrapper.dataset.horizontal = 'true';

        const piece = document.createElement('div');
        piece.classList.add('ship-piece');
        for (let i = 0; i < type.length; i++) {
            const seg = document.createElement('div');
            seg.classList.add('seg');
            piece.appendChild(seg);
        }

        const label = document.createElement('div');
        label.classList.add('ship-name');
        label.textContent = type.name;

        wrapper.appendChild(piece);
        wrapper.appendChild(label);

        wrapper.addEventListener('click', () => {
            if (game.state !== 'setup') return;
            selectShipFromShipyard(type.name, type.length, wrapper);
        });

        shipyard.appendChild(wrapper);
    });
    updateSetupStatus();
}

function selectShipFromShipyard(name, length, element) {
    if (selectedShip && selectedShip.name === name && !selectedShip.fromBoard) {
        deselectShip();
        return;
    }
    if (selectedShip && selectedShip.fromBoard) {
        cancelBoardPickup();
    }

    const isHoriz = element.dataset.horizontal === 'true';
    selectedShip = { name, length, isHorizontal: isHoriz, fromBoard: false, element };

    shipyard.querySelectorAll('.shipyard-item').forEach(el => el.classList.remove('selected'));
    element.classList.add('selected');

    clearHoverEffects();
    updateSetupStatus();
}

function deselectShip() {
    if (!selectedShip) return;
    shipyard.querySelectorAll('.shipyard-item').forEach(el => el.classList.remove('selected'));
    selectedShip = null;
    clearHoverEffects();
    updateSetupStatus();
}

function cancelBoardPickup() {
    if (!selectedShip || !selectedShip.fromBoard) return;
    const ship = new Ship(selectedShip.name, selectedShip.length);
    game.playerBoard.placeShip(ship, selectedShip.originR, selectedShip.originC, selectedShip.isHorizontal);
    selectedShip = null;
    shipyard.querySelectorAll('.shipyard-item').forEach(el => el.classList.remove('selected'));
    clearHoverEffects();
    renderBoard(game.playerBoard, playerBoardEl);
    updateSetupStatus();
}

function createBoard(boardEl, size, clickHandler, hoverHandler) {
    boardEl.innerHTML = '';
    for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
            const cell = document.createElement('div');
            cell.classList.add('cell', 'empty');
            cell.dataset.r = r;
            cell.dataset.c = c;
            if (clickHandler) cell.addEventListener('click', () => clickHandler(r, c));
            if (hoverHandler) {
                cell.addEventListener('mouseover', () => hoverHandler(r, c));
                cell.addEventListener('mouseout', clearHoverEffects);
            }
            boardEl.appendChild(cell);
        }
    }
}

function renderBoard(board, boardEl, hideShips = false) {
    for (let r = 0; r < board.size; r++) {
        for (let c = 0; c < board.size; c++) {
            const cellEl = boardEl.children[r * board.size + c];
            const cellData = board.grid[r][c];
            cellEl.className = 'cell';
            if (cellData === null) {
                cellEl.classList.add('empty');
            } else if (cellData !== null && typeof cellData === 'object' && cellData.hit === true) {
                if (cellData.ship && cellData.ship.isSunk()) {
                    cellEl.classList.add('sunk');
                } else {
                    cellEl.classList.add('hit');
                }
            } else if (cellData === 'miss') {
                cellEl.classList.add('miss');
            } else if (cellData instanceof Ship) {
                if (!hideShips) {
                    cellEl.classList.add('ship');
                } else {
                    cellEl.classList.add('empty');
                }
            }
        }
    }
}

// --- Setup Phase ---
function handlePlayerBoardHover(r, c) {
    if (game.state !== 'setup' || !selectedShip) return;
    clearHoverEffects();
    const isValid = game.playerBoard.isValidPlacement(selectedShip.length, r, c, selectedShip.isHorizontal);
    for (let i = 0; i < selectedShip.length; i++) {
        let tr = selectedShip.isHorizontal ? r : r + i;
        let tc = selectedShip.isHorizontal ? c + i : c;
        if (tr >= 0 && tr < 10 && tc >= 0 && tc < 10) {
            playerBoardEl.children[tr * 10 + tc].classList.add(isValid ? 'ship-hover' : 'invalid-hover');
        }
    }
}

function handlePlayerBoardClick(r, c) {
    if (game.state !== 'setup') return;
    const cellData = game.playerBoard.grid[r][c];

    if (!selectedShip) {
        if (cellData instanceof Ship) pickUpShipFromBoard(cellData);
        return;
    }

    const ship = new Ship(selectedShip.name, selectedShip.length);
    if (game.playerBoard.placeShip(ship, r, c, selectedShip.isHorizontal)) {
        if (!selectedShip.fromBoard && selectedShip.element) {
            selectedShip.element.remove();
        }
        selectedShip = null;
        shipyard.querySelectorAll('.shipyard-item').forEach(el => el.classList.remove('selected'));
        clearHoverEffects();
        renderBoard(game.playerBoard, playerBoardEl);
        updateSetupStatus();
    }
}

function pickUpShipFromBoard(shipData) {
    let isHoriz = true;
    if (shipData.coordinates.length > 1) {
        isHoriz = shipData.coordinates[0].r === shipData.coordinates[1].r;
    }
    const originR = shipData.coordinates[0].r;
    const originC = shipData.coordinates[0].c;
    game.playerBoard.removeShip(shipData.name);

    selectedShip = {
        name: shipData.name,
        length: shipData.length,
        isHorizontal: isHoriz,
        fromBoard: true,
        originR, originC
    };
    renderBoard(game.playerBoard, playerBoardEl);
    updateSetupStatus();
}

function clearHoverEffects() {
    playerBoardEl.querySelectorAll('.cell').forEach(cell => {
        cell.classList.remove('ship-hover', 'invalid-hover');
    });
}

function updateSetupStatus() {
    const placed = game.playerBoard.ships.length;
    const total = game.fleetTypes.length;
    shipsPlacedText.textContent = `${placed} / ${total}`;
    phaseText.textContent = 'Deployment';

    if (selectedShip) {
        statusMessage.textContent = `Placing ${selectedShip.name} (${selectedShip.length}) — hover & click to place. R to rotate.`;
        startBtn.disabled = true;
    } else if (placed < total) {
        statusMessage.textContent = `Select a ship from the Shipyard to deploy (${total - placed} remaining)`;
        startBtn.disabled = true;
    } else {
        statusMessage.textContent = 'All ships deployed. Ready to engage!';
        startBtn.disabled = false;
    }
}

function updateDifficultyDisplay() {
    const val = aiDifficultySelect.value;
    difficultyText.textContent = val.charAt(0).toUpperCase() + val.slice(1);
}

// --- Controls ---
rotateBtn.addEventListener('click', () => {
    if (selectedShip) {
        selectedShip.isHorizontal = !selectedShip.isHorizontal;
        if (selectedShip.element) {
            selectedShip.element.dataset.horizontal = selectedShip.isHorizontal;
            const piece = selectedShip.element.querySelector('.ship-piece');
            if (piece) piece.classList.toggle('vertical', !selectedShip.isHorizontal);
        }
    } else {
        shipyard.querySelectorAll('.shipyard-item').forEach(item => {
            const cur = item.dataset.horizontal === 'true';
            item.dataset.horizontal = !cur;
            const piece = item.querySelector('.ship-piece');
            if (piece) piece.classList.toggle('vertical', cur);
        });
    }
    clearHoverEffects();
});

document.addEventListener('keydown', (e) => {
    if ((e.key === 'r' || e.key === 'R') && game.state === 'setup') rotateBtn.click();
    if (e.key === 'Escape') {
        if (selectedShip && selectedShip.fromBoard) cancelBoardPickup();
        else deselectShip();
    }
});

aiDifficultySelect.addEventListener('change', updateDifficultyDisplay);

randomizeBtn.addEventListener('click', () => {
    selectedShip = null;
    game.playerBoard.placeFleetOptimally(game.fleetTypes);
    shipyard.innerHTML = '';
    renderBoard(game.playerBoard, playerBoardEl);
    updateSetupStatus();
});

clearBtn.addEventListener('click', () => {
    selectedShip = null;
    game.playerBoard.clear();
    createShipyard();
    renderBoard(game.playerBoard, playerBoardEl);
    updateSetupStatus();
});

startBtn.addEventListener('click', () => {
    if (game.start()) {
        const difficulty = aiDifficultySelect.value;
        initAI(difficulty, game);
        turnCount = 1;
        playerHitCount = 0;
        enemyHitCount = 0;

        setupControls.classList.add('hidden');
        shipyardContainer.classList.add('hidden');
        gameControls.classList.remove('hidden');
        fleetStatus.classList.remove('hidden');
        turnIndicator.classList.remove('hidden');
        scoreSection.classList.remove('hidden');
        enemyBoardEl.classList.remove('disabled');

        phaseText.textContent = 'Battle';
        statusMessage.textContent = 'Your move, Commander';
        AudioEngine.playBattleHorn();
        updateTurnDisplay();
        updateScoreDisplay();

        renderBoard(game.playerBoard, playerBoardEl);
        renderBoard(game.enemyBoard, enemyBoardEl, true);
        updateShipLists();

        // Show advisor panel if advisor is enabled
        if (Advisor.isEnabled()) {
            advisorPanel.classList.remove('hidden');
            updateAdvisor(null);
        }
    }
});

function resetGame() {
    game.playerBoard.clear();
    game.enemyBoard.clear();
    game.state = 'setup';
    selectedShip = null;
    turnCount = 0;
    playerHitCount = 0;
    enemyHitCount = 0;

    statusMessage.style.color = '';

    Advisor.reset();
    advisorPanel.classList.add('hidden');
    clearAdvisorHighlight();

    setupControls.classList.remove('hidden');
    shipyardContainer.classList.remove('hidden');
    gameControls.classList.add('hidden');
    fleetStatus.classList.add('hidden');
    turnIndicator.classList.add('hidden');
    scoreSection.classList.add('hidden');
    enemyBoardEl.classList.add('disabled');
    gameoverOverlay.classList.add('hidden');

    clearTimeout(aiTurnTimeoutId);
    clearTimeout(gameOverTimeoutId);
    aiTurnTimeoutId = null;
    gameOverTimeoutId = null;

    initBoards();
    updateSetupStatus();
    updateDifficultyDisplay();
}

restartBtn.addEventListener('click', resetGame);
gameoverRestartBtn.addEventListener('click', resetGame);

// --- Battle Phase ---
function handleEnemyBoardClick(r, c) {
    if (game.state !== 'playing' || game.currentTurn !== 'player') return;
    const result = game.playTurn(r, c);
    if (!result) return;

    if (result.result === 'hit') {
        playerHitCount++;
        if (result.sunk) {
            AudioEngine.playSunk();
            showSunkToast(result.ship.name, 'player');
        } else {
            AudioEngine.playHit();
        }
    } else {
        AudioEngine.playMiss();
    }

    renderBoard(game.enemyBoard, enemyBoardEl, true);
    if (result.sunk) animateSunkCells(game.enemyBoard, enemyBoardEl, result.ship);
    updateShipLists();
    updateScoreDisplay();
    clearAdvisorHighlight();

    if (game.state === 'gameover') {
        endGame(result.winner);
        if (result.sunk) animateSunkCells(game.enemyBoard, enemyBoardEl, result.ship);
    } else {
        const delay = result.sunk ? 2200 : 800;
        statusMessage.textContent = result.sunk ? `You sunk the ${result.ship.name}!` : 'Enemy is thinking...';
        enemyBoardEl.classList.add('disabled');
        aiTurnTimeoutId = setTimeout(() => {
            aiTurnTimeoutId = null;
            statusMessage.textContent = 'Enemy is thinking...';
            executeAITurn();
        }, delay);
    }
}

function executeAITurn() {
    if (game.state !== 'playing') return;
    const { r, c } = getAIMove();
    const result = game.enemyTurn(r, c);
    notifyAIResult(r, c, result);

    if (result && result.result === 'hit') {
        enemyHitCount++;
        if (result.sunk) {
            AudioEngine.playSunk();
            showSunkToast(result.ship.name, 'enemy');
        } else {
            AudioEngine.playHit();
        }
    } else if (result) {
        AudioEngine.playMiss();
    }

    renderBoard(game.playerBoard, playerBoardEl);
    if (result && result.sunk) animateSunkCells(game.playerBoard, playerBoardEl, result.ship);
    updateShipLists();
    updateScoreDisplay();

    if (game.state === 'gameover') {
        endGame(result.winner);
    } else {
        turnCount++;
        updateTurnDisplay();
        statusMessage.textContent = result && result.sunk
            ? `The enemy sunk your ${result.ship.name}!`
            : 'Your move, Commander';
        enemyBoardEl.classList.remove('disabled');
        updateAdvisor(result);
    }
}

function updateTurnDisplay() {
    turnIndicator.innerHTML = `Turn <strong>${turnCount}</strong> — Your move, Commander`;
}

function updateScoreDisplay() {
    playerHitsEl.textContent = playerHitCount;
    enemyHitsEl.textContent = enemyHitCount;
}

function updateShipLists() {
    renderShipList(game.playerBoard.ships, playerShipList, game.fleetTypes);
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

        const shipInstance = shipsOnBoard.find(s => s.name === type.name);
        if (shipInstance && shipInstance.isSunk()) {
            indicator.classList.add('sunk');
            text.classList.add('sunk');
        } else if (!shipInstance && game.state === 'setup') {
            indicator.style.backgroundColor = 'var(--text-dim)';
        }
        li.appendChild(indicator);
        li.appendChild(text);
        listEl.appendChild(li);
    });
}

function endGame(winner) {
    phaseText.textContent = 'Game Over';
    if (winner === 'player') {
        statusMessage.textContent = 'Victory! You destroyed the enemy fleet.';
        statusMessage.style.color = 'var(--success)';
        turnIndicator.innerHTML = `Game over in <strong>${turnCount}</strong> turns — <strong style="color:var(--success)">Victory!</strong>`;
        AudioEngine.playVictory();
    } else {
        statusMessage.textContent = 'Defeat! Your fleet has been destroyed.';
        statusMessage.style.color = 'var(--hit)';
        turnIndicator.innerHTML = `Game over in <strong>${turnCount}</strong> turns — <strong style="color:var(--hit)">Defeat</strong>`;
        AudioEngine.playDefeat();
    }
    renderBoard(game.enemyBoard, enemyBoardEl, false);
    enemyBoardEl.classList.add('disabled');

    gameOverTimeoutId = setTimeout(() => {
        gameOverTimeoutId = null;
        showGameOverModal(winner);
    }, 800);
}

// --- Toast Notification for Ship Sinking ---
function showSunkToast(shipName, sunkBy) {
    const toast = document.createElement('div');
    toast.classList.add('toast');
    if (sunkBy === 'player') {
        toast.classList.add('player-sunk');
        toast.innerHTML = `<div class="toast-label">Ship destroyed</div><span class="toast-ship">You sunk the ${shipName}!</span>`;
    } else {
        toast.innerHTML = `<div class="toast-label">Ship lost</div><span class="toast-ship">Enemy sunk your ${shipName}!</span>`;
    }

    const duration = 2200;
    toast.style.animationDuration = '0.4s, 0.4s';
    toast.style.animationDelay = `0s, ${duration - 400}ms`;

    toastContainer.appendChild(toast);
    setTimeout(() => toast.remove(), duration);
}

// --- Animate sunk ship cells ---
function animateSunkCells(board, boardEl, ship) {
    ship.coordinates.forEach(coord => {
        const cellEl = boardEl.children[coord.r * board.size + coord.c];
        cellEl.classList.add('sunk-animate');
        cellEl.addEventListener('animationend', () => {
            cellEl.classList.remove('sunk-animate');
        }, { once: true });
    });
}

// --- Game Over Modal ---
function showGameOverModal(winner) {
    gameoverOverlay.classList.remove('hidden', 'victory', 'defeat');
    gameoverOverlay.classList.add(winner === 'player' ? 'victory' : 'defeat');

    if (winner === 'player') {
        gameoverIcon.textContent = '\u2693';
        gameoverHeading.textContent = 'Victory';
        gameoverSubtitle.textContent = 'You destroyed the enemy fleet. Well played, Commander.';
    } else {
        gameoverIcon.textContent = '\uD83D\uDCA5';
        gameoverHeading.textContent = 'Defeat';
        gameoverSubtitle.textContent = 'Your fleet has been destroyed. Better luck next time.';
    }

    gameoverTurns.textContent = turnCount;
    gameoverPlayerHits.textContent = playerHitCount;
    gameoverEnemyHits.textContent = enemyHitCount;
}

// --- Sound: Auto-start on first interaction ---
const soundToggle = document.getElementById('sound-toggle');
let audioStarted = false;

function tryAutoStartAudio() {
    if (audioStarted) return;
    AudioEngine.start();
    audioStarted = true;
    soundToggle.innerHTML = '&#x1f50a; Sound';
    soundToggle.classList.remove('muted');
    document.removeEventListener('click', tryAutoStartAudio);
}

// Start audio on the very first click anywhere on the page
document.addEventListener('click', tryAutoStartAudio);

soundToggle.addEventListener('click', (e) => {
    if (!audioStarted) return; // Will be started by the global handler
    e.stopPropagation();
    const muted = AudioEngine.toggleMute();
    soundToggle.innerHTML = muted ? '&#x1f507; Muted' : '&#x1f50a; Sound';
    soundToggle.classList.toggle('muted', muted);
});

// --- Advisor Toggle & Update ---
advisorToggleBtn.addEventListener('click', () => {
    const newState = !Advisor.isEnabled();
    Advisor.setEnabled(newState);
    advisorToggleBtn.textContent = newState ? 'Advisor: ON' : 'Advisor: OFF';
    if (newState) {
        advisorToggleBtn.style.borderColor = 'rgba(6, 182, 212, 0.5)';
        advisorToggleBtn.style.color = 'var(--accent)';
        if (game.state === 'playing') {
            advisorPanel.classList.remove('hidden');
            updateAdvisor(null);
        }
    } else {
        advisorToggleBtn.style.borderColor = '';
        advisorToggleBtn.style.color = '';
        advisorPanel.classList.add('hidden');
        clearAdvisorHighlight();
    }
});

function updateAdvisor(lastResult) {
    if (!Advisor.isEnabled() || game.state !== 'playing') return;
    advisorPanel.classList.remove('hidden');

    const rec = Advisor.getRecommendation(game.enemyBoard, game.fleetTypes, lastResult);
    if (!rec) {
        advisorTarget.textContent = '--';
        advisorConfidence.innerHTML = '';
        advisorTip.textContent = 'No recommendation available.';
        clearAdvisorHighlight();
        return;
    }

    advisorTarget.textContent = rec.coordLabel;
    advisorConfidence.innerHTML = `Confidence: <strong>${rec.confidence}%</strong>`;
    advisorTip.textContent = rec.tip;

    // Highlight recommended cell on enemy board
    clearAdvisorHighlight();
    const cellIdx = rec.row * game.enemyBoard.size + rec.col;
    const cellEl = enemyBoardEl.children[cellIdx];
    if (cellEl) cellEl.classList.add('advisor-highlight');

    // Show subtle probability heatmap on empty cells
    if (rec.probMap) {
        const size = game.enemyBoard.size;
        let maxVal = 0;
        for (let r = 0; r < size; r++) {
            for (let c = 0; c < size; c++) {
                if (rec.probMap[r][c] > maxVal) maxVal = rec.probMap[r][c];
            }
        }
        if (maxVal > 0) {
            for (let r = 0; r < size; r++) {
                for (let c = 0; c < size; c++) {
                    const idx = r * size + c;
                    const el = enemyBoardEl.children[idx];
                    if (!el || !el.classList.contains('empty')) continue;
                    const ratio = rec.probMap[r][c] / maxVal;
                    el.classList.remove('prob-low', 'prob-med', 'prob-high');
                    if (ratio > 0.6) el.classList.add('prob-high');
                    else if (ratio > 0.3) el.classList.add('prob-med');
                    else if (ratio > 0.05) el.classList.add('prob-low');
                }
            }
        }
    }
}

function clearAdvisorHighlight() {
    enemyBoardEl.querySelectorAll('.cell').forEach(cell => {
        cell.classList.remove('advisor-highlight', 'prob-low', 'prob-med', 'prob-high');
    });
}

// Initial setup
initBoards();
updateSetupStatus();
updateDifficultyDisplay();
