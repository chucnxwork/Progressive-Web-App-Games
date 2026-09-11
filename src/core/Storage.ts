// LocalStorage persistence service for games and app settings
import { GameStats } from './types';

const PREFIX = 'arcade_nova_';

export class StorageService {
  public static getGameState<T>(gameId: string): T | null {
    try {
      const raw = localStorage.getItem(`${PREFIX}state_${gameId}`);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  public static setGameState<T>(gameId: string, state: T): void {
    try {
      localStorage.setItem(`${PREFIX}state_${gameId}`, JSON.stringify(state));
    } catch (e) {
      console.warn('Failed to save game state', e);
    }
  }

  public static clearGameState(gameId: string): void {
    localStorage.removeItem(`${PREFIX}state_${gameId}`);
  }

  public static getStats(gameId: string): GameStats {
    try {
      const raw = localStorage.getItem(`${PREFIX}stats_${gameId}`);
      if (raw) {
        return JSON.parse(raw);
      }
    } catch {
      // ignore
    }
    return {
      timesPlayed: 0,
      wins: 0,
      bestScore: 0,
      bestTimeSeconds: undefined,
      lastPlayed: undefined
    };
  }

  public static recordGamePlay(
    gameId: string,
    won: boolean,
    score?: number,
    timeSeconds?: number
  ): void {
    const stats = this.getStats(gameId);
    stats.timesPlayed += 1;
    if (won) {
      stats.wins += 1;
    }
    stats.lastPlayed = Date.now();

    if (score !== undefined) {
      if (stats.bestScore === undefined || score > stats.bestScore) {
        stats.bestScore = score;
      }
    }

    if (timeSeconds !== undefined && won) {
      if (stats.bestTimeSeconds === undefined || timeSeconds < stats.bestTimeSeconds) {
        stats.bestTimeSeconds = timeSeconds;
      }
    }

    try {
      localStorage.setItem(`${PREFIX}stats_${gameId}`, JSON.stringify(stats));
    } catch (e) {
      console.warn('Failed to save game stats', e);
    }
  }

  public static getTheme(): string {
    return localStorage.getItem(`${PREFIX}theme`) || 'arcade';
  }

  public static setTheme(theme: string): void {
    localStorage.setItem(`${PREFIX}theme`, theme);
  }
}
