export type EdgeState = 0 | 1 | 2;

export interface SlitherlinkConfig {
  rows: number;
  cols: number;
}

export interface SlitherlinkPuzzle {
  clues: number[][];
  solution: Set<string>;
}

export class SlitherlinkEngine {
  public static readonly CONFIGS: { [key: string]: SlitherlinkConfig } = {
    Beginner: { rows: 5, cols: 5 },
    Intermediate: { rows: 7, cols: 7 },
    Expert: { rows: 9, cols: 9 }
  };

  public static edgeKey(orientation: 'h' | 'v', row: number, col: number): string {
    return `${orientation}:${row}:${col}`;
  }

  public static createPuzzle(config: SlitherlinkConfig): SlitherlinkPuzzle {
    const solution = new Set<string>();
    const top = 1;
    const left = 1;
    const bottom = config.rows - 1;
    const right = config.cols - 1;

    for (let col = left; col < right; col++) {
      solution.add(this.edgeKey('h', top, col));
      solution.add(this.edgeKey('h', bottom, col));
    }
    for (let row = top; row < bottom; row++) {
      solution.add(this.edgeKey('v', row, left));
      solution.add(this.edgeKey('v', row, right));
    }

    const clues = Array.from({ length: config.rows }, (_, row) =>
      Array.from({ length: config.cols }, (_, col) => {
        let count = 0;
        if (solution.has(this.edgeKey('h', row, col))) count++;
        if (solution.has(this.edgeKey('h', row + 1, col))) count++;
        if (solution.has(this.edgeKey('v', row, col))) count++;
        if (solution.has(this.edgeKey('v', row, col + 1))) count++;
        return count;
      })
    );

    return { clues, solution };
  }

  public static countCellEdges(states: Map<string, EdgeState>, row: number, col: number): { lines: number; unknowns: number } {
    const edges = [
      this.edgeKey('h', row, col),
      this.edgeKey('h', row + 1, col),
      this.edgeKey('v', row, col),
      this.edgeKey('v', row, col + 1)
    ];
    return edges.reduce(
      (result, edge) => {
        const state = states.get(edge) || 0;
        if (state === 1) result.lines++;
        if (state === 0) result.unknowns++;
        return result;
      },
      { lines: 0, unknowns: 0 }
    );
  }

  public static hasContradiction(clues: number[][], states: Map<string, EdgeState>): boolean {
    for (let row = 0; row < clues.length; row++) {
      for (let col = 0; col < clues[row].length; col++) {
        const count = this.countCellEdges(states, row, col);
        if (count.lines > clues[row][col] || count.lines + count.unknowns < clues[row][col]) return true;
      }
    }
    return false;
  }

  public static isSolved(clues: number[][], states: Map<string, EdgeState>): boolean {
    if (this.hasContradiction(clues, states)) return false;
    for (let row = 0; row < clues.length; row++) {
      for (let col = 0; col < clues[row].length; col++) {
        if (this.countCellEdges(states, row, col).lines !== clues[row][col]) return false;
      }
    }

    const lineEdges = Array.from(states.entries()).filter(([, state]) => state === 1);
    if (lineEdges.length === 0) return false;
    const adjacency = new Map<string, string[]>();
    const connect = (a: string, b: string): void => {
      if (!adjacency.has(a)) adjacency.set(a, []);
      adjacency.get(a)!.push(b);
    };

    for (const [key] of lineEdges) {
      const [orientation, rowText, colText] = key.split(':');
      const row = Number(rowText);
      const col = Number(colText);
      const start = `${row}:${col}`;
      const end = orientation === 'h' ? `${row}:${col + 1}` : `${row + 1}:${col}`;
      connect(start, end);
      connect(end, start);
    }

    for (const neighbors of adjacency.values()) {
      if (neighbors.length !== 2) return false;
    }
    const start = adjacency.keys().next().value as string;
    const visited = new Set<string>();
    const queue = [start];
    while (queue.length > 0) {
      const vertex = queue.pop()!;
      if (visited.has(vertex)) continue;
      visited.add(vertex);
      for (const neighbor of adjacency.get(vertex) || []) {
        if (!visited.has(neighbor)) queue.push(neighbor);
      }
    }
    return visited.size === adjacency.size;
  }
}