// Built-in offline procedural visual themes for Sliding Puzzle
export interface PuzzleTheme {
  id: string;
  name: string;
  type: 'numeric' | 'image';
  accentColor: string;
  previewBg: string;
  getTileStyle: (val: number, origRow: number, origCol: number, size: number) => { [key: string]: string };
  getFullImageSvg?: (size: number) => string;
}

// Procedural SVG artwork generators (100% offline, crystal-clear vector at any DPI)
const generateSynthwaveSvg = (): string => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600" width="100%" height="100%">
    <defs>
      <linearGradient id="skyGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#0b001a"/>
        <stop offset="45%" stop-color="#2d0b4e"/>
        <stop offset="70%" stop-color="#79155b"/>
        <stop offset="100%" stop-color="#ff4f79"/>
      </linearGradient>
      <linearGradient id="sunGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#ffe600"/>
        <stop offset="50%" stop-color="#ff3366"/>
        <stop offset="100%" stop-color="#990066"/>
      </linearGradient>
      <radialGradient id="sunGlow" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="#ff007f" stop-opacity="0.6"/>
        <stop offset="100%" stop-color="#ff007f" stop-opacity="0"/>
      </radialGradient>
      <linearGradient id="gridGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#050014"/>
        <stop offset="100%" stop-color="#190038"/>
      </linearGradient>
    </defs>
    <!-- Sky -->
    <rect width="600" height="380" fill="url(#skyGrad)"/>
    <!-- Stars -->
    <circle cx="90" cy="70" r="1.5" fill="#fff" opacity="0.8"/>
    <circle cx="210" cy="50" r="2" fill="#fff" opacity="0.9"/>
    <circle cx="340" cy="90" r="1.5" fill="#fff" opacity="0.7"/>
    <circle cx="480" cy="65" r="2.5" fill="#fff" opacity="0.85"/>
    <circle cx="530" cy="140" r="1.5" fill="#fff" opacity="0.6"/>
    <circle cx="70" cy="180" r="2" fill="#fff" opacity="0.75"/>
    <!-- Sun glow & Sun -->
    <circle cx="300" cy="300" r="150" fill="url(#sunGlow)"/>
    <circle cx="300" cy="300" r="110" fill="url(#sunGrad)"/>
    <!-- Retro Sun Horizontal Slices -->
    <rect x="180" y="270" width="240" height="4" fill="#2d0b4e"/>
    <rect x="180" y="285" width="240" height="7" fill="#2d0b4e"/>
    <rect x="180" y="303" width="240" height="11" fill="#2d0b4e"/>
    <rect x="180" y="325" width="240" height="16" fill="#2d0b4e"/>
    <rect x="180" y="352" width="240" height="22" fill="#2d0b4e"/>
    <rect x="180" y="385" width="240" height="28" fill="#2d0b4e"/>
    <!-- Mountains -->
    <polygon points="0,380 90,310 180,380 270,290 380,380 470,320 540,380 600,340 600,380" fill="#15002b" opacity="0.85"/>
    <!-- Perspective Grid Floor -->
    <rect y="380" width="600" height="220" fill="url(#gridGrad)"/>
    <line x1="0" y1="380" x2="600" y2="380" stroke="#00f3ff" stroke-width="2.5" opacity="0.9"/>
    <line x1="300" y1="380" x2="300" y2="600" stroke="#ff007f" stroke-width="2" opacity="0.8"/>
    <line x1="300" y1="380" x2="160" y2="600" stroke="#ff007f" stroke-width="2" opacity="0.8"/>
    <line x1="300" y1="380" x2="440" y2="600" stroke="#ff007f" stroke-width="2" opacity="0.8"/>
    <line x1="300" y1="380" x2="20" y2="600" stroke="#ff007f" stroke-width="2" opacity="0.8"/>
    <line x1="300" y1="380" x2="580" y2="600" stroke="#ff007f" stroke-width="2" opacity="0.8"/>
    <line x1="300" y1="380" x2="-120" y2="600" stroke="#ff007f" stroke-width="2" opacity="0.8"/>
    <line x1="300" y1="380" x2="720" y2="600" stroke="#ff007f" stroke-width="2" opacity="0.8"/>
    <!-- Horizontal floor lines with perspective -->
    <line x1="0" y1="395" x2="600" y2="395" stroke="#00f3ff" stroke-width="1.2" opacity="0.4"/>
    <line x1="0" y1="415" x2="600" y2="415" stroke="#00f3ff" stroke-width="1.4" opacity="0.5"/>
    <line x1="0" y1="445" x2="600" y2="445" stroke="#00f3ff" stroke-width="1.8" opacity="0.6"/>
    <line x1="0" y1="490" x2="600" y2="490" stroke="#00f3ff" stroke-width="2" opacity="0.75"/>
    <line x1="0" y1="545" x2="600" y2="545" stroke="#00f3ff" stroke-width="2.5" opacity="0.9"/>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

const generateCosmicNebulaSvg = (): string => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600" width="100%" height="100%">
    <defs>
      <radialGradient id="nebula1" cx="35%" cy="40%" r="55%">
        <stop offset="0%" stop-color="#9333ea" stop-opacity="0.85"/>
        <stop offset="50%" stop-color="#4f46e5" stop-opacity="0.45"/>
        <stop offset="100%" stop-color="#020617" stop-opacity="0"/>
      </radialGradient>
      <radialGradient id="nebula2" cx="70%" cy="65%" r="50%">
        <stop offset="0%" stop-color="#06b6d4" stop-opacity="0.8"/>
        <stop offset="45%" stop-color="#3b82f6" stop-opacity="0.4"/>
        <stop offset="100%" stop-color="#020617" stop-opacity="0"/>
      </radialGradient>
      <radialGradient id="coreGlow" cx="50%" cy="50%" r="30%">
        <stop offset="0%" stop-color="#f472b6" stop-opacity="0.9"/>
        <stop offset="50%" stop-color="#ec4899" stop-opacity="0.3"/>
        <stop offset="100%" stop-color="#020617" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <rect width="600" height="600" fill="#030712"/>
    <rect width="600" height="600" fill="url(#nebula1)"/>
    <rect width="600" height="600" fill="url(#nebula2)"/>
    <rect width="600" height="600" fill="url(#coreGlow)"/>
    <!-- Central celestial orb with ring -->
    <circle cx="300" cy="300" r="54" fill="#38bdf8" opacity="0.9"/>
    <circle cx="300" cy="300" r="50" fill="#0284c7"/>
    <ellipse cx="300" cy="300" rx="95" ry="24" fill="none" stroke="#e0e7ff" stroke-width="4.5" transform="rotate(-25 300 300)" opacity="0.8"/>
    <!-- Satellite Planet -->
    <circle cx="150" cy="180" r="26" fill="#a855f7"/>
    <circle cx="460" cy="420" r="18" fill="#f43f5e"/>
    <!-- Starbursts and clusters -->
    <circle cx="120" cy="120" r="3" fill="#fff"/>
    <circle cx="480" cy="140" r="3" fill="#fff"/>
    <circle cx="420" cy="200" r="2" fill="#fff"/>
    <circle cx="220" cy="420" r="2" fill="#fff"/>
    <circle cx="160" cy="480" r="2.5" fill="#fff"/>
    <circle cx="520" cy="480" r="2" fill="#fff"/>
    <circle cx="320" cy="100" r="2" fill="#fff"/>
    <!-- Star sparkle cross -->
    <path d="M 450,110 L 450,150 M 430,130 L 470,130" stroke="#fff" stroke-width="2" opacity="0.8"/>
    <path d="M 160,340 L 160,370 M 145,355 L 175,355" stroke="#38bdf8" stroke-width="1.8" opacity="0.7"/>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

const generateEmeraldMatrixSvg = (): string => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600" width="100%" height="100%">
    <defs>
      <linearGradient id="bgMatrix" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#021c14"/>
        <stop offset="100%" stop-color="#052e16"/>
      </linearGradient>
      <radialGradient id="chipGlow" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="#10b981" stop-opacity="0.35"/>
        <stop offset="100%" stop-color="#052e16" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <rect width="600" height="600" fill="url(#bgMatrix)"/>
    <circle cx="300" cy="300" r="220" fill="url(#chipGlow)"/>
    <!-- Central CPU core -->
    <rect x="230" y="230" width="140" height="140" rx="16" fill="#064e3b" stroke="#34d399" stroke-width="3"/>
    <rect x="255" y="255" width="90" height="90" rx="8" fill="#047857" stroke="#6ee7b7" stroke-width="2"/>
    <text x="300" y="308" font-family="monospace" font-size="20" font-weight="bold" fill="#ecfdf5" text-anchor="middle">CORE-X</text>
    <!-- Circuit traces -->
    <path d="M 230,260 L 90,260 L 90,160 L 40,160" stroke="#10b981" stroke-width="3" fill="none"/>
    <path d="M 230,300 L 120,300 L 80,380 L 40,380" stroke="#34d399" stroke-width="3" fill="none"/>
    <path d="M 230,340 L 140,340 L 100,500 L 60,500" stroke="#10b981" stroke-width="3" fill="none"/>
    <path d="M 370,260 L 510,260 L 510,160 L 560,160" stroke="#10b981" stroke-width="3" fill="none"/>
    <path d="M 370,300 L 480,300 L 520,380 L 560,380" stroke="#34d399" stroke-width="3" fill="none"/>
    <path d="M 370,340 L 460,340 L 500,500 L 540,500" stroke="#10b981" stroke-width="3" fill="none"/>
    <path d="M 260,230 L 260,90 L 160,90 L 160,40" stroke="#10b981" stroke-width="3" fill="none"/>
    <path d="M 300,230 L 300,50" stroke="#34d399" stroke-width="3" fill="none"/>
    <path d="M 340,230 L 340,90 L 440,90 L 440,40" stroke="#10b981" stroke-width="3" fill="none"/>
    <path d="M 260,370 L 260,510 L 160,510 L 160,560" stroke="#10b981" stroke-width="3" fill="none"/>
    <path d="M 300,370 L 300,550" stroke="#34d399" stroke-width="3" fill="none"/>
    <path d="M 340,370 L 340,510 L 440,510 L 440,560" stroke="#10b981" stroke-width="3" fill="none"/>
    <!-- Node solder dots -->
    <circle cx="40" cy="160" r="5" fill="#34d399"/>
    <circle cx="40" cy="380" r="5" fill="#34d399"/>
    <circle cx="60" cy="500" r="5" fill="#34d399"/>
    <circle cx="560" cy="160" r="5" fill="#34d399"/>
    <circle cx="560" cy="380" r="5" fill="#34d399"/>
    <circle cx="540" cy="500" r="5" fill="#34d399"/>
    <circle cx="160" cy="40" r="5" fill="#34d399"/>
    <circle cx="300" cy="50" r="5" fill="#34d399"/>
    <circle cx="440" cy="40" r="5" fill="#34d399"/>
    <circle cx="160" cy="560" r="5" fill="#34d399"/>
    <circle cx="300" cy="550" r="5" fill="#34d399"/>
    <circle cx="440" cy="560" r="5" fill="#34d399"/>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

export const PUZZLE_THEMES: PuzzleTheme[] = [
  {
    id: 'neon-cyber',
    name: 'Neon Cyber',
    type: 'numeric',
    accentColor: '#06b6d4',
    previewBg: 'linear-gradient(135deg, #0284c7, #6366f1)',
    getTileStyle: (val: number, _origRow: number, _origCol: number, _size: number) => {
      // Elegant glowing glass tile style with subtle hue variation
      const hue = 190 + ((val * 9) % 50);
      return {
        background: `linear-gradient(145deg, hsl(${hue}, 85%, 26%), hsl(${hue + 25}, 80%, 15%))`,
        borderColor: `hsl(${hue}, 90%, 55%)`,
        boxShadow: `0 4px 14px rgba(0, 0, 0, 0.45), inset 0 1px 1px hsla(${hue}, 100%, 80%, 0.35)`
      };
    }
  },
  {
    id: 'synthwave',
    name: 'Synthwave Sun',
    type: 'image',
    accentColor: '#ff007f',
    previewBg: 'linear-gradient(135deg, #79155b, #ff4f79)',
    getFullImageSvg: () => generateSynthwaveSvg(),
    getTileStyle: (_val: number, origRow: number, origCol: number, size: number) => {
      const img = generateSynthwaveSvg();
      const colPercent = size > 1 ? (origCol / (size - 1)) * 100 : 0;
      const rowPercent = size > 1 ? (origRow / (size - 1)) * 100 : 0;
      return {
        backgroundImage: `url("${img}")`,
        backgroundSize: `${size * 100}% ${size * 100}%`,
        backgroundPosition: `${colPercent}% ${rowPercent}%`,
        borderColor: 'rgba(255, 0, 127, 0.45)',
        boxShadow: '0 4px 14px rgba(0, 0, 0, 0.5), inset 0 0 10px rgba(255, 0, 127, 0.2)'
      };
    }
  },
  {
    id: 'cosmic',
    name: 'Cosmic Nebula',
    type: 'image',
    accentColor: '#a855f7',
    previewBg: 'linear-gradient(135deg, #3b82f6, #9333ea)',
    getFullImageSvg: () => generateCosmicNebulaSvg(),
    getTileStyle: (_val: number, origRow: number, origCol: number, size: number) => {
      const img = generateCosmicNebulaSvg();
      const colPercent = size > 1 ? (origCol / (size - 1)) * 100 : 0;
      const rowPercent = size > 1 ? (origRow / (size - 1)) * 100 : 0;
      return {
        backgroundImage: `url("${img}")`,
        backgroundSize: `${size * 100}% ${size * 100}%`,
        backgroundPosition: `${colPercent}% ${rowPercent}%`,
        borderColor: 'rgba(168, 85, 247, 0.45)',
        boxShadow: '0 4px 14px rgba(0, 0, 0, 0.5), inset 0 0 10px rgba(168, 85, 247, 0.2)'
      };
    }
  },
  {
    id: 'emerald',
    name: 'Emerald Matrix',
    type: 'image',
    accentColor: '#10b981',
    previewBg: 'linear-gradient(135deg, #047857, #10b981)',
    getFullImageSvg: () => generateEmeraldMatrixSvg(),
    getTileStyle: (_val: number, origRow: number, origCol: number, size: number) => {
      const img = generateEmeraldMatrixSvg();
      const colPercent = size > 1 ? (origCol / (size - 1)) * 100 : 0;
      const rowPercent = size > 1 ? (origRow / (size - 1)) * 100 : 0;
      return {
        backgroundImage: `url("${img}")`,
        backgroundSize: `${size * 100}% ${size * 100}%`,
        backgroundPosition: `${colPercent}% ${rowPercent}%`,
        borderColor: 'rgba(52, 211, 153, 0.45)',
        boxShadow: '0 4px 14px rgba(0, 0, 0, 0.5), inset 0 0 10px rgba(16, 185, 129, 0.2)'
      };
    }
  }
];
