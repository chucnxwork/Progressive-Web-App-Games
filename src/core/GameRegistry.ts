// Game Registry - Central Pluggable Registry for All Games
import { GamePlugin } from './types';

export class GameRegistry {
  private static games: Map<string, GamePlugin> = new Map();
  private static listeners: Array<() => void> = [];

  public static register(plugin: GamePlugin): void {
    if (this.games.has(plugin.id)) {
      console.warn(`Game with id '${plugin.id}' is already registered. Overwriting.`);
    }
    this.games.set(plugin.id, plugin);
    this.notifyListeners();
  }

  public static get(id: string): GamePlugin | undefined {
    return this.games.get(id);
  }

  public static getAll(): GamePlugin[] {
    return Array.from(this.games.values());
  }

  public static getByCategory(category: string): GamePlugin[] {
    return this.getAll().filter((g) => g.category === category);
  }

  public static subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private static notifyListeners(): void {
    for (const listener of this.listeners) {
      listener();
    }
  }
}
