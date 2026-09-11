import { GamePlugin, GameContext } from '../../core/types';
import { Engine2048, Direction } from './engine';

export class Game2048 implements GamePlugin {
  public id = '2048';
  public title = '2048 Neon';
  public shortDescription = 'Join the numbers and slide your way to the 2048 tile!';
  public description = 'An addictive puzzle classic. Slide tiles with arrows or touch swipes to combine matching values and unlock the elusive 2048 tile and beyond!';
  public category = 'puzzle' as const;
  public tags = ['Math', 'Addictive', 'Swipe', 'Numbers'];
  public bannerGradient = 'linear-gradient(135deg, #f59e0b, #ec4899)';
  public accentColor = '#f59e0b';
  public iconSvg = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="18" height="18" x="3" y="3" rx="4"/><path d="M7 10h4v4H7zM13 10h4v4h-4z"/></svg>`;

  private container: HTMLElement | null = null;
  private ctx: GameContext | null = null;

  private board: number[][] = [];
  private previousBoard: number[][] | null = null;
  private previousScore: number = 0;
  private score: number = 0;
  private bestScore: number = 0;
  private isGameOver: boolean = false;
  private hasWon: boolean = false;

  private touchStartX: number = 0;
  private touchStartY: number = 0;
  private keyListener: ((e: KeyboardEvent) => void) | null = null;

  public mount(container: HTMLElement, context: GameContext): void {
    this.container = container;
    this.ctx = context;

    const stats = this.ctx.storage.getStats(this.id);
    this.bestScore = stats.bestScore || 0;

    const savedState = this.ctx.storage.getGameState<{
      board: number[][];
      score: number;
    }>(this.id);

    if (savedState && savedState.board) {
      this.board = savedState.board;
      this.score = savedState.score || 0;
    } else {
      this.startNewGame();
    }

    this.render();
    this.bindEvents();
  }

  public unmount(): void {
    if (this.keyListener) {
      window.removeEventListener('keydown', this.keyListener);
      this.keyListener = null;
    }
    this.saveState();
    this.container = null;
  }

  public onRestart(): void {
    this.startNewGame();
  }

  private startNewGame(): void {
    this.board = Engine2048.createEmptyBoard();
    this.previousBoard = null;
    this.previousScore = 0;
    this.score = 0;
    this.isGameOver = false;
    this.hasWon = false;

    Engine2048.spawnTile(this.board);
    Engine2048.spawnTile(this.board);

    this.render();
  }

  private saveState(): void {
    if (this.ctx && !this.isGameOver) {
      this.ctx.storage.setGameState(this.id, {
        board: this.board,
        score: this.score
      });
    }
  }

  private render(): void {
    if (!this.container) return;

    this.container.innerHTML = `
      <div class="g2048-container">
        <div class="g2048-hud">
          <div class="g2048-score-box">
            <span class="g2048-score-label">Score</span>
            <span class="g2048-score-num" id="g2048-cur-score">${this.score}</span>
          </div>
          <div style="display:flex; gap:0.5rem; align-items:center;">
            <button class="toolbar-btn" id="g2048-undo-btn" title="Undo Move">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 7v6h6"/><path d="M21 17a9 9 0 00-9-9 9 9 0 00-6 2.3L3 13"/></svg>
              Undo
            </button>
          </div>
          <div class="g2048-score-box">
            <span class="g2048-score-label">Best</span>
            <span class="g2048-score-num" id="g2048-best-score">${this.bestScore}</span>
          </div>
        </div>

        <div class="g2048-board" id="g2048-board"></div>
        <div style="font-size:0.8rem; color:var(--text-muted); text-align:center;">
          Use Arrow keys or swipe to merge identical tiles!
        </div>
      </div>
    `;

    this.renderBoard();
    document.getElementById('g2048-undo-btn')?.addEventListener('click', () => this.handleUndo());
  }

  private renderBoard(): void {
    const boardEl = document.getElementById('g2048-board');
    if (!boardEl) return;
    boardEl.innerHTML = '';

    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        const val = this.board[r][c];
        const cell = document.createElement('div');
        cell.className = 'g2048-cell';
        if (val > 0) {
          cell.classList.add(`t-${val}`);
          cell.textContent = String(val);
        }
        boardEl.appendChild(cell);
      }
    }
  }

  private handleMove(direction: Direction): void {
    if (this.isGameOver) return;

    // Save previous state for undo
    const backupBoard = this.board.map((row) => [...row]);
    const backupScore = this.score;

    const res = Engine2048.move(this.board, direction);
    if (!res.moved) return;

    this.previousBoard = backupBoard;
    this.previousScore = backupScore;

    this.score += res.scoreGained;
    if (this.score > this.bestScore) {
      this.bestScore = this.score;
      const bestEl = document.getElementById('g2048-best-score');
      if (bestEl) bestEl.textContent = String(this.bestScore);
    }

    const curEl = document.getElementById('g2048-cur-score');
    if (curEl) curEl.textContent = String(this.score);

    // Spawn a new tile
    Engine2048.spawnTile(this.board);
    this.ctx?.audio.playMove();

    if (res.scoreGained > 0) {
      this.ctx?.audio.playScore();
    }

    // Check for 2048 win
    if (res.has2048 && !this.hasWon) {
      this.hasWon = true;
      this.ctx?.audio.playVictory();
      this.ctx?.ui.launchConfetti();
      this.ctx?.ui.showToast('🏆 2048 Achieved! Keep playing for higher scores!', 'success');
    }

    // Check for game over
    if (!Engine2048.canMove(this.board)) {
      this.isGameOver = true;
      this.ctx?.audio.playExplosion();
      this.ctx?.ui.showToast(`Game Over! Final Score: ${this.score}`, 'error');
      this.ctx?.storage.recordGamePlay(this.id, this.hasWon, this.score);
      this.ctx?.storage.clearGameState(this.id);
    }

    this.renderBoard();
    this.saveState();
  }

  private handleUndo(): void {
    if (!this.previousBoard || this.isGameOver) return;
    this.board = this.previousBoard;
    this.score = this.previousScore;
    this.previousBoard = null;

    const curEl = document.getElementById('g2048-cur-score');
    if (curEl) curEl.textContent = String(this.score);

    this.ctx?.audio.playClick();
    this.renderBoard();
    this.saveState();
  }

  private bindEvents(): void {
    this.keyListener = (e: KeyboardEvent) => {
      if (!this.container) return;
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        e.preventDefault();
        this.handleMove('up');
      } else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
        e.preventDefault();
        this.handleMove('down');
      } else if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        e.preventDefault();
        this.handleMove('left');
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        e.preventDefault();
        this.handleMove('right');
      }
    };
    window.addEventListener('keydown', this.keyListener);

    // Touch swipes
    const boardEl = document.getElementById('g2048-board');
    if (!boardEl) return;

    boardEl.addEventListener(
      'touchstart',
      (e) => {
        if (e.touches.length > 0) {
          this.touchStartX = e.touches[0].clientX;
          this.touchStartY = e.touches[0].clientY;
        }
      },
      { passive: true }
    );

    boardEl.addEventListener(
      'touchend',
      (e) => {
        if (e.changedTouches.length > 0) {
          const deltaX = e.changedTouches[0].clientX - this.touchStartX;
          const deltaY = e.changedTouches[0].clientY - this.touchStartY;
          const minSwipe = 30;

          if (Math.abs(deltaX) > Math.abs(deltaY)) {
            if (deltaX > minSwipe) this.handleMove('right');
            else if (deltaX < -minSwipe) this.handleMove('left');
          } else {
            if (deltaY > minSwipe) this.handleMove('down');
            else if (deltaY < -minSwipe) this.handleMove('up');
          }
        }
      },
      { passive: true }
    );
  }
}
