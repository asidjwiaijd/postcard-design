/**
 * 全站图标。一律走内联 SVG，不用 emoji：
 * emoji 在 Windows / 安卓 / iOS 上是三套完全不同的画风，
 * 放在一个粉色二次元界面里很容易糊成一团，字重和基线也对不齐。
 * 这里统一 24×24 视窗、1.7 描边、currentColor，跟文字颜色自动一致。
 */
import type { SVGProps } from "react";

const P: Record<string, React.ReactNode> = {
  // ---- 通用动作
  undo: <><path d="M9 14 4 9l5-5" /><path d="M4 9h10a6 6 0 0 1 0 12h-3" /></>,
  redo: <><path d="m15 14 5-5-5-5" /><path d="M20 9H10a6 6 0 0 0 0 12h3" /></>,
  close: <><path d="m6 6 12 12" /><path d="M18 6 6 18" /></>,
  check: <path d="m5 13 4 4L19 7" />,
  plus: <><path d="M12 5v14" /><path d="M5 12h14" /></>,
  minus: <path d="M5 12h14" />,
  trash: <><path d="M4 7h16" /><path d="M10 11v6M14 11v6" /><path d="m6 7 1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13" /><path d="M9 7V4.5A1.5 1.5 0 0 1 10.5 3h3A1.5 1.5 0 0 1 15 4.5V7" /></>,
  copy: <><rect x="9" y="9" width="12" height="12" rx="2.5" /><path d="M5 15H4.5A1.5 1.5 0 0 1 3 13.5v-9A1.5 1.5 0 0 1 4.5 3h9A1.5 1.5 0 0 1 15 4.5V5" /></>,
  pencil: <><path d="M4 20h4L18.5 9.5a2.6 2.6 0 0 0-3.7-3.7L4 16.4z" /><path d="m13.5 7 3.5 3.5" /></>,
  download: <><path d="M12 4v11" /><path d="m8 11 4 4 4-4" /><path d="M5 19h14" /></>,
  upload: <><path d="M12 20V9" /><path d="m8 13 4-4 4 4" /><path d="M5 5h14" /></>,
  refresh: <><path d="M20 11a8 8 0 0 0-13.7-5.1L3 9" /><path d="M3 4v5h5" /><path d="M4 13a8 8 0 0 0 13.7 5.1L21 15" /><path d="M21 20v-5h-5" /></>,
  external: <><path d="M14 4h6v6" /><path d="M20 4 11 13" /><path d="M19 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5" /></>,
  logout: <><path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4" /><path d="M10 8 6 12l4 4" /><path d="M6 12h9" /></>,
  eye: <><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" /><circle cx="12" cy="12" r="3" /></>,
  search: <><circle cx="11" cy="11" r="6.5" /><path d="m16 16 5 5" /></>,
  chevronLeft: <path d="m15 5-7 7 7 7" />,
  chevronDown: <path d="m6 9 6 6 6-6" />,
  chevronUp: <path d="m6 15 6-6 6 6" />,
  chevronRight: <path d="m9 6 6 6-6 6" />,
  arrowRight: <><path d="M4 12h15" /><path d="m13 6 6 6-6 6" /></>,
  up: <><path d="M12 19V5" /><path d="m6 11 6-6 6 6" /></>,
  down: <><path d="M12 5v14" /><path d="m6 13 6 6 6-6" /></>,
  toFront: <><path d="M12 20V8" /><path d="m7 13 5-5 5 5" /><path d="M4 4h16" /></>,
  toBack: <><path d="M12 4v12" /><path d="m7 11 5 5 5-5" /><path d="M4 20h16" /></>,
  lock: <><rect x="4" y="10.5" width="16" height="10.5" rx="2.5" /><path d="M8 10.5V7a4 4 0 0 1 8 0v3.5" /></>,
  unlock: <><rect x="4" y="10.5" width="16" height="10.5" rx="2.5" /><path d="M8 10.5V7a4 4 0 0 1 7.6-1.7" /></>,

  // ---- 导航与面板
  inbox: <><path d="M3 13h4.5l1.6 3h5.8l1.6-3H21" /><path d="M5.6 4.6h12.8l2.6 8.4V18a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-5z" /></>,
  link: <><path d="M10.5 13.5a4.5 4.5 0 0 0 6.4 0l2.4-2.4a4.5 4.5 0 0 0-6.4-6.4l-1.3 1.3" /><path d="M13.5 10.5a4.5 4.5 0 0 0-6.4 0l-2.4 2.4a4.5 4.5 0 0 0 6.4 6.4l1.3-1.3" /></>,
  users: <><circle cx="9.5" cy="8" r="3.3" /><path d="M3 20c0-3.4 2.9-5.2 6.5-5.2S16 16.6 16 20" /><path d="M16.5 5.2a3.3 3.3 0 0 1 0 5.6" /><path d="M18.5 20c0-2.3-.6-3.9-1.8-4.9" /></>,
  settings: <><circle cx="12" cy="12" r="3.2" /><path d="M19.6 14.4a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5v.2a2 2 0 0 1-4 0v-.1a1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 0 1 0-4h.1a1.6 1.6 0 0 0 1.5-1 1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3h.1a1.6 1.6 0 0 0 1-1.5V3a2 2 0 0 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8v.1a1.6 1.6 0 0 0 1.5 1h.2a2 2 0 0 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z" /></>,
  layout: <><rect x="3" y="4" width="18" height="16" rx="2.5" /><path d="M3 9.5h18" /><path d="M10 9.5V20" /></>,
  type: <><path d="M5 6.5V5h14v1.5" /><path d="M12 5v14" /><path d="M9 19h6" /></>,
  image: <><rect x="3" y="4.5" width="18" height="15" rx="2.5" /><circle cx="8.5" cy="9.5" r="1.6" /><path d="m4 16.5 4.5-4.2 3.5 3.3 3-2.4 5 4.3" /></>,
  sparkles: <><path d="M12 3.2 13.7 8 18.5 9.7 13.7 11.4 12 16.2 10.3 11.4 5.5 9.7 10.3 8z" /><path d="m18.2 15.2.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z" /></>,
  palette: <><path d="M12 3.2a8.8 8.8 0 0 0 0 17.6c1.2 0 2-.8 2-1.8 0-.5-.2-.9-.5-1.2-.3-.3-.5-.7-.5-1.1 0-1 .8-1.8 1.8-1.8h1.4A4.8 4.8 0 0 0 21 10.2c0-3.9-4-7-9-7z" /><circle cx="8" cy="10" r="1.1" fill="currentColor" stroke="none" /><circle cx="11.5" cy="7.2" r="1.1" fill="currentColor" stroke="none" /><circle cx="15.5" cy="8.6" r="1.1" fill="currentColor" stroke="none" /></>,
  layers: <><path d="m12 3 9 4.8-9 4.8-9-4.8z" /><path d="m3 12.6 9 4.8 9-4.8" /><path d="m3 17.2 9 4.8 9-4.8" /></>,
  sliders: <><path d="M4 7h9M17.5 7H20" /><path d="M4 17h3.5M12 17h8" /><circle cx="15.2" cy="7" r="2.3" /><circle cx="9.7" cy="17" r="2.3" /></>,
  crop: <><path d="M6.5 2.5v15h15" /><path d="M2.5 6.5h15v15" /></>,
  frame: <><rect x="3.5" y="3.5" width="17" height="17" rx="2.5" /><path d="M3.5 9h17M3.5 15h17M9 3.5v17M15 3.5v17" /></>,
  grid: <><rect x="3" y="3" width="18" height="18" rx="2.5" /><path d="M3 9h18M3 15h18M9 3v18M15 3v18" /></>,
  // 铺满整页：一个版面加上朝对角撑开的箭头
  fillPage: <><rect x="2.5" y="4.5" width="19" height="15" rx="2.5" /><path d="M10 14l-3.5 3.5M6.5 17.5v-3M6.5 17.5h3" /><path d="M14 10l3.5-3.5M17.5 6.5v3M17.5 6.5h-3" /></>,
  marquee: <><path d="M4 8V6a2 2 0 0 1 2-2h2" /><path d="M16 4h2a2 2 0 0 1 2 2v2" /><path d="M20 16v2a2 2 0 0 1-2 2h-2" /><path d="M8 20H6a2 2 0 0 1-2-2v-2" /><path d="M11 4h2M11 20h2M4 11v2M20 11v2" /></>,

  // ---- 页面朝向
  landscape: <rect x="2.5" y="6" width="19" height="12" rx="2" />,
  portrait: <rect x="6" y="2.5" width="12" height="19" rx="2" />,
  // 顺/逆时针转 90°：圆弧加一个箭头，方向一眼看得出来
  rotateCw: <><path d="M20 12a8 8 0 1 1-2.4-5.7" /><path d="M20.5 4v4.5H16" /></>,
  rotateCcw: <><path d="M4 12a8 8 0 1 0 2.4-5.7" /><path d="M3.5 4v4.5H8" /></>,
  rotatePage: <><rect x="3" y="9" width="12" height="12" rx="2" /><path d="M15 3h3a3 3 0 0 1 3 3v3" /><path d="M18.2 8.8 21 9l.2-2.8" /></>,

  // ---- 内容与形状
  square: <rect x="4" y="4" width="16" height="16" rx="3" />,
  circle: <circle cx="12" cy="12" r="8.2" />,
  triangle: <path d="M12 4.2 20.5 19.5h-17z" />,
  star: <path d="m12 3.6 2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8L3.5 9.8l5.9-.9z" />,
  heart: <path d="M12 20.4S3.5 15.3 3.5 9.5A4.5 4.5 0 0 1 12 7.2a4.5 4.5 0 0 1 8.5 2.3c0 5.8-8.5 10.9-8.5 10.9z" />,
  speech: <path d="M4 5.5h16a1.5 1.5 0 0 1 1.5 1.5v8a1.5 1.5 0 0 1-1.5 1.5H10l-4.5 3.5.8-3.5H4A1.5 1.5 0 0 1 2.5 15V7A1.5 1.5 0 0 1 4 5.5z" />,
  line: <path d="M4 12h16" />,
  camera: <><path d="M4 7.5h3.2l1.5-2.2h6.6l1.5 2.2H20a1.5 1.5 0 0 1 1.5 1.5v9a1.5 1.5 0 0 1-1.5 1.5H4a1.5 1.5 0 0 1-1.5-1.5V9A1.5 1.5 0 0 1 4 7.5z" /><circle cx="12" cy="13" r="3.6" /></>,
  mail: <><rect x="3" y="5" width="18" height="14" rx="2.5" /><path d="m3.8 7 7.3 5.3a1.5 1.5 0 0 0 1.8 0L20.2 7" /></>,
  printer: <><path d="M7 9V4h10v5" /><rect x="3" y="9" width="18" height="7.5" rx="2" /><path d="M7 14h10v6H7z" /></>,
  tag: <><path d="M11.5 3H20a1 1 0 0 1 1 1v8.5a1 1 0 0 1-.3.7l-7.8 7.8a1 1 0 0 1-1.4 0l-8-8a1 1 0 0 1 0-1.4l7.8-7.8a1 1 0 0 1 .7-.3z" /><circle cx="16.5" cy="7.5" r="1.4" /></>,
  idCard: <><rect x="2.5" y="5" width="19" height="14" rx="2.5" /><circle cx="8.5" cy="11" r="2.4" /><path d="M4.8 16.4c.5-1.5 1.9-2.3 3.7-2.3s3.2.8 3.7 2.3" /><path d="M15 10h4M15 13.5h3" /></>,
  flag: <><path d="M5 21V4" /><path d="M5 5h9.5l-1.2 3.2L14.5 12H5z" /><path d="M14.5 12H19l-1.2-3.2L19 5.6" /></>,
  gift: <><rect x="3" y="8.5" width="18" height="5" rx="1.2" /><path d="M4.8 13.5V20a1 1 0 0 0 1 1h12.4a1 1 0 0 0 1-1v-6.5" /><path d="M12 8.5V21" /><path d="M12 8.5S10.8 3 8.4 3a2.4 2.4 0 0 0 0 5.5z" /><path d="M12 8.5S13.2 3 15.6 3a2.4 2.4 0 0 1 0 5.5z" /></>,
  wand: <><path d="M4 20 15 9" /><path d="m17 3 .9 2.4 2.4.9-2.4.9L17 9.6l-.9-2.4-2.4-.9 2.4-.9z" /><path d="m6.5 3.5.6 1.5 1.5.6-1.5.6-.6 1.5-.6-1.5L4.4 5.6l1.5-.6z" /></>,
  checkCircle: <><circle cx="12" cy="12" r="9" /><path d="m8 12.3 2.8 2.7L16 9.7" /></>,
  help: <><circle cx="12" cy="12" r="9" /><path d="M9.6 9.2a2.5 2.5 0 1 1 3.2 2.5c-.6.2-.8.7-.8 1.3v.6" /><circle cx="12" cy="16.9" r=".9" fill="currentColor" stroke="none" /></>,
  alert: <><path d="M12 4.5 21 19.5H3z" /><path d="M12 10v4" /><circle cx="12" cy="16.8" r=".9" fill="currentColor" stroke="none" /></>,
  key: <><circle cx="8" cy="14" r="4.2" /><path d="m11 11 8.5-8.5" /><path d="m16 6.5 2.2 2.2" /><path d="m18.6 3.9 2.2 2.2" /></>,
  alignLeft: <><path d="M4 6h16M4 11h10M4 16h14M4 21h8" /></>,
  alignCenter: <><path d="M4 6h16M7 11h10M5 16h14M8 21h8" /></>,
  alignRight: <><path d="M4 6h16M10 11h10M6 16h14M12 21h8" /></>,
  clipboard: <><rect x="5" y="5" width="14" height="16" rx="2" /><path d="M9 5V3.8A.8.8 0 0 1 9.8 3h4.4a.8.8 0 0 1 .8.8V5" /><path d="M9 11h6M9 15h4" /></>,
};

export type IconName = keyof typeof P;

export function Icon({
  name, size = 18, ...rest
}: { name: IconName | string; size?: number } & Omit<SVGProps<SVGSVGElement>, "name">) {
  const body = P[name as string];
  if (!body) return null;
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      focusable="false"
      {...rest}
    >
      {body}
    </svg>
  );
}
