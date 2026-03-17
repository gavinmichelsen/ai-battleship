// AI implementation

let aiState = {
    difficulty: 'easy',
    game: null,
    boardSize: 10,
    attacks: new Set(), // Store "r,c" strings of past attacks
    mode: 'hunt', // 'hunt' or 'target'
    hitStack: [], // Queue of hits to explore around
    potentialTargets: [], // Adjacent cells to hits
    firstHit: null, // Track the first hit of current targeted ship
    currentDirection: null // 'up', 'down', 'left', 'right'
};

function initAI(difficulty, gameInstance) {
    aiState.difficulty = difficulty;
    aiState.game = gameInstance;
    aiState.boardSize = gameInstance.playerBoard.size;
    aiState.attacks.clear();
    aiState.mode = 'hunt';
    aiState.hitStack = [];
    aiState.potentialTargets = [];
    aiState.firstHit = null;
    aiState.currentDirection = null;
}

function hasAttacked(r, c) {
    return aiState.attacks.has(`${r},${c}`);
}

function isValidCoord(r, c) {
    return r >= 0 && r < aiState.boardSize && c >= 0 && c < aiState.boardSize;
}

function getAIMove() {
    let move;
    if (aiState.difficulty === 'easy') {
        move = getRandomMove();
    } else if (aiState.difficulty === 'medium') {
        if (aiState.mode === 'hunt') {
            move = getRandomMove();
        } else {
            move = getTargetedMove();
            if (!move) {
                aiState.mode = 'hunt';
                move = getRandomMove();
            }
        }
    } else if (aiState.difficulty === 'hard') {
        if (aiState.mode === 'hunt') {
            move = getCheckerboardMove();
            if (!move) move = getRandomMove(); // Fallback if checkerboard is full
        } else {
            move = getSmartTargetedMove();
            if (!move) {
                aiState.mode = 'hunt';
                move = getCheckerboardMove() || getRandomMove();
            }
        }
    }
    
    // Safety fallback
    if (!move || hasAttacked(move.r, move.c)) {
        move = getRandomMove();
    }

    // No moves available (should not happen during normal gameplay)
    if (!move) return { r: 0, c: 0 };

    aiState.attacks.add(`${move.r},${move.c}`);
    return move;
}

function notifyAIResult(r, c, result) {
    if (aiState.difficulty === 'easy') return;
    if (!result) return;

    if (result.result === 'hit') {
        if (result.sunk) {
            // Ship sunk, go back to hunt mode
            aiState.mode = 'hunt';
            aiState.hitStack = [];
            aiState.potentialTargets = [];
            aiState.firstHit = null;
            aiState.currentDirection = null;
            
            // Note: A smarter AI would remove adjacent cells of the sunk ship from future targeting
        } else {
            // Hit but not sunk, switch/stay in target mode
            aiState.mode = 'target';
            if (!aiState.firstHit) {
                aiState.firstHit = {r, c};
                addAdjacentTargets(r, c);
            } else {
                // We have a second hit, we can determine direction
                determineDirection(r, c);
                addDirectionalTargets(r, c);
            }
        }
    } else if (result.result === 'miss') {
        if (aiState.mode === 'target' && aiState.currentDirection) {
            // Missed while targeting a specific direction, reverse direction
            reverseDirection();
            // Add targets from the first hit in the new direction
            if (aiState.firstHit) {
                addDirectionalTargets(aiState.firstHit.r, aiState.firstHit.c);
            }
        }
    }
}

// --- Movement Strategies ---

function getRandomMove() {
    const available = [];
    for (let r = 0; r < aiState.boardSize; r++) {
        for (let c = 0; c < aiState.boardSize; c++) {
            if (!hasAttacked(r, c)) {
                available.push({ r, c });
            }
        }
    }
    if (available.length === 0) return null;
    return available[Math.floor(Math.random() * available.length)];
}

function getCheckerboardMove() {
    let possibleMoves = [];
    for (let r = 0; r < aiState.boardSize; r++) {
        for (let c = 0; c < aiState.boardSize; c++) {
            // Checkerboard pattern: parity (r+c) is even
            if ((r + c) % 2 === 0 && !hasAttacked(r, c)) {
                possibleMoves.push({r, c});
            }
        }
    }
    
    if (possibleMoves.length === 0) return null;
    return possibleMoves[Math.floor(Math.random() * possibleMoves.length)];
}

function getTargetedMove() {
    while (aiState.potentialTargets.length > 0) {
        const target = aiState.potentialTargets.pop();
        if (!hasAttacked(target.r, target.c)) {
            return target;
        }
    }
    return null;
}

function getSmartTargetedMove() {
    // Similar to medium for now, but prioritized by direction
    return getTargetedMove();
}

// --- Targeting Logic ---

function addAdjacentTargets(r, c) {
    // Up, Right, Down, Left
    const directions = [
        {dr: -1, dc: 0},
        {dr: 0, dc: 1},
        {dr: 1, dc: 0},
        {dr: 0, dc: -1}
    ];

    // Randomize order for medium difficulty unpredictability
    directions.sort(() => Math.random() - 0.5);

    directions.forEach(dir => {
        let nr = r + dir.dr;
        let nc = c + dir.dc;
        if (isValidCoord(nr, nc) && !hasAttacked(nr, nc)) {
            aiState.potentialTargets.push({r: nr, c: nc});
        }
    });
}

function determineDirection(r, c) {
    if (!aiState.firstHit) return;
    
    if (r === aiState.firstHit.r) {
        aiState.currentDirection = 'horizontal';
    } else if (c === aiState.firstHit.c) {
        aiState.currentDirection = 'vertical';
    }
    
    // Filter out targets that don't align with the determined direction
    if (aiState.currentDirection === 'horizontal') {
        aiState.potentialTargets = aiState.potentialTargets.filter(t => t.r === aiState.firstHit.r);
    } else if (aiState.currentDirection === 'vertical') {
        aiState.potentialTargets = aiState.potentialTargets.filter(t => t.c === aiState.firstHit.c);
    }
}

function addDirectionalTargets(r, c) {
    if (aiState.currentDirection === 'horizontal') {
        if (isValidCoord(r, c - 1) && !hasAttacked(r, c - 1)) aiState.potentialTargets.push({r, c: c - 1});
        if (isValidCoord(r, c + 1) && !hasAttacked(r, c + 1)) aiState.potentialTargets.push({r, c: c + 1});
        if (aiState.firstHit) {
             if (isValidCoord(aiState.firstHit.r, aiState.firstHit.c - 1) && !hasAttacked(aiState.firstHit.r, aiState.firstHit.c - 1)) aiState.potentialTargets.push({r: aiState.firstHit.r, c: aiState.firstHit.c - 1});
             if (isValidCoord(aiState.firstHit.r, aiState.firstHit.c + 1) && !hasAttacked(aiState.firstHit.r, aiState.firstHit.c + 1)) aiState.potentialTargets.push({r: aiState.firstHit.r, c: aiState.firstHit.c + 1});
        }
    } else if (aiState.currentDirection === 'vertical') {
        if (isValidCoord(r - 1, c) && !hasAttacked(r - 1, c)) aiState.potentialTargets.push({r: r - 1, c});
        if (isValidCoord(r + 1, c) && !hasAttacked(r + 1, c)) aiState.potentialTargets.push({r: r + 1, c});
        if (aiState.firstHit) {
            if (isValidCoord(aiState.firstHit.r - 1, aiState.firstHit.c) && !hasAttacked(aiState.firstHit.r - 1, aiState.firstHit.c)) aiState.potentialTargets.push({r: aiState.firstHit.r - 1, c: aiState.firstHit.c});
            if (isValidCoord(aiState.firstHit.r + 1, aiState.firstHit.c) && !hasAttacked(aiState.firstHit.r + 1, aiState.firstHit.c)) aiState.potentialTargets.push({r: aiState.firstHit.r + 1, c: aiState.firstHit.c});
       }
    }
}

function reverseDirection() {
    if (!aiState.currentDirection || !aiState.firstHit) return;
    // Clear targets in the failed direction and add targets from firstHit in the opposite sense
    aiState.potentialTargets = [];
}
