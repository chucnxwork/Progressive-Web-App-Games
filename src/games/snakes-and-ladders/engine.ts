// Snakes and Ladders Game Engine

export interface BoardSpecial {
  from: number;
  to: number;
  type: 'ladder' | 'snake';
}

export interface PlayerState {
  id: number;
  name: string;
  color: string;
  position: number; // 0 means before square 1 (at starting gate)
  isAi: boolean;
  totalRolls: number;
  snakesEncountered: number;
  laddersClimbed: number;
}

export interface StepMoveResult {
  playerId: number;
  roll: number;
  path: number[]; // Step-by-step squares visited during walk
  special: BoardSpecial | null; // Ladder climbed or snake slid
  finalSquare: number;
  hasWon: boolean;
  extraRoll: boolean; // rolled a 6
}

export class SnakesAndLaddersEngine {
  public static readonly TOTAL_SQUARES = 100;

  // Standard classic Snakes & Ladders positions
  public static readonly LADDERS: Record<number, number> = {
    4: 14,
    9: 31,
    20: 38,
    28: 84,
    40: 59,
    51: 67,
    63: 81,
    71: 91
  };

  public static readonly SNAKES: Record<number, number> = {
    17: 7,
    54: 34,
    62: 19,
    64: 60,
    87: 24,
    93: 73,
    95: 75,
    99: 78
  };

  /**
   * Converts square number (1..100) to grid coordinates (0..9).
   * 1 is bottom-left, 10 is bottom-right, 11 is one row up on right, 100 is top-left.
   */
  public static squareToCoords(square: number): { row: number; col: number; xPercent: number; yPercent: number } {
    if (square <= 0) {
      return { row: 9, col: -1, xPercent: -5, yPercent: 95 };
    }
    const clamped = Math.min(Math.max(square, 1), 100);
    const rowFromBottom = Math.floor((clamped - 1) / 10);
    const indexInRow = (clamped - 1) % 10;
    const col = rowFromBottom % 2 === 0 ? indexInRow : 9 - indexInRow;
    const rowFromTop = 9 - rowFromBottom;

    // Center percentage of each cell (10% per cell)
    const xPercent = (col + 0.5) * 10;
    const yPercent = (rowFromTop + 0.5) * 10;

    return { row: rowFromTop, col, xPercent, yPercent };
  }

  /**
   * Rolls a standard 6-sided die (1..6).
   */
  public static rollDice(): number {
    return Math.floor(Math.random() * 6) + 1;
  }

  /**
   * Computes the movement result for a given player position and roll.
   * Implements bounce-back if roll exceeds square 100.
   */
  public static calculateMove(currentSquare: number, roll: number, playerId: number): StepMoveResult {
    const path: number[] = [];
    let square = currentSquare === 0 ? 0 : currentSquare;

    // If starting from 0, first step enters square 1, then rest of the roll
    const remainingRoll = roll;
    let target = square + remainingRoll;

    // Bounce back rule: must land on 100 exactly
    if (target > this.TOTAL_SQUARES) {
      const overshoot = target - this.TOTAL_SQUARES;
      target = this.TOTAL_SQUARES - overshoot;
    }

    // Step-by-step path
    let curr = square === 0 ? 0 : square;
    if (square + roll <= this.TOTAL_SQUARES) {
      for (let s = curr + 1; s <= square + roll; s++) {
        path.push(s);
      }
    } else {
      // Forward up to 100
      for (let s = curr + 1; s <= this.TOTAL_SQUARES; s++) {
        path.push(s);
      }
      // Bounce backwards
      const overshoot = square + roll - this.TOTAL_SQUARES;
      for (let b = 1; b <= overshoot; b++) {
        path.push(this.TOTAL_SQUARES - b);
      }
    }

    const landSquare = path[path.length - 1];
    let special: BoardSpecial | null = null;
    let finalSquare = landSquare;

    if (this.LADDERS[landSquare]) {
      special = { from: landSquare, to: this.LADDERS[landSquare], type: 'ladder' };
      finalSquare = this.LADDERS[landSquare];
    } else if (this.SNAKES[landSquare]) {
      special = { from: landSquare, to: this.SNAKES[landSquare], type: 'snake' };
      finalSquare = this.SNAKES[landSquare];
    }

    const hasWon = finalSquare === this.TOTAL_SQUARES;
    const extraRoll = roll === 6 && !hasWon;

    return {
      playerId,
      roll,
      path,
      special,
      finalSquare,
      hasWon,
      extraRoll
    };
  }

  /**
   * Gets list of all ladders for SVG drawing.
   */
  public static getAllLadders(): { from: number; to: number; fromCoord: { xPercent: number; yPercent: number }; toCoord: { xPercent: number; yPercent: number } }[] {
    return Object.entries(this.LADDERS).map(([fromStr, to]) => {
      const from = Number(fromStr);
      return {
        from,
        to,
        fromCoord: this.squareToCoords(from),
        toCoord: this.squareToCoords(to)
      };
    });
  }

  /**
   * Gets list of all snakes for SVG drawing.
   */
  public static getAllSnakes(): { from: number; to: number; fromCoord: { xPercent: number; yPercent: number }; toCoord: { xPercent: number; yPercent: number } }[] {
    return Object.entries(this.SNAKES).map(([fromStr, to]) => {
      const from = Number(fromStr);
      return {
        from,
        to,
        fromCoord: this.squareToCoords(from),
        toCoord: this.squareToCoords(to)
      };
    });
  }
}
