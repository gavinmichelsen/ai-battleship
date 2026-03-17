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
        if ((cell && cell.hit) || cell === 'miss') {
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
            while (!placed) {
                const isHorizontal = Math.random() >= 0.5;
                const row = Math.floor(Math.random() * this.size);
                const col = Math.floor(Math.random() * this.size);
                
                const ship = new Ship(name, length);
                placed = this.placeShip(ship, row, col, isHorizontal);
            }
        }
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
        
        this.enemyBoard.placeFleetRandomly(this.fleetTypes);
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
