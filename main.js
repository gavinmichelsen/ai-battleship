// Main UI logic

const game = new Game();
let draggedShipInfo = null; // Stores { name, length, isHorizontal, fromBoard }

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
    createBoard(playerBoardEl, 10, null, null); // Handled by Drag & Drop now
    createBoard(enemyBoardEl, 10, handleEnemyBoardClick);
    
    // Setup drag over and drop for player board
    playerBoardEl.addEventListener('dragover', handleDragOver);
    playerBoardEl.addEventListener('dragleave', handleDragLeave);
    playerBoardEl.addEventListener('drop', handleDrop);

    // Setup shipyard
    createShipyard();
    updateShipLists();
}

function createShipyard() {
    shipyard.innerHTML = '';
    game.fleetTypes.forEach(type => {
        const shipEl = createDraggableShip(type.name, type.length, true);
        shipyard.appendChild(shipEl);
    });
    updateSetupStatus();
}

function createDraggableShip(name, length, isHorizontal) {
    const shipEl = document.createElement('div');
    shipEl.classList.add('draggable-ship', isHorizontal ? 'horizontal' : 'vertical');
    shipEl.draggable = true;
    shipEl.dataset.name = name;
    shipEl.dataset.length = length;
    shipEl.dataset.horizontal = isHorizontal;

    for (let i = 0; i < length; i++) {
        const segment = document.createElement('div');
        segment.classList.add('ship-segment');
        shipEl.appendChild(segment);
    }

    shipEl.addEventListener('dragstart', (e) => {
        draggedShipInfo = {
            name: name,
            length: length,
            isHorizontal: shipEl.dataset.horizontal === 'true',
            fromBoard: false,
            element: shipEl
        };
        // Small delay to hide the original element while dragging
        setTimeout(() => shipEl.classList.add('hidden'), 0);
    });

    shipEl.addEventListener('dragend', (e) => {
        shipEl.classList.remove('hidden');
        clearHoverEffects();
        draggedShipInfo = null;
    });

    // Click to rotate in shipyard
    shipEl.addEventListener('click', (e) => {
        if (game.state !== 'setup') return;
        const currentHoriz = shipEl.dataset.horizontal === 'true';
        shipEl.dataset.horizontal = !currentHoriz;
        shipEl.classList.toggle('horizontal');
        shipEl.classList.toggle('vertical');
    });

    return shipEl;
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
            
            // Clear existing state classes
            cellEl.className = 'cell';
            
            // Remove previous event listeners for dragging from board
            cellEl.draggable = false;
            cellEl.onmousedown = null;
            cellEl.ondragstart = null;
            
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
                    
                    // Setup dragging from board during setup phase
                    if (game.state === 'setup') {
                        cellEl.classList.add('ship-hover'); // Give it a clickable cursor look
                        
                        // We only attach the drag start to the "head" or any part, but we move the whole ship
                        cellEl.draggable = true;
                        
                        cellEl.addEventListener('dragstart', (e) => {
                            // Find the ship's orientation by comparing coordinates
                            let isHoriz = true;
                            if (cellData.coordinates.length > 1) {
                                isHoriz = cellData.coordinates[0].r === cellData.coordinates[1].r;
                            }
                            
                            draggedShipInfo = {
                                name: cellData.name,
                                length: cellData.length,
                                isHorizontal: isHoriz,
                                fromBoard: true
                            };
                            
                            // Remove it from the board logic immediately so we can validate new drops
                            game.playerBoard.removeShip(cellData.name);
                            // We don't render yet so the drag image stays intact, 
                            // it will re-render on drop or dragend
                        });
                        
                        cellEl.addEventListener('dragend', (e) => {
                            // If it wasn't dropped successfully, it stays removed, put it back in shipyard
                            if (draggedShipInfo) {
                                addShipToShipyard(draggedShipInfo.name, draggedShipInfo.length, draggedShipInfo.isHorizontal);
                                renderBoard(game.playerBoard, playerBoardEl);
                                updateSetupStatus();
                                draggedShipInfo = null;
                            }
                        });

                        // Click to rotate placed ship
                        cellEl.addEventListener('click', (e) => {
                            if (game.state !== 'setup') return;
                            e.preventDefault();
                            
                            // Determine orientation
                            let isHoriz = true;
                            if (cellData.coordinates.length > 1) {
                                isHoriz = cellData.coordinates[0].r === cellData.coordinates[1].r;
                            }

                            // Temporarily remove to check if rotated placement is valid
                            const originR = cellData.coordinates[0].r;
                            const originC = cellData.coordinates[0].c;
                            game.playerBoard.removeShip(cellData.name);

                            const ship = new Ship(cellData.name, cellData.length);
                            if (game.playerBoard.isValidPlacement(cellData.length, originR, originC, !isHoriz)) {
                                // Valid rotation
                                game.playerBoard.placeShip(ship, originR, originC, !isHoriz);
                            } else {
                                // Invalid, put back as was
                                game.playerBoard.placeShip(ship, originR, originC, isHoriz);
                            }
                            renderBoard(game.playerBoard, playerBoardEl);
                        });
                    }
                } else {
                    cellEl.classList.add('empty'); // Hide enemy ships
                }
            }
        }
    }
}

// --- Drag and Drop Handlers ---
function handleDragOver(e) {
    e.preventDefault(); // Necessary to allow dropping
    if (!draggedShipInfo || game.state !== 'setup') return;

    const cell = e.target.closest('.cell');
    if (!cell) return;

    const r = parseInt(cell.dataset.r);
    const c = parseInt(cell.dataset.c);

    clearHoverEffects();
    const isValid = game.playerBoard.isValidPlacement(draggedShipInfo.length, r, c, draggedShipInfo.isHorizontal);

    for (let i = 0; i < draggedShipInfo.length; i++) {
        let tr = draggedShipInfo.isHorizontal ? r : r + i;
        let tc = draggedShipInfo.isHorizontal ? c + i : c;
        
        if (tr < 10 && tc < 10) {
            const hoverCell = playerBoardEl.children[tr * 10 + tc];
            if (isValid) {
                hoverCell.classList.add('ship-hover');
            } else {
                hoverCell.classList.add('invalid-hover');
            }
        }
    }
}

function handleDragLeave(e) {
    clearHoverEffects();
}

function handleDrop(e) {
    e.preventDefault();
    if (!draggedShipInfo || game.state !== 'setup') return;

    const cell = e.target.closest('.cell');
    if (!cell) return;

    const r = parseInt(cell.dataset.r);
    const c = parseInt(cell.dataset.c);

    const ship = new Ship(draggedShipInfo.name, draggedShipInfo.length);
    if (game.playerBoard.placeShip(ship, r, c, draggedShipInfo.isHorizontal)) {
        // Success
        if (!draggedShipInfo.fromBoard) {
            // Remove from shipyard
            if (draggedShipInfo.element && draggedShipInfo.element.parentNode) {
                draggedShipInfo.element.parentNode.removeChild(draggedShipInfo.element);
            }
        }
        draggedShipInfo = null; // Clear so dragend knows it was successful
        renderBoard(game.playerBoard, playerBoardEl);
        updateSetupStatus();
    }
    clearHoverEffects();
}

function addShipToShipyard(name, length, isHorizontal) {
    // Check if it already exists to prevent duplicates
    if (!shipyard.querySelector(`[data-name="${name}"]`)) {
        const shipEl = createDraggableShip(name, length, isHorizontal);
        shipyard.appendChild(shipEl);
    }
}

function clearHoverEffects() {
    const cells = playerBoardEl.querySelectorAll('.cell');
    cells.forEach(cell => {
        cell.classList.remove('ship-hover', 'invalid-hover');
    });
}

function updateSetupStatus() {
    const unplacedShips = game.fleetTypes.length - game.playerBoard.ships.length;
    
    if (unplacedShips > 0) {
        statusMessage.textContent = `Place your ships! (${unplacedShips} remaining)`;
        startBtn.disabled = true;
    } else {
        statusMessage.textContent = "All ships placed. Ready to start!";
        startBtn.disabled = false;
    }
}

// Event Listeners for Controls
rotateBtn.addEventListener('click', () => {
    // Rotates all ships currently in the shipyard
    const shipyardShips = shipyard.querySelectorAll('.draggable-ship');
    shipyardShips.forEach(shipEl => {
        const currentHoriz = shipEl.dataset.horizontal === 'true';
        shipEl.dataset.horizontal = !currentHoriz;
        shipEl.classList.toggle('horizontal');
        shipEl.classList.toggle('vertical');
    });
    
    // Toggle global orientation state for consistency if we wanted to add ships back
    const firstShip = shipyard.querySelector('.draggable-ship');
    if (firstShip) {
        const isHoriz = firstShip.dataset.horizontal === 'true';
        rotateBtn.textContent = `Rotate Shipyard Ships (Current: ${isHoriz ? 'Horizontal' : 'Vertical'})`;
    }
});

randomizeBtn.addEventListener('click', () => {
    game.playerBoard.placeFleetRandomly(game.fleetTypes);
    shipyard.innerHTML = ''; // Clear shipyard
    renderBoard(game.playerBoard, playerBoardEl);
    updateSetupStatus();
});

clearBtn.addEventListener('click', () => {
    game.playerBoard.clear();
    createShipyard();
    renderBoard(game.playerBoard, playerBoardEl);
    updateSetupStatus();
});

startBtn.addEventListener('click', () => {
    if (game.start()) {
        // Init AI
        const difficulty = aiDifficultySelect.value;
        initAI(difficulty, game);
        
        setupControls.classList.add('hidden');
        shipyardContainer.classList.add('hidden');
        gameControls.classList.remove('hidden');
        fleetStatus.classList.remove('hidden');
        enemyBoardEl.classList.remove('disabled');
        
        statusMessage.textContent = "Your turn! Select a target on the enemy board.";
        
        // Re-render player board to remove drag functionality
        renderBoard(game.playerBoard, playerBoardEl);
        renderBoard(game.enemyBoard, enemyBoardEl, true); // Hide enemy ships
        updateShipLists();
    }
});

restartBtn.addEventListener('click', () => {
    // Reset everything
    game.playerBoard.clear();
    game.enemyBoard.clear();
    game.state = 'setup';
    
    // Reset status message color
    statusMessage.style.color = 'var(--text-color)';
    
    setupControls.classList.remove('hidden');
    shipyardContainer.classList.remove('hidden');
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