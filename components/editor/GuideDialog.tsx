"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/icons";
import { SPEC, bleedW, bleedH } from "@/lib/config";

/** 版本号进了 key：以后须知改了内容，看过老版本的人会再弹一次 */
const KEY = "pc:guide:v1";

export function guideSeen() {
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    // 隐私模式下读不了，那就每次都提示一遍，总比不提示好
    return false;
  }
}
function remember(v: boolean) {
  try {
    if (v) localStorage.setItem(KEY, "1");
    else localStorage.removeItem(KEY);
  } catch {
    /* 存不下就算了 */
  }
}

/** 出血 / 成品 / 安全区的示意图，尺寸跟着当前规格走 */
function SpecDiagram() {
  const W = bleedW();
  const H = bleedH();
  const B = SPEC.bleedMm;
  const S = B + SPEC.safeMm;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="出血与安全区示意">
      <rect x={0} y={0} width={W} height={H} fill="#ffd9e6" />
      <rect x={B} y={B} width={SPEC.widthMm} height={SPEC.heightMm} fill="#ffffff" />
      <rect
        x={B} y={B} width={SPEC.widthMm} height={SPEC.heightMm}
        fill="none" stroke="#ec3b76" strokeWidth={0.5}
      />
      <rect
        x={S} y={S} width={SPEC.widthMm - SPEC.safeMm * 2} height={SPEC.heightMm - SPEC.safeMm * 2}
        fill="none" stroke="#7c6cf6" strokeWidth={0.4} strokeDasharray="2 1.6"
      />
      <text x={W / 2} y={H / 2 + 1.6} textAnchor="middle" fontSize={4.5} fill="#b3a8bd">
        你的画面
      </text>
    </svg>
  );
}

const RULES = [
  "不要出现色情擦边、血腥猎奇、政治敏感、人身攻击和引流广告。这是要印出来在现场发给陌生人的东西。",
  "不要放隐私信息：手机号、身份证号、住址、别人的照片或 QQ 号。想留联系方式就放社团的群号。",
  "二创请遵守原作者和版权方的规则，注明出处更稳妥。",
];

/**
 * 进编辑器时弹一次的「设计须知」。第一次进来自动弹，看过就记在本地，
 * 之后可以从顶栏那个问号重新打开。
 */
export function GuideDialog({ onClose }: { onClose: () => void }) {
  const [dontShow, setDontShow] = useState(true);

  const close = () => {
    remember(dontShow);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-black/45" onClick={close} />
      <div className="relative max-h-[90dvh] w-full overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:max-w-xl sm:rounded-3xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-cute text-ink-900 text-xl">开始之前，先看一眼</h2>
            <p className="text-ink-400 mt-0.5 text-xs">
              这张会真的印出来，下面几条看完再动手能少返工
            </p>
          </div>
          <button onClick={close} className="text-ink-400 hover:text-ink-800 -mr-1 p-1">
            <Icon name="close" size={18} />
          </button>
        </div>

        {/* ---- 印刷规则 ---- */}
        <section className="border-sakura-100 mt-4 rounded-2xl border p-3.5">
          <h3 className="text-ink-800 flex items-center gap-1.5 text-sm font-semibold">
            <Icon name="crop" size={15} className="text-sakura-500" />
            出血和安全区
          </h3>
          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="ring-sakura-100 w-full shrink-0 overflow-hidden rounded-lg ring-1 sm:w-48">
              <SpecDiagram />
            </div>
            <ul className="text-ink-600 space-y-1.5 text-[12px] leading-relaxed">
              <li>
                <b className="text-sakura-600">粉色那一圈</b>是出血（{SPEC.bleedMm}mm），
                印完会被裁掉。背景、底图要一直铺到最外边，别在这里放重要东西。
              </li>
              <li>
                <b className="text-iris-500">紫色虚线</b>以内是安全区。文字、人脸、logo
                都放进来，裁歪几毫米也不会被切到。
              </li>
              <li>
                成品 {SPEC.widthMm}×{SPEC.heightMm}mm，{SPEC.dpi}dpi。
                图片拉得比原图大会糊，编辑器不会拦你，印出来才看得出来。
              </li>
            </ul>
          </div>
        </section>

        {/* ---- 省事的操作 ---- */}
        <section className="border-sakura-100 mt-3 rounded-2xl border p-3.5">
          <h3 className="text-ink-800 flex items-center gap-1.5 text-sm font-semibold">
            <Icon name="wand" size={15} className="text-sakura-500" />
            三个省事的操作
          </h3>
          <ul className="text-ink-600 mt-2 space-y-1.5 text-[12px] leading-relaxed">
            <li>模板里的<b>虚线框是照片位</b>，双击就能选图，图会自动按形状裁好。</li>
            <li>每一面可以单独选<b>横版 / 竖版</b>，换完重新套一次模板最省事。</li>
            <li>在空白处<b>拖一个框</b>能一次选中多个元素（手机上用手指拖也行），整组挪动、对齐。</li>
          </ul>
        </section>

        {/* ---- 内容规范 ---- */}
        <section className="mt-3 rounded-2xl bg-rose-50 p-3.5 ring-1 ring-rose-200">
          <h3 className="flex items-center gap-1.5 text-sm font-semibold text-rose-700">
            <Icon name="alert" size={15} />
            内容规范（会影响能不能印）
          </h3>
          <ul className="mt-2 space-y-1.5 text-[12px] leading-relaxed text-rose-700/90">
            {RULES.map((r) => (
              <li key={r} className="flex gap-1.5">
                <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-rose-400" />
                <span>{r}</span>
              </li>
            ))}
          </ul>
          <p className="mt-2.5 text-[11px] text-rose-600/80">
            社团会逐张审核。不合适的会被退回并写明原因，改完可以再交；
            反复提交违规内容会被停用。
          </p>
        </section>

        <label className="text-ink-400 mt-4 flex items-center gap-2 text-xs">
          <input
            type="checkbox"
            className="accent-sakura-500"
            checked={dontShow}
            onChange={(e) => setDontShow(e.target.checked)}
          />
          以后不再自动弹出（顶栏的问号里随时能翻回来）
        </label>

        <button onClick={close} className="btn btn-primary mt-3 w-full py-2.5 text-sm">
          我知道了，开始设计
        </button>
      </div>
    </div>
  );
}
