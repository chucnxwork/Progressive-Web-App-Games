import { GamePlugin, GameContext } from '../../core/types';
import { SnakesAndLaddersEngine, PlayerState } from './engine';

interface SavedSnakesState {
  players: PlayerState[];
  activePlayerIndex: number;
  lastRoll: number | null;
  historyLog: string[];
  difficulty: string;
  gameDurationSeconds: number;
}

export class SnakesAndLaddersGame implements GamePlugin {
  public id = 'snakes-and-ladders';
  public title = 'Snakes & Ladders';
  public shortDescription = 'Roll the dice, climb ladders, dodge snakes, and race to 100!';
  public description =
    'The timeless board race re-imagined with glowing neon cyber aesthetics! Play solo against smart AI or pass-and-play with a friend. Features animated 3D dice rolling, step-by-step token hops, dynamic glowing ladders and snakes, and extra rolls on rolling a 6.';
  public category = 'classic' as const;
  public tags = ['Classic', 'Board', 'Dice', 'Multiplayer', 'Family'];
  public difficultyLevels = ['Vs AI (Normal)', 'Vs AI (Easy)', 'Pass & Play (2P)'];
  public currentDifficulty = 'Vs AI (Normal)';
  public bannerGradient = 'linear-gradient(135deg, #10b981, #06b6d4)';
  public accentColor = '#10b981';
  public iconSvg = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <rect x="3" y="3" width="18" height="18" rx="3" stroke-width="2"/>
    <path d="M7 17l4-10M13 17l4-10M8.5 13.5h7M9.5 9.5h7"/>
    <path d="M19 7c-2 0-3 2-4 4s-2 4-5 4" stroke="#f43f5e" stroke-width="2.5" stroke-linecap="round"/>
  </svg>`;

  private container: HTMLElement | null = null;
  private ctx: GameContext | null = null;

  private players: PlayerState[] = [];
  private activePlayerIndex: number = 0;
  private isRolling: boolean = false;
  private isMoving: boolean = false;
  private lastRoll: number | null = null;
  private isGameOver: boolean = false;
  private winner: PlayerState | null = null;
  private historyLog: string[] = [];
  private speedMode: 'normal' | 'fast' = 'normal';

  private timerSeconds: number = 0;
  private timerInterval: number | null = null;
  private aiTimeoutId: number | null = null;
  private keyListener: ((e: KeyboardEvent) => void) | null = null;

  public setDifficulty(level: string): void {
    this.currentDifficulty = level;
    this.startNewGame();
  }

  public mount(container: HTMLElement, context: GameContext): void {
    this.container = container;
    this.ctx = context;

    const saved = this.ctx.storage.getGameState<SavedSnakesState>(this.id);
    if (saved && saved.players && saved.players.length === 2 && saved.players[0].position < 100 && saved.players[1].position < 100) {
      this.players = saved.players;
      this.activePlayerIndex = saved.activePlayerIndex || 0;
      this.lastRoll = saved.lastRoll;
      this.historyLog = saved.historyLog || [];
      this.currentDifficulty = saved.difficulty || this.currentDifficulty;
      this.timerSeconds = saved.gameDurationSeconds || 0;
    } else {
      this.initPlayers();
    }

    this.startTimer();
    this.render();
    this.bindEvents();

    // If initial player is AI, trigger turn
    if (this.getCurrentPlayer().isAi && !this.isGameOver) {
      this.scheduleAiTurn();
    }
  }

  public unmount(): void {
    this.stopTimer();
    if (this.aiTimeoutId !== null) {
      clearTimeout(this.aiTimeoutId);
      this.aiTimeoutId = null;
    }
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

  private initPlayers(): void {
    const isPvp = this.currentDifficulty === 'Pass & Play (2P)';
    this.players = [
      {
        id: 1,
        name: 'Player 1',
        color: '#06b6d4', // Neon Cyan
        position: 0,
        isAi: false,
        totalRolls: 0,
        snakesEncountered: 0,
        laddersClimbed: 0
      },
      {
        id: 2,
        name: isPvp ? 'Player 2' : 'Cyber Bot',
        color: '#f43f5e', // Neon Rose/Red
        position: 0,
        isAi: !isPvp,
        totalRolls: 0,
        snakesEncountered: 0,
        laddersClimbed: 0
      }
    ];
    this.activePlayerIndex = 0;
    this.lastRoll = null;
    this.historyLog = ['Game started. Roll dice to enter the board!'];
    this.isGameOver = false;
    this.winner = null;
    this.isRolling = false;
    this.isMoving = false;
  }

  private startNewGame(): void {
    if (this.aiTimeoutId !== null) {
      clearTimeout(this.aiTimeoutId);
      this.aiTimeoutId = null;
    }
    this.timerSeconds = 0;
    this.initPlayers();
    this.render();
    this.saveState();
  }

  private startTimer(): void {
    if (this.timerInterval !== null) return;
    this.timerInterval = window.setInterval(() => {
      this.timerSeconds++;
    }, 1000);
  }

  private stopTimer(): void {
    if (this.timerInterval !== null) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  private getCurrentPlayer(): PlayerState {
    return this.players[this.activePlayerIndex];
  }

  private saveState(): void {
    if (this.ctx && !this.isGameOver) {
      this.ctx.storage.setGameState<SavedSnakesState>(this.id, {
        players: this.players,
        activePlayerIndex: this.activePlayerIndex,
        lastRoll: this.lastRoll,
        historyLog: this.historyLog,
        difficulty: this.currentDifficulty,
        gameDurationSeconds: this.timerSeconds
      });
    } else if (this.ctx && this.isGameOver) {
      this.ctx.storage.clearGameState(this.id);
    }
  }

  private render(): void {
    if (!this.container) return;

    const p1 = this.players[0];
    const p2 = this.players[1];
    const currentP = this.getCurrentPlayer();

    this.container.innerHTML = `
      <div class="snakes-game-container">
        <!-- Top Players HUD -->
        <div class="snakes-hud">
          <div class="snakes-player-card ${this.activePlayerIndex === 0 ? 'is-active' : ''}" id="p1-card">
            <div class="snakes-avatar" style="--p-color: ${p1.color};">P1</div>
            <div class="snakes-player-info">
              <span class="snakes-player-name">${p1.name}</span>
              <span class="snakes-player-pos">Square: <strong id="p1-pos-val">${p1.position === 0 ? 'Start' : p1.position}</strong></span>
            </div>
            ${this.activePlayerIndex === 0 ? '<span class="snakes-turn-badge">Turn</span>' : ''}
          </div>

          <div class="snakes-turn-indicator">
            <span class="snakes-turn-label">${this.isGameOver ? 'Game Over' : `${currentP.name}'s Turn`}</span>
            <div class="snakes-dice-display" id="snakes-dice-box" title="Click to Roll Dice">
              ${this.renderDiceSvg(this.lastRoll || 1)}
            </div>
          </div>

          <div class="snakes-player-card ${this.activePlayerIndex === 1 ? 'is-active' : ''}" id="p2-card">
            <div class="snakes-avatar" style="--p-color: ${p2.color};">${p2.isAi ? 'AI' : 'P2'}</div>
            <div class="snakes-player-info">
              <span class="snakes-player-name">${p2.name}</span>
              <span class="snakes-player-pos">Square: <strong id="p2-pos-val">${p2.position === 0 ? 'Start' : p2.position}</strong></span>
            </div>
            ${this.activePlayerIndex === 1 ? '<span class="snakes-turn-badge">Turn</span>' : ''}
          </div>
        </div>

        <!-- Board Wrapper -->
        <div class="snakes-board-wrapper">
          <div class="snakes-board" id="snakes-board">
            ${this.renderBoardCells()}
            ${this.renderSvgOverlays()}
            ${this.renderPlayerTokens()}
          </div>

          <!-- Victory Modal Overlay -->
          <div class="snakes-victory-overlay ${this.isGameOver ? 'is-visible' : ''}" id="snakes-victory-overlay">
            <div class="snakes-victory-card">
              <div class="snakes-trophy">👑</div>
              <h3 class="snakes-winner-title">${this.winner ? `${this.winner.name} Wins!` : 'Victory!'}</h3>
              <p class="snakes-winner-desc" id="snakes-winner-desc">
                ${this.winner ? `Reached square 100 in ${this.winner.totalRolls} rolls!` : ''}
              </p>
              <div class="snakes-victory-stats">
                <div>Ladders: <strong>${this.winner?.laddersClimbed || 0}</strong></div>
                <div>Snakes Hit: <strong>${this.winner?.snakesEncountered || 0}</strong></div>
              </div>
              <button class="toolbar-btn btn-accent" id="snakes-play-again-btn" style="margin-top:1rem;">Play Again</button>
            </div>
          </div>
        </div>

        <!-- Controls & Action Panel -->
        <div class="snakes-action-bar">
          <button class="toolbar-btn btn-accent snakes-roll-btn" id="snakes-roll-btn" ${this.isRolling || this.isMoving || (currentP.isAi && !this.isGameOver) || this.isGameOver ? 'disabled' : ''}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="3" width="18" height="18" rx="4"/><circle cx="8" cy="8" r="1.5" fill="currentColor"/><circle cx="16" cy="16" r="1.5" fill="currentColor"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/></svg>
            <span>Roll Dice ${currentP.isAi ? '(AI Thinking...)' : ''}</span>
          </button>

          <button class="toolbar-btn" id="snakes-speed-btn" title="Toggle Move Animation Speed">
            <span>⚡ ${this.speedMode === 'fast' ? 'Fast' : 'Normal'}</span>
          </button>
        </div>

        <!-- Mini Activity Feed -->
        <div class="snakes-log-box" id="snakes-log-box">
          <div class="snakes-log-content">
            ${this.historyLog.slice(-4).map((entry) => `<div class="snakes-log-entry">${entry}</div>`).join('')}
          </div>
        </div>
      </div>
    `;
  }

  private renderBoardCells(): string {
    let cellsHtml = '';
    // Render 100 squares: from top row (square 100 to 91) down to bottom row (square 1 to 10)
    for (let row = 0; row < 10; row++) {
      for (let col = 0; col < 10; col++) {
        const rowFromBottom = 9 - row;
        const square = rowFromBottom % 2 === 0 ? rowFromBottom * 10 + col + 1 : rowFromBottom * 10 + (10 - col);
        const isLadderStart = SnakesAndLaddersEngine.LADDERS[square] !== undefined;
        const isSnakeHead = SnakesAndLaddersEngine.SNAKES[square] !== undefined;
        const isSpecialGoal = square === 100;
        const isAlternate = (row + col) % 2 === 1;

        cellsHtml += `
          <div class="snakes-cell ${isAlternate ? 'is-alt' : ''} ${isSpecialGoal ? 'is-goal' : ''}" data-square="${square}">
            <span class="snakes-cell-num">${square}</span>
            ${isLadderStart ? `<span class="snakes-badge badge-ladder" title="Climb to ${SnakesAndLaddersEngine.LADDERS[square]}">🪜 ${SnakesAndLaddersEngine.LADDERS[square]}</span>` : ''}
            ${isSnakeHead ? `<span class="snakes-badge badge-snake" title="Slide to ${SnakesAndLaddersEngine.SNAKES[square]}">🐍 ${SnakesAndLaddersEngine.SNAKES[square]}</span>` : ''}
            ${isSpecialGoal ? `<span class="snakes-goal-flag">🏆</span>` : ''}
          </div>
        `;
      }
    }
    return cellsHtml;
  }

  private renderSvgOverlays(): string {
    const ladders = SnakesAndLaddersEngine.getAllLadders();
    const snakes = SnakesAndLaddersEngine.getAllSnakes();

    let svgElements = '';

    // Draw Ladders
    ladders.forEach(({ fromCoord, toCoord }) => {
      const x1 = fromCoord.xPercent;
      const y1 = fromCoord.yPercent;
      const x2 = toCoord.xPercent;
      const y2 = toCoord.yPercent;

      const dx = x2 - x1;
      const dy = y2 - y1;
      const len = Math.hypot(dx, dy);
      if (len === 0) return;

      const nx = -dy / len;
      const ny = dx / len;
      const halfWidth = 1.35; // % width of ladder rails

      // Rails
      const lx1 = x1 + nx * halfWidth;
      const ly1 = y1 + ny * halfWidth;
      const lx2 = x2 + nx * halfWidth;
      const ly2 = y2 + ny * halfWidth;

      const rx1 = x1 - nx * halfWidth;
      const ry1 = y1 - ny * halfWidth;
      const rx2 = x2 - nx * halfWidth;
      const ry2 = y2 - ny * halfWidth;

      svgElements += `<line x1="${lx1}%" y1="${ly1}%" x2="${lx2}%" y2="${ly2}%" class="svg-ladder-rail" />`;
      svgElements += `<line x1="${rx1}%" y1="${ry1}%" x2="${rx2}%" y2="${ry2}%" class="svg-ladder-rail" />`;

      // Rungs
      const numRungs = Math.max(3, Math.floor(len / 4.2));
      for (let r = 1; r <= numRungs; r++) {
        const t = r / (numRungs + 1);
        const rungX = x1 + dx * t;
        const rungY = y1 + dy * t;
        svgElements += `<line x1="${rungX + nx * halfWidth}%" y1="${rungY + ny * halfWidth}%" x2="${rungX - nx * halfWidth}%" y2="${rungY - ny * halfWidth}%" class="svg-ladder-rung" />`;
      }
    });

    // Draw Snakes (curved wavy bodies)
    snakes.forEach(({ fromCoord, toCoord }) => {
      const x1 = fromCoord.xPercent; // Head
      const y1 = fromCoord.yPercent;
      const x2 = toCoord.xPercent; // Tail
      const y2 = toCoord.yPercent;

      const dx = x2 - x1;
      const dy = y2 - y1;
      const len = Math.hypot(dx, dy);
      const nx = -dy / len;
      const ny = dx / len;
      const waveAmp = Math.min(len * 0.22, 6.5);

      // Bezier curve with sinusoidal bends
      const cx1 = x1 + dx * 0.33 + nx * waveAmp;
      const cy1 = y1 + dy * 0.33 + ny * waveAmp;
      const cx2 = x1 + dx * 0.66 - nx * waveAmp;
      const cy2 = y1 + dy * 0.66 - ny * waveAmp;

      const pathData = `M ${x1} ${y1} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${x2} ${y2}`;

      // Outer glow body, inner pattern, and glowing head
      svgElements += `<path d="${pathData}" class="svg-snake-body" />`;
      svgElements += `<path d="${pathData}" class="svg-snake-spine" />`;
      svgElements += `<circle cx="${x1}%" cy="${y1}%" r="1.6%" class="svg-snake-head" />`;
      svgElements += `<circle cx="${x2}%" cy="${y2}%" r="0.8%" class="svg-snake-tail" />`;
    });

    return `
      <svg class="snakes-svg-overlay" viewBox="0 0 100 100" preserveAspectRatio="none">
        <defs>
          <filter id="ladder-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="0.8" result="blur"/>
            <feMerge>
              <feMergeNode in="blur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        ${svgElements}
      </svg>
    `;
  }

  private renderPlayerTokens(): string {
    return this.players
      .map((p) => {
        const coord = SnakesAndLaddersEngine.squareToCoords(p.position);
        // Add tiny offset so two tokens on the same square don't completely hide each other
        const offset = p.id === 1 ? -1.5 : 1.5;
        const xPos = p.position === 0 ? (p.id === 1 ? 2 : 7) : coord.xPercent + offset;
        const yPos = p.position === 0 ? 98 : coord.yPercent + offset;

        return `
          <div class="snakes-token token-p${p.id}" id="token-p${p.id}"
               style="--token-x: ${xPos}%; --token-y: ${yPos}%; --p-color: ${p.color};">
            <span>${p.id === 1 ? 'P1' : p.isAi ? 'AI' : 'P2'}</span>
          </div>
        `;
      })
      .join('');
  }

  private renderDiceSvg(face: number): string {
    const dotPositions: Record<number, { cx: number; cy: number }[]> = {
      1: [{ cx: 12, cy: 12 }],
      2: [{ cx: 7, cy: 7 }, { cx: 17, cy: 17 }],
      3: [{ cx: 7, cy: 7 }, { cx: 12, cy: 12 }, { cx: 17, cy: 17 }],
      4: [{ cx: 7, cy: 7 }, { cx: 17, cy: 7 }, { cx: 7, cy: 17 }, { cx: 17, cy: 17 }],
      5: [{ cx: 7, cy: 7 }, { cx: 17, cy: 7 }, { cx: 12, cy: 12 }, { cx: 7, cy: 17 }, { cx: 17, cy: 17 }],
      6: [{ cx: 7, cy: 6.5 }, { cx: 17, cy: 6.5 }, { cx: 7, cy: 12 }, { cx: 17, cy: 12 }, { cx: 7, cy: 17.5 }, { cx: 17, cy: 17.5 }]
    };

    const dots = dotPositions[face] || dotPositions[1];

    return `
      <svg class="snakes-dice-face ${this.isRolling ? 'is-rolling' : ''}" viewBox="0 0 24 24" width="46" height="46">
        <rect x="2" y="2" width="20" height="20" rx="4" class="dice-bg" />
        ${dots.map((d) => `<circle cx="${d.cx}" cy="${d.cy}" r="2" class="dice-pip" />`).join('')}
      </svg>
    `;
  }

  private async handleRoll(): Promise<void> {
    if (this.isRolling || this.isMoving || this.isGameOver) return;

    const player = this.getCurrentPlayer();
    this.isRolling = true;
    this.updateControlsState();

    // Dice rolling animation
    this.ctx?.audio.playMove();
    const diceBox = document.getElementById('snakes-dice-box');
    if (diceBox) {
      diceBox.classList.add('rolling-anim');
      // Rapid shuffle preview
      for (let i = 0; i < 6; i++) {
        diceBox.innerHTML = this.renderDiceSvg((i % 6) + 1);
        await this.delay(45);
      }
    }

    const roll = SnakesAndLaddersEngine.rollDice();
    this.lastRoll = roll;
    player.totalRolls++;

    if (diceBox) {
      diceBox.classList.remove('rolling-anim');
      diceBox.innerHTML = this.renderDiceSvg(roll);
    }

    this.isRolling = false;
    this.ctx?.audio.playClick();

    // Move player step-by-step
    await this.executePlayerMove(player, roll);
  }

  private async executePlayerMove(player: PlayerState, roll: number): Promise<void> {
    this.isMoving = true;
    this.updateControlsState();

    const moveResult = SnakesAndLaddersEngine.calculateMove(player.position, roll, player.id);
    const stepDelay = this.speedMode === 'fast' ? 90 : 180;

    this.addLog(`${player.name} rolled a 🎲 <strong>${roll}</strong>!`);

    // Step-by-step token hops
    for (const stepSquare of moveResult.path) {
      player.position = stepSquare;
      this.updateTokenPosition(player);
      this.ctx?.audio.playMove();
      await this.delay(stepDelay);
    }

    // Check special (Ladder or Snake)
    if (moveResult.special) {
      await this.delay(220);
      if (moveResult.special.type === 'ladder') {
        player.laddersClimbed++;
        this.ctx?.audio.playSuccess();
        this.ctx?.ui.showToast(`🪜 Ladder! ${player.name} climbs to square ${moveResult.special.to}!`, 'success');
        this.addLog(`🪜 ${player.name} climbed ladder: ${moveResult.special.from} ➔ <strong>${moveResult.special.to}</strong>!`);
      } else {
        player.snakesEncountered++;
        this.ctx?.audio.playExplosion();
        this.ctx?.ui.showToast(`🐍 Snake! ${player.name} slid to square ${moveResult.special.to}!`, 'warning');
        this.addLog(`🐍 Oh no! Snake bit ${player.name}: ${moveResult.special.from} ➔ <strong>${moveResult.special.to}</strong>!`);
      }

      player.position = moveResult.special.to;
      this.updateTokenPosition(player);
      await this.delay(300);
    }

    this.isMoving = false;
    this.saveState();

    // Check win
    if (moveResult.hasWon) {
      this.handleVictory(player);
      return;
    }

    // Extra roll bonus for 6
    if (moveResult.extraRoll) {
      this.ctx?.audio.playSuccess();
      this.ctx?.ui.showToast(`🔥 Rolled a 6! ${player.name} gets an extra roll!`, 'info');
      this.addLog(`✨ Rolled a 6! Extra roll for ${player.name}!`);
      this.render();
      if (player.isAi) {
        this.scheduleAiTurn();
      }
      return;
    }

    // Switch player
    this.activePlayerIndex = 1 - this.activePlayerIndex;
    this.render();

    const nextPlayer = this.getCurrentPlayer();
    if (nextPlayer.isAi && !this.isGameOver) {
      this.scheduleAiTurn();
    }
  }

  private scheduleAiTurn(): void {
    if (this.aiTimeoutId !== null) clearTimeout(this.aiTimeoutId);
    const delayMs = this.currentDifficulty.includes('Easy') ? 900 : 650;
    this.aiTimeoutId = window.setTimeout(() => {
      this.handleRoll();
    }, delayMs);
  }

  private updateTokenPosition(player: PlayerState): void {
    const token = document.getElementById(`token-p${player.id}`);
    const posVal = document.getElementById(`p${player.id}-pos-val`);
    if (posVal) posVal.textContent = String(player.position);

    if (token) {
      const coord = SnakesAndLaddersEngine.squareToCoords(player.position);
      const offset = player.id === 1 ? -1.5 : 1.5;
      const xPos = player.position === 0 ? (player.id === 1 ? 2 : 7) : coord.xPercent + offset;
      const yPos = player.position === 0 ? 98 : coord.yPercent + offset;
      token.style.setProperty('--token-x', `${xPos}%`);
      token.style.setProperty('--token-y', `${yPos}%`);
    }
  }

  private updateControlsState(): void {
    const rollBtn = document.getElementById('snakes-roll-btn') as HTMLButtonElement;
    if (rollBtn) {
      const currentP = this.getCurrentPlayer();
      rollBtn.disabled = this.isRolling || this.isMoving || currentP.isAi || this.isGameOver;
    }
  }

  private addLog(entry: string): void {
    this.historyLog.push(entry);
    if (this.historyLog.length > 20) this.historyLog.shift();

    const logBox = document.getElementById('snakes-log-box');
    if (logBox) {
      const content = logBox.querySelector('.snakes-log-content');
      if (content) {
        content.innerHTML = this.historyLog
          .slice(-4)
          .map((e) => `<div class="snakes-log-entry">${e}</div>`)
          .join('');
      }
    }
  }

  private handleVictory(player: PlayerState): void {
    this.isGameOver = true;
    this.winner = player;
    this.stopTimer();

    this.ctx?.audio.playVictory();
    this.ctx?.ui.launchConfetti();
    this.ctx?.ui.showToast(`🏆 ${player.name} Won the Game!`, 'success');

    // Record stats (won if player 1)
    const isPlayer1Win = player.id === 1;
    this.ctx?.storage.recordGamePlay(this.id, isPlayer1Win, player.totalRolls, this.timerSeconds);

    this.render();
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private bindEvents(): void {
    if (!this.container) return;

    this.container.addEventListener('click', (e) => {
      const rollBtn = (e.target as HTMLElement).closest('#snakes-roll-btn');
      const diceBox = (e.target as HTMLElement).closest('#snakes-dice-box');
      const playAgain = (e.target as HTMLElement).closest('#snakes-play-again-btn');
      const speedBtn = (e.target as HTMLElement).closest('#snakes-speed-btn');

      if ((rollBtn || diceBox) && !this.getCurrentPlayer().isAi) {
        this.handleRoll();
      } else if (playAgain) {
        this.startNewGame();
      } else if (speedBtn) {
        this.speedMode = this.speedMode === 'normal' ? 'fast' : 'normal';
        this.ctx?.audio.playClick();
        this.render();
      }
    });

    // Spacebar to roll dice
    this.keyListener = (e: KeyboardEvent) => {
      if (['Space', 'Enter'].includes(e.code) && !this.getCurrentPlayer().isAi) {
        e.preventDefault();
        this.handleRoll();
      }
    };
    window.addEventListener('keydown', this.keyListener);
  }
}
