// Minesweeper Engine with Guaranteed Safe First Click & Chord Clicks

export interface MineCellData {
  row: number;
  col: number;
  isMine: boolean;
  isRevealed: boolean;
  isFlagged: boolean;
  neighborMines: number;
}

export interface MinesweeperConfig {
  rows: number;
  cols: number;
  mines: number;
}

export class MinesweeperEngine {
  public static readonly CONFIGS: { [key: string]: MinesweeperConfig } = {
    Beginner: { rows: 9, cols: 9, mines: 10 },
    Intermediate: { rows: 16, cols: 16, mines: 40 },
    Expert: { rows: 16, cols: 30, mines: 99 }
  };

  public static createEmptyBoard(rows: number, cols: number): MineCellData[][] {
    const board: MineCellData[][] = [];
    for (let r = 0; r < rows; r++) {
      const row: MineCellData[] = [];
      for (let c = 0; c < cols; c++) {
        row.push({
          row: r,
          col: c,
          isMine: false,
          isRevealed: false,
          isFlagged: false,
          neighborMines: 0
        });
      }
      board.push(row);
    }
    return board;
  }

  public static populateMines(
    board: MineCellData[][],
    config: MinesweeperConfig,
    firstClickRow: number,
    firstClickCol: number
  ): void {
    const { rows, cols, mines } = config;
    let placed = 0;

    // First-click safety: don't place mines in the first cell or its immediate neighbors
    const safeZone = new Set<string>();
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        const nr = firstClickRow + dr;
        const nc = firstClickCol + dc;
        if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
          safeZone.add(`${nr},${nc}`);
        }
      }
    }

    // Available positions outside safe zone
    const positions: [number, number][] = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (!safeZone.has(`${r},${c}`)) {
          positions.push([r, c]);
        }
      }
    }

    // Shuffle
    for (let i = positions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [positions[i], positions[j]] = [positions[j], positions[i]];
    }

    // Place mines
    const actualMines = Math.min(mines, positions.length);
    for (let i = 0; i < actualMines; i++) {
      const [r, c] = positions[i];
      board[r][c].isMine = true;
      placed++;
    }

    // Calculate neighbor mines
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (!board[r][c].isMine) {
          let count = 0;
          for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
              if (dr === 0 && dc === 0) continue;
              const nr = r + dr;
              const nc = c + dc;
              if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && board[nr][nc].isMine) {
                count++;
              }
            }
          }
          board[r][c].neighborMines = count;
        }
      }
    }
  }

  public static revealCell(board: MineCellData[][], row: number, col: number): {
    hitMine: boolean;
    revealedCells: MineCellData[];
  } {
    const cell = board[row][col];
    if (cell.isRevealed || cell.isFlagged) {
      return { hitMine: false, revealedCells: [] };
    }

    cell.isRevealed = true;
    if (cell.isMine) {
      return { hitMine: true, revealedCells: [cell] };
    }

    const revealedCells: MineCellData[] = [cell];

    // Flood-fill if 0 neighbor mines
    if (cell.neighborMines === 0) {
      const queue: [number, number][] = [[row, col]];
      const rows = board.length;
      const cols = board[0].length;

      while (queue.length > 0) {
        const [cr, cc] = queue.shift()!;
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            if (dr === 0 && dc === 0) continue;
            const nr = cr + dr;
            const nc = cc + dc;
            if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
              const neighbor = board[nr][nc];
              if (!neighbor.isRevealed && !neighbor.isFlagged && !neighbor.isMine) {
                neighbor.isRevealed = true;
                revealedCells.push(neighbor);
                if (neighbor.neighborMines === 0) {
                  queue.push([nr, nc]);
                }
              }
            }
          }
        }
      }
    }

    return { hitMine: false, revealedCells };
  }

  public static chordCell(board: MineCellData[][], row: number, col: number): {
    hitMine: boolean;
    revealedCells: MineCellData[];
  } {
    const cell = board[row][col];
    if (!cell.isRevealed || cell.neighborMines === 0) {
      return { hitMine: false, revealedCells: [] };
    }

    const rows = board.length;
    const cols = board[0].length;
    let flagCount = 0;
    const unrevealedNeighbors: [number, number][] = [];

    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const nr = row + dr;
        const nc = col + dc;
        if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
          const n = board[nr][nc];
          if (n.isFlagged) flagCount++;
          else if (!n.isRevealed) unrevealedNeighbors.push([nr, nc]);
        }
      }
    }

    if (flagCount === cell.neighborMines) {
      let hitMine = false;
      const allRevealed: MineCellData[] = [];

      for (const [nr, nc] of unrevealedNeighbors) {
        const res = this.revealCell(board, nr, nc);
        if (res.hitMine) hitMine = true;
        allRevealed.push(...res.revealedCells);
      }

      return { hitMine, revealedCells: allRevealed };
    }

    return { hitMine: false, revealedCells: [] };
  }

  public static checkWin(board: MineCellData[][]): boolean {
    for (const row of board) {
      for (const cell of row) {
        if (!cell.isMine && !cell.isRevealed) {
          return false;
        }
      }
    }
    return true;
  }
}
