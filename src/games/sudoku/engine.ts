// Sudoku Generation, Solving & Validation Engine

export type SudokuBoard = number[][];

export interface SudokuPuzzle {
  puzzle: SudokuBoard;
  solution: SudokuBoard;
}

export class SudokuEngine {
  public static createEmptyBoard(): SudokuBoard {
    return Array.from({ length: 9 }, () => Array(9).fill(0));
  }

  public static cloneBoard(board: SudokuBoard): SudokuBoard {
    return board.map((row) => [...row]);
  }

  public static isValid(board: SudokuBoard, row: number, col: number, num: number): boolean {
    for (let i = 0; i < 9; i++) {
      if (board[row][i] === num && i !== col) return false;
      if (board[i][col] === num && i !== row) return false;
    }

    const startRow = Math.floor(row / 3) * 3;
    const startCol = Math.floor(col / 3) * 3;

    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        const curRow = startRow + r;
        const curCol = startCol + c;
        if (board[curRow][curCol] === num && (curRow !== row || curCol !== col)) {
          return false;
        }
      }
    }

    return true;
  }

  public static solve(board: SudokuBoard): boolean {
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (board[r][c] === 0) {
          const nums = this.shuffleArray([1, 2, 3, 4, 5, 6, 7, 8, 9]);
          for (const num of nums) {
            if (this.isValid(board, r, c, num)) {
              board[r][c] = num;
              if (this.solve(board)) return true;
              board[r][c] = 0;
            }
          }
          return false;
        }
      }
    }
    return true;
  }

  public static generatePuzzle(difficulty: string): SudokuPuzzle {
    // 1. Generate full solved board
    const solution = this.createEmptyBoard();
    this.solve(solution);

    // 2. Clone for puzzle and dig holes based on difficulty
    const puzzle = this.cloneBoard(solution);

    let cluesToKeep = 38; // Default easy
    if (difficulty === 'Medium') cluesToKeep = 32;
    else if (difficulty === 'Hard') cluesToKeep = 28;
    else if (difficulty === 'Expert') cluesToKeep = 24;

    const cellsToDig = 81 - cluesToKeep;
    const positions: [number, number][] = [];
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        positions.push([r, c]);
      }
    }
    const shuffledPositions = this.shuffleArray(positions);

    let dug = 0;
    for (const [r, c] of shuffledPositions) {
      if (dug >= cellsToDig) break;
      puzzle[r][c] = 0;
      dug++;
    }

    return { puzzle, solution };
  }

  public static isCompleteAndCorrect(board: SudokuBoard, solution: SudokuBoard): boolean {
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (board[r][c] === 0 || board[r][c] !== solution[r][c]) {
          return false;
        }
      }
    }
    return true;
  }

  public static getErrors(board: SudokuBoard, solution: SudokuBoard): Set<string> {
    const errors = new Set<string>();
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        const val = board[r][c];
        if (val !== 0 && val !== solution[r][c]) {
          errors.add(`${r},${c}`);
        }
      }
    }
    return errors;
  }

  private static shuffleArray<T>(arr: T[]): T[] {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }
}
