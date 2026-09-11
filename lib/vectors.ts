/**
 * 内置矢量装饰。全部用代码画，无版权风险、体积为零、可任意换色。
 * 每个都在 100×(100/aspect) 的坐标系里作图，用时按元素宽高拉伸。
 */
export interface VectorDef {
  id: string;
  name: string;
  category: string;
  /** 宽 / 高 */
  aspect: number;
  color: string;
  color2?: string;
  draw: (c: string, c2: string) => string;
}

const H = (aspect: number) => 100 / aspect;

function starPath(cx: number, cy: number, R: number, r: number, n: number, rot = -90) {
  const pts: string[] = [];
  for (let i = 0; i < n * 2; i++) {
    const rad = i % 2 === 0 ? R : r;
    const a = ((rot + (i * 180) / n) * Math.PI) / 180;
    pts.push(`${(cx + rad * Math.cos(a)).toFixed(2)},${(cy + rad * Math.sin(a)).toFixed(2)}`);
  }
  return `M ${pts.join(" L ")} Z`;
}

export const VECTORS: VectorDef[] = [
  {
    id: "star", name: "五角星", category: "基础", aspect: 1, color: "#ffc93c",
    draw: (c) => `<path d="${starPath(50, 52, 46, 19, 5)}" fill="${c}"/>`,
  },
  {
    id: "star-outline", name: "描边星", category: "基础", aspect: 1, color: "#ff8fb1",
    draw: (c) => `<path d="${starPath(50, 52, 43, 18, 5)}" fill="none" stroke="${c}" stroke-width="6" stroke-linejoin="round"/>`,
  },
  {
    id: "heart", name: "爱心", category: "基础", aspect: 1.1, color: "#ff6b93",
    draw: (c) => `<path d="M50 84 C 20 62, 4 44, 4 28 C 4 13, 16 5, 28 5 C 38 5, 46 11, 50 19 C 54 11, 62 5, 72 5 C 84 5, 96 13, 96 28 C 96 44, 80 62, 50 84 Z" fill="${c}"/>`,
  },
  {
    id: "heart-outline", name: "描边心", category: "基础", aspect: 1.1, color: "#ff6b93",
    draw: (c) => `<path d="M50 82 C 22 61, 7 44, 7 29 C 7 15, 18 8, 29 8 C 38 8, 46 13, 50 21 C 54 13, 62 8, 71 8 C 82 8, 93 15, 93 29 C 93 44, 78 61, 50 82 Z" fill="none" stroke="${c}" stroke-width="7" stroke-linejoin="round"/>`,
  },
  {
    id: "sparkle", name: "四角闪", category: "闪亮", aspect: 1, color: "#ffd76e",
    draw: (c) => `<path d="M50 0 C 54 34, 66 46, 100 50 C 66 54, 54 66, 50 100 C 46 66, 34 54, 0 50 C 34 46, 46 34, 50 0 Z" fill="${c}"/>`,
  },
  {
    id: "sparkle-trio", name: "闪光三连", category: "闪亮", aspect: 1.4, color: "#ffd76e", color2: "#ffe9a8",
    draw: (c, c2) => {
      const one = (x: number, y: number, s: number, col: string) =>
        `<path transform="translate(${x} ${y}) scale(${s})" d="M0 -50 C 4 -16, 16 -4, 50 0 C 16 4, 4 16, 0 50 C -4 16, -16 4, -50 0 C -16 -4, -4 -16, 0 -50 Z" fill="${col}"/>`;
      return one(30, 30, 0.5, c) + one(72, 20, 0.3, c2) + one(62, 55, 0.38, c);
    },
  },
  {
    id: "twinkle", name: "小星星群", category: "闪亮", aspect: 1.6, color: "#ffc93c",
    draw: (c) => [[18, 22, 15], [55, 12, 9], [80, 30, 12], [36, 48, 8], [70, 52, 6]]
      .map(([x, y, r]) => `<path d="${starPath(x, y, r, r * 0.42, 5)}" fill="${c}"/>`).join(""),
  },
  {
    id: "speech", name: "对话框", category: "对话", aspect: 1.35, color: "#ffffff", color2: "#ff8fb1",
    draw: (c, c2) => `<path d="M6 6 H94 A6 6 0 0 1 100 12 V52 A6 6 0 0 1 94 58 H40 L24 72 L27 58 H6 A6 6 0 0 1 0 52 V12 A6 6 0 0 1 6 6 Z" fill="${c}" stroke="${c2}" stroke-width="4" stroke-linejoin="round"/>`,
  },
  {
    id: "speech-round", name: "云朵框", category: "对话", aspect: 1.5, color: "#ffffff", color2: "#8fb8ff",
    draw: (c, c2) => `<g fill="${c}" stroke="${c2}" stroke-width="3.5"><path d="M20 20 A16 16 0 0 1 46 12 A18 18 0 0 1 80 18 A15 15 0 0 1 84 46 H20 A14 14 0 0 1 20 20 Z"/><circle cx="26" cy="54" r="6"/><circle cx="17" cy="62" r="3.5"/></g>`,
  },
  {
    id: "tape", name: "胶带", category: "装饰", aspect: 3.4, color: "#ffd9e6",
    draw: (c) => `<path d="M2 6 L98 2 L96 27 L4 24 Z" fill="${c}" opacity="0.85"/><path d="M2 6 L98 2" stroke="#fff" stroke-width="1.5" opacity="0.5"/>`,
  },
  {
    id: "tape-washi", name: "和纸胶带", category: "装饰", aspect: 3.4, color: "#b8e0d2", color2: "#ffffff",
    draw: (c, c2) => {
      let stripes = "";
      for (let x = -10; x < 110; x += 9) stripes += `<path d="M${x} 0 L${x + 5} 0 L${x - 3} 30 L${x - 8} 30 Z" fill="${c2}" opacity="0.55"/>`;
      return `<clipPath id="tp"><path d="M2 5 L98 1 L96 28 L4 25 Z"/></clipPath><path d="M2 5 L98 1 L96 28 L4 25 Z" fill="${c}"/><g clip-path="url(#tp)">${stripes}</g>`;
    },
  },
  {
    id: "ribbon", name: "丝带", category: "装饰", aspect: 2.6, color: "#ff8fb1", color2: "#e06b8f",
    draw: (c, c2) => `<path d="M0 4 H100 V26 L92 19 L100 12 V38 H0 V12 L8 19 L0 26 Z" fill="${c}"/><path d="M0 26 L8 19 L0 12 Z" fill="${c2}"/><path d="M100 26 L92 19 L100 12 Z" fill="${c2}"/>`,
  },
  {
    id: "bow", name: "蝴蝶结", category: "装饰", aspect: 1.5, color: "#ff7fa8", color2: "#ffffff",
    draw: (c, c2) => `<g fill="${c}"><path d="M46 33 L10 12 C 2 8, 0 22, 4 34 C 0 46, 2 60, 10 56 L46 37 Z"/><path d="M54 33 L90 12 C 98 8, 100 22, 96 34 C 100 46, 98 60, 90 56 L54 37 Z"/><rect x="42" y="26" width="16" height="18" rx="6"/><path d="M44 44 L36 66 L48 60 Z"/><path d="M56 44 L64 66 L52 60 Z"/></g><ellipse cx="50" cy="31" rx="4" ry="2.4" fill="${c2}" opacity="0.5"/>`,
  },
  {
    id: "crown", name: "皇冠", category: "装饰", aspect: 1.4, color: "#ffc93c",
    draw: (c) => `<path d="M6 58 L2 16 L26 34 L50 6 L74 34 L98 16 L94 58 Z" fill="${c}"/><rect x="6" y="58" width="88" height="10" rx="4" fill="${c}"/>`,
  },
  {
    id: "cat-ears", name: "猫耳", category: "装饰", aspect: 2.2, color: "#3d3348", color2: "#ff9fbb",
    draw: (c, c2) => `<g><path d="M4 44 L14 2 L44 30 Z" fill="${c}"/><path d="M13 38 L18 15 L33 29 Z" fill="${c2}"/><path d="M96 44 L86 2 L56 30 Z" fill="${c}"/><path d="M87 38 L82 15 L67 29 Z" fill="${c2}"/></g>`,
  },
  {
    id: "music", name: "音符", category: "装饰", aspect: 1, color: "#7b6cf6",
    draw: (c) => `<g fill="${c}"><ellipse cx="26" cy="78" rx="18" ry="13" transform="rotate(-18 26 78)"/><rect x="38" y="12" width="7" height="68" rx="3"/><path d="M45 12 L86 24 V44 L45 32 Z"/></g>`,
  },
  {
    id: "frame-round", name: "圆角边框", category: "边框", aspect: 1.45, color: "#ff8fb1",
    draw: (c) => `<rect x="4" y="4" width="92" height="61" rx="7" fill="none" stroke="${c}" stroke-width="3"/><rect x="9" y="9" width="82" height="51" rx="4" fill="none" stroke="${c}" stroke-width="1" stroke-dasharray="3 2.5" opacity="0.7"/>`,
  },
  {
    id: "frame-photo", name: "拍立得框", category: "边框", aspect: 0.85, color: "#ffffff", color2: "#e6e0ea",
    draw: (c, c2) => `<rect x="0" y="0" width="100" height="118" rx="2" fill="${c}" stroke="${c2}" stroke-width="1.5"/><rect x="7" y="7" width="86" height="86" fill="${c2}" opacity="0.6"/>`,
  },
  {
    id: "frame-scallop", name: "花边框", category: "边框", aspect: 1.45, color: "#ff8fb1",
    draw: (c) => {
      let d = "";
      const r = 4, w = 100, h = 69;
      for (let x = r; x < w; x += r * 2) d += `<circle cx="${x}" cy="${r}" r="${r}" fill="${c}"/><circle cx="${x}" cy="${h - r}" r="${r}" fill="${c}"/>`;
      for (let y = r; y < h; y += r * 2) d += `<circle cx="${r}" cy="${y}" r="${r}" fill="${c}"/><circle cx="${w - r}" cy="${y}" r="${r}" fill="${c}"/>`;
      return `${d}<rect x="${r}" y="${r}" width="${w - r * 2}" height="${h - r * 2}" fill="${c}"/><rect x="${r + 3}" y="${r + 3}" width="${w - r * 2 - 6}" height="${h - r * 2 - 6}" fill="#fff"/>`;
    },
  },
  {
    id: "halftone", name: "网点", category: "质感", aspect: 1, color: "#ff8fb1",
    draw: (c) => {
      let s = "";
      for (let y = 3; y < 100; y += 7)
        for (let x = 3; x < 100; x += 7) {
          const r = 3.1 * (1 - (x + y) / 240);
          if (r > 0.25) s += `<circle cx="${x}" cy="${y}" r="${r.toFixed(2)}" fill="${c}"/>`;
        }
      return s;
    },
  },
  {
    id: "speedlines", name: "集中线", category: "质感", aspect: 1, color: "#3d3348",
    draw: (c) => {
      let s = "";
      for (let i = 0; i < 44; i++) {
        const a = (i / 44) * Math.PI * 2 + (i % 3) * 0.02;
        const w = 0.9 + (i % 4) * 0.5;
        const x1 = 50 + Math.cos(a) * 26, y1 = 50 + Math.sin(a) * 26;
        const x2 = 50 + Math.cos(a) * 78, y2 = 50 + Math.sin(a) * 78;
        s += `<path d="M${x1.toFixed(1)} ${y1.toFixed(1)} L${x2.toFixed(1)} ${y2.toFixed(1)}" stroke="${c}" stroke-width="${w}" stroke-linecap="round"/>`;
      }
      return s;
    },
  },
  {
    id: "blob", name: "渐变色块", category: "质感", aspect: 1, color: "#ffb3d1", color2: "#b9a7ff",
    draw: (c, c2) => `<defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c}"/><stop offset="1" stop-color="${c2}"/></linearGradient></defs><path d="M50 2 C 78 2, 98 22, 98 50 C 98 78, 78 98, 50 98 C 22 98, 2 78, 2 50 C 2 22, 22 2, 50 2 Z" fill="url(#bg)"/>`,
  },
  {
    id: "arrow", name: "手绘箭头", category: "标注", aspect: 2, color: "#3d3348",
    draw: (c) => `<g fill="none" stroke="${c}" stroke-width="4" stroke-linecap="round"><path d="M4 34 C 26 6, 58 6, 88 24"/><path d="M74 12 L90 25 L72 32"/></g>`,
  },
  {
    id: "underline", name: "波浪下划线", category: "标注", aspect: 6, color: "#ff8fb1",
    draw: (c) => `<path d="M2 9 Q 8.5 1, 15 9 T 28 9 T 41 9 T 54 9 T 67 9 T 80 9 T 93 9" fill="none" stroke="${c}" stroke-width="2.6" stroke-linecap="round"/>`,
  },
  {
    id: "corner", name: "角落装饰", category: "标注", aspect: 1, color: "#ffc93c",
    draw: (c) => `<g stroke="${c}" stroke-width="4" fill="none" stroke-linecap="round"><path d="M4 34 V4 H34"/><path d="M12 46 L46 12" opacity="0.5"/></g><path d="${starPath(72, 72, 20, 8, 4, -90)}" fill="${c}"/>`,
  },
  {
    id: "stamp-edge", name: "邮票齿边", category: "边框", aspect: 0.85, color: "#ffffff", color2: "#ff8fb1",
    draw: (c, c2) => {
      let holes = "";
      const w = 100, h = 118, r = 3.4, step = 8.6;
      for (let x = step / 2; x < w; x += step) holes += `<circle cx="${x.toFixed(1)}" cy="0" r="${r}"/><circle cx="${x.toFixed(1)}" cy="${h}" r="${r}"/>`;
      for (let y = step / 2; y < h; y += step) holes += `<circle cx="0" cy="${y.toFixed(1)}" r="${r}"/><circle cx="${w}" cy="${y.toFixed(1)}" r="${r}"/>`;
      return `<mask id="sm"><rect width="${w}" height="${h}" fill="#fff"/><g fill="#000">${holes}</g></mask><g mask="url(#sm)"><rect width="${w}" height="${h}" fill="${c}"/><rect x="7" y="7" width="86" height="104" fill="none" stroke="${c2}" stroke-width="2" stroke-dasharray="4 3"/></g>`;
    },
  },
];

export const VECTOR_CATEGORIES = [...new Set(VECTORS.map((v) => v.category))];

export function vectorSvg(id: string, color?: string, color2?: string): string {
  const def = VECTORS.find((v) => v.id === id) ?? VECTORS[0];
  const c = color ?? def.color;
  const c2 = color2 ?? def.color2 ?? c;
  const h = H(def.aspect);
  // 每个实例的 defs id 加前缀，避免同页面多个实例互相串色
  const uid = `v${Math.random().toString(36).slice(2, 8)}`;
  const inner = def.draw(c, c2).replace(/id="([^"]+)"/g, `id="${uid}-$1"`).replace(/url\(#([^)]+)\)/g, `url(#${uid}-$1)`);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 ${h.toFixed(2)}" preserveAspectRatio="none">${inner}</svg>`;
}

export function vectorAspect(id: string) {
  return (VECTORS.find((v) => v.id === id) ?? VECTORS[0]).aspect;
}
