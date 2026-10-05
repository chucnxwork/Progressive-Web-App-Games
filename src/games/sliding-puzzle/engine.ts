// Sliding Puzzle Core Engine
export interface MoveResult {
  valid: boolean;
  newBoard: number[];
  movedTiles: { val: number; fromIndex: number; toIndex: number }[];
}

export type SlideDirection = 'up' | 'down' | 'left' | 'right';

export class SlidingPuzzleEngine {
  /**
   * Generates a solved board for a given grid dimension.
   * e.g. for size=4: [1, 2, 3, ..., 15, 0]
   */
  public static createSolvedBoard(size: number): number[] {
    const total = size * size;
    const board: number[] = [];
    for (let i = 1; i < total; i++) {
      board.push(i);
    }
    board.push(0); // 0 represents the blank space
    return board;
  }

  /**
   * Checks if the board is in its solved configuration.
   */
  public static isSolved(board: number[]): boolean {
    const total = board.length;
    for (let i = 0; i < total - 1; i++) {
      if (board[i] !== i + 1) return false;
    }
    return board[total - 1] === 0;
  }

  /**
   * Finds the 0-indexed position of the blank space (0).
   */
  public static getEmptyIndex(board: number[]): number {
    return board.indexOf(0);
  }

  /**
   * Calculates total Manhattan Distance for the board against the solved state.
   */
  public static getManhattanDistance(board: number[], size: number): number {
    let distance = 0;
    for (let i = 0; i < board.length; i++) {
      const val = board[i];
      if (val === 0) continue;
      const targetIndex = val - 1;
      const targetRow = Math.floor(targetIndex / size);
      const targetCol = targetIndex % size;
      const curRow = Math.floor(i / size);
      const curCol = i % size;
      distance += Math.abs(curRow - targetRow) + Math.abs(curCol - targetCol);
    }
    return distance;
  }

  /**
   * Generates a guaranteed solvable scrambled board by walking random valid moves from solved.
   */
  public static generateShuffledBoard(size: number, moveCount = 140): number[] {
    const board = this.createSolvedBoard(size);
    let emptyIdx = board.length - 1;
    let lastMovedVal = -1;

    for (let m = 0; m < moveCount; m++) {
      const neighbors = this.getAdjacentIndices(emptyIdx, size);
      // Filter out immediate undo move
      const eligible = neighbors.filter((idx) => board[idx] !== lastMovedVal);
      const chosenIdx = eligible.length > 0
        ? eligible[Math.floor(Math.random() * eligible.length)]
        : neighbors[Math.floor(Math.random() * neighbors.length)];

      lastMovedVal = board[chosenIdx];
      board[emptyIdx] = board[chosenIdx];
      board[chosenIdx] = 0;
      emptyIdx = chosenIdx;
    }

    // If it somehow ended up solved, shuffle a few extra moves
    if (this.isSolved(board)) {
      return this.generateShuffledBoard(size, moveCount + 20);
    }

    return board;
  }

  /**
   * Returns valid 1-step adjacent neighbors of an index.
   */
  public static getAdjacentIndices(index: number, size: number): number[] {
    const row = Math.floor(index / size);
    const col = index % size;
    const neighbors: number[] = [];

    if (row > 0) neighbors.push((row - 1) * size + col); // Up
    if (row < size - 1) neighbors.push((row + 1) * size + col); // Down
    if (col > 0) neighbors.push(row * size + (col - 1)); // Left
    if (col < size - 1) neighbors.push(row * size + (col + 1)); // Right

    return neighbors;
  }

  /**
   * Determines if a clicked tile can slide (i.e. shares row or col with blank space).
   */
  public static canMove(board: number[], size: number, clickedIndex: number): boolean {
    if (board[clickedIndex] === 0) return false;
    const emptyIndex = this.getEmptyIndex(board);
    const cRow = Math.floor(clickedIndex / size);
    const cCol = clickedIndex % size;
    const eRow = Math.floor(emptyIndex / size);
    const eCol = emptyIndex % size;

    return cRow === eRow || cCol === eCol;
  }

  /**
   * Executes a slide from a clicked tile (supports single and multi-tile slide).
   */
  public static executeClickMove(
    board: number[],
    size: number,
    clickedIndex: number
  ): MoveResult {
    if (!this.canMove(board, size, clickedIndex)) {
      return { valid: false, newBoard: board, movedTiles: [] };
    }

    const emptyIndex = this.getEmptyIndex(board);
    const cRow = Math.floor(clickedIndex / size);
    const cCol = clickedIndex % size;
    const eRow = Math.floor(emptyIndex / size);
    const eCol = emptyIndex % size;

    const newBoard = [...board];
    const movedTiles: { val: number; fromIndex: number; toIndex: number }[] = [];

    if (cRow === eRow) {
      // Horizontal slide
      const step = cCol < eCol ? 1 : -1;
      // We move tiles starting closest to empty towards empty
      for (let col = eCol - step; ; col -= step) {
        const fromIdx = cRow * size + col;
        const toIdx = cRow * size + (col + step);
        const val = newBoard[fromIdx];
        newBoard[toIdx] = val;
        movedTiles.push({ val, fromIndex: fromIdx, toIndex: toIdx });
        if (col === cCol) break;
      }
      newBoard[clickedIndex] = 0;
    } else if (cCol === eCol) {
      // Vertical slide
      const step = cRow < eRow ? 1 : -1;
      for (let row = eRow - step; ; row -= step) {
        const fromIdx = row * size + cCol;
        const toIdx = (row + step) * size + cCol;
        const val = newBoard[fromIdx];
        newBoard[toIdx] = val;
        movedTiles.push({ val, fromIndex: fromIdx, toIndex: toIdx });
        if (row === cRow) break;
      }
      newBoard[clickedIndex] = 0;
    }

    return { valid: true, newBoard, movedTiles };
  }

  /**
   * Executes a move in a cardinal direction (Keyboard / Swipe / D-Pad).
   * Direction refers to tile movement (e.g. 'up' slides the tile below into the empty space).
   */
  public static executeDirectionMove(
    board: number[],
    size: number,
    dir: SlideDirection
  ): MoveResult {
    const emptyIndex = this.getEmptyIndex(board);
    const eRow = Math.floor(emptyIndex / size);
    const eCol = emptyIndex % size;

    let targetRow = eRow;
    let targetCol = eCol;

    if (dir === 'up') targetRow = eRow + 1; // Tile below slides up
    else if (dir === 'down') targetRow = eRow - 1; // Tile above slides down
    else if (dir === 'left') targetCol = eCol + 1; // Tile to right slides left
    else if (dir === 'right') targetCol = eCol - 1; // Tile to left slides right

    if (targetRow < 0 || targetRow >= size || targetCol < 0 || targetCol >= size) {
      return { valid: false, newBoard: board, movedTiles: [] };
    }

    const clickedIndex = targetRow * size + targetCol;
    return this.executeClickMove(board, size, clickedIndex);
  }

  /**
   * Computes a smart hint recommendation.
   * Returns index of the neighbor tile whose move results in the best Manhattan distance reduction.
   */
  public static getBestHintTileIndex(board: number[], size: number): number | null {
    if (this.isSolved(board)) return null;

    const emptyIdx = this.getEmptyIndex(board);
    const neighbors = this.getAdjacentIndices(emptyIdx, size);

    let bestIdx: number | null = null;
    let minDistance = Infinity;

    for (const neighborIdx of neighbors) {
      // Simulate move
      const simulatedBoard = [...board];
      simulatedBoard[emptyIdx] = simulatedBoard[neighborIdx];
      simulatedBoard[neighborIdx] = 0;

      const dist = this.getManhattanDistance(simulatedBoard, size);
      if (dist < minDistance) {
        minDistance = dist;
        bestIdx = neighborIdx;
      }
    }

    return bestIdx !== null ? bestIdx : neighbors[0] || null;
  }

  /**
   * Calculates a 1 to 3 star score rating based on size, moves, and time.
   */
  public static calculateStarRating(
    size: number,
    moves: number,
    timeSeconds: number
  ): { stars: number; title: string } {
    let threeStarMoves = 35;
    let twoStarMoves = 70;
    let threeStarTime = 40;
    let twoStarTime = 90;

    if (size === 3) {
      threeStarMoves = 25;
      twoStarMoves = 50;
      threeStarTime = 25;
      twoStarTime = 60;
    } else if (size === 4) {
      threeStarMoves = 80;
      twoStarMoves = 150;
      threeStarTime = 90;
      twoStarTime = 180;
    } else if (size >= 5) {
      threeStarMoves = 180;
      twoStarMoves = 320;
      threeStarTime = 240;
      twoStarTime = 450;
    }

    if (moves <= threeStarMoves && timeSeconds <= threeStarTime) {
      return { stars: 3, title: 'Mastermind Grandmaster!' };
    } else if (moves <= twoStarMoves && timeSeconds <= twoStarTime) {
      return { stars: 2, title: 'Great Puzzle Solver!' };
    }
    return { stars: 1, title: 'Puzzle Completed!' };
  }
}
