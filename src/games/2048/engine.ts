// 2048 Engine: Board logic, sliding, merging & score calculation

export type Direction = 'up' | 'down' | 'left' | 'right';

export interface MoveResult {
  moved: boolean;
  scoreGained: number;
  has2048: boolean;
}

export class Engine2048 {
  public static createEmptyBoard(): number[][] {
    return Array.from({ length: 4 }, () => Array(4).fill(0));
  }

  public static spawnTile(board: number[][]): boolean {
    const emptyCells: [number, number][] = [];
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        if (board[r][c] === 0) {
          emptyCells.push([r, c]);
        }
      }
    }

    if (emptyCells.length === 0) return false;

    const [r, c] = emptyCells[Math.floor(Math.random() * emptyCells.length)];
    board[r][c] = Math.random() < 0.9 ? 2 : 4;
    return true;
  }

  public static move(board: number[][], direction: Direction): MoveResult {
    let moved = false;
    let scoreGained = 0;
    let has2048 = false;

    const slide = (row: number[]): { newRow: number[]; gained: number; reached2048: boolean } => {
      // Filter non-zeros
      const filtered = row.filter((val) => val !== 0);
      const newRow: number[] = [];
      let gained = 0;
      let reached2048 = false;

      for (let i = 0; i < filtered.length; i++) {
        if (i + 1 < filtered.length && filtered[i] === filtered[i + 1]) {
          const mergedVal = filtered[i] * 2;
          newRow.push(mergedVal);
          gained += mergedVal;
          if (mergedVal === 2048) reached2048 = true;
          i++; // Skip merged partner
        } else {
          newRow.push(filtered[i]);
        }
      }

      while (newRow.length < 4) {
        newRow.push(0);
      }

      return { newRow, gained, reached2048 };
    };

    if (direction === 'left') {
      for (let r = 0; r < 4; r++) {
        const original = [...board[r]];
        const { newRow, gained, reached2048 } = slide(original);
        board[r] = newRow;
        scoreGained += gained;
        if (reached2048) has2048 = true;
        if (original.some((v, idx) => v !== newRow[idx])) moved = true;
      }
    } else if (direction === 'right') {
      for (let r = 0; r < 4; r++) {
        const original = [...board[r]];
        const reversed = [...original].reverse();
        const { newRow, gained, reached2048 } = slide(reversed);
        newRow.reverse();
        board[r] = newRow;
        scoreGained += gained;
        if (reached2048) has2048 = true;
        if (original.some((v, idx) => v !== newRow[idx])) moved = true;
      }
    } else if (direction === 'up') {
      for (let c = 0; c < 4; c++) {
        const original = [board[0][c], board[1][c], board[2][c], board[3][c]];
        const { newRow, gained, reached2048 } = slide(original);
        for (let r = 0; r < 4; r++) {
          board[r][c] = newRow[r];
        }
        scoreGained += gained;
        if (reached2048) has2048 = true;
        if (original.some((v, idx) => v !== newRow[idx])) moved = true;
      }
    } else if (direction === 'down') {
      for (let c = 0; c < 4; c++) {
        const original = [board[0][c], board[1][c], board[2][c], board[3][c]];
        const reversed = [...original].reverse();
        const { newRow, gained, reached2048 } = slide(reversed);
        newRow.reverse();
        for (let r = 0; r < 4; r++) {
          board[r][c] = newRow[r];
        }
        scoreGained += gained;
        if (reached2048) has2048 = true;
        if (original.some((v, idx) => v !== newRow[idx])) moved = true;
      }
    }

    return { moved, scoreGained, has2048 };
  }

  public static canMove(board: number[][]): boolean {
    // Check if any empty cell
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        if (board[r][c] === 0) return true;
        // Check horizontal neighbor
        if (c + 1 < 4 && board[r][c] === board[r][c + 1]) return true;
        // Check vertical neighbor
        if (r + 1 < 4 && board[r][c] === board[r + 1][c]) return true;
      }
    }
    return false;
  }
}
