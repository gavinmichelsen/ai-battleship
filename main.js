// Main UI logic

const game = new Game();
let selectedShip = null; // { name, length, isHorizontal, fromBoard }

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

// Initialize boards
function initBoards() {
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

        const label = document.createElement('div');
        label.classList.add('shipyard-label');
        label.textContent = `${type.name} (${type.length})`;

        const shipEl = document.createElement('div');
        shipEl.classList.add('draggable-ship', 'horizontal');
        shipEl.dataset.name = type.name;
        shipEl.dataset.length = type.length;
        shipEl.dataset.horizontal = 'true';

        for (let i = 0; i < type.length; i++) {
            const segment = document.createElement('div');
            segment.classList.add('ship-segment');
            shipEl.appendChild(segment);
        }

        // Click to select this ship for placement
        shipEl.addEventListener('click', () => {
            if (game.state !== 'setup') return;
            selectShipFromShipyard(type.name, type.length, shipEl);
        });

        wrapper.appendChild(label);
        wrapper.appendChild(shipEl);
        shipyard.appendChild(wrapper);
    });
    updateSetupStatus();
}

function selectShipFromShipyard(name, length, element) {
    // If clicking the already-selected ship, deselect it
    if (selectedShip && selectedShip.name === name && !selectedShip.fromBoard) {
        deselectShip();
        return;
    }

    // If we had a board ship selected, put it back first
    if (selectedShip && selectedShip.fromBoard) {
        cancelBoardPickup();
    }

    const isHoriz = element.dataset.horizontal === 'true';
    selectedShip = { name, length, isHorizontal: isHoriz, fromBoard: false, element };

    // Highlight the selected ship in the shipyard
    shipyard.querySelectorAll('.draggable-ship').forEach(el => el.classList.remove('selected'));
    element.classList.add('selected');

    clearHoverEffects();
    updateSetupStatus();
}

function deselectShip() {
    if (!selectedShip) return;
    shipyard.querySelectorAll('.draggable-ship').forEach(el => el.classList.remove('selected'));
    selectedShip = null;
    clearHoverEffects();
    updateSetupStatus();
}

function cancelBoardPickup() {
    if (!selectedShip || !selectedShip.fromBoard) return;
    // Re-place the ship back where it was
    const ship = new Ship(selectedShip.name, selectedShip.length);
    game.playerBoard.placeShip(ship, selectedShip.originR, selectedShip.originC, selectedShip.isHorizontal);
    selectedShip = null;
    shipyard.querySelectorAll('.draggable-ship').forEach(el => el.classList.remove('selected'));
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

            if (clickHandler) {
                cell.addEventListener('click', () => clickHandler(r, c));
            }
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
                    cellEl.classList.add('empty');
                }
            }
        }
    }
}

// --- Setup Phase: Hover Preview ---
function handlePlayerBoardHover(r, c) {
    if (game.state !== 'setup' || !selectedShip) return;

    clearHoverEffects();
    const isValid = game.playerBoard.isValidPlacement(selectedShip.length, r, c, selectedShip.isHorizontal);

    for (let i = 0; i < selectedShip.length; i++) {
        let tr = selectedShip.isHorizontal ? r : r + i;
        let tc = selectedShip.isHorizontal ? c + i : c;

        if (tr >= 0 && tr < 10 && tc >= 0 && tc < 10) {
            const hoverCell = playerBoardEl.children[tr * 10 + tc];
            hoverCell.classList.add(isValid ? 'ship-hover' : 'invalid-hover');
        }
    }
}

// --- Setup Phase: Click to Place or Pick Up ---
function handlePlayerBoardClick(r, c) {
    if (game.state !== 'setup') return;

    const cellData = game.playerBoard.grid[r][c];

    // If no ship selected, check if clicking a placed ship to pick it up
    if (!selectedShip) {
        if (cellData instanceof Ship) {
            pickUpShipFromBoard(cellData);
        }
        return;
    }

    // Try to place the selected ship
    const ship = new Ship(selectedShip.name, selectedShip.length);
    if (game.playerBoard.placeShip(ship, r, c, selectedShip.isHorizontal)) {
        // Success — remove from shipyard if it came from there
        if (!selectedShip.fromBoard) {
            const wrapper = selectedShip.element.closest('.shipyard-item');
            if (wrapper) wrapper.remove();
        }
        selectedShip = null;
        shipyard.querySelectorAll('.draggable-ship').forEach(el => el.classList.remove('selected'));
        clearHoverEffects();
        renderBoard(game.playerBoard, playerBoardEl);
        updateSetupStatus();
    }
}

function pickUpShipFromBoard(shipData) {
    // Determine orientation
    let isHoriz = true;
    if (shipData.coordinates.length > 1) {
        isHoriz = shipData.coordinates[0].r === shipData.coordinates[1].r;
    }

    const originR = shipData.coordinates[0].r;
    const originC = shipData.coordinates[0].c;

    // Remove from board
    game.playerBoard.removeShip(shipData.name);

    selectedShip = {
        name: shipData.name,
        length: shipData.length,
        isHorizontal: isHoriz,
        fromBoard: true,
        originR: originR,
        originC: originC
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
    const unplacedShips = game.fleetTypes.length - game.playerBoard.ships.length;

    if (selectedShip) {
        statusMessage.textContent = `Placing ${selectedShip.name} (${selectedShip.length} spaces) — hover over board and click to place. Press R to rotate.`;
        startBtn.disabled = true;
    } else if (unplacedShips > 0) {
        statusMessage.textContent = `Click a ship in the Shipyard to place it! (${unplacedShips} remaining)`;
        startBtn.disabled = true;
    } else {
        statusMessage.textContent = "All ships placed. Ready to start!";
        startBtn.disabled = false;
    }
}

// --- Controls ---
rotateBtn.addEventListener('click', () => {
    if (selectedShip) {
        // Rotate the currently selected ship
        selectedShip.isHorizontal = !selectedShip.isHorizontal;
        // Also update the shipyard element if it came from there
        if (selectedShip.element) {
            selectedShip.element.dataset.horizontal = selectedShip.isHorizontal;
            selectedShip.element.classList.toggle('horizontal');
            selectedShip.element.classList.toggle('vertical');
        }
        rotateBtn.textContent = `Rotate Ship (Current: ${selectedShip.isHorizontal ? 'Horizontal' : 'Vertical'})`;
    } else {
        // Rotate all ships in shipyard
        shipyard.querySelectorAll('.draggable-ship').forEach(shipEl => {
            const currentHoriz = shipEl.dataset.horizontal === 'true';
            shipEl.dataset.horizontal = !currentHoriz;
            shipEl.classList.toggle('horizontal');
            shipEl.classList.toggle('vertical');
        });
        const firstShip = shipyard.querySelector('.draggable-ship');
        if (firstShip) {
            const isHoriz = firstShip.dataset.horizontal === 'true';
            rotateBtn.textContent = `Rotate Ship (Current: ${isHoriz ? 'Horizontal' : 'Vertical'})`;
        }
    }
    clearHoverEffects();
});

// Keyboard shortcut: R to rotate
document.addEventListener('keydown', (e) => {
    if (e.key === 'r' || e.key === 'R') {
        if (game.state === 'setup') rotateBtn.click();
    }
    if (e.key === 'Escape') {
        if (selectedShip && selectedShip.fromBoard) {
            cancelBoardPickup();
        } else {
            deselectShip();
        }
    }
});

randomizeBtn.addEventListener('click', () => {
    selectedShip = null;
    game.playerBoard.placeFleetRandomly(game.fleetTypes);
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

        setupControls.classList.add('hidden');
        shipyardContainer.classList.add('hidden');
        gameControls.classList.remove('hidden');
        fleetStatus.classList.remove('hidden');
        enemyBoardEl.classList.remove('disabled');

        statusMessage.textContent = "Your turn! Select a target on the enemy board.";
        renderBoard(game.playerBoard, playerBoardEl);
        renderBoard(game.enemyBoard, enemyBoardEl, true);
        updateShipLists();
    }
});

restartBtn.addEventListener('click', () => {
    game.playerBoard.clear();
    game.enemyBoard.clear();
    game.state = 'setup';
    selectedShip = null;

    statusMessage.style.color = 'var(--text-color)';

    setupControls.classList.remove('hidden');
    shipyardContainer.classList.remove('hidden');
    gameControls.classList.add('hidden');
    fleetStatus.classList.add('hidden');
    enemyBoardEl.classList.add('disabled');

    initBoards();
    updateSetupStatus();
});

// --- Battle Phase ---
function handleEnemyBoardClick(r, c) {
    if (game.state !== 'playing' || game.currentTurn !== 'player') return;

    const result = game.playTurn(r, c);
    if (!result) return;

    renderBoard(game.enemyBoard, enemyBoardEl, true);
    updateShipLists();

    if (game.state === 'gameover') {
        endGame(result.winner);
    } else {
        statusMessage.textContent = "Enemy is thinking...";
        enemyBoardEl.classList.add('disabled');
        setTimeout(() => executeAITurn(), 800);
    }
}

function executeAITurn() {
    if (game.state !== 'playing') return;

    const { r, c } = getAIMove();
    const result = game.enemyTurn(r, c);
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

    renderBoard(game.enemyBoard, enemyBoardEl, false);
    enemyBoardEl.classList.add('disabled');
}

// Initial setup
initBoards();
updateSetupStatus();