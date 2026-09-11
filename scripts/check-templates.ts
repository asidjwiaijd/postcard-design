/**
 * 体检：所有模板和元素块生成的内容都必须落在出血版之内，
 * 重要内容还应该留在安全区里。改模板坐标后跑一下 `npm run check`。
 */
import { BLOCKS, FRONT_TEMPLATES, BACK_TEMPLATES, buildBlock, buildSide, type TemplateCtx } from "../lib/templates";
import { SPEC, pageW, pageH, turnLabel } from "../lib/config";
import { ensureConfig } from "../lib/settings";
import type { AnyElement } from "../lib/types";

// 按后台当前生效的规格来验，而不是 .env 里的默认值——
// 改完尺寸就该跑一次，看看现成模板在新版面上还站不站得住
ensureConfig();

const ctx: TemplateCtx = {
  qq: "10001", nickname: "测试昵称", avatar: "/api/qq/avatar/10001", clubName: "测试社团",
};

const S = SPEC.bleedMm + SPEC.safeMm;
let bad = 0;
let warn = 0;

// 正在验的这一面是横是竖。模板两种朝向都要能站得住
let turned = false;
const bleedW = () => pageW(turned);
const bleedH = () => pageH(turned);

function check(where: string, els: AnyElement[]) {
  for (const el of els) {
    const r = { l: el.x, t: el.y, r: el.x + el.w, b: el.y + el.h };
    const isContent = el.type === "text" || el.type === "image" || el.type === "sticker";

    if (isContent) {
      // 内容被裁掉就是事故：文字断头、头像缺一半
      const over = [
        r.l < -0.5 && "左",
        r.t < -0.5 && "上",
        r.r > bleedW() + 0.5 && "右",
        r.b > bleedH() + 0.5 && "下",
      ].filter(Boolean);
      if (over.length) {
        console.error(
          `  ✗ ${where} [${el.type}] 内容越出出血版 ${over.join("/")} — ` +
            `x=${el.x} y=${el.y} w=${el.w} h=${el.h}`,
        );
        bad++;
        continue;
      }
      if (el.type === "text") {
        const out = r.l < S - 0.5 || r.t < S - 0.5 || r.r > bleedW() - S + 0.5 || r.b > bleedH() - S + 0.5;
        if (out) {
          console.warn(
            `  ! ${where} 文字超出安全区 — "${el.text.slice(0, 12)}" ` +
              `→ ${r.r.toFixed(1)},${r.b.toFixed(1)}`,
          );
          warn++;
        }
      }
      continue;
    }

    // 装饰（形状 / 矢量）故意出血是常规做法，只在几乎看不见时报错
    const visW = Math.max(0, Math.min(r.r, bleedW()) - Math.max(r.l, 0));
    const visH = Math.max(0, Math.min(r.b, bleedH()) - Math.max(r.t, 0));
    const ratio = (visW * visH) / (el.w * el.h || 1);
    if (ratio < 0.25) {
      console.error(
        `  ✗ ${where} [${el.type}] 只有 ${(ratio * 100).toFixed(0)}% 落在版面内，等于白放 — ` +
          `x=${el.x} y=${el.y} w=${el.w} h=${el.h}`,
      );
      bad++;
    }
  }
}

// 每一面都能各自选朝向，所以两种版面各验一遍
for (const t of [false, true]) {
  turned = t;
  console.log(
    `\n${turnLabel(t)}版面 ${bleedW()}×${bleedH()}mm，` +
      `安全区 ${S}~${bleedW() - S} / ${S}~${bleedH() - S}\n`,
  );
  console.log("整页模板:");
  for (const tpl of [...FRONT_TEMPLATES, ...BACK_TEMPLATES]) {
    check(tpl.id, buildSide(tpl, ctx, t).elements);
  }
  console.log("元素块:");
  for (const b of BLOCKS) check(b.id, buildBlock(b, ctx, t));
}

console.log(`\n错误 ${bad} 个，警告 ${warn} 个`);
process.exit(bad ? 1 : 0);
