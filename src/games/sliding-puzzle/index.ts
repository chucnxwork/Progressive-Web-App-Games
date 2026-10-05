import { GamePlugin, GameContext } from '../../core/types';
import { SlidingPuzzleEngine, SlideDirection } from './engine';
import { PUZZLE_THEMES, PuzzleTheme } from './themes';

interface SavedPuzzleState {
  board: number[];
  size: number;
  difficulty: string;
  moves: number;
  timerSeconds: number;
  themeId: string;
  showNumbersOnImage: boolean;
}

export class SlidingPuzzleGame implements GamePlugin {
  public id = 'sliding-puzzle';
  public title = 'Sliding Puzzle';
  public shortDescription = 'Slide scrambled tiles into sequential order!';
  public description =
    'The timeless sliding tile challenge modernized with vibrant neon themes, synthwave and cosmic artwork, multi-tile slides, touch gestures, undo, hints, and live speedrun tracking.';
  public category = 'puzzle' as const;
  public tags = ['Classic', 'Logic', 'Numbers', 'Swipe', 'Brain'];
  public difficultyLevels = ['3x3 (Casual)', '4x4 (Classic)', '5x5 (Master)'];
  public currentDifficulty = '4x4 (Classic)';
  public bannerGradient = 'linear-gradient(135deg, #0284c7, #6366f1)';
  public accentColor = '#06b6d4';
  public iconSvg = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <rect x="3" y="3" width="18" height="18" rx="3" stroke-width="2"/>
    <path d="M3 9h18M3 15h18M9 3v18M15 3v18"/>
    <circle cx="6" cy="6" r="1.5" fill="currentColor"/>
    <circle cx="12" cy="6" r="1.5" fill="currentColor"/>
    <circle cx="18" cy="6" r="1.5" fill="currentColor"/>
    <circle cx="6" cy="12" r="1.5" fill="currentColor"/>
    <circle cx="12" cy="12" r="1.5" fill="currentColor"/>
    <circle cx="18" cy="12" r="1.5" fill="currentColor"/>
    <circle cx="6" cy="18" r="1.5" fill="currentColor"/>
    <circle cx="12" cy="18" r="1.5" fill="currentColor"/>
  </svg>`;

  private container: HTMLElement | null = null;
  private ctx: GameContext | null = null;

  private size: number = 4;
  private board: number[] = [];
  private undoStack: number[][] = [];
  private moves: number = 0;
  private timerSeconds: number = 0;
  private timerInterval: number | null = null;
  private timerStarted: boolean = false;
  private isWon: boolean = false;

  private currentThemeId: string = 'neon-cyber';
  private showNumbersOnImage: boolean = true;
  private hintTileIndex: number | null = null;
  private showPreview: boolean = false;

  // Touch gesture tracking
  private touchStartX: number = 0;
  private touchStartY: number = 0;

  // Listeners
  private keydownListener: ((e: KeyboardEvent) => void) | null = null;

  public setDifficulty(level: string): void {
    this.currentDifficulty = level;
    if (level.startsWith('3x3')) this.size = 3;
    else if (level.startsWith('5x5')) this.size = 5;
    else this.size = 4;

    this.startNewGame();
  }

  public mount(container: HTMLElement, context: GameContext): void {
    this.container = container;
    this.ctx = context;

    // Parse size from currentDifficulty
    if (this.currentDifficulty.startsWith('3x3')) this.size = 3;
    else if (this.currentDifficulty.startsWith('5x5')) this.size = 5;
    else this.size = 4;

    // Check for saved state
    const saved = this.ctx.storage.getGameState<SavedPuzzleState>(this.id);
    if (saved && saved.board && saved.size === this.size && !SlidingPuzzleEngine.isSolved(saved.board)) {
      this.board = saved.board;
      this.moves = saved.moves || 0;
      this.timerSeconds = saved.timerSeconds || 0;
      this.currentThemeId = saved.themeId || 'neon-cyber';
      this.showNumbersOnImage = saved.showNumbersOnImage !== false;
      this.timerStarted = this.moves > 0;
      if (this.timerStarted) this.startTimer();
    } else {
      this.startNewGame();
    }

    this.render();
    this.bindEvents();
  }

  public unmount(): void {
    this.stopTimer();
    if (this.keydownListener) {
      window.removeEventListener('keydown', this.keydownListener);
      this.keydownListener = null;
    }
    this.saveState();
    this.container = null;
  }

  public onRestart(): void {
    this.startNewGame();
  }

  private startNewGame(): void {
    this.stopTimer();
    this.timerSeconds = 0;
    this.timerStarted = false;
    this.moves = 0;
    this.undoStack = [];
    this.isWon = false;
    this.hintTileIndex = null;
    this.showPreview = false;

    this.board = SlidingPuzzleEngine.generateShuffledBoard(this.size);

    this.render();
    this.saveState();
  }

  private saveState(): void {
    if (this.ctx && !this.isWon) {
      this.ctx.storage.setGameState<SavedPuzzleState>(this.id, {
        board: this.board,
        size: this.size,
        difficulty: this.currentDifficulty,
        moves: this.moves,
        timerSeconds: this.timerSeconds,
        themeId: this.currentThemeId,
        showNumbersOnImage: this.showNumbersOnImage
      });
    } else if (this.ctx && this.isWon) {
      this.ctx.storage.clearGameState(this.id);
    }
  }

  private startTimer(): void {
    if (this.timerInterval !== null) return;
    this.timerInterval = window.setInterval(() => {
      this.timerSeconds++;
      this.updateHud();
    }, 1000);
  }

  private stopTimer(): void {
    if (this.timerInterval !== null) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  private formatTime(sec: number): string {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  private getTheme(): PuzzleTheme {
    return PUZZLE_THEMES.find((t) => t.id === this.currentThemeId) || PUZZLE_THEMES[0];
  }

  private render(): void {
    if (!this.container) return;

    const theme = this.getTheme();
    const stats = this.ctx ? this.ctx.storage.getStats(this.id) : null;
    const bestScoreText = stats?.bestScore ? `${stats.bestScore} moves` : '--';

    this.container.innerHTML = `
      <div class="slide-puzzle-container">
        <!-- Top HUD Panel -->
        <div class="slide-puzzle-hud">
          <div class="slide-hud-stat">
            <span class="slide-hud-label">Moves</span>
            <span class="slide-hud-value" id="slide-moves-val">${this.moves}</span>
          </div>
          <div class="slide-hud-stat">
            <span class="slide-hud-label">Time</span>
            <span class="slide-hud-value" id="slide-time-val">${this.formatTime(this.timerSeconds)}</span>
          </div>
          <div class="slide-hud-stat">
            <span class="slide-hud-label">Best</span>
            <span class="slide-hud-value" id="slide-best-val">${bestScoreText}</span>
          </div>
        </div>

        <!-- Controls Bar -->
        <div class="slide-controls-bar">
          <div class="slide-theme-selector" title="Choose Puzzle Artwork / Style">
            <label for="slide-theme-select">Theme:</label>
            <select id="slide-theme-select" class="slide-select">
              ${PUZZLE_THEMES.map(
                (t) => `<option value="${t.id}" ${t.id === this.currentThemeId ? 'selected' : ''}>${t.name}</option>`
              ).join('')}
            </select>
          </div>

          <div class="slide-action-btns">
            ${
              theme.type === 'image'
                ? `<button class="slide-btn ${this.showNumbersOnImage ? 'is-active' : ''}" id="slide-toggle-nums-btn" title="Toggle numbers overlay">
                    <span># Numbers</span>
                   </button>`
                : ''
            }
            <button class="slide-btn" id="slide-undo-btn" ${this.undoStack.length === 0 ? 'disabled' : ''} title="Undo last move">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/></svg>
              <span>Undo</span>
            </button>
            <button class="slide-btn" id="slide-hint-btn" title="Highlight recommended move">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M9 18h6"/><path d="M10 22h4"/><path d="M12 2a7 7 0 0 0-7 7c0 2.5 1.5 4.5 3 6h8c1.5-1.5 3-3.5 3-6a7 7 0 0 0-7-7z"/></svg>
              <span>Hint</span>
            </button>
            <button class="slide-btn" id="slide-preview-btn" title="View target goal preview">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="3"/><path d="M2 12s3.5-8 10-8 10 8 10 8-3.5 8-10 8-10-8-10-8z"/></svg>
              <span>Goal</span>
            </button>
          </div>
        </div>

        <!-- Preview Modal / Overlay -->
        <div class="slide-preview-overlay ${this.showPreview ? 'is-visible' : ''}" id="slide-preview-overlay">
          <div class="slide-preview-card">
            <div class="slide-preview-header">
              <h4>🎯 Target Solved State</h4>
              <button class="slide-preview-close" id="slide-preview-close">&times;</button>
            </div>
            <div class="slide-preview-content" id="slide-preview-content"></div>
          </div>
        </div>

        <!-- The Puzzle Stage -->
        <div class="slide-board-wrapper">
          <div class="slide-board" id="slide-board" style="--puzzle-size: ${this.size};">
            ${this.renderTilesHtml()}
          </div>

          <!-- Victory Overlay -->
          <div class="slide-victory-overlay ${this.isWon ? 'is-visible' : ''}" id="slide-victory-overlay">
            <div class="slide-victory-card">
              <div class="slide-victory-trophy">🏆</div>
              <h3 class="slide-victory-title">Puzzle Solved!</h3>
              <div class="slide-victory-stars" id="slide-victory-stars">⭐⭐⭐</div>
              <p class="slide-victory-summary" id="slide-victory-summary">
                Finished in <strong>${this.moves}</strong> moves and <strong>${this.formatTime(this.timerSeconds)}</strong>!
              </p>
              <div style="display:flex; gap:0.75rem; justify-content:center; margin-top:1rem;">
                <button class="toolbar-btn btn-accent" id="slide-victory-restart">Play Again</button>
              </div>
            </div>
          </div>
        </div>

        <!-- Controls Guide / Mobile Thumb D-Pad -->
        <div class="slide-footer-controls">
          <div class="slide-dpad">
            <button class="dpad-btn dpad-up" id="dpad-up" aria-label="Slide Up">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="18 15 12 9 6 15"/></svg>
            </button>
            <button class="dpad-btn dpad-left" id="dpad-left" aria-label="Slide Left">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>
            </button>
            <button class="dpad-btn dpad-right" id="dpad-right" aria-label="Slide Right">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>
            </button>
            <button class="dpad-btn dpad-down" id="dpad-down" aria-label="Slide Down">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
            </button>
          </div>
          <p class="slide-guide-text">
            Tap or swipe tiles to slide. Arrow keys & WASD supported. Tap distant tile in same row/col to slide line!
          </p>
        </div>
      </div>
    `;

    this.renderPreviewContent();
  }

  private renderTilesHtml(): string {
    const theme = this.getTheme();

    return this.board
      .map((val, idx) => {
        const row = Math.floor(idx / this.size);
        const col = idx % this.size;

        if (val === 0) {
          // If won, render the completed final piece!
          if (this.isWon) {
            const finalVal = this.size * this.size;
            const targetRow = this.size - 1;
            const targetCol = this.size - 1;
            const customStyles = theme.getTileStyle(finalVal, targetRow, targetCol, this.size);
            const styleStr = Object.entries(customStyles)
              .map(([k, v]) => `${k.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`)}:${v}`)
              .join(';');

            return `
              <div class="slide-tile slide-tile-final is-won-piece" style="--tile-row:${row}; --tile-col:${col}; ${styleStr}">
                ${
                  theme.type === 'image' && !this.showNumbersOnImage
                    ? ''
                    : `<span class="slide-tile-num">${finalVal}</span>`
                }
              </div>
            `;
          }

          return `<div class="slide-tile slide-tile-empty" data-index="${idx}" style="--tile-row:${row}; --tile-col:${col};"></div>`;
        }

        const origIndex = val - 1;
        const origRow = Math.floor(origIndex / this.size);
        const origCol = origIndex % this.size;
        const isHint = idx === this.hintTileIndex;
        const canMove = SlidingPuzzleEngine.canMove(this.board, this.size, idx);

        const customStyles = theme.getTileStyle(val, origRow, origCol, this.size);
        const styleStr = Object.entries(customStyles)
          .map(([k, v]) => `${k.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`)}:${v}`)
          .join(';');

        return `
          <div class="slide-tile ${canMove ? 'is-movable' : ''} ${isHint ? 'is-hint' : ''}"
               data-index="${idx}"
               data-val="${val}"
               style="--tile-row:${row}; --tile-col:${col}; ${styleStr}">
            ${
              theme.type === 'image' && !this.showNumbersOnImage
                ? ''
                : `<span class="slide-tile-num">${val}</span>`
            }
          </div>
        `;
      })
      .join('');
  }

  private renderPreviewContent(): void {
    const previewContent = document.getElementById('slide-preview-content');
    if (!previewContent) return;

    const theme = this.getTheme();
    if (theme.type === 'image' && theme.getFullImageSvg) {
      previewContent.innerHTML = `
        <div class="slide-preview-image-wrap">
          <img src="${theme.getFullImageSvg(this.size)}" alt="Target Goal" class="slide-preview-img"/>
        </div>
      `;
    } else {
      // Numeric preview grid
      let gridHtml = `<div class="slide-preview-grid" style="grid-template-columns: repeat(${this.size}, 1fr);">`;
      for (let i = 1; i <= this.size * this.size; i++) {
        if (i === this.size * this.size) {
          gridHtml += `<div class="slide-preview-tile is-empty"></div>`;
        } else {
          gridHtml += `<div class="slide-preview-tile">${i}</div>`;
        }
      }
      gridHtml += `</div>`;
      previewContent.innerHTML = gridHtml;
    }
  }

  private updateHud(): void {
    const movesEl = document.getElementById('slide-moves-val');
    if (movesEl) movesEl.textContent = String(this.moves);

    const timeEl = document.getElementById('slide-time-val');
    if (timeEl) timeEl.textContent = this.formatTime(this.timerSeconds);

    const undoBtn = document.getElementById('slide-undo-btn') as HTMLButtonElement;
    if (undoBtn) undoBtn.disabled = this.undoStack.length === 0;
  }

  private handleTileClick(index: number): void {
    if (this.isWon) return;

    if (!this.timerStarted) {
      this.timerStarted = true;
      this.startTimer();
    }

    const result = SlidingPuzzleEngine.executeClickMove(this.board, this.size, index);
    if (!result.valid) {
      this.ctx?.audio.playError();
      return;
    }

    // Save previous state for undo
    this.undoStack.push([...this.board]);
    if (this.undoStack.length > 50) this.undoStack.shift();

    this.board = result.newBoard;
    this.moves++;
    this.hintTileIndex = null;

    this.ctx?.audio.playMove();

    // Check win condition
    if (SlidingPuzzleEngine.isSolved(this.board)) {
      this.handleVictory();
    } else {
      this.renderBoardTiles();
      this.updateHud();
      this.saveState();
    }
  }

  private handleDirectionMove(dir: SlideDirection): void {
    if (this.isWon) return;

    if (!this.timerStarted) {
      this.timerStarted = true;
      this.startTimer();
    }

    const result = SlidingPuzzleEngine.executeDirectionMove(this.board, this.size, dir);
    if (!result.valid) return;

    this.undoStack.push([...this.board]);
    if (this.undoStack.length > 50) this.undoStack.shift();

    this.board = result.newBoard;
    this.moves++;
    this.hintTileIndex = null;

    this.ctx?.audio.playMove();

    if (SlidingPuzzleEngine.isSolved(this.board)) {
      this.handleVictory();
    } else {
      this.renderBoardTiles();
      this.updateHud();
      this.saveState();
    }
  }

  private handleUndo(): void {
    if (this.undoStack.length === 0 || this.isWon) return;

    const prev = this.undoStack.pop();
    if (!prev) return;

    this.board = prev;
    if (this.moves > 0) this.moves--;
    this.hintTileIndex = null;

    this.ctx?.audio.playClick();
    this.renderBoardTiles();
    this.updateHud();
    this.saveState();
  }

  private handleHint(): void {
    if (this.isWon) return;
    const hintIdx = SlidingPuzzleEngine.getBestHintTileIndex(this.board, this.size);
    if (hintIdx !== null) {
      this.hintTileIndex = hintIdx;
      this.ctx?.audio.playClick();
      this.ctx?.ui.showToast('💡 Try sliding this glowing tile!', 'info');
      this.renderBoardTiles();
    }
  }

  private handleVictory(): void {
    this.isWon = true;
    this.stopTimer();

    const rating = SlidingPuzzleEngine.calculateStarRating(this.size, this.moves, this.timerSeconds);
    const starString = '⭐'.repeat(rating.stars);

    // Play fanfare and effects
    this.ctx?.audio.playVictory();
    this.ctx?.ui.launchConfetti();
    this.ctx?.ui.showToast(`🎉 ${rating.title} Solved in ${this.moves} moves!`, 'success');

    // Update stats: records won, moves (score), and time
    this.ctx?.storage.recordGamePlay(this.id, true, this.moves, this.timerSeconds);

    this.renderBoardTiles();
    this.updateHud();
    this.saveState();

    const victoryStars = document.getElementById('slide-victory-stars');
    if (victoryStars) victoryStars.textContent = starString;

    const victorySummary = document.getElementById('slide-victory-summary');
    if (victorySummary) {
      victorySummary.innerHTML = `
        <strong>${rating.title}</strong><br>
        Solved in <strong>${this.moves}</strong> moves and <strong>${this.formatTime(this.timerSeconds)}</strong>!
      `;
    }

    const overlay = document.getElementById('slide-victory-overlay');
    if (overlay) overlay.classList.add('is-visible');
  }

  private renderBoardTiles(): void {
    const boardEl = document.getElementById('slide-board');
    if (boardEl) {
      boardEl.innerHTML = this.renderTilesHtml();
    }
  }

  private bindEvents(): void {
    if (!this.container) return;

    // Board click delegation
    this.container.addEventListener('click', (e) => {
      const target = (e.target as HTMLElement).closest('.slide-tile') as HTMLElement;
      if (target && target.dataset.index) {
        const idx = parseInt(target.dataset.index, 10);
        this.handleTileClick(idx);
      }
    });

    // Theme selector
    const themeSelect = document.getElementById('slide-theme-select') as HTMLSelectElement;
    if (themeSelect) {
      themeSelect.addEventListener('change', (e) => {
        this.currentThemeId = (e.target as HTMLSelectElement).value;
        this.ctx?.audio.playClick();
        this.render();
        this.saveState();
      });
    }

    // Toggle numbers overlay on image
    const toggleNumsBtn = document.getElementById('slide-toggle-nums-btn');
    if (toggleNumsBtn) {
      toggleNumsBtn.addEventListener('click', () => {
        this.showNumbersOnImage = !this.showNumbersOnImage;
        this.ctx?.audio.playClick();
        this.render();
        this.saveState();
      });
    }

    // Undo button
    document.getElementById('slide-undo-btn')?.addEventListener('click', () => {
      this.handleUndo();
    });

    // Hint button
    document.getElementById('slide-hint-btn')?.addEventListener('click', () => {
      this.handleHint();
    });

    // Goal Preview button
    document.getElementById('slide-preview-btn')?.addEventListener('click', () => {
      this.showPreview = true;
      this.ctx?.audio.playClick();
      const overlay = document.getElementById('slide-preview-overlay');
      if (overlay) overlay.classList.add('is-visible');
    });

    // Close preview button
    document.getElementById('slide-preview-close')?.addEventListener('click', () => {
      this.showPreview = false;
      this.ctx?.audio.playClick();
      const overlay = document.getElementById('slide-preview-overlay');
      if (overlay) overlay.classList.remove('is-visible');
    });

    // Victory restart
    document.getElementById('slide-victory-restart')?.addEventListener('click', () => {
      this.ctx?.audio.playClick();
      this.startNewGame();
    });

    // Mobile D-Pad
    document.getElementById('dpad-up')?.addEventListener('click', () => this.handleDirectionMove('up'));
    document.getElementById('dpad-down')?.addEventListener('click', () => this.handleDirectionMove('down'));
    document.getElementById('dpad-left')?.addEventListener('click', () => this.handleDirectionMove('left'));
    document.getElementById('dpad-right')?.addEventListener('click', () => this.handleDirectionMove('right'));

    // Keyboard bindings
    this.keydownListener = (e: KeyboardEvent) => {
      if (['ArrowUp', 'KeyW'].includes(e.code)) {
        e.preventDefault();
        this.handleDirectionMove('up');
      } else if (['ArrowDown', 'KeyS'].includes(e.code)) {
        e.preventDefault();
        this.handleDirectionMove('down');
      } else if (['ArrowLeft', 'KeyA'].includes(e.code)) {
        e.preventDefault();
        this.handleDirectionMove('left');
      } else if (['ArrowRight', 'KeyD'].includes(e.code)) {
        e.preventDefault();
        this.handleDirectionMove('right');
      } else if (e.code === 'KeyZ' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        this.handleUndo();
      } else if (e.code === 'KeyU') {
        this.handleUndo();
      } else if (e.code === 'KeyH') {
        this.handleHint();
      }
    };
    window.addEventListener('keydown', this.keydownListener);

    // Touch Swipe events on board
    const boardEl = document.getElementById('slide-board');
    if (boardEl) {
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
            const absX = Math.abs(deltaX);
            const absY = Math.abs(deltaY);

            if (Math.max(absX, absY) > 35) {
              if (absX > absY) {
                // Horizontal swipe
                if (deltaX > 0) this.handleDirectionMove('right');
                else this.handleDirectionMove('left');
              } else {
                // Vertical swipe
                if (deltaY > 0) this.handleDirectionMove('down');
                else this.handleDirectionMove('up');
              }
            }
          }
        },
        { passive: true }
      );
    }
  }
}
