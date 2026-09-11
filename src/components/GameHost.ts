// Game Host Component - Mounts, manages lifecycle and provides unified toolbar for active game
import { GamePlugin, GameContext } from '../core/types';
import { globalAudio } from '../core/AudioEngine';
import { StorageService } from '../core/Storage';
import { EffectsManager } from '../core/Effects';

export class GameHostComponent {
  private container: HTMLElement;
  private game: GamePlugin;
  private onBackToHub: () => void;

  constructor(container: HTMLElement, game: GamePlugin, onBackToHub: () => void) {
    this.container = container;
    this.game = game;
    this.onBackToHub = onBackToHub;
  }

  public render(): void {
    const hasDifficulties = this.game.difficultyLevels && this.game.difficultyLevels.length > 0;

    this.container.innerHTML = `
      <section class="game-host-wrapper">
        <div class="game-toolbar">
          <div class="toolbar-left">
            <button class="toolbar-btn" id="btn-back-hub" title="Return to Arcade Hub">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>
              <span>Hub</span>
            </button>
            <h2 class="toolbar-title">${this.game.title}</h2>
          </div>

          <div class="toolbar-right">
            ${
              hasDifficulties
                ? `<select class="difficulty-select" id="game-difficulty-select">
                    ${this.game.difficultyLevels!.map(
                      (lvl) => `<option value="${lvl}" ${lvl === this.game.currentDifficulty ? 'selected' : ''}>${lvl}</option>`
                    ).join('')}
                   </select>`
                : ''
            }

            <button class="toolbar-btn" id="btn-restart-game" title="Restart Game">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/></svg>
              <span>Restart</span>
            </button>
          </div>
        </div>

        <div class="game-stage-container" id="game-stage"></div>
      </section>
    `;

    this.bindEvents();
    this.mountGame();
  }

  private bindEvents(): void {
    document.getElementById('btn-back-hub')?.addEventListener('click', () => {
      globalAudio.playClick();
      this.game.unmount();
      this.onBackToHub();
    });

    document.getElementById('btn-restart-game')?.addEventListener('click', () => {
      globalAudio.playClick();
      if (this.game.onRestart) {
        this.game.onRestart();
      } else {
        this.mountGame();
      }
    });

    const diffSelect = document.getElementById('game-difficulty-select') as HTMLSelectElement;
    if (diffSelect) {
      diffSelect.addEventListener('change', (e) => {
        globalAudio.playClick();
        const selected = (e.target as HTMLSelectElement).value;
        if (this.game.setDifficulty) {
          this.game.setDifficulty(selected);
        }
      });
    }
  }

  private mountGame(): void {
    const stage = document.getElementById('game-stage');
    if (!stage) return;

    const context: GameContext = {
      audio: {
        playClick: () => globalAudio.playClick(),
        playMove: () => globalAudio.playMove(),
        playFlag: () => globalAudio.playFlag(),
        playReveal: () => globalAudio.playReveal(),
        playSuccess: () => globalAudio.playSuccess(),
        playVictory: () => globalAudio.playVictory(),
        playExplosion: () => globalAudio.playExplosion(),
        playError: () => globalAudio.playError(),
        playScore: () => globalAudio.playScore()
      },
      storage: {
        getGameState: (id) => StorageService.getGameState(id),
        setGameState: (id, state) => StorageService.setGameState(id, state),
        clearGameState: (id) => StorageService.clearGameState(id),
        getStats: (id) => StorageService.getStats(id),
        recordGamePlay: (id, won, score, time) => StorageService.recordGamePlay(id, won, score, time)
      },
      ui: {
        showToast: (msg, type) => EffectsManager.showToast(msg, type),
        launchConfetti: () => EffectsManager.launchConfetti(),
        exitToHub: () => {
          this.game.unmount();
          this.onBackToHub();
        },
        updateToolbar: (_title, _info) => {
          // Can optionally update header
        }
      }
    };

    this.game.mount(stage, context);
  }

  public destroy(): void {
    this.game.unmount();
  }
}
