// AI Advisor — helps the player find optimal moves with probability analysis

const Advisor = (() => {
    let enabled = false;
    let lastRecommendation = null;
    let messageHistory = [];

    // Tips shown contextually during gameplay
    const TIPS = {
        opening: [
            "Try targeting the center of the board first — ships are more likely to be there.",
            "A checkerboard pattern is efficient for hunting — it guarantees finding every ship.",
            "Focus on the middle rows and columns where longer ships are most likely hiding.",
            "Start with spread-out shots to cover more ground before zeroing in.",
        ],
        afterHit: [
            "Great hit! Try the cells directly above, below, left, and right of it.",
            "Ships are straight lines — once you have a hit, probe adjacent cells to find the ship's direction.",
            "Don't shoot diagonally from a hit — ships only go horizontal or vertical.",
            "Two hits in a line? Keep going in that direction to finish the ship off.",
        ],
        afterSink: [
            "Ship down! Now switch back to hunting mode — spread your shots out again.",
            "After sinking a ship, remember: no other ship can be adjacent to it (usually).",
            "Focus on areas you haven't explored yet. Cluster shots waste turns.",
            "Check which ships are left — that tells you the minimum gap sizes to look for.",
        ],
        afterMiss: [
            "Miss! That's still useful info — now you know that cell is clear.",
            "Every miss narrows down where ships can be. Keep eliminating possibilities.",
            "If you're stuck, try the largest open area on the board — longer ships need room.",
        ],
        general: [
            "The smallest remaining ship determines your optimal search pattern spacing.",
            "Edges and corners are lower-probability spots — ships have fewer ways to fit there.",
            "Track which ships are left — if only 2-cell ships remain, tighten your search grid.",
            "Probability peaks where the most remaining ships could theoretically overlap.",
        ],
    };

    function isEnabled() {
        return enabled;
    }

    function setEnabled(val) {
        enabled = val;
        lastRecommendation = null;
    }

    // Build a probability density map for the enemy board
    function computeProbabilityMap(enemyBoard, remainingShipLengths) {
        const size = enemyBoard.size;
        const prob = Array(size).fill(null).map(() => Array(size).fill(0));

        // Identify cells that have been attacked
        const attacked = Array(size).fill(null).map(() => Array(size).fill(false));
        const hitCells = [];

        for (let r = 0; r < size; r++) {
            for (let c = 0; c < size; c++) {
                const cell = enemyBoard.grid[r][c];
                if (cell === 'miss') {
                    attacked[r][c] = true;
                } else if (cell !== null && typeof cell === 'object' && cell.hit === true) {
                    attacked[r][c] = true;
                    if (cell.ship && !cell.ship.isSunk()) {
                        hitCells.push({ r, c });
                    }
                }
            }
        }

        // For each remaining ship length, try every possible placement
        for (const shipLen of remainingShipLengths) {
            for (let r = 0; r < size; r++) {
                for (let c = 0; c < size; c++) {
                    // Try horizontal
                    if (c + shipLen <= size) {
                        let valid = true;
                        let touchesHit = false;
                        for (let i = 0; i < shipLen; i++) {
                            const cell = enemyBoard.grid[r][c + i];
                            if (cell === 'miss') { valid = false; break; }
                            if (cell !== null && typeof cell === 'object' && cell.hit === true) {
                                if (cell.ship && cell.ship.isSunk()) { valid = false; break; }
                                touchesHit = true;
                            }
                        }
                        if (valid) {
                            // Weight higher if this placement passes through a known hit
                            const weight = touchesHit ? 20 : 1;
                            for (let i = 0; i < shipLen; i++) {
                                if (!attacked[r][c + i]) {
                                    prob[r][c + i] += weight;
                                }
                            }
                        }
                    }
                    // Try vertical
                    if (r + shipLen <= size) {
                        let valid = true;
                        let touchesHit = false;
                        for (let i = 0; i < shipLen; i++) {
                            const cell = enemyBoard.grid[r + i][c];
                            if (cell === 'miss') { valid = false; break; }
                            if (cell !== null && typeof cell === 'object' && cell.hit === true) {
                                if (cell.ship && cell.ship.isSunk()) { valid = false; break; }
                                touchesHit = true;
                            }
                        }
                        if (valid) {
                            const weight = touchesHit ? 20 : 1;
                            for (let i = 0; i < shipLen; i++) {
                                if (!attacked[r + i][c]) {
                                    prob[r + i][c] += weight;
                                }
                            }
                        }
                    }
                }
            }
        }

        return prob;
    }

    // Get the list of remaining (unsunk) enemy ship lengths
    function getRemainingShipLengths(enemyBoard, fleetTypes) {
        const sunkNames = new Set();
        for (const ship of enemyBoard.ships) {
            if (ship.isSunk()) sunkNames.add(ship.name);
        }
        return fleetTypes
            .filter(ft => !sunkNames.has(ft.name))
            .map(ft => ft.length);
    }

    // Determine the game context for tip selection
    function getContext(lastResult) {
        if (!lastResult) return 'opening';
        if (lastResult.result === 'hit') {
            return lastResult.sunk ? 'afterSink' : 'afterHit';
        }
        return 'afterMiss';
    }

    // Pick a random tip from the category, avoid repeating recent ones
    function pickTip(category) {
        const pool = TIPS[category] || TIPS.general;
        // Filter out recent messages
        const available = pool.filter(t => !messageHistory.includes(t));
        const pick = available.length > 0
            ? available[Math.floor(Math.random() * available.length)]
            : pool[Math.floor(Math.random() * pool.length)];
        messageHistory.push(pick);
        if (messageHistory.length > 6) messageHistory.shift();
        return pick;
    }

    // Main recommendation function — returns { row, col, confidence, tip, probMap }
    function getRecommendation(enemyBoard, fleetTypes, lastResult) {
        if (!enabled) return null;

        const remaining = getRemainingShipLengths(enemyBoard, fleetTypes);
        if (remaining.length === 0) return null;

        const probMap = computeProbabilityMap(enemyBoard, remaining);
        const size = enemyBoard.size;

        // Find the cell with the highest probability
        let bestR = 0, bestC = 0, bestVal = -1;
        for (let r = 0; r < size; r++) {
            for (let c = 0; c < size; c++) {
                if (probMap[r][c] > bestVal) {
                    bestVal = probMap[r][c];
                    bestR = r;
                    bestC = c;
                }
            }
        }

        if (bestVal <= 0) return null;

        // Compute max for confidence percentage
        const maxProb = bestVal;
        const totalCells = size * size;
        const attackedCount = enemyBoard.missedAttacks.length +
            enemyBoard.ships.reduce((sum, s) => sum + s.hits, 0);
        const remainingCells = totalCells - attackedCount;
        const confidence = remainingCells > 0
            ? Math.min(99, Math.round((maxProb / (maxProb + remaining.length)) * 100))
            : 0;

        const context = getContext(lastResult);
        const tip = pickTip(context);

        const cols = 'ABCDEFGHIJ';
        const coordLabel = `${cols[bestC]}${bestR + 1}`;

        lastRecommendation = {
            row: bestR,
            col: bestC,
            confidence,
            tip,
            coordLabel,
            probMap,
            shipsRemaining: remaining.length,
        };

        return lastRecommendation;
    }

    function getLastRecommendation() {
        return lastRecommendation;
    }

    function reset() {
        lastRecommendation = null;
        messageHistory = [];
    }

    return {
        isEnabled,
        setEnabled,
        getRecommendation,
        getLastRecommendation,
        reset,
        computeProbabilityMap,
        getRemainingShipLengths,
    };
})();
