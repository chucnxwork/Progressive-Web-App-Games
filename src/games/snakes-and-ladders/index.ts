import { GamePlugin, GameContext } from '../../core/types';

interface Player {
  name: string;
  color: string;
  position: number;
}

export class SnakesAndLaddersGame implements GamePlugin {
  public id = 'snakes-and-ladders';
  public title = 'Snakes & Ladders';
  public shortDescription = 'Race to 100, climb ladders, and slide down snakes.';
  public description = 'Roll the dice and race across the classic 100-square board. Choose 1 to 4 players, with the remaining players guided by the arcade opponent.';
  public category = 'classic' as const;
  public tags = ['Classic', 'Board', 'Family', 'Multiplayer'];
  public bannerGradient = 'linear-gradient(135deg, #0f766e, #f59e0b)';
  public accentColor = '#f59e0b';
  public iconSvg = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 21 19 3M9 21 23 3M3 7h6M15 17h6"/><circle cx="6" cy="5" r="2"/><circle cx="18" cy="19" r="2"/></svg>`;

  private container: HTMLElement | null = null;
  private ctx: GameContext | null = null;
  private players: Player[] = [];
  private playerCount = 2;
  private currentPlayer = 0;
  private lastRoll: number | null = null;
  private gameOver = false;
  private computerTimer: number | null = null;

  private readonly boardJumps: Record<number, number> = {
    4: 14,
    9: 31,
    17: 7,
    20: 38,
    28: 84,
    40: 59,
    51: 67,
    54: 34,
    62: 19,
    63: 81,
    64: 60,
    71: 91,
    87: 24,
    93: 73,
    95: 75,
    99: 78
  };

  public mount(container: HTMLElement, context: GameContext): void {
    this.container = container;
    this.ctx = context;
    this.startNewGame();
  }

  public unmount(): void {
    this.clearComputerTimer();
    this.container = null;
    this.ctx = null;
  }

  public onRestart(): void {
    this.startNewGame();
  }

  private startNewGame(): void {
    this.clearComputerTimer();
    this.players = Array.from({ length: this.playerCount }, (_, index) => ({
      name: index === 0 ? 'You' : `Player ${index + 1}`,
      color: ['#f97316', '#38bdf8', '#a78bfa', '#34d399'][index],
      position: 0
    }));
    this.currentPlayer = 0;
    this.lastRoll = null;
    this.gameOver = false;
    this.render();
  }

  private changePlayerCount(value: string): void {
    const count = Number(value);
    if (count < 1 || count > 4) return;
    this.playerCount = count;
    this.ctx?.audio.playClick();
    this.startNewGame();
  }

  private rollDice(): void {
    if (this.gameOver || this.currentPlayer !== 0) return;
    this.takeTurn();
  }

  private takeTurn(): void {
    if (this.gameOver) return;

    const roll = Math.floor(Math.random() * 6) + 1;
    const player = this.players[this.currentPlayer];
    this.lastRoll = roll;
    this.ctx?.audio.playMove();

    const nextPosition = player.position + roll;
    if (nextPosition <= 100) player.position = nextPosition;

    const jumpTarget = this.boardJumps[player.position];
    if (jumpTarget) {
      const movedUp = jumpTarget > player.position;
      player.position = jumpTarget;
      this.ctx?.audio.playScore();
      this.ctx?.ui.showToast(
        movedUp ? `${player.name} climbed a ladder!` : `${player.name} slid down a snake!`,
        movedUp ? 'success' : 'warning'
      );
    }

    if (player.position === 100) {
      this.finishGame(player);
      return;
    }

    this.currentPlayer = (this.currentPlayer + 1) % this.players.length;
    this.render();

    if (this.currentPlayer !== 0) {
      this.computerTimer = window.setTimeout(() => {
        this.computerTimer = null;
        this.takeTurn();
      }, 650);
    }
  }

  private finishGame(winner: Player): void {
    this.gameOver = true;
    this.clearComputerTimer();
    this.ctx?.audio.playVictory();
    this.ctx?.ui.launchConfetti();
    this.ctx?.ui.showToast(`🎉 ${winner.name} reached 100 and won!`, 'success');
    this.ctx?.storage.recordGamePlay(this.id, winner.name === 'You', winner.name === 'You' ? 100 : 0);
    this.render();
  }

  private clearComputerTimer(): void {
    if (this.computerTimer !== null) {
      window.clearTimeout(this.computerTimer);
      this.computerTimer = null;
    }
  }

  private render(): void {
    if (!this.container) return;

    const activePlayer = this.players[this.currentPlayer];
    this.container.innerHTML = `
      <div class="snl-container">
        <div class="snl-topbar">
          <div>
            <p class="snl-kicker">CLASSIC BOARD GAME</p>
            <h3>Race to square 100</h3>
          </div>
          <label class="snl-player-control">
            <span>Players</span>
            <select id="snl-player-count" aria-label="Number of players">
              ${[1, 2, 3, 4].map((count) => `<option value="${count}" ${count === this.playerCount ? 'selected' : ''}>${count}</option>`).join('')}
            </select>
          </label>
        </div>

        <div class="snl-status" aria-live="polite">
          <span class="snl-turn-dot" style="background:${activePlayer.color}"></span>
          <strong>${this.gameOver ? 'Game complete' : `${activePlayer.name}'s turn`}</strong>
          <span>${this.lastRoll ? `Last roll: ${this.lastRoll}` : 'Roll the dice to begin'}</span>
        </div>

        <div class="snl-board" aria-label="Snakes and Ladders board">
          ${this.renderBoard()}
        </div>

        <div class="snl-controls">
          <div class="snl-players">
            ${this.players.map((player, index) => `
              <div class="snl-player ${index === this.currentPlayer && !this.gameOver ? 'is-active' : ''}">
                <span class="snl-token" style="background:${player.color}"></span>
                <span>${player.name}</span>
                <strong>${player.position}</strong>
              </div>
            `).join('')}
          </div>
          <button class="snl-roll-button" id="snl-roll" ${this.gameOver || this.currentPlayer !== 0 ? 'disabled' : ''}>
            <span class="snl-die">${this.lastRoll || '?'}</span>
            <span>${this.gameOver ? 'Restart above' : this.currentPlayer === 0 ? 'Roll dice' : 'Opponent thinking...'}</span>
          </button>
        </div>
      </div>
    `;

    document.getElementById('snl-player-count')?.addEventListener('change', (event) => {
      this.changePlayerCount((event.target as HTMLSelectElement).value);
    });
    document.getElementById('snl-roll')?.addEventListener('click', () => this.rollDice());
  }

  private renderBoard(): string {
    const squares: number[] = [];
    for (let row = 9; row >= 0; row--) {
      const rowStart = row * 10 + 1;
      const rowSquares = Array.from({ length: 10 }, (_, index) => rowStart + index);
      squares.push(...(row % 2 === 1 ? rowSquares.reverse() : rowSquares));
    }

    return squares.map((square) => {
      const jump = this.boardJumps[square];
      const occupants = this.players
        .map((player, index) => player.position === square ? `<span class="snl-board-token" style="--token-color:${player.color}" title="${player.name}">${index + 1}</span>` : '')
        .join('');
      const jumpLabel = jump ? `<span class="snl-jump ${jump > square ? 'ladder' : 'snake'}">${jump > square ? '↑' : '↓'}${jump}</span>` : '';
      return `<div class="snl-square ${square === 100 ? 'finish' : ''}"><span>${square}</span>${jumpLabel}<div class="snl-square-tokens">${occupants}</div></div>`;
    }).join('');
  }
}
