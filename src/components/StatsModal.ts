// Stats Modal Component - Overall statistics across all games
import { GameRegistry } from '../core/GameRegistry';
import { StorageService } from '../core/Storage';
import { globalAudio } from '../core/AudioEngine';

export class StatsModalComponent {
  public static show(): void {
    const existing = document.getElementById('stats-modal-overlay');
    if (existing) existing.remove();

    const games = GameRegistry.getAll();
    let totalPlays = 0;
    let totalWins = 0;

    const gameStatsList = games.map((game) => {
      const s = StorageService.getStats(game.id);
      totalPlays += s.timesPlayed;
      totalWins += s.wins;
      return { game, stats: s };
    });

    const overlay = document.createElement('div');
    overlay.id = 'stats-modal-overlay';
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal-card">
        <div class="modal-header">
          <h2 class="modal-title">📊 Arcade Statistics</h2>
          <button class="close-btn" id="modal-close-btn">&times;</button>
        </div>

        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:0.75rem; margin-bottom: 1.25rem;">
          <div style="background:var(--bg-card); padding:0.75rem; border-radius:var(--radius-md); border:1px solid var(--border-glass); text-align:center;">
            <div style="font-size:0.75rem; color:var(--text-muted); text-transform:uppercase;">Total Games Played</div>
            <div style="font-size:1.6rem; font-weight:800; font-family:var(--font-mono); color:var(--accent-primary);">${totalPlays}</div>
          </div>
          <div style="background:var(--bg-card); padding:0.75rem; border-radius:var(--radius-md); border:1px solid var(--border-glass); text-align:center;">
            <div style="font-size:0.75rem; color:var(--text-muted); text-transform:uppercase;">Total Victories</div>
            <div style="font-size:1.6rem; font-weight:800; font-family:var(--font-mono); color:#10b981;">${totalWins}</div>
          </div>
        </div>

        <div style="max-height: 260px; overflow-y: auto; display:flex; flex-direction:column; gap:0.6rem;">
          ${gameStatsList
            .map(
              ({ game, stats }) => `
            <div style="display:flex; align-items:center; justify-content:space-between; background:var(--bg-card); padding:0.6rem 0.85rem; border-radius:var(--radius-sm); border:1px solid var(--border-glass);">
              <div style="display:flex; align-items:center; gap:0.5rem;">
                <span style="font-weight:700;">${game.title}</span>
              </div>
              <div style="display:flex; gap:1rem; font-size:0.85rem;">
                <span>Plays: <strong>${stats.timesPlayed}</strong></span>
                <span>Wins: <strong style="color:#10b981;">${stats.wins}</strong></span>
                ${stats.bestScore ? `<span>Best: <strong style="font-family:var(--font-mono);">${stats.bestScore}</strong></span>` : ''}
              </div>
            </div>
          `
            )
            .join('')}
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    const close = () => {
      globalAudio.playClick();
      overlay.remove();
    };

    document.getElementById('modal-close-btn')?.addEventListener('click', close);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) close();
    });
  }
}
