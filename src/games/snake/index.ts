import { GamePlugin, GameContext } from '../../core/types';

interface Point {
  x: number;
  y: number;
}

export class SnakeGame implements GamePlugin {
  public id = 'snake';
  public title = 'Retro Snake';
  public shortDescription = 'Arcade neon snake with food combo multipliers.';
  public description = 'Guide the glowing neon snake, collect radiant apples, and avoid crashing into walls or your own tail! Includes multiple speed levels and responsive touch controls.';
  public category = 'arcade' as const;
  public tags = ['Arcade', 'Retro', 'Action', 'Fast-Paced'];
  public difficultyLevels = ['Casual', 'Normal', 'Turbo'];
  public currentDifficulty = 'Normal';
  public bannerGradient = 'linear-gradient(135deg, #059669, #10b981)';
  public accentColor = '#10b981';
  public iconSvg = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a4 4 0 0 0-4 4v2H6a2 2 0 0 0-2 2v2a2 2 0 0 0 2 2h4v4a4 4 0 0 0 4 4 4 4 0 0 0 4-4v-2h2a2 2 0 0 0 2-2v-2a2 2 0 0 0-2-2h-4V6a4 4 0 0 0-4-4Z"/></svg>`;

  private container: HTMLElement | null = null;
  private ctx: GameContext | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private c2d: CanvasRenderingContext2D | null = null;

  private readonly gridSize = 20;
  private readonly tileCount = 20;

  private snake: Point[] = [];
  private dir: Point = { x: 1, y: 0 };
  private nextDir: Point = { x: 1, y: 0 };
  private food: Point = { x: 15, y: 15 };
  private score: number = 0;
  private bestScore: number = 0;
  private isGameOver: boolean = false;
  private gameLoopId: number | null = null;
  private keyListener: ((e: KeyboardEvent) => void) | null = null;

  public setDifficulty(level: string): void {
    this.currentDifficulty = level;
    this.startNewGame();
  }

  public mount(container: HTMLElement, context: GameContext): void {
    this.container = container;
    this.ctx = context;

    const stats = this.ctx.storage.getStats(this.id);
    this.bestScore = stats.bestScore || 0;

    this.render();
    this.startNewGame();
    this.bindEvents();
  }

  public unmount(): void {
    this.stopLoop();
    if (this.keyListener) {
      window.removeEventListener('keydown', this.keyListener);
      this.keyListener = null;
    }
    this.container = null;
  }

  public onRestart(): void {
    this.startNewGame();
  }

  private getSpeedMs(): number {
    if (this.currentDifficulty === 'Casual') return 130;
    if (this.currentDifficulty === 'Turbo') return 70;
    return 95; // Normal
  }

  private startNewGame(): void {
    this.stopLoop();
    this.snake = [
      { x: 10, y: 10 },
      { x: 9, y: 10 },
      { x: 8, y: 10 }
    ];
    this.dir = { x: 1, y: 0 };
    this.nextDir = { x: 1, y: 0 };
    this.score = 0;
    this.isGameOver = false;

    this.spawnFood();
    this.updateHud();
    this.draw();

    this.startLoop();
  }

  private startLoop(): void {
    this.stopLoop();
    const interval = this.getSpeedMs();
    this.gameLoopId = window.setInterval(() => {
      this.tick();
    }, interval);
  }

  private stopLoop(): void {
    if (this.gameLoopId) {
      clearInterval(this.gameLoopId);
      this.gameLoopId = null;
    }
  }

  private spawnFood(): void {
    let newX: number;
    let newY: number;
    let onSnake: boolean;

    do {
      newX = Math.floor(Math.random() * this.tileCount);
      newY = Math.floor(Math.random() * this.tileCount);
      onSnake = this.snake.some((seg) => seg.x === newX && seg.y === newY);
    } while (onSnake);

    this.food = { x: newX, y: newY };
  }

  private tick(): void {
    if (this.isGameOver) return;

    this.dir = { ...this.nextDir };
    const head = { x: this.snake[0].x + this.dir.x, y: this.snake[0].y + this.dir.y };

    // Wall collision
    if (head.x < 0 || head.x >= this.tileCount || head.y < 0 || head.y >= this.tileCount) {
      this.triggerGameOver();
      return;
    }

    // Self collision
    if (this.snake.some((seg) => seg.x === head.x && seg.y === head.y)) {
      this.triggerGameOver();
      return;
    }

    this.snake.unshift(head);

    // Food collision
    if (head.x === this.food.x && head.y === this.food.y) {
      this.score += 10;
      this.ctx?.audio.playScore();

      if (this.score > this.bestScore) {
        this.bestScore = this.score;
      }
      this.updateHud();
      this.spawnFood();

      if (this.score % 100 === 0) {
        this.ctx?.ui.launchConfetti();
        this.ctx?.audio.playSuccess();
      }
    } else {
      this.snake.pop();
    }

    this.draw();
  }

  private triggerGameOver(): void {
    this.isGameOver = true;
    this.stopLoop();
    this.ctx?.audio.playExplosion();
    this.ctx?.ui.showToast(`💥 Crash! Final Score: ${this.score}`, 'error');
    this.ctx?.storage.recordGamePlay(this.id, this.score >= 100, this.score);
    this.draw();
  }

  private draw(): void {
    if (!this.c2d || !this.canvas) return;
    const ctx = this.c2d;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // Background
    ctx.fillStyle = '#021e15';
    ctx.fillRect(0, 0, w, h);

    // Grid lines subtle
    ctx.strokeStyle = 'rgba(16, 185, 129, 0.05)';
    ctx.lineWidth = 1;
    for (let i = 0; i < this.tileCount; i++) {
      ctx.beginPath();
      ctx.moveTo(i * this.gridSize, 0);
      ctx.lineTo(i * this.gridSize, h);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, i * this.gridSize);
      ctx.lineTo(w, i * this.gridSize);
      ctx.stroke();
    }

    // Draw food with neon glow
    ctx.save();
    ctx.shadowBlur = 12;
    ctx.shadowColor = '#f43f5e';
    ctx.fillStyle = '#f43f5e';
    ctx.beginPath();
    ctx.arc(
      this.food.x * this.gridSize + this.gridSize / 2,
      this.food.y * this.gridSize + this.gridSize / 2,
      this.gridSize / 2.3,
      0,
      Math.PI * 2
    );
    ctx.fill();
    ctx.restore();

    // Draw snake segments
    this.snake.forEach((seg, index) => {
      ctx.save();
      const isHead = index === 0;

      ctx.shadowBlur = isHead ? 15 : 8;
      ctx.shadowColor = isHead ? '#34d399' : '#10b981';
      ctx.fillStyle = isHead ? '#34d399' : '#059669';

      const padding = 1;
      const x = seg.x * this.gridSize + padding;
      const y = seg.y * this.gridSize + padding;
      const size = this.gridSize - padding * 2;

      ctx.beginPath();
      ctx.roundRect(x, y, size, size, isHead ? 6 : 4);
      ctx.fill();

      // Eyes on head
      if (isHead) {
        ctx.fillStyle = '#ffffff';
        const eyeRadius = 2;
        const eyeOffset = 5;
        ctx.beginPath();
        ctx.arc(x + eyeOffset, y + eyeOffset, eyeRadius, 0, Math.PI * 2);
        ctx.arc(x + size - eyeOffset, y + eyeOffset, eyeRadius, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    });

    if (this.isGameOver) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(0, 0, w, h);

      ctx.fillStyle = '#f43f5e';
      ctx.font = 'bold 24px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('GAME OVER', w / 2, h / 2 - 10);

      ctx.fillStyle = '#ffffff';
      ctx.font = '14px Outfit, sans-serif';
      ctx.fillText('Press Restart or Tap to Play Again', w / 2, h / 2 + 20);
    }
  }

  private updateHud(): void {
    const curEl = document.getElementById('snake-cur-score');
    if (curEl) curEl.textContent = String(this.score);

    const bestEl = document.getElementById('snake-best-score');
    if (bestEl) bestEl.textContent = String(this.bestScore);
  }

  private render(): void {
    if (!this.container) return;

    this.container.innerHTML = `
      <div class="snake-container">
        <div class="snake-hud">
          <div>Speed: <strong style="color:var(--accent-emerald)">${this.currentDifficulty}</strong></div>
          <div>Score: <strong id="snake-cur-score" style="color:#34d399">${this.score}</strong></div>
          <div>Best: <strong id="snake-best-score">${this.bestScore}</strong></div>
        </div>

        <div class="snake-canvas-wrapper">
          <canvas class="snake-canvas" id="snake-canvas" width="400" height="400"></canvas>
        </div>

        <div class="snake-dpad">
          <button class="dpad-btn dpad-up" id="dpad-up" aria-label="Up">▲</button>
          <button class="dpad-btn dpad-left" id="dpad-left" aria-label="Left">◀</button>
          <button class="dpad-btn dpad-right" id="dpad-right" aria-label="Right">▶</button>
          <button class="dpad-btn dpad-down" id="dpad-down" aria-label="Down">▼</button>
        </div>
      </div>
    `;

    this.canvas = document.getElementById('snake-canvas') as HTMLCanvasElement;
    if (this.canvas) {
      this.c2d = this.canvas.getContext('2d');
    }

    this.attachDpadEvents();
  }

  private handleDirectionChange(dx: number, dy: number): void {
    if (this.isGameOver) {
      this.startNewGame();
      return;
    }
    // Prevent 180-degree reversing
    if (this.dir.x !== 0 && dx === -this.dir.x) return;
    if (this.dir.y !== 0 && dy === -this.dir.y) return;

    this.nextDir = { x: dx, y: dy };
    this.ctx?.audio.playMove();
  }

  private attachDpadEvents(): void {
    document.getElementById('dpad-up')?.addEventListener('click', () => this.handleDirectionChange(0, -1));
    document.getElementById('dpad-down')?.addEventListener('click', () => this.handleDirectionChange(0, 1));
    document.getElementById('dpad-left')?.addEventListener('click', () => this.handleDirectionChange(-1, 0));
    document.getElementById('dpad-right')?.addEventListener('click', () => this.handleDirectionChange(1, 0));

    this.canvas?.addEventListener('click', () => {
      if (this.isGameOver) this.startNewGame();
    });
  }

  private bindEvents(): void {
    this.keyListener = (e: KeyboardEvent) => {
      if (!this.container) return;
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        e.preventDefault();
        this.handleDirectionChange(0, -1);
      } else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
        e.preventDefault();
        this.handleDirectionChange(0, 1);
      } else if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        e.preventDefault();
        this.handleDirectionChange(-1, 0);
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        e.preventDefault();
        this.handleDirectionChange(1, 0);
      }
    };
    window.addEventListener('keydown', this.keyListener);
  }
}
