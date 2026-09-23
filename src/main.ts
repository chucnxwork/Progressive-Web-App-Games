// Main Application Entrypoint
import './styles/main.css';
import { GameRegistry } from './core/GameRegistry';
import { StorageService } from './core/Storage';
import { HeaderComponent } from './components/Header';
import { HubComponent } from './components/Hub';
import { GameHostComponent } from './components/GameHost';
import { StatsModalComponent } from './components/StatsModal';

// Built-in Game Plugins
import { SudokuGame } from './games/sudoku';
import { MinesweeperGame } from './games/minesweeper';
import { Game2048 } from './games/2048';
import { SnakeGame } from './games/snake';
import { SnakesAndLaddersGame } from './games/snakes-and-ladders';

class ArcadeApp {
  private headerContainer: HTMLElement;
  private mainContainer: HTMLElement;
  private currentHost: GameHostComponent | null = null;

  constructor() {
    const appEl = document.getElementById('app');
    if (!appEl) throw new Error('Missing #app container');

    // Create layout slots
    this.headerContainer = document.createElement('div');
    this.headerContainer.id = 'header-slot';
    this.mainContainer = document.createElement('div');
    this.mainContainer.id = 'main-slot';
    this.mainContainer.style.flex = '1';
    this.mainContainer.style.display = 'flex';
    this.mainContainer.style.flexDirection = 'column';

    appEl.appendChild(this.headerContainer);
    appEl.appendChild(this.mainContainer);
  }

  public init(): void {
    // 1. Initialize Theme
    const savedTheme = StorageService.getTheme();
    document.body.className = `theme-${savedTheme}`;

    // 2. Register Built-in Games
    GameRegistry.register(new SudokuGame());
    GameRegistry.register(new MinesweeperGame());
    GameRegistry.register(new Game2048());
    GameRegistry.register(new SnakeGame());
    GameRegistry.register(new SnakesAndLaddersGame());

    // 3. Render Header
    const header = new HeaderComponent(this.headerContainer, {
      onNavigateHome: () => this.navigateToHub(),
      onOpenStats: () => StatsModalComponent.show()
    });
    header.render();

    // 4. Initial Route
    this.handleRoute();

    // 5. Browser History support
    window.addEventListener('popstate', () => {
      this.handleRoute();
    });

    // 6. Register Service Worker for Offline PWA
    this.registerServiceWorker();
  }

  private handleRoute(): void {
    const urlParams = new URLSearchParams(window.location.search);
    const gameId = urlParams.get('game');

    if (gameId && GameRegistry.get(gameId)) {
      this.launchGame(gameId, false);
    } else {
      this.showHub(false);
    }
  }

  public navigateToHub(): void {
    this.showHub(true);
  }

  private showHub(updateHistory = true): void {
    if (this.currentHost) {
      this.currentHost.destroy();
      this.currentHost = null;
    }

    if (updateHistory) {
      const url = new URL(window.location.href);
      url.searchParams.delete('game');
      window.history.pushState({}, '', url.pathname);
    }

    const hub = new HubComponent(this.mainContainer, (selectedGameId) => {
      this.launchGame(selectedGameId, true);
    });
    hub.render();
  }

  private launchGame(gameId: string, updateHistory = true): void {
    const game = GameRegistry.get(gameId);
    if (!game) {
      this.showHub(true);
      return;
    }

    if (this.currentHost) {
      this.currentHost.destroy();
      this.currentHost = null;
    }

    if (updateHistory) {
      const url = new URL(window.location.href);
      url.searchParams.set('game', gameId);
      window.history.pushState({}, '', url.toString());
    }

    this.currentHost = new GameHostComponent(this.mainContainer, game, () => {
      this.navigateToHub();
    });
    this.currentHost.render();
  }

  private registerServiceWorker(): void {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('./sw.js')
          .then((reg) => {
            console.log('[PWA] Service Worker registered with scope:', reg.scope);
          })
          .catch((err) => {
            console.warn('[PWA] Service Worker registration failed:', err);
          });
      });
    }
  }
}

// Bootstrap
document.addEventListener('DOMContentLoaded', () => {
  const app = new ArcadeApp();
  app.init();
});
