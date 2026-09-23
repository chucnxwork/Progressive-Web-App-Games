import { GamePlugin, GameContext } from '../../core/types';
import { EdgeState, SlitherlinkEngine, SlitherlinkPuzzle } from './engine';

export class SlitherlinkGame implements GamePlugin {
  public id = 'slitherlink';
  public title = 'Slitherlink';
  public shortDescription = 'Draw one continuous loop using the numbered clues.';
  public description = 'Connect the dots into one closed loop. Every number tells you exactly how many of its four surrounding edges belong to the loop.';
  public category = 'puzzle' as const;
  public tags = ['Logic', 'Numbers', 'Grid', 'Classic'];
  public difficultyLevels = ['Beginner', 'Intermediate', 'Expert'];
  public currentDifficulty = 'Beginner';
  public bannerGradient = 'linear-gradient(135deg, #0f766e, #14b8a6)';
  public accentColor = '#2dd4bf';
  public iconSvg = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16v16H4z"/><path d="M4 12h6l2-8 2 16 2-8h4"/></svg>`;

  private container: HTMLElement | null = null;
  private ctx: GameContext | null = null;
  private puzzle: SlitherlinkPuzzle | null = null;
  private states = new Map<string, EdgeState>();
  private startedAt = 0;
  private timerInterval: number | null = null;
  private isWon = false;
  private puzzleIndex = -1;

  public setDifficulty(level: string): void {
    this.currentDifficulty = level;
    this.startNewGame();
  }

  public mount(container: HTMLElement, context: GameContext): void {
    this.container = container;
    this.ctx = context;
    this.startNewGame();
  }

  public unmount(): void {
    this.stopTimer();
    this.container = null;
    this.ctx = null;
  }

  public onRestart(): void {
    this.startNewGame();
  }

  private startNewGame(): void {
    this.stopTimer();
    const config = SlitherlinkEngine.CONFIGS[this.currentDifficulty] || SlitherlinkEngine.CONFIGS.Beginner;
    const puzzleCount = SlitherlinkEngine.getPuzzleCount(config);
    let nextIndex = Math.floor(Math.random() * puzzleCount);
    if (puzzleCount > 1 && nextIndex === this.puzzleIndex) nextIndex = (nextIndex + 1) % puzzleCount;
    this.puzzleIndex = nextIndex;
    this.puzzle = SlitherlinkEngine.createPuzzle(config, this.puzzleIndex);
    this.states = new Map<string, EdgeState>();
    this.startedAt = Date.now();
    this.isWon = false;
    this.render();
    this.startTimer();
  }

  private startTimer(): void {
    this.timerInterval = window.setInterval(() => {
      const timeEl = this.container?.querySelector('#slitherlink-time');
      if (timeEl && !this.isWon) timeEl.textContent = this.formatTime(Math.floor((Date.now() - this.startedAt) / 1000));
    }, 1000);
  }

  private stopTimer(): void {
    if (this.timerInterval !== null) {
      window.clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  private render(): void {
    if (!this.container || !this.puzzle) return;
    const { clues } = this.puzzle;
    const rows = clues.length;
    const cols = clues[0].length;
    this.container.innerHTML = `
      <div class="slitherlink-container">
        <div class="slitherlink-hud">
          <span>Puzzle: <strong>${this.puzzleIndex + 1}/${SlitherlinkEngine.getPuzzleCount({ rows, cols })}</strong></span>
          <span>Lines: <strong id="slitherlink-lines">0</strong></span>
          <span id="slitherlink-status">Build one loop</span>
          <span>Time: <strong id="slitherlink-time">0:00</strong></span>
        </div>
        <div class="slitherlink-board" id="slitherlink-board" style="--slither-rows:${rows};--slither-cols:${cols};">
          ${clues.map((row, rowIndex) => row.map((clue, colIndex) => `<div class="slitherlink-clue" style="left:${((colIndex + 0.5) / cols) * 100}%;top:${((rowIndex + 0.5) / rows) * 100}%">${clue}</div>`).join('')).join('')}
        </div>
        <p class="slitherlink-help">Click an edge to cycle line, blank, and unknown. Right-click cycles backward.</p>
      </div>
    `;

    const board = this.container.querySelector<HTMLElement>('#slitherlink-board');
    if (!board) return;
    for (let row = 0; row <= rows; row++) {
      for (let col = 0; col < cols; col++) this.addEdgeButton(board, 'h', row, col, cols, rows);
    }
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col <= cols; col++) this.addEdgeButton(board, 'v', row, col, cols, rows);
    }
  }

  private addEdgeButton(board: HTMLElement, orientation: 'h' | 'v', row: number, col: number, cols: number, rows: number): void {
    const key = SlitherlinkEngine.edgeKey(orientation, row, col);
    const edge = document.createElement('button');
    edge.type = 'button';
    edge.className = `slitherlink-edge slitherlink-edge-${orientation}`;
    edge.dataset.edge = key;
    edge.setAttribute('aria-label', `${orientation === 'h' ? 'Horizontal' : 'Vertical'} edge`);
    edge.style.left = `${(col / cols) * 100}%`;
    edge.style.top = `${(row / rows) * 100}%`;
    if (orientation === 'h') edge.style.width = `${100 / cols}%`;
    else edge.style.height = `${100 / rows}%`;
    edge.addEventListener('click', () => this.cycleEdge(key, 1));
    edge.addEventListener('contextmenu', (event) => {
      event.preventDefault();
      this.cycleEdge(key, -1);
    });
    board.appendChild(edge);
  }

  private cycleEdge(key: string, direction: 1 | -1): void {
    if (this.isWon) return;
    const current = this.states.get(key) || 0;
    const next = ((current + direction + 3) % 3) as EdgeState;
    this.states.set(key, next);
    this.ctx?.audio.playClick();
    this.updateBoard();
    if (this.puzzle && SlitherlinkEngine.isSolved(this.puzzle.clues, this.states)) {
      this.isWon = true;
      this.stopTimer();
      this.updateBoard();
      const time = Math.floor((Date.now() - this.startedAt) / 1000);
      this.ctx?.audio.playVictory();
      this.ctx?.ui.launchConfetti();
      this.ctx?.ui.showToast(`Loop complete in ${this.formatTime(time)}!`, 'success');
      this.ctx?.storage.recordGamePlay(this.id, true, Math.max(100, 1000 - time), time);
    }
  }

  private updateBoard(): void {
    if (!this.container || !this.puzzle) return;
    for (const edge of Array.from(this.container.querySelectorAll<HTMLButtonElement>('.slitherlink-edge'))) {
      const state = this.states.get(edge.dataset.edge || '') || 0;
      edge.classList.toggle('is-line', state === 1);
      edge.classList.toggle('is-blank', state === 2);
    }
    let lines = 0;
    for (const state of this.states.values()) if (state === 1) lines++;
    const linesEl = this.container.querySelector('#slitherlink-lines');
    if (linesEl) linesEl.textContent = String(lines);
    const statusEl = this.container.querySelector('#slitherlink-status');
    if (statusEl) {
      const contradiction = SlitherlinkEngine.hasContradiction(this.puzzle.clues, this.states);
      statusEl.textContent = this.isWon ? 'Loop complete' : contradiction ? 'Check a clue' : 'Build one loop';
      statusEl.classList.toggle('is-warning', !this.isWon && contradiction);
    }
  }

  private formatTime(seconds: number): string {
    return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
  }
}