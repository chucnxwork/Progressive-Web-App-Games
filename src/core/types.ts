// Core Type Definitions for Arcade Nova

export interface GameStats {
  timesPlayed: number;
  wins: number;
  bestScore?: number;
  bestTimeSeconds?: number;
  lastPlayed?: number;
}

export interface GameContext {
  audio: {
    playClick(): void;
    playMove(): void;
    playFlag(): void;
    playReveal(): void;
    playSuccess(): void;
    playVictory(): void;
    playExplosion(): void;
    playError(): void;
    playScore(): void;
  };
  storage: {
    getGameState<T>(gameId: string): T | null;
    setGameState<T>(gameId: string, state: T): void;
    clearGameState(gameId: string): void;
    getStats(gameId: string): GameStats;
    recordGamePlay(gameId: string, won: boolean, score?: number, timeSeconds?: number): void;
  };
  ui: {
    showToast(message: string, type?: 'info' | 'success' | 'warning' | 'error'): void;
    launchConfetti(): void;
    exitToHub(): void;
    updateToolbar(title?: string, extraInfo?: string): void;
  };
}

export interface GamePlugin {
  id: string;
  title: string;
  shortDescription: string;
  description: string;
  category: 'puzzle' | 'arcade' | 'strategy' | 'classic';
  tags: string[];
  iconSvg: string;
  bannerGradient: string;
  accentColor: string;
  difficultyLevels?: string[];
  currentDifficulty?: string;
  setDifficulty?(level: string): void;
  mount(container: HTMLElement, context: GameContext): void;
  unmount(): void;
  onPause?(): void;
  onResume?(): void;
  onRestart?(): void;
}
