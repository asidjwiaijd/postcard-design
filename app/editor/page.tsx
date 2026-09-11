import { redirect } from "next/navigation";
import { currentUser, publicUser } from "@/lib/auth";
import { latestDoc } from "@/lib/repo";
import { EditorShell } from "@/components/editor/EditorShell";
import type { DesignDoc } from "@/lib/types";
import { SPEC } from "@/lib/config";
import { ensureConfig } from "@/lib/settings";
import { campaignStatus } from "@/lib/campaign";

export const dynamic = "force-dynamic";

export default async function EditorPage() {
  ensureConfig();
  const me = await currentUser();
  if (!me) redirect("/");

  // 接着改最近动过的那一份，其余的在「新建」对话框里还能翻回来
  const row = latestDoc(me.user.id);
  let draft: DesignDoc | null = null;
  let docId: string | null = null;
  if (row) {
    try {
      const parsed = JSON.parse(row.design_json) as DesignDoc;
      // 规格若在发布后被改过，旧草稿的比例就对不上了，宁可从头开始
      const same =
        parsed?.spec?.widthMm === SPEC.widthMm &&
        parsed?.spec?.heightMm === SPEC.heightMm &&
        parsed?.spec?.bleedMm === SPEC.bleedMm;
      if (same && parsed.front && parsed.back) {
        draft = parsed;
        docId = row.id;
      }
    } catch {
      draft = null;
    }
  }

  return (
    <EditorShell
      user={publicUser(me)}
      initialDoc={draft}
      initialDocId={docId}
      campaignLeft={campaignStatus().left}
    />
  );
}
