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
    currentDirection: null, // 'horizontal' or 'vertical'

    // Hard mode enhancements
    allHits: [], // All unsunk hit cells for hard mode tracking
    sunkShipCells: new Set(), // Cells belonging to already-sunk ships
    remainingShips: [], // Lengths of ships not yet sunk
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

    // Hard mode init
    aiState.allHits = [];
    aiState.sunkShipCells.clear();
    aiState.remainingShips = gameInstance.fleetTypes.map(ft => ft.length);
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
        move = getHardMove();
    }
    
    // Safety fallback
    if (!move || hasAttacked(move.r, move.c)) {
        move = getRandomMove();
    }

    // No moves available (should not happen during normal gameplay)
    if (!move) move = { r: 0, c: 0 };

    aiState.attacks.add(`${move.r},${move.c}`);
    return move;
}

function notifyAIResult(r, c, result) {
    if (aiState.difficulty === 'easy') return;
    if (!result) return;

    if (aiState.difficulty === 'hard') {
        notifyHardAIResult(r, c, result);
        return;
    }

    // Medium difficulty logic
    if (result.result === 'hit') {
        if (result.sunk) {
            // Only reset if no other unsunk hits remain in potentialTargets vicinity
            // Remove any potential targets that were adjacent to the sunk ship only
            aiState.potentialTargets = aiState.potentialTargets.filter(t => !hasAttacked(t.r, t.c));
            
            // Check if we still have unexplored hits (from a different ship)
            const hasRemainingTargets = aiState.potentialTargets.length > 0;
            if (!hasRemainingTargets) {
                aiState.mode = 'hunt';
                aiState.hitStack = [];
                aiState.potentialTargets = [];
                aiState.firstHit = null;
                aiState.currentDirection = null;
            } else {
                // Continue targeting — there may be another ship nearby
                aiState.firstHit = null;
                aiState.currentDirection = null;
            }
        } else {
            aiState.mode = 'target';
            if (!aiState.firstHit) {
                aiState.firstHit = {r, c};
                addAdjacentTargets(r, c);
            } else {
                determineDirection(r, c);
                addDirectionalTargets(r, c);
            }
        }
    } else if (result.result === 'miss') {
        if (aiState.mode === 'target' && aiState.currentDirection) {
            reverseDirection();
            if (aiState.firstHit) {
                addDirectionalTargets(aiState.firstHit.r, aiState.firstHit.c);
            }
        }
    }
}

// ============================================================
// HARD MODE — Probability density-based AI
// ============================================================

function getHardMove() {
    // If we have unsunk hits, try to sink those ships first
    if (aiState.allHits.length > 0) {
        const targetMove = getHardTargetMove();
        if (targetMove) return targetMove;
    }
    // Hunt mode: use probability density map
    return getHardHuntMove();
}

// Build a probability density map for the player board from the AI perspective
function buildProbabilityMap() {
    const size = aiState.boardSize;
    const prob = Array(size).fill(null).map(() => Array(size).fill(0));

    for (const shipLen of aiState.remainingShips) {
        // Horizontal placements
        for (let r = 0; r < size; r++) {
            for (let c = 0; c <= size - shipLen; c++) {
                let valid = true;
                let touchesUnsunkHit = false;
                for (let i = 0; i < shipLen; i++) {
                    const key = r + ',' + (c + i);
                    if (aiState.attacks.has(key) && !aiState.allHits.some(h => h.r === r && h.c === c + i)) {
                        valid = false; break;
                    }
                    if (aiState.sunkShipCells.has(key)) {
                        valid = false; break;
                    }
                    if (aiState.allHits.some(h => h.r === r && h.c === c + i)) {
                        touchesUnsunkHit = true;
                    }
                }
                if (valid) {
                    const weight = touchesUnsunkHit ? 25 : 1;
                    for (let i = 0; i < shipLen; i++) {
                        if (!aiState.attacks.has(r + ',' + (c + i))) {
                            prob[r][c + i] += weight;
                        }
                    }
                }
            }
        }
        // Vertical placements
        for (let r = 0; r <= size - shipLen; r++) {
            for (let c = 0; c < size; c++) {
                let valid = true;
                let touchesUnsunkHit = false;
                for (let i = 0; i < shipLen; i++) {
                    const key = (r + i) + ',' + c;
                    if (aiState.attacks.has(key) && !aiState.allHits.some(h => h.r === r + i && h.c === c)) {
                        valid = false; break;
                    }
                    if (aiState.sunkShipCells.has(key)) {
                        valid = false; break;
                    }
                    if (aiState.allHits.some(h => h.r === r + i && h.c === c)) {
                        touchesUnsunkHit = true;
                    }
                }
                if (valid) {
                    const weight = touchesUnsunkHit ? 25 : 1;
                    for (let i = 0; i < shipLen; i++) {
                        if (!aiState.attacks.has((r + i) + ',' + c)) {
                            prob[r + i][c] += weight;
                        }
                    }
                }
            }
        }
    }
    return prob;
}

function getHardHuntMove() {
    const prob = buildProbabilityMap();
    const size = aiState.boardSize;

    let maxProb = 0;
    for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
            if (prob[r][c] > maxProb) maxProb = prob[r][c];
        }
    }
    if (maxProb === 0) return getRandomMove();

    const candidates = [];
    for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
            if (prob[r][c] === maxProb) candidates.push({ r, c });
        }
    }

    // Break ties with parity based on smallest remaining ship
    const minShipLen = Math.min(...aiState.remainingShips);
    const parityCandidates = candidates.filter(
        cell => (cell.r + cell.c) % minShipLen === 0
    );
    const pool = parityCandidates.length > 0 ? parityCandidates : candidates;
    return pool[Math.floor(Math.random() * pool.length)];
}

function getHardTargetMove() {
    const prob = buildProbabilityMap();

    // Only consider cells adjacent to unsunk hits
    const adjacentCells = new Set();
    for (const hit of aiState.allHits) {
        const dirs = [[-1,0],[1,0],[0,-1],[0,1]];
        for (const [dr, dc] of dirs) {
            const nr = hit.r + dr;
            const nc = hit.c + dc;
            if (isValidCoord(nr, nc) && !hasAttacked(nr, nc)) {
                adjacentCells.add(nr + ',' + nc);
            }
        }
    }
    if (adjacentCells.size === 0) return null;

    // If we have 2+ collinear hits, prefer extending the line
    const lineExtensions = getLineExtensions();
    if (lineExtensions.length > 0) {
        let best = null;
        let bestVal = -1;
        for (const cell of lineExtensions) {
            if (prob[cell.r][cell.c] > bestVal) {
                bestVal = prob[cell.r][cell.c];
                best = cell;
            }
        }
        if (best) return best;
    }

    // Otherwise pick highest probability from adjacent cells
    let best = null;
    let bestVal = -1;
    for (const key of adjacentCells) {
        const parts = key.split(',');
        const r = parseInt(parts[0]);
        const c = parseInt(parts[1]);
        if (prob[r][c] > bestVal) {
            bestVal = prob[r][c];
            best = { r, c };
        }
    }
    return best;
}

// Find cells that extend a line of 2+ collinear unsunk hits
function getLineExtensions() {
    const hits = aiState.allHits;
    if (hits.length < 2) return [];
    const extensions = [];

    // Group hits by row
    const byRow = {};
    for (const h of hits) {
        if (!byRow[h.r]) byRow[h.r] = [];
        byRow[h.r].push(h.c);
    }
    for (const row in byRow) {
        const cols = byRow[row].sort((a, b) => a - b);
        if (cols.length < 2) continue;
        let start = 0;
        for (let i = 1; i <= cols.length; i++) {
            if (i === cols.length || cols[i] !== cols[i-1] + 1) {
                if (i - start >= 2) {
                    const r = parseInt(row);
                    const minC = cols[start];
                    const maxC = cols[i-1];
                    if (isValidCoord(r, minC - 1) && !hasAttacked(r, minC - 1)) {
                        extensions.push({ r, c: minC - 1 });
                    }
                    if (isValidCoord(r, maxC + 1) && !hasAttacked(r, maxC + 1)) {
                        extensions.push({ r, c: maxC + 1 });
                    }
                }
                start = i;
            }
        }
    }

    // Group hits by column
    const byCol = {};
    for (const h of hits) {
        if (!byCol[h.c]) byCol[h.c] = [];
        byCol[h.c].push(h.r);
    }
    for (const col in byCol) {
        const rows = byCol[col].sort((a, b) => a - b);
        if (rows.length < 2) continue;
        let start = 0;
        for (let i = 1; i <= rows.length; i++) {
            if (i === rows.length || rows[i] !== rows[i-1] + 1) {
                if (i - start >= 2) {
                    const c = parseInt(col);
                    const minR = rows[start];
                    const maxR = rows[i-1];
                    if (isValidCoord(minR - 1, c) && !hasAttacked(minR - 1, c)) {
                        extensions.push({ r: minR - 1, c });
                    }
                    if (isValidCoord(maxR + 1, c) && !hasAttacked(maxR + 1, c)) {
                        extensions.push({ r: maxR + 1, c });
                    }
                }
                start = i;
            }
        }
    }
    return extensions;
}

function notifyHardAIResult(r, c, result) {
    if (result.result === 'hit') {
        if (result.sunk) {
            const sunkShip = result.ship;
            const sunkCoords = sunkShip.coordinates;
            for (const coord of sunkCoords) {
                const key = coord.r + ',' + coord.c;
                aiState.sunkShipCells.add(key);
                aiState.allHits = aiState.allHits.filter(h => !(h.r === coord.r && h.c === coord.c));
            }
            // Remove this ship length from remaining
            const idx = aiState.remainingShips.indexOf(sunkShip.length);
            if (idx !== -1) aiState.remainingShips.splice(idx, 1);
        } else {
            aiState.allHits.push({ r, c });
        }
    }
}

// --- Movement Strategies (Easy/Medium) ---

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

function getTargetedMove() {
    while (aiState.potentialTargets.length > 0) {
        const target = aiState.potentialTargets.pop();
        if (!hasAttacked(target.r, target.c)) {
            return target;
        }
    }
    return null;
}

// --- Targeting Logic (Medium) ---

function addAdjacentTargets(r, c) {
    const directions = [
        {dr: -1, dc: 0},
        {dr: 0, dc: 1},
        {dr: 1, dc: 0},
        {dr: 0, dc: -1}
    ];

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
    
    if (aiState.currentDirection === 'horizontal') {
        aiState.potentialTargets = aiState.potentialTargets.filter(t => t.r === aiState.firstHit.r);
    } else if (aiState.currentDirection === 'vertical') {
        aiState.potentialTargets = aiState.potentialTargets.filter(t => t.c === aiState.firstHit.c);
    }
}

function addDirectionalTargets(r, c) {
    const candidates = [];
    if (aiState.currentDirection === 'horizontal') {
        candidates.push({r, c: c - 1}, {r, c: c + 1});
        if (aiState.firstHit) {
            candidates.push(
                {r: aiState.firstHit.r, c: aiState.firstHit.c - 1},
                {r: aiState.firstHit.r, c: aiState.firstHit.c + 1}
            );
        }
    } else if (aiState.currentDirection === 'vertical') {
        candidates.push({r: r - 1, c}, {r: r + 1, c});
        if (aiState.firstHit) {
            candidates.push(
                {r: aiState.firstHit.r - 1, c: aiState.firstHit.c},
                {r: aiState.firstHit.r + 1, c: aiState.firstHit.c}
            );
        }
    }
    // Deduplicate and add only valid, unattacked, non-duplicate targets
    for (const t of candidates) {
        if (isValidCoord(t.r, t.c) && !hasAttacked(t.r, t.c)) {
            const isDup = aiState.potentialTargets.some(pt => pt.r === t.r && pt.c === t.c);
            if (!isDup) aiState.potentialTargets.push(t);
        }
    }
}

function reverseDirection() {
    if (!aiState.currentDirection || !aiState.firstHit) return;
    // Keep the same axis but prune already-attacked targets so the AI
    // explores the opposite end of the line from firstHit.
    aiState.potentialTargets = aiState.potentialTargets.filter(t => !hasAttacked(t.r, t.c));
}
