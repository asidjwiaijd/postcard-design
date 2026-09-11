"use client";

import { useEffect, useMemo, useState } from "react";
import { FIELDS, GROUPS, fieldsOf, readPath, type FieldDef } from "@/lib/configFields";
import type { AppConfig } from "@/lib/config";

interface Payload {
  config: AppConfig;
  defaults: AppConfig;
  submissions: number;
}

type Form = Record<string, string | boolean>;

/** 配置对象 → 表单值（体积字段按 MB 显示） */
function toForm(cfg: AppConfig): Form {
  const f: Form = {};
  for (const d of FIELDS) {
    const v = readPath(cfg, d.path);
    if (d.kind === "bool") f[d.path] = !!v;
    else if (d.kind === "mb") f[d.path] = String(Number(v) / 1048576);
    else f[d.path] = String(v ?? "");
  }
  return f;
}

/** 表单值 → 提交给接口的嵌套对象。接口收的是存储单位，MB 在这里换回字节 */
function toBody(form: Form) {
  const out: Record<string, Record<string, unknown>> = { card: {}, limits: {}, site: {} };
  for (const d of FIELDS) {
    const [g, k] = d.path.split(".");
    const v = form[d.path];
    out[g][k] = d.kind === "mb" ? Math.round(Number(v) * 1048576) : v;
  }
  return out;
}

export function SettingTab() {
  const [data, setData] = useState<Payload | null>(null);
  const [form, setForm] = useState<Form>({});
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [ack, setAck] = useState(false);

  useEffect(() => {
    fetch("/api/admin/config")
      .then((r) => r.json())
      .then((d: Payload) => { setData(d); setForm(toForm(d.config)); })
      .catch(() => setErr("加载失败"));
  }, []);

  const saved = useMemo(() => (data ? toForm(data.config) : {}), [data]);
  const dirty = FIELDS.filter((d) => String(form[d.path]) !== String(saved[d.path]));
  const breaking = dirty.filter((d) => d.breaking);
  const needAck = breaking.length > 0 && (data?.submissions ?? 0) > 0;

  const num = (path: string) => Number(form[path]);
  const previewW = num("card.widthMm") + num("card.bleedMm") * 2;
  const previewH = num("card.heightMm") + num("card.bleedMm") * 2;
  const px = (mm: number) => Math.round((mm / 25.4) * num("card.dpi"));
  const geomOk = [previewW, previewH, num("card.dpi")].every((n) => Number.isFinite(n) && n > 0);

  async function submit(method: "PUT" | "DELETE") {
    setBusy(true);
    setErr("");
    const r = await fetch("/api/admin/config", {
      method,
      headers: { "Content-Type": "application/json" },
      body: method === "PUT" ? JSON.stringify(toBody(form)) : undefined,
    });
    const d = await r.json();
    setBusy(false);
    if (!r.ok) { setErr(d.error ?? "保存失败"); return; }
    // 画布尺寸是在页面加载时注入到浏览器里的，整页刷新才能让编辑器跟上
    location.reload();
  }

  if (!data) {
    return <p className="text-ink-400 py-10 text-center text-sm">{err || "加载中…"}</p>;
  }

  return (
    <div className="space-y-5 pb-24">
      <div className="card-soft p-4">
        <h2 className="font-cute text-ink-900 mb-1 text-base">站点设置</h2>
        <p className="text-ink-400 text-[11px]">
          这里改的值立刻对所有人生效，存在数据库里，重启和重新部署都不会丢。
          只有后台密码和会话密钥必须留在 .env（它们是进程启动前就要用的东西）。
        </p>
      </div>

      {breaking.length > 0 && (
        <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4">
          <p className="text-sm font-semibold text-amber-900">改动会影响已有内容</p>
          <p className="mt-1 text-[11px] leading-relaxed text-amber-800">
            你动了 {breaking.map((d) => d.label).join("、")}。
            画布尺寸一变，所有<b>没提交的草稿</b>会因为比例对不上被作废，米娜下次进编辑器是一张白纸；
            已经提交的成品图不会变，但和新规格混在一起就没法一起下印了。
            {data.submissions > 0 && ` 目前已有 ${data.submissions} 份稿件。`}
          </p>
          {needAck && (
            <label className="mt-2 flex items-start gap-2 text-[11px] text-amber-900">
              <input
                type="checkbox"
                className="accent-sakura-500 mt-0.5"
                checked={ack}
                onChange={(e) => setAck(e.target.checked)}
              />
              <span>我知道已经有 {data.submissions} 份稿件是按旧规格做的，仍然要改</span>
            </label>
          )}
        </div>
      )}

      {GROUPS.map((g) => (
        <div key={g.id} className="card-soft p-4">
          <h3 className="text-ink-900 mb-1 text-sm font-semibold">{g.title}</h3>
          {g.note && <p className="text-ink-400 mb-3 text-[11px] leading-relaxed">{g.note}</p>}

          <div className="grid gap-3 sm:grid-cols-2">
            {fieldsOf(g.id).map((d) => (
              <Row
                key={d.path}
                def={d}
                value={form[d.path]}
                changed={String(form[d.path]) !== String(saved[d.path])}
                onChange={(v) => setForm((f) => ({ ...f, [d.path]: v }))}
              />
            ))}
          </div>

          {g.id === "card" && (
            <p className="text-ink-500 bg-cream-100 mt-3 rounded-xl px-3 py-2 text-[11px]">
              {geomOk ? (
                <>
                  含出血整版 <b>{previewW.toFixed(1)}×{previewH.toFixed(1)} mm</b>
                  {" · "}导出 <b>{px(previewW)}×{px(previewH)} px</b>
                  {" · "}安全区 {(num("card.widthMm") - num("card.safeMm") * 2).toFixed(1)}×
                  {(num("card.heightMm") - num("card.safeMm") * 2).toFixed(1)} mm
                </>
              ) : (
                "数值填完整才能算出版面尺寸"
              )}
            </p>
          )}
        </div>
      ))}

      {err && (
        <p className="rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-700">{err}</p>
      )}

      <div className="border-sakura-100 fixed inset-x-0 bottom-0 z-10 border-t bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-3">
          <span className="text-ink-400 flex-1 text-[11px]">
            {dirty.length === 0
              ? "没有未保存的改动"
              : needAck && !ack
                ? `${dirty.length} 项待保存 · 改了画布尺寸，要先在上面勾选确认`
                : `${dirty.length} 项待保存`}
          </span>
          <button
            onClick={() => { if (confirm("清空所有后台改动，回到 .env 里的默认值？")) submit("DELETE"); }}
            disabled={busy}
            className="btn btn-ghost px-3 py-2 text-[11px]"
          >
            恢复默认
          </button>
          <button
            onClick={() => submit("PUT")}
            disabled={busy || dirty.length === 0 || (needAck && !ack)}
            className="btn btn-primary px-5 py-2 text-sm"
          >
            {busy ? "保存中…" : "保存"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Row({
  def, value, changed, onChange,
}: {
  def: FieldDef;
  value: string | boolean | undefined;
  changed: boolean;
  onChange: (v: string | boolean) => void;
}) {
  const unit = def.kind === "mm" ? "mm" : def.kind === "mb" ? "MB" : "";

  if (def.kind === "bool") {
    return (
      <label className="flex items-start gap-2 py-1">
        <input
          type="checkbox"
          className="accent-sakura-500 mt-0.5"
          checked={!!value}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span>
          <span className={`text-xs font-medium ${changed ? "text-sakura-600" : "text-ink-600"}`}>
            {def.label}
          </span>
          {def.hint && <span className="text-ink-400 block text-[10px]">{def.hint}</span>}
        </span>
      </label>
    );
  }

  return (
    <label className="block">
      <span className={`text-xs font-medium ${changed ? "text-sakura-600" : "text-ink-600"}`}>
        {def.label}
        {changed && " ·"}
      </span>
      <span className="relative mt-1 block">
        <input
          className="input"
          inputMode={def.kind === "text" ? "text" : "decimal"}
          value={String(value ?? "")}
          onChange={(e) => onChange(e.target.value)}
          style={unit ? { paddingRight: "2.6rem" } : undefined}
        />
        {unit && (
          <span className="text-ink-400 pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-[11px]">
            {unit}
          </span>
        )}
      </span>
      {def.hint && <span className="text-ink-400 mt-1 block text-[10px]">{def.hint}</span>}
    </label>
  );
}
