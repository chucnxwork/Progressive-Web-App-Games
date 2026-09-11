// Header Component with PWA Install, Theme Switcher & Offline Status
import { globalAudio } from '../core/AudioEngine';
import { StorageService } from '../core/Storage';

export class HeaderComponent {
  private container: HTMLElement;
  private onNavigateHome: () => void;
  private onOpenStats: () => void;
  private deferredPrompt: any = null;

  constructor(
    container: HTMLElement,
    options: { onNavigateHome: () => void; onOpenStats: () => void }
  ) {
    this.container = container;
    this.onNavigateHome = options.onNavigateHome;
    this.onOpenStats = options.onOpenStats;
    this.initPWAInstall();
  }

  public render(): void {
    const isMuted = globalAudio.isMuted();
    const isOnline = navigator.onLine;

    this.container.innerHTML = `
      <header class="site-header">
        <div class="brand-wrapper" id="brand-logo-btn">
          <div class="brand-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <rect x="2" y="6" width="20" height="12" rx="4"/>
              <path d="M6 12h4M8 10v4M16 11h.01M18 13h.01"/>
            </svg>
          </div>
          <div>
            <div style="display:flex; align-items:center; gap:0.4rem;">
              <span class="brand-title">Arcade Nova</span>
              <span class="brand-badge">PWA</span>
            </div>
          </div>
        </div>

        <div class="header-actions">
          <div class="offline-pill ${!isOnline ? 'is-offline' : ''}" id="network-status-pill">
            <span class="status-dot"></span>
            <span id="network-status-text">${isOnline ? 'Offline Ready' : 'Offline Mode'}</span>
          </div>

          <button class="install-btn" id="pwa-install-btn" title="Install Web App">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Install
          </button>

          <button class="icon-btn" id="header-stats-btn" title="Game Statistics">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 20V10M12 20V4M6 20v-6"/></svg>
          </button>

          <button class="icon-btn" id="header-theme-btn" title="Change Theme">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg>
          </button>

          <button class="icon-btn" id="header-audio-btn" title="Toggle Sound">
            ${
              isMuted
                ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 5L6 9H2v6h4l5 4V5zM23 9l-6 6M17 9l6 6"/></svg>`
                : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>`
            }
          </button>
        </div>
      </header>
    `;

    this.bindEvents();
  }

  private bindEvents(): void {
    document.getElementById('brand-logo-btn')?.addEventListener('click', () => {
      this.onNavigateHome();
    });

    document.getElementById('header-audio-btn')?.addEventListener('click', () => {
      globalAudio.toggleMute();
      this.render();
      globalAudio.playClick();
    });

    document.getElementById('header-theme-btn')?.addEventListener('click', () => {
      globalAudio.playClick();
      this.cycleTheme();
    });

    document.getElementById('header-stats-btn')?.addEventListener('click', () => {
      globalAudio.playClick();
      this.onOpenStats();
    });

    // Network listeners
    window.addEventListener('online', () => this.updateOnlineStatus(true));
    window.addEventListener('offline', () => this.updateOnlineStatus(false));
  }

  private updateOnlineStatus(online: boolean): void {
    const pill = document.getElementById('network-status-pill');
    const text = document.getElementById('network-status-text');
    if (pill && text) {
      if (online) {
        pill.classList.remove('is-offline');
        text.textContent = 'Offline Ready';
      } else {
        pill.classList.add('is-offline');
        text.textContent = 'Offline Mode';
      }
    }
  }

  private cycleTheme(): void {
    const themes = ['arcade', 'midnight', 'retro', 'light'];
    const current = StorageService.getTheme();
    const nextIdx = (themes.indexOf(current) + 1) % themes.length;
    const nextTheme = themes[nextIdx];

    StorageService.setTheme(nextTheme);
    document.body.className = `theme-${nextTheme}`;
  }

  private initPWAInstall(): void {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.deferredPrompt = e;
      const installBtn = document.getElementById('pwa-install-btn');
      if (installBtn) {
        installBtn.classList.add('visible');
        installBtn.addEventListener('click', async () => {
          if (this.deferredPrompt) {
            this.deferredPrompt.prompt();
            const choice = await this.deferredPrompt.userChoice;
            if (choice.outcome === 'accepted') {
              installBtn.classList.remove('visible');
            }
            this.deferredPrompt = null;
          }
        });
      }
    });

    window.addEventListener('appinstalled', () => {
      const installBtn = document.getElementById('pwa-install-btn');
      if (installBtn) installBtn.classList.remove('visible');
    });
  }
}
