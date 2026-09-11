import { GamePlugin, GameContext } from '../../core/types';
import { MinesweeperEngine, MineCellData, MinesweeperConfig } from './engine';

export class MinesweeperGame implements GamePlugin {
  public id = 'minesweeper';
  public title = 'Minesweeper Pro';
  public shortDescription = 'The classic minefield challenge with safe first-click.';
  public description = 'Clear the board without detonating any hidden mines! Featuring touch-optimized flag mode, guaranteed safe first clicks, chords, and multi-difficulty boards.';
  public category = 'classic' as const;
  public tags = ['Strategy', 'Logic', 'Classic', 'Retro'];
  public difficultyLevels = ['Beginner', 'Intermediate', 'Expert'];
  public currentDifficulty = 'Beginner';
  public bannerGradient = 'linear-gradient(135deg, #e11d48, #f59e0b)';
  public accentColor = '#f43f5e';
  public iconSvg = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="6"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>`;

  private container: HTMLElement | null = null;
  private ctx: GameContext | null = null;

  private board: MineCellData[][] = [];
  private config: MinesweeperConfig = MinesweeperEngine.CONFIGS.Beginner;
  private isFirstClick: boolean = true;
  private isGameOver: boolean = false;
  private isWon: boolean = false;
  private remainingMines: number = 10;
  private timerSeconds: number = 0;
  private timerInterval: number | null = null;
  private isFlagMode: boolean = false; // Mobile touch flag toggle

  public setDifficulty(level: string): void {
    this.currentDifficulty = level;
    this.config = MinesweeperEngine.CONFIGS[level] || MinesweeperEngine.CONFIGS.Beginner;
    this.startNewGame();
  }

  public mount(container: HTMLElement, context: GameContext): void {
    this.container = container;
    this.ctx = context;
    this.config = MinesweeperEngine.CONFIGS[this.currentDifficulty] || MinesweeperEngine.CONFIGS.Beginner;
    this.startNewGame();
  }

  public unmount(): void {
    this.stopTimer();
    this.container = null;
  }

  public onRestart(): void {
    this.startNewGame();
  }

  private startNewGame(): void {
    this.stopTimer();
    this.isFirstClick = true;
    this.isGameOver = false;
    this.isWon = false;
    this.timerSeconds = 0;
    this.remainingMines = this.config.mines;
    this.board = MinesweeperEngine.createEmptyBoard(this.config.rows, this.config.cols);

    this.render();
  }

  private startTimer(): void {
    this.stopTimer();
    this.timerInterval = window.setInterval(() => {
      if (!this.isGameOver && !this.isWon) {
        this.timerSeconds++;
        const timerEl = document.getElementById('mines-timer-val');
        if (timerEl) {
          timerEl.textContent = this.timerSeconds.toString().padStart(3, '0');
        }
      }
    }, 1000);
  }

  private stopTimer(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  private render(): void {
    if (!this.container) return;

    this.container.innerHTML = `
      <div class="mines-container">
        <div class="mines-hud">
          <div class="mines-counter" id="mines-flag-count">${Math.max(0, this.remainingMines).toString().padStart(3, '0')}</div>
          <div class="mines-face" id="mines-smiley-face" title="Click to restart">🙂</div>
          <div class="mines-timer" id="mines-timer-val">${this.timerSeconds.toString().padStart(3, '0')}</div>
        </div>

        <button class="mines-touch-toggle ${this.isFlagMode ? 'flag-mode' : ''}" id="mines-flag-toggle">
          <span>${this.isFlagMode ? '🚩 Mode: Place Flags' : '⛏️ Mode: Reveal Cells'}</span>
        </button>

        <div class="mines-scroll-box">
          <div class="mines-grid" id="mines-grid-board" style="grid-template-columns: repeat(${this.config.cols}, 1fr);"></div>
        </div>
      </div>
    `;

    this.renderBoard();
    this.attachEvents();
  }

  private renderBoard(): void {
    const gridEl = document.getElementById('mines-grid-board');
    if (!gridEl) return;
    gridEl.innerHTML = '';

    for (let r = 0; r < this.config.rows; r++) {
      for (let c = 0; c < this.config.cols; c++) {
        const cell = this.board[r][c];
        const cellEl = document.createElement('div');
        cellEl.className = 'mine-cell';
        cellEl.dataset.row = String(r);
        cellEl.dataset.col = String(c);

        if (cell.isRevealed) {
          cellEl.classList.add('revealed');
          if (cell.isMine) {
            cellEl.classList.add('exploded');
            cellEl.textContent = '💣';
          } else if (cell.neighborMines > 0) {
            cellEl.classList.add(`num-${cell.neighborMines}`);
            cellEl.textContent = String(cell.neighborMines);
          }
        } else if (cell.isFlagged) {
          cellEl.classList.add('flagged');
          cellEl.textContent = '🚩';
        }

        gridEl.appendChild(cellEl);
      }
    }
  }

  private handleCellClick(r: number, c: number): void {
    if (this.isGameOver || this.isWon) return;

    if (this.isFlagMode) {
      this.toggleFlag(r, c);
      return;
    }

    const cell = this.board[r][c];
    if (cell.isFlagged) return;

    // First-click guaranteed safe
    if (this.isFirstClick) {
      MinesweeperEngine.populateMines(this.board, this.config, r, c);
      this.isFirstClick = false;
      this.startTimer();
    }

    // Chord click if already revealed
    if (cell.isRevealed) {
      const chordRes = MinesweeperEngine.chordCell(this.board, r, c);
      if (chordRes.hitMine) {
        this.triggerLoss();
      } else if (chordRes.revealedCells.length > 0) {
        this.ctx?.audio.playReveal();
        this.checkWinCondition();
      }
      this.renderBoard();
      return;
    }

    // Normal reveal
    const revealRes = MinesweeperEngine.revealCell(this.board, r, c);
    if (revealRes.hitMine) {
      this.triggerLoss();
    } else {
      this.ctx?.audio.playReveal();
      this.checkWinCondition();
    }

    this.renderBoard();
  }

  private toggleFlag(r: number, c: number): void {
    if (this.isGameOver || this.isWon) return;
    const cell = this.board[r][c];
    if (cell.isRevealed) return;

    cell.isFlagged = !cell.isFlagged;
    this.remainingMines += cell.isFlagged ? -1 : 1;

    this.ctx?.audio.playFlag();

    const countEl = document.getElementById('mines-flag-count');
    if (countEl) {
      countEl.textContent = Math.max(0, this.remainingMines).toString().padStart(3, '0');
    }

    this.renderBoard();
  }

  private triggerLoss(): void {
    this.isGameOver = true;
    this.stopTimer();
    this.ctx?.audio.playExplosion();

    // Reveal all mines
    for (const row of this.board) {
      for (const cell of row) {
        if (cell.isMine) cell.isRevealed = true;
      }
    }

    const face = document.getElementById('mines-smiley-face');
    if (face) face.textContent = '😵';

    this.ctx?.ui.showToast('💥 Detonation! Game Over.', 'error');
    this.ctx?.storage.recordGamePlay(this.id, false);
  }

  private checkWinCondition(): void {
    if (MinesweeperEngine.checkWin(this.board)) {
      this.isWon = true;
      this.stopTimer();

      // Flag all remaining mines
      for (const row of this.board) {
        for (const cell of row) {
          if (cell.isMine) cell.isFlagged = true;
        }
      }

      const face = document.getElementById('mines-smiley-face');
      if (face) face.textContent = '😎';

      const countEl = document.getElementById('mines-flag-count');
      if (countEl) countEl.textContent = '000';

      this.ctx?.audio.playVictory();
      this.ctx?.ui.launchConfetti();
      this.ctx?.ui.showToast(`🎉 Field Cleared! Time: ${this.timerSeconds}s!`, 'success');
      this.ctx?.storage.recordGamePlay(this.id, true, 1000 - Math.min(900, this.timerSeconds), this.timerSeconds);
    }
  }

  private attachEvents(): void {
    const gridEl = document.getElementById('mines-grid-board');
    if (!gridEl) return;

    // Click handler (delegation)
    gridEl.addEventListener('click', (e) => {
      const target = (e.target as HTMLElement).closest('.mine-cell') as HTMLElement;
      if (!target) return;
      const r = parseInt(target.dataset.row || '0', 10);
      const c = parseInt(target.dataset.col || '0', 10);
      this.handleCellClick(r, c);
    });

    // Right-click handler for flags
    gridEl.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      const target = (e.target as HTMLElement).closest('.mine-cell') as HTMLElement;
      if (!target) return;
      const r = parseInt(target.dataset.row || '0', 10);
      const c = parseInt(target.dataset.col || '0', 10);
      this.toggleFlag(r, c);
    });

    // Flag mode button for touch devices
    document.getElementById('mines-flag-toggle')?.addEventListener('click', () => {
      this.isFlagMode = !this.isFlagMode;
      this.ctx?.audio.playClick();
      const btn = document.getElementById('mines-flag-toggle');
      if (btn) {
        btn.classList.toggle('flag-mode', this.isFlagMode);
        btn.innerHTML = `<span>${this.isFlagMode ? '🚩 Mode: Place Flags' : '⛏️ Mode: Reveal Cells'}</span>`;
      }
    });

    // Smiley button restart
    document.getElementById('mines-smiley-face')?.addEventListener('click', () => {
      this.ctx?.audio.playClick();
      this.startNewGame();
    });
  }
}
