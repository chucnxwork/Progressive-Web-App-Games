// Hub Component - Main Game Catalog & Selection Screen
import { GameRegistry } from '../core/GameRegistry';
import { GamePlugin } from '../core/types';
import { StorageService } from '../core/Storage';
import { globalAudio } from '../core/AudioEngine';

export class HubComponent {
  private container: HTMLElement;
  private onSelectGame: (gameId: string) => void;
  private searchQuery: string = '';
  private selectedCategory: string = 'all';

  constructor(container: HTMLElement, onSelectGame: (gameId: string) => void) {
    this.container = container;
    this.onSelectGame = onSelectGame;
  }

  public render(): void {
    const games = GameRegistry.getAll();
    const filteredGames = games.filter((game) => {
      const matchesCat =
        this.selectedCategory === 'all' || game.category === this.selectedCategory;
      const matchesSearch =
        this.searchQuery === '' ||
        game.title.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        game.description.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        game.tags.some((t) => t.toLowerCase().includes(this.searchQuery.toLowerCase()));

      return matchesCat && matchesSearch;
    });

    this.container.innerHTML = `
      <main class="hub-container">
        <!-- Hero Banner -->
        <section class="hero-banner">
          <h1 class="hero-title">Welcome to <span>Arcade Nova</span></h1>
          <p class="hero-subtitle">
            Play anywhere, anytime. Instant loading, seamless offline access, zero ads, and zero external downloads.
          </p>
          <div class="hero-highlights">
            <span class="highlight-tag">⚡ 100% Offline Ready</span>
            <span class="highlight-tag">🎵 Native Web Audio</span>
            <span class="highlight-tag">📱 Mobile & Desktop Optimized</span>
            <span class="highlight-tag">🧩 Extensible Plugin System</span>
          </div>
        </section>

        <!-- Filters and Search -->
        <section class="filter-bar">
          <div class="category-tabs">
            <button class="cat-tab ${this.selectedCategory === 'all' ? 'active' : ''}" data-cat="all">All Games (${games.length})</button>
            <button class="cat-tab ${this.selectedCategory === 'puzzle' ? 'active' : ''}" data-cat="puzzle">🧩 Puzzle</button>
            <button class="cat-tab ${this.selectedCategory === 'classic' ? 'active' : ''}" data-cat="classic">👑 Classic</button>
            <button class="cat-tab ${this.selectedCategory === 'arcade' ? 'active' : ''}" data-cat="arcade">🕹️ Arcade</button>
          </div>

          <div class="search-input-wrapper">
            <svg class="search-icon" viewBox="0 0 24 24"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" stroke="currentColor" stroke-width="2" fill="none"/></svg>
            <input type="text" class="search-input" id="game-search-input" placeholder="Search games, tags..." value="${this.escapeHtml(this.searchQuery)}" />
          </div>
        </section>

        <!-- Game Grid -->
        <section class="game-grid" id="game-grid">
          ${
            filteredGames.length > 0
              ? filteredGames.map((game) => this.renderGameCard(game)).join('')
              : `<div style="grid-column: 1 / -1; text-align: center; padding: 3rem; color: var(--text-muted);">
                   <h3>No games found matching your search.</h3>
                 </div>`
          }
        </section>
      </main>
    `;

    this.bindEvents();
  }

  private renderGameCard(game: GamePlugin): string {
    const stats = StorageService.getStats(game.id);

    return `
      <article class="game-card" data-id="${game.id}">
        <div class="game-card-banner" style="background: ${game.bannerGradient};">
          <span class="card-category-badge">${game.category}</span>
          ${game.iconSvg}
        </div>
        <div class="game-card-body">
          <h2 class="game-card-title">${game.title}</h2>
          <p class="game-card-desc">${game.shortDescription}</p>

          <div style="display:flex; flex-wrap:wrap; gap:0.35rem; margin-bottom: 0.85rem;">
            ${game.tags.map((tag) => `<span style="font-size:0.72rem; padding:0.15rem 0.5rem; background:rgba(255,255,255,0.05); border-radius:4px; color:var(--text-secondary);">${tag}</span>`).join('')}
          </div>

          <div class="game-card-stats">
            <div class="stat-item">
              <span style="font-size:0.7rem; text-transform:uppercase;">Plays</span>
              <span class="stat-val">${stats.timesPlayed}</span>
            </div>
            <div class="stat-item">
              <span style="font-size:0.7rem; text-transform:uppercase;">Best</span>
              <span class="stat-val">${stats.bestScore ? stats.bestScore : stats.bestTimeSeconds ? stats.bestTimeSeconds + 's' : '-'}</span>
            </div>
            <button class="card-play-btn" data-launch="${game.id}">
              <span>Play</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="5 3 19 12 5 21 5 3"/></svg>
            </button>
          </div>
        </div>
      </article>
    `;
  }

  private bindEvents(): void {
    // Category tabs
    this.container.querySelectorAll('.cat-tab').forEach((tab) => {
      tab.addEventListener('click', (e) => {
        globalAudio.playClick();
        const cat = (e.currentTarget as HTMLElement).dataset.cat || 'all';
        this.selectedCategory = cat;
        this.render();
      });
    });

    // Search input
    const searchInput = document.getElementById('game-search-input') as HTMLInputElement;
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.searchQuery = (e.target as HTMLInputElement).value;
        const grid = document.getElementById('game-grid');
        if (grid) {
          const games = GameRegistry.getAll().filter((g) => {
            const matchesCat = this.selectedCategory === 'all' || g.category === this.selectedCategory;
            const matchesSearch =
              this.searchQuery === '' ||
              g.title.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
              g.description.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
              g.tags.some((t) => t.toLowerCase().includes(this.searchQuery.toLowerCase()));
            return matchesCat && matchesSearch;
          });
          grid.innerHTML = games.length > 0
            ? games.map((g) => this.renderGameCard(g)).join('')
            : `<div style="grid-column: 1 / -1; text-align: center; padding: 3rem; color: var(--text-muted);">
                 <h3>No games found matching "${this.escapeHtml(this.searchQuery)}".</h3>
               </div>`;
          this.attachCardClicks();
        }
      });
    }

    this.attachCardClicks();
  }

  private attachCardClicks(): void {
    this.container.querySelectorAll('.game-card').forEach((card) => {
      card.addEventListener('click', () => {
        const id = (card as HTMLElement).dataset.id;
        if (id) {
          globalAudio.playClick();
          this.onSelectGame(id);
        }
      });
    });
  }

  private escapeHtml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}
