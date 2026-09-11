import { GamePlugin, GameContext } from '../../core/types';
import { SudokuEngine, SudokuBoard } from './engine';

interface MoveHistory {
  row: number;
  col: number;
  prevVal: number;
  newVal: number;
  prevNotes: number[];
  newNotes: number[];
}

export class SudokuGame implements GamePlugin {
  public id = 'sudoku';
  public title = 'Sudoku Master';
  public shortDescription = 'Classic logic number puzzle with notes, hints & solver.';
  public description = 'Challenge your brain with classic 9x9 Sudoku. Includes guaranteed unique puzzles, pencil draft notes, smart hints, and conflict tracking.';
  public category = 'puzzle' as const;
  public tags = ['Logic', 'Brain', 'Numbers', 'Classic'];
  public difficultyLevels = ['Easy', 'Medium', 'Hard', 'Expert'];
  public currentDifficulty = 'Easy';
  public bannerGradient = 'linear-gradient(135deg, #0284c7, #6366f1)';
  public accentColor = '#38bdf8';
  public iconSvg = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18M3 15h18M9 3v18M15 3v18"/></svg>`;

  private container: HTMLElement | null = null;
  private ctx: GameContext | null = null;

  private puzzle: SudokuBoard = [];
  private solution: SudokuBoard = [];
  private currentBoard: SudokuBoard = [];
  private notes: { [key: string]: number[] } = {};
  private history: MoveHistory[] = [];

  private selectedCell: [number, number] | null = [0, 0];
  private isNotesMode: boolean = false;
  private mistakes: number = 0;
  private maxMistakes: number = 3;
  private timerSeconds: number = 0;
  private timerInterval: number | null = null;
  private isGameOver: boolean = false;
  private isWon: boolean = false;

  public setDifficulty(level: string): void {
    this.currentDifficulty = level;
    this.startNewGame();
  }

  public mount(container: HTMLElement, context: GameContext): void {
    this.container = container;
    this.ctx = context;

    // Check saved state or start new
    const savedState = this.ctx.storage.getGameState<{
      puzzle: SudokuBoard;
      solution: SudokuBoard;
      currentBoard: SudokuBoard;
      notes: { [key: string]: number[] };
      mistakes: number;
      timerSeconds: number;
      difficulty: string;
    }>(this.id);

    if (savedState && savedState.difficulty === this.currentDifficulty && !this.isGameOver) {
      this.puzzle = savedState.puzzle;
      this.solution = savedState.solution;
      this.currentBoard = savedState.currentBoard;
      this.notes = savedState.notes || {};
      this.mistakes = savedState.mistakes || 0;
      this.timerSeconds = savedState.timerSeconds || 0;
    } else {
      this.initNewPuzzle();
    }

    this.render();
    this.startTimer();
    this.bindEvents();
  }

  public unmount(): void {
    this.stopTimer();
    this.saveState();
    this.container = null;
  }

  public onRestart(): void {
    this.startNewGame();
  }

  private startNewGame(): void {
    this.stopTimer();
    this.initNewPuzzle();
    this.render();
    this.startTimer();
  }

  private initNewPuzzle(): void {
    const generated = SudokuEngine.generatePuzzle(this.currentDifficulty);
    this.puzzle = generated.puzzle;
    this.solution = generated.solution;
    this.currentBoard = SudokuEngine.cloneBoard(this.puzzle);
    this.notes = {};
    this.history = [];
    this.mistakes = 0;
    this.timerSeconds = 0;
    this.isGameOver = false;
    this.isWon = false;
    this.selectedCell = [0, 0];
  }

  private startTimer(): void {
    this.stopTimer();
    this.timerInterval = window.setInterval(() => {
      if (!this.isGameOver && !this.isWon) {
        this.timerSeconds++;
        this.updateHud();
      }
    }, 1000);
  }

  private stopTimer(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  private formatTime(secs: number): string {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }

  private saveState(): void {
    if (this.ctx && !this.isGameOver && !this.isWon) {
      this.ctx.storage.setGameState(this.id, {
        puzzle: this.puzzle,
        solution: this.solution,
        currentBoard: this.currentBoard,
        notes: this.notes,
        mistakes: this.mistakes,
        timerSeconds: this.timerSeconds,
        difficulty: this.currentDifficulty
      });
    }
  }

  private render(): void {
    if (!this.container) return;

    this.container.innerHTML = `
      <div class="sudoku-container">
        <div class="sudoku-hud">
          <div>Difficulty: <strong style="color:var(--accent-primary)">${this.currentDifficulty}</strong></div>
          <div id="sudoku-mistakes">Mistakes: <strong style="color:#f43f5e">${this.mistakes}/${this.maxMistakes}</strong></div>
          <div id="sudoku-timer" style="font-family:var(--font-mono)">⏱️ ${this.formatTime(this.timerSeconds)}</div>
        </div>

        <div class="sudoku-board" id="sudoku-board"></div>

        <div class="sudoku-controls">
          <button class="sudoku-action-btn" id="btn-undo" title="Undo Move">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 7v6h6"/><path d="M21 17a9 9 0 00-9-9 9 9 0 00-6 2.3L3 13"/></svg>
            Undo
          </button>
          <button class="sudoku-action-btn" id="btn-erase" title="Erase Cell">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21"/><path d="M22 21H7"/><path d="m5 11 9 9"/></svg>
            Erase
          </button>
          <button class="sudoku-action-btn ${this.isNotesMode ? 'active' : ''}" id="btn-notes" title="Toggle Pencil Notes">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
            Notes: ${this.isNotesMode ? 'ON' : 'OFF'}
          </button>
          <button class="sudoku-action-btn" id="btn-hint" title="Get a Hint">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/></svg>
            Hint
          </button>
        </div>

        <div class="sudoku-numpad" id="sudoku-numpad">
          ${[1, 2, 3, 4, 5, 6, 7, 8, 9]
            .map((num) => `<button class="numpad-btn" data-num="${num}">${num}</button>`)
            .join('')}
        </div>
      </div>
    `;

    this.renderBoard();
    this.attachDomEvents();
  }

  private updateHud(): void {
    const timerEl = document.getElementById('sudoku-timer');
    if (timerEl) timerEl.textContent = `⏱️ ${this.formatTime(this.timerSeconds)}`;

    const mistakesEl = document.getElementById('sudoku-mistakes');
    if (mistakesEl) {
      mistakesEl.innerHTML = `Mistakes: <strong style="color:#f43f5e">${this.mistakes}/${this.maxMistakes}</strong>`;
    }
  }

  private renderBoard(): void {
    const boardEl = document.getElementById('sudoku-board');
    if (!boardEl) return;
    boardEl.innerHTML = '';

    const selectedVal = this.selectedCell ? this.currentBoard[this.selectedCell[0]][this.selectedCell[1]] : 0;
    const errors = SudokuEngine.getErrors(this.currentBoard, this.solution);

    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        const isGiven = this.puzzle[r][c] !== 0;
        const val = this.currentBoard[r][c];
        const isSelected = this.selectedCell && this.selectedCell[0] === r && this.selectedCell[1] === c;
        const isPeer = this.selectedCell && (this.selectedCell[0] === r || this.selectedCell[1] === c || (Math.floor(this.selectedCell[0] / 3) === Math.floor(r / 3) && Math.floor(this.selectedCell[1] / 3) === Math.floor(c / 3)));
        const isSameNumber = val !== 0 && selectedVal !== 0 && val === selectedVal;
        const isError = errors.has(`${r},${c}`);

        const cellEl = document.createElement('div');
        cellEl.className = 'sudoku-cell';
        if (isGiven) cellEl.classList.add('given');
        if (isSelected) cellEl.classList.add('selected');
        else if (isSameNumber) cellEl.classList.add('highlight-same');
        else if (isPeer) cellEl.classList.add('highlight-peer');

        if (isError) cellEl.classList.add('error');

        cellEl.dataset.row = String(r);
        cellEl.dataset.col = String(c);

        if (val !== 0) {
          cellEl.textContent = String(val);
        } else {
          const cellNotes = this.notes[`${r},${c}`] || [];
          if (cellNotes.length > 0) {
            const notesGrid = document.createElement('div');
            notesGrid.className = 'sudoku-notes-grid';
            for (let i = 1; i <= 9; i++) {
              const noteItem = document.createElement('div');
              noteItem.className = 'sudoku-note';
              if (cellNotes.includes(i)) {
                noteItem.textContent = String(i);
              }
              notesGrid.appendChild(noteItem);
            }
            cellEl.appendChild(notesGrid);
          }
        }

        cellEl.addEventListener('click', () => {
          this.selectedCell = [r, c];
          this.ctx?.audio.playClick();
          this.renderBoard();
        });

        boardEl.appendChild(cellEl);
      }
    }
  }

  private handleNumberInput(num: number): void {
    if (!this.selectedCell || this.isGameOver || this.isWon) return;
    const [r, c] = this.selectedCell;

    // Can't edit original puzzle numbers
    if (this.puzzle[r][c] !== 0) return;

    if (this.isNotesMode) {
      // Toggle note
      const key = `${r},${c}`;
      let currentNotes = this.notes[key] ? [...this.notes[key]] : [];
      if (currentNotes.includes(num)) {
        currentNotes = currentNotes.filter((n) => n !== num);
      } else {
        currentNotes.push(num);
        currentNotes.sort();
      }
      this.notes[key] = currentNotes;
      this.ctx?.audio.playClick();
      this.renderBoard();
      return;
    }

    // Direct input
    const prevVal = this.currentBoard[r][c];
    const prevNotes = this.notes[`${r},${c}`] ? [...this.notes[`${r},${c}`]] : [];

    if (prevVal === num) return; // No-op

    this.history.push({
      row: r,
      col: c,
      prevVal,
      newVal: num,
      prevNotes,
      newNotes: []
    });

    this.currentBoard[r][c] = num;
    delete this.notes[`${r},${c}`];

    // Check validity against solution
    if (num !== this.solution[r][c]) {
      this.mistakes++;
      this.ctx?.audio.playError();
      this.ctx?.ui.showToast(`Incorrect number! (${this.mistakes}/${this.maxMistakes})`, 'error');

      if (this.mistakes >= this.maxMistakes) {
        this.isGameOver = true;
        this.stopTimer();
        this.ctx?.ui.showToast('Game Over! You reached 3 mistakes.', 'error');
      }
    } else {
      this.ctx?.audio.playMove();

      // Check for victory
      if (SudokuEngine.isCompleteAndCorrect(this.currentBoard, this.solution)) {
        this.isWon = true;
        this.stopTimer();
        this.ctx?.audio.playVictory();
        this.ctx?.ui.launchConfetti();
        this.ctx?.ui.showToast(`🎉 Congratulations! Sudoku Solved in ${this.formatTime(this.timerSeconds)}!`, 'success');
        this.ctx?.storage.recordGamePlay(this.id, true, 1000, this.timerSeconds);
        this.ctx?.storage.clearGameState(this.id);
      }
    }

    this.updateHud();
    this.renderBoard();
    this.saveState();
  }

  private handleErase(): void {
    if (!this.selectedCell || this.isGameOver || this.isWon) return;
    const [r, c] = this.selectedCell;
    if (this.puzzle[r][c] !== 0) return;

    const prevVal = this.currentBoard[r][c];
    const prevNotes = this.notes[`${r},${c}`] ? [...this.notes[`${r},${c}`]] : [];

    if (prevVal !== 0 || prevNotes.length > 0) {
      this.history.push({
        row: r,
        col: c,
        prevVal,
        newVal: 0,
        prevNotes,
        newNotes: []
      });
      this.currentBoard[r][c] = 0;
      delete this.notes[`${r},${c}`];
      this.ctx?.audio.playClick();
      this.renderBoard();
      this.saveState();
    }
  }

  private handleUndo(): void {
    if (this.history.length === 0 || this.isGameOver || this.isWon) return;
    const lastMove = this.history.pop()!;
    const { row, col, prevVal, prevNotes } = lastMove;

    this.currentBoard[row][col] = prevVal;
    if (prevNotes.length > 0) {
      this.notes[`${row},${col}`] = prevNotes;
    } else {
      delete this.notes[`${row},${col}`];
    }

    this.selectedCell = [row, col];
    this.ctx?.audio.playClick();
    this.renderBoard();
    this.saveState();
  }

  private handleHint(): void {
    if (this.isGameOver || this.isWon) return;

    // Find an empty cell or an incorrect cell
    const candidates: [number, number][] = [];
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (this.currentBoard[r][c] === 0 || this.currentBoard[r][c] !== this.solution[r][c]) {
          candidates.push([r, c]);
        }
      }
    }

    if (candidates.length === 0) return;

    // Pick random candidate or current cell
    let target = candidates[Math.floor(Math.random() * candidates.length)];
    if (this.selectedCell && (this.currentBoard[this.selectedCell[0]][this.selectedCell[1]] === 0 || this.currentBoard[this.selectedCell[0]][this.selectedCell[1]] !== this.solution[this.selectedCell[0]][this.selectedCell[1]])) {
      target = this.selectedCell;
    }

    const [r, c] = target;
    this.selectedCell = [r, c];
    this.currentBoard[r][c] = this.solution[r][c];
    delete this.notes[`${r},${c}`];

    this.ctx?.audio.playScore();
    this.ctx?.ui.showToast('💡 Hint applied!', 'info');

    if (SudokuEngine.isCompleteAndCorrect(this.currentBoard, this.solution)) {
      this.isWon = true;
      this.stopTimer();
      this.ctx?.audio.playVictory();
      this.ctx?.ui.launchConfetti();
      this.ctx?.ui.showToast(`🎉 Puzzle Completed!`, 'success');
      this.ctx?.storage.recordGamePlay(this.id, true, 800, this.timerSeconds);
      this.ctx?.storage.clearGameState(this.id);
    }

    this.renderBoard();
    this.saveState();
  }

  private attachDomEvents(): void {
    // Action buttons
    document.getElementById('btn-undo')?.addEventListener('click', () => this.handleUndo());
    document.getElementById('btn-erase')?.addEventListener('click', () => this.handleErase());
    document.getElementById('btn-hint')?.addEventListener('click', () => this.handleHint());

    const notesBtn = document.getElementById('btn-notes');
    notesBtn?.addEventListener('click', () => {
      this.isNotesMode = !this.isNotesMode;
      this.ctx?.audio.playClick();
      if (notesBtn) {
        notesBtn.classList.toggle('active', this.isNotesMode);
        notesBtn.innerHTML = `
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
          Notes: ${this.isNotesMode ? 'ON' : 'OFF'}
        `;
      }
    });

    // Numpad buttons
    document.querySelectorAll('.numpad-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const target = e.currentTarget as HTMLElement;
        const num = parseInt(target.dataset.num || '0', 10);
        if (num >= 1 && num <= 9) {
          this.handleNumberInput(num);
        }
      });
    });
  }

  private bindEvents(): void {
    const keyHandler = (e: KeyboardEvent) => {
      if (!this.container || this.isGameOver || this.isWon) return;

      if (e.key >= '1' && e.key <= '9') {
        this.handleNumberInput(parseInt(e.key, 10));
      } else if (e.key === 'Backspace' || e.key === 'Delete') {
        this.handleErase();
      } else if (e.key === 'z' || e.key === 'Z') {
        if (e.ctrlKey || e.metaKey || !e.ctrlKey) this.handleUndo();
      } else if (e.key === 'n' || e.key === 'N') {
        document.getElementById('btn-notes')?.click();
      } else if (e.key === 'h' || e.key === 'H') {
        this.handleHint();
      } else if (this.selectedCell) {
        const [r, c] = this.selectedCell;
        if (e.key === 'ArrowUp' && r > 0) {
          this.selectedCell = [r - 1, c];
          this.renderBoard();
        } else if (e.key === 'ArrowDown' && r < 8) {
          this.selectedCell = [r + 1, c];
          this.renderBoard();
        } else if (e.key === 'ArrowLeft' && c > 0) {
          this.selectedCell = [r, c - 1];
          this.renderBoard();
        } else if (e.key === 'ArrowRight' && c < 8) {
          this.selectedCell = [r, c + 1];
          this.renderBoard();
        }
      }
    };

    window.addEventListener('keydown', keyHandler);
  }
}
