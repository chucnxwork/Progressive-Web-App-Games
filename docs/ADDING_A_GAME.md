# 🎮 Adding New Games to Arcade Nova

Arcade Nova is built with a modular, pluggable game architecture. You can easily add new games (e.g. Tic-Tac-Toe, Wordle, Chess, Pong, Memory Match) by creating a game folder and registering it with the `GameRegistry`.

---

## Architecture Overview

All games implement the standard `GamePlugin` interface found in `src/core/types.ts`:

```typescript
export interface GamePlugin {
  id: string;                      // Unique ID (e.g., 'wordle')
  title: string;                   // Display title (e.g., 'Wordle')
  shortDescription: string;        // Brief tagline for game cards
  description: string;             // Detailed description
  category: 'puzzle' | 'arcade' | 'strategy' | 'classic';
  tags: string[];                  // Tags for search and filtering
  iconSvg: string;                 // SVG markup for icon
  bannerGradient: string;          // CSS gradient for card banner
  accentColor: string;             // Hex or CSS color
  difficultyLevels?: string[];     // Optional difficulty levels
  currentDifficulty?: string;
  setDifficulty?(level: string): void;
  mount(container: HTMLElement, context: GameContext): void;
  unmount(): void;
  onPause?(): void;
  onResume?(): void;
  onRestart?(): void;
}
```

### Provided `GameContext` Services:
When your game mounts, it receives a `context` object providing:
- **`context.audio`**: Native Web Audio synthesizer (`playClick`, `playMove`, `playSuccess`, `playVictory`, `playExplosion`, `playError`, `playScore`). 100% offline with zero asset loading.
- **`context.storage`**: Local persistence helpers (`getGameState`, `setGameState`, `clearGameState`, `getStats`, `recordGamePlay`).
- **`context.ui`**: App-level visual effects (`showToast(msg, type)`, `launchConfetti()`, `exitToHub()`).

---

## Step-by-Step Tutorial: Adding a New Game

### Step 1: Create a Game Folder
Create a new directory in `src/games/`:
```bash
src/games/my-game/
├── index.ts
└── (optional helper files: engine.ts, etc.)
```

### Step 2: Implement `GamePlugin` in `src/games/my-game/index.ts`

Here is a minimal, complete boilerplate template:

```typescript
import { GamePlugin, GameContext } from '../../core/types';

export class MyNewGame implements GamePlugin {
  public id = 'my-game';
  public title = 'My Cool Game';
  public shortDescription = 'A brand new thrilling puzzle game.';
  public description = 'Match tiles, beat your high score, and enjoy offline gameplay.';
  public category = 'puzzle' as const;
  public tags = ['New', 'Puzzle', 'Fun'];
  public bannerGradient = 'linear-gradient(135deg, #6366f1, #a855f7)';
  public accentColor = '#8b5cf6';
  public iconSvg = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/></svg>`;

  private container: HTMLElement | null = null;
  private ctx: GameContext | null = null;
  private score: number = 0;

  public mount(container: HTMLElement, context: GameContext): void {
    this.container = container;
    this.ctx = context;

    // Render game markup
    this.container.innerHTML = `
      <div style="display:flex; flex-direction:column; align-items:center; gap:1rem; padding:1.5rem;">
        <h3>My Game Stage</h3>
        <p>Score: <span id="my-game-score">0</span></p>
        <button id="my-game-btn" class="toolbar-btn btn-accent">Tap Me!</button>
      </div>
    `;

    // Bind listeners
    document.getElementById('my-game-btn')?.addEventListener('click', () => {
      this.score += 10;
      const scoreEl = document.getElementById('my-game-score');
      if (scoreEl) scoreEl.textContent = String(this.score);

      // Play synthesized offline audio
      this.ctx?.audio.playScore();

      if (this.score >= 50) {
        // Trigger win effects
        this.ctx?.audio.playVictory();
        this.ctx?.ui.launchConfetti();
        this.ctx?.ui.showToast('🎉 You reached 50 points!', 'success');
        this.ctx?.storage.recordGamePlay(this.id, true, this.score);
      }
    });
  }

  public unmount(): void {
    // Clean up timers, intervals or heavy listeners
    this.container = null;
  }

  public onRestart(): void {
    this.score = 0;
    const scoreEl = document.getElementById('my-game-score');
    if (scoreEl) scoreEl.textContent = '0';
  }
}
```

### Step 3: Register Your Game in `src/main.ts`

Import and register your game instance:

```typescript
import { MyNewGame } from './games/my-game';

// Inside ArcadeApp.init():
GameRegistry.register(new MyNewGame());
```

### That's it!
Your game will automatically:
1. Appear in the Arcade Hub grid with its custom icon, banner, and tags.
2. Be searchable via the search bar and filterable by category.
3. Automatically have offline caching via the Service Worker.
4. Track plays, high scores, and stats in the Statistics modal.
5. Work seamlessly on desktop and mobile touch devices.
