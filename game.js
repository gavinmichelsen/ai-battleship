// Ship classes and game board logic

class Ship {
    constructor(name, length) {
        this.name = name;
        this.length = length;
        this.hits = 0;
        this.coordinates = [];
    }

    hit() {
        this.hits++;
    }

    isSunk() {
        return this.hits >= this.length;
    }
}

class GameBoard {
    constructor(size = 10) {
        this.size = size;
        this.grid = Array(size).fill(null).map(() => Array(size).fill(null));
        this.ships = [];
        this.missedAttacks = [];
    }

    // Place ship if valid
    placeShip(ship, row, col, isHorizontal) {
        if (!this.isValidPlacement(ship.length, row, col, isHorizontal)) {
            return false;
        }

        const coordinates = [];
        for (let i = 0; i < ship.length; i++) {
            if (isHorizontal) {
                this.grid[row][col + i] = ship;
                coordinates.push({ r: row, c: col + i });
            } else {
                this.grid[row + i][col] = ship;
                coordinates.push({ r: row + i, c: col });
            }
        }
        
        ship.coordinates = coordinates;
        this.ships.push(ship);
        return true;
    }

    // Check if placement is valid (within bounds, no overlap)
    isValidPlacement(length, row, col, isHorizontal) {
        // Check bounds
        if (row < 0 || row >= this.size || col < 0 || col >= this.size) return false;
        
        if (isHorizontal) {
            if (col + length > this.size) return false;
        } else {
            if (row + length > this.size) return false;
        }

        // Check overlap
        for (let i = 0; i < length; i++) {
            let r = isHorizontal ? row : row + i;
            let c = isHorizontal ? col + i : col;
            
            if (this.grid[r][c] !== null) {
                return false;
            }
        }

        return true;
    }

    // Remove a ship from the board (useful for dragging and repositioning)
    removeShip(name) {
        const shipIndex = this.ships.findIndex(s => s.name === name);
        if (shipIndex !== -1) {
            const ship = this.ships[shipIndex];
            ship.coordinates.forEach(coord => {
                this.grid[coord.r][coord.c] = null;
            });
            this.ships.splice(shipIndex, 1);
            return ship;
        }
        return null;
    }

    // Receive attack, update board state, return result
    receiveAttack(row, col) {
        // Already attacked
        const cell = this.grid[row][col];
        if ((cell !== null && typeof cell === 'object' && cell.hit === true) || cell === 'miss') {
            return { result: 'already_attacked' };
        }

        const target = this.grid[row][col];

        if (target === null) {
            this.grid[row][col] = 'miss';
            this.missedAttacks.push({ r: row, c: col });
            return { result: 'miss' };
        } else {
            // It's a ship
            target.hit();
            this.grid[row][col] = { hit: true, ship: target };
            
            return { 
                result: 'hit', 
                ship: target,
                sunk: target.isSunk()
            };
        }
    }

    areAllShipsSunk() {
        return this.ships.length > 0 && this.ships.every(ship => ship.isSunk());
    }

    // Reset board
    clear() {
        this.grid = Array(this.size).fill(null).map(() => Array(this.size).fill(null));
        this.ships = [];
        this.missedAttacks = [];
    }

    // Randomly place all given ships
    placeFleetRandomly(fleetTypes) {
        this.clear();
        
        for (const {name, length} of fleetTypes) {
            let placed = false;
            let attempts = 0;
            while (!placed && attempts < 1000) {
                const isHorizontal = Math.random() >= 0.5;
                const row = Math.floor(Math.random() * this.size);
                const col = Math.floor(Math.random() * this.size);
                
                const ship = new Ship(name, length);
                placed = this.placeShip(ship, row, col, isHorizontal);
                attempts++;
            }
        }
    }

    // Optimal fleet placement based on competitive battleship strategy.
    // Key principles from professional/tournament play:
    //   1. Edge placement — ships along borders limit opponent search directions
    //      and avoid the high-probability center zone.
    //   2. Spacing — at least one empty cell between ships prevents chain discovery.
    //   3. Mixed orientations — a blend of horizontal and vertical foils pattern
    //      recognition.
    //   4. Zone distribution — ships spread across different board quadrants.
    //   5. Controlled randomness — variety between games so layouts stay
    //      unpredictable.
    placeFleetOptimally(fleetTypes) {
        let bestLayout = null;
        let bestScore = -Infinity;

        for (let attempt = 0; attempt < 100; attempt++) {
            this.clear();

            // Place largest ships first (most constrained)
            const sortedFleet = [...fleetTypes].sort((a, b) => b.length - a.length);
            let allPlaced = true;
            const placements = [];

            for (const { name, length } of sortedFleet) {
                const candidates = [];

                for (let r = 0; r < this.size; r++) {
                    for (let c = 0; c < this.size; c++) {
                        for (const isHorizontal of [true, false]) {
                            if (this.isValidPlacement(length, r, c, isHorizontal)) {
                                const score = this._scoreCandidate(
                                    length, r, c, isHorizontal, placements
                                );
                                candidates.push({ r, c, isHorizontal, score });
                            }
                        }
                    }
                }

                if (candidates.length === 0) {
                    allPlaced = false;
                    break;
                }

                // Pick from the top ~20 % of scored candidates for variety
                candidates.sort((a, b) => b.score - a.score);
                const topN = Math.max(1, Math.ceil(candidates.length * 0.2));
                const pick = candidates[Math.floor(Math.random() * topN)];

                const ship = new Ship(name, length);
                this.placeShip(ship, pick.r, pick.c, pick.isHorizontal);
                placements.push({
                    name, length, r: pick.r, c: pick.c, isHorizontal: pick.isHorizontal
                });
            }

            if (!allPlaced) continue;

            const layoutScore = this._scoreLayout(placements);
            if (layoutScore > bestScore) {
                bestScore = layoutScore;
                bestLayout = [...placements];
            }
        }

        if (bestLayout) {
            this.clear();
            for (const p of bestLayout) {
                const ship = new Ship(p.name, p.length);
                this.placeShip(ship, p.r, p.c, p.isHorizontal);
            }
        } else {
            // Fallback if no valid layout found
            this.placeFleetRandomly(fleetTypes);
        }
    }

    // Score an individual candidate placement.
    _scoreCandidate(length, row, col, isHorizontal, existingPlacements) {
        let score = 0;
        const size = this.size;

        // Cells this ship would occupy
        const cells = [];
        for (let i = 0; i < length; i++) {
            cells.push({
                r: isHorizontal ? row : row + i,
                c: isHorizontal ? col + i : col
            });
        }

        // --- 1. Edge bonus ---
        // Ships touching an edge are harder to find (lower probability density).
        const touchesEdge = cells.some(
            cell => cell.r === 0 || cell.r === size - 1 ||
                    cell.c === 0 || cell.c === size - 1
        );
        if (touchesEdge) score += 15;

        // Extra reward when the entire ship runs along an edge row/column
        const runsAlongEdge = isHorizontal
            ? (row === 0 || row === size - 1)
            : (col === 0 || col === size - 1);
        if (runsAlongEdge) score += 10;

        // --- 2. Anti-center penalty ---
        // Center cells (rows 3-6, cols 3-6) have the highest hit probability;
        // opponents and probability-based AIs target them first.
        const centerCount = cells.filter(
            cell => cell.r >= 3 && cell.r <= 6 && cell.c >= 3 && cell.c <= 6
        ).length;
        score -= centerCount * 5;

        // --- 3. Spacing from existing ships ---
        // At least one empty cell between ships prevents chain discovery.
        if (existingPlacements.length > 0) {
            let minDist = Infinity;
            for (const cell of cells) {
                for (const placement of existingPlacements) {
                    for (let i = 0; i < placement.length; i++) {
                        const pr = placement.isHorizontal
                            ? placement.r : placement.r + i;
                        const pc = placement.isHorizontal
                            ? placement.c + i : placement.c;
                        // Chebyshev distance (accounts for diagonal adjacency)
                        const dist = Math.max(
                            Math.abs(cell.r - pr), Math.abs(cell.c - pc)
                        );
                        minDist = Math.min(minDist, dist);
                    }
                }
            }
            if (minDist <= 1) score -= 20;      // adjacent or overlapping
            else if (minDist === 2) score += 5;  // one-cell gap
            else score += 10;                    // generous gap
        }

        // --- 4. Avoid corners ---
        // Corners are predictable targets for experienced players.
        const corners = [
            { r: 0, c: 0 }, { r: 0, c: size - 1 },
            { r: size - 1, c: 0 }, { r: size - 1, c: size - 1 }
        ];
        if (cells.some(cell =>
            corners.some(cn => cell.r === cn.r && cell.c === cn.c)
        )) {
            score -= 8;
        }

        return score;
    }

    // Score a complete layout for overall strategic quality.
    _scoreLayout(placements) {
        let score = 0;
        const size = this.size;

        // --- 1. Orientation mix (want at least 2H + 2V) ---
        const hCount = placements.filter(p => p.isHorizontal).length;
        const vCount = placements.length - hCount;
        if (hCount >= 2 && vCount >= 2) score += 20;
        else if (hCount >= 1 && vCount >= 1) score += 10;

        // --- 2. Zone distribution (quadrants) ---
        const zones = new Set();
        for (const p of placements) {
            const midR = p.isHorizontal ? p.r : p.r + Math.floor(p.length / 2);
            const midC = p.isHorizontal ? p.c + Math.floor(p.length / 2) : p.c;
            zones.add(`${midR < size / 2 ? 0 : 1},${midC < size / 2 ? 0 : 1}`);
        }
        score += zones.size * 10;

        // --- 3. Edge ship count (ideal: 2-3 out of 5) ---
        let edgeCount = 0;
        for (const p of placements) {
            for (let i = 0; i < p.length; i++) {
                const r = p.isHorizontal ? p.r : p.r + i;
                const c = p.isHorizontal ? p.c + i : p.c;
                if (r === 0 || r === size - 1 || c === 0 || c === size - 1) {
                    edgeCount++;
                    break;
                }
            }
        }
        if (edgeCount >= 2 && edgeCount <= 3) score += 15;
        else if (edgeCount === 1 || edgeCount === 4) score += 5;

        // --- 4. Minimum inter-ship spacing ---
        let minSpacing = Infinity;
        for (let i = 0; i < placements.length; i++) {
            for (let j = i + 1; j < placements.length; j++) {
                const dist = this._minDistBetweenPlacements(
                    placements[i], placements[j]
                );
                minSpacing = Math.min(minSpacing, dist);
            }
        }
        if (minSpacing >= 2) score += 15;
        else if (minSpacing >= 1) score += 5;

        return score;
    }

    // Chebyshev distance between closest cells of two placements.
    _minDistBetweenPlacements(p1, p2) {
        let minDist = Infinity;
        for (let i = 0; i < p1.length; i++) {
            const r1 = p1.isHorizontal ? p1.r : p1.r + i;
            const c1 = p1.isHorizontal ? p1.c + i : p1.c;
            for (let j = 0; j < p2.length; j++) {
                const r2 = p2.isHorizontal ? p2.r : p2.r + j;
                const c2 = p2.isHorizontal ? p2.c + j : p2.c;
                minDist = Math.min(
                    minDist, Math.max(Math.abs(r1 - r2), Math.abs(c1 - c2))
                );
            }
        }
        return minDist;
    }
}

// Game controller
class Game {
    constructor() {
        this.playerBoard = new GameBoard();
        this.enemyBoard = new GameBoard();
        
        this.fleetTypes = [
            { name: 'Carrier', length: 5 },
            { name: 'Battleship', length: 4 },
            { name: 'Cruiser', length: 3 },
            { name: 'Submarine', length: 3 },
            { name: 'Destroyer', length: 2 }
        ];

        this.state = 'setup'; // 'setup', 'playing', 'gameover'
        this.currentTurn = 'player'; // 'player' or 'enemy'
    }

    start() {
        if (this.playerBoard.ships.length !== this.fleetTypes.length) {
            return false;
        }
        
        this.enemyBoard.placeFleetOptimally(this.fleetTypes);
        this.state = 'playing';
        this.currentTurn = 'player';
        return true;
    }

    playTurn(row, col) {
        if (this.state !== 'playing' || this.currentTurn !== 'player') return null;

        const attackResult = this.enemyBoard.receiveAttack(row, col);
        
        if (attackResult.result === 'already_attacked') {
            return null; // Invalid move
        }

        if (this.enemyBoard.areAllShipsSunk()) {
            this.state = 'gameover';
            return { ...attackResult, winner: 'player' };
        }

        // Switch turn
        this.currentTurn = 'enemy';
        return attackResult;
    }

    enemyTurn(row, col) {
        if (this.state !== 'playing' || this.currentTurn !== 'enemy') return null;

        const attackResult = this.playerBoard.receiveAttack(row, col);
        
        if (this.playerBoard.areAllShipsSunk()) {
            this.state = 'gameover';
            return { ...attackResult, winner: 'enemy' };
        }

        this.currentTurn = 'player';
        return attackResult;
    }
}
