import { useMemo, useState } from "react";
import { Check, Lock, Palette } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AvatarWithFrame,
  BorderShell,
  RankTagChip,
  RarityChip,
  TitleChip,
} from "@/components/anime/ProfileCosmetics";
import {
  AUTO_ID,
  BORDERS,
  FRAMES,
  RARITY_META,
  TITLES,
  borderStyle,
  describeRequirement,
  requirementState,
  resolveBorder,
  resolveFrame,
  resolveTitle,
  type BorderDef,
  type CosmeticContext,
  type CosmeticKind,
  type FrameDef,
  type TitleDef,
} from "@/lib/cosmetics";
import { getRankInfo } from "@/lib/gamification";
import { saveProfilePrefs, type ProfilePrefs } from "@/lib/profile-prefs";
import { cn } from "@/lib/utils";

type Filter = "semua" | "dimiliki" | "terkunci";
type AnyDef = TitleDef | FrameDef | BorderDef;

const TABS: { id: CosmeticKind; label: string }[] = [
  { id: "title", label: "Julukan" },
  { id: "frame", label: "Frame Avatar" },
  { id: "border", label: "Border Profil" },
];

const LISTS: Record<CosmeticKind, AnyDef[]> = {
  title: TITLES,
  frame: FRAMES,
  border: BORDERS,
};

const AUTO_LABEL: Record<CosmeticKind, { name: string; desc: string }> = {
  title: { name: "Otomatis", desc: "Julukan tertinggi sesuai level kamu." },
  frame: { name: "Otomatis", desc: "Frame tertinggi sesuai level kamu." },
  border: { name: "Otomatis", desc: "Border tertinggi sesuai level kamu." },
};

function Thumb({
  kind,
  def,
  src,
  name,
}: {
  kind: CosmeticKind;
  def: AnyDef;
  src: string;
  name: string;
}) {
  if (kind === "title") {
    return (
      <div className="flex h-14 w-[4.5rem] shrink-0 items-center justify-center rounded-xl border border-border/70 bg-background/60 px-1 text-center">
        <span className="line-clamp-2 text-[10px] font-black leading-tight text-amber-700 dark:text-amber-300">
          {"「"}
          {def.name}
          {"」"}
        </span>
      </div>
    );
  }
  if (kind === "frame") {
    return (
      <div className="flex h-14 w-[4.5rem] shrink-0 items-center justify-center rounded-xl border border-border/70 bg-background/60">
        <AvatarWithFrame src={src} name={name} frame={def as FrameDef} size={34} />
      </div>
    );
  }
  const b = def as BorderDef;
  return (
    <div
      className="h-14 w-[4.5rem] shrink-0 rounded-xl p-[2px]"
      style={borderStyle(b)}
      aria-hidden="true"
    >
      <div className="flex h-full w-full items-center gap-1 rounded-[10px] bg-card px-1.5">
        <span className="h-3.5 w-3.5 shrink-0 rounded-full bg-muted-foreground/40" />
        <span className="flex flex-1 flex-col gap-1">
          <span className="h-1.5 w-full rounded-full" style={{ background: b.colors[0] }} />
          <span className="h-1.5 w-2/3 rounded-full bg-muted-foreground/30" />
        </span>
      </div>
    </div>
  );
}

export function CosmeticsDialog({
  open,
  onOpenChange,
  uid,
  name,
  photo,
  level,
  ctx,
  prefs,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  uid: string;
  name: string;
  photo: string;
  level: number;
  ctx: CosmeticContext;
  prefs: ProfilePrefs;
}) {
  const [tab, setTab] = useState<CosmeticKind>("title");
  const [filter, setFilter] = useState<Filter>("semua");
  const [preview, setPreview] = useState<{ kind: CosmeticKind; id: string } | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const equippedId = prefs.equipped[tab];

  const items = useMemo(() => {
    const all = LISTS[tab].map((def) => ({ def, state: requirementState(def.req, ctx) }));
    const filtered = all.filter((x) =>
      filter === "semua" ? true : filter === "dimiliki" ? x.state.unlocked : !x.state.unlocked,
    );
    // Terbuka dulu, lalu urut rarity dan syarat.
    return filtered.sort((a, b) => {
      if (a.state.unlocked !== b.state.unlocked) return a.state.unlocked ? -1 : 1;
      return RARITY_META[a.def.rarity].order - RARITY_META[b.def.rarity].order;
    });
  }, [tab, filter, ctx]);

  const counts = useMemo(() => {
    const out = {} as Record<CosmeticKind, string>;
    for (const t of TABS) {
      const list = LISTS[t.id];
      const owned = list.filter((d) => requirementState(d.req, ctx).unlocked).length;
      out[t.id] = `${owned}/${list.length}`;
    }
    return out;
  }, [ctx]);

  // Pratinjau: item yang disorot (boleh yang masih terkunci) menimpa yang sedang dipakai.
  const titleDef =
    (preview?.kind === "title" && TITLES.find((t) => t.id === preview.id)) ||
    resolveTitle(prefs.equipped.title, ctx);
  const frameDef =
    (preview?.kind === "frame" && FRAMES.find((f) => f.id === preview.id)) ||
    resolveFrame(prefs.equipped.frame, ctx);
  const borderDef =
    (preview?.kind === "border" && BORDERS.find((b) => b.id === preview.id)) ||
    resolveBorder(prefs.equipped.border, ctx);
  const rank = getRankInfo(level);

  async function equip(kind: CosmeticKind, id: string) {
    setSaveError(null);
    try {
      await saveProfilePrefs(uid, { equipped: { ...prefs.equipped, [kind]: id } });
      setPreview(null);
    } catch {
      setSaveError("Gagal menyimpan pilihan. Periksa koneksi lalu coba lagi.");
    }
  }

  const autoActive = equippedId === AUTO_ID;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[92dvh] max-w-xl flex-col gap-3 overflow-hidden rounded-3xl p-4 sm:p-6">
        <DialogHeader className="pr-8 text-left">
          <DialogTitle className="flex items-center gap-2 font-display text-base font-black">
            <Palette className="h-4 w-4 text-amber-500" />
            Koleksi &amp; Kustomisasi Kosmetik
          </DialogTitle>
          <DialogDescription className="text-[11px]">
            Ketuk item untuk melihat pratinjau. Item terbuka dari level dan pencapaian.
          </DialogDescription>
        </DialogHeader>

        <BorderShell border={borderDef} radius="1.5rem" innerClassName="p-3.5">
          <div className="flex items-center gap-3.5">
            <AvatarWithFrame src={photo} name={name} frame={frameDef} size={52} />
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="truncate font-display text-sm font-black text-foreground">{name}</p>
                {prefs.showRankTag ? <RankTagChip title={rank.title} gradient={rank.color} /> : null}
              </div>
              {prefs.showTitle ? <TitleChip name={titleDef.name} /> : null}
            </div>
            <span className="self-start text-[10px] font-black uppercase tracking-wider text-muted-foreground">
              Pratinjau
            </span>
          </div>
        </BorderShell>

        <div
          role="tablist"
          aria-label="Jenis kosmetik"
          className="grid grid-cols-3 gap-1 rounded-2xl border border-border/80 bg-card p-1"
        >
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => {
                setTab(t.id);
                setPreview(null);
              }}
              className={cn(
                "min-h-10 cursor-pointer rounded-xl px-1.5 text-[11px] font-bold transition-colors",
                tab === t.id
                  ? "bg-amber-400 text-zinc-950"
                  : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
              )}
            >
              {t.label} <span className="font-mono text-[10px] opacity-80">{counts[t.id]}</span>
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          {(
            [
              ["semua", "Semua"],
              ["dimiliki", "Dimiliki"],
              ["terkunci", "Terkunci"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setFilter(id)}
              className={cn(
                "min-h-9 cursor-pointer rounded-lg border px-3 text-[11px] font-bold transition-colors",
                filter === id
                  ? "border-foreground bg-foreground text-background"
                  : "border-border/80 text-muted-foreground hover:bg-secondary/60",
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {saveError ? (
          <p role="alert" className="rounded-xl bg-destructive/10 p-2.5 text-[11px] text-destructive">
            {saveError}
          </p>
        ) : null}

        <ul className="-mx-1 min-h-0 flex-1 space-y-2 overflow-y-auto px-1 pb-1">
          {filter !== "terkunci" ? (
            <li>
              <div
                className={cn(
                  "flex items-center gap-3 rounded-2xl border border-l-4 border-border/70 border-l-amber-400 bg-card p-3",
                  autoActive && "bg-amber-400/10",
                )}
              >
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-black text-foreground">{AUTO_LABEL[tab].name}</p>
                  <p className="text-[11px] text-muted-foreground">{AUTO_LABEL[tab].desc}</p>
                </div>
                {autoActive ? (
                  <span className="inline-flex min-h-10 items-center gap-1 rounded-xl bg-amber-400 px-3 text-[11px] font-black text-zinc-950">
                    <Check className="h-3 w-3" />
                    Aktif
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => equip(tab, AUTO_ID)}
                    className="min-h-10 cursor-pointer rounded-xl border border-border bg-secondary px-3 text-[11px] font-bold text-foreground hover:bg-secondary/70"
                  >
                    Gunakan
                  </button>
                )}
              </div>
            </li>
          ) : null}

          {items.map(({ def, state }) => {
            const isActive = !autoActive && equippedId === def.id;
            const pct = Math.round((state.progress / Math.max(1, state.target)) * 100);
            const isPreviewing = preview?.kind === tab && preview.id === def.id;
            return (
              <li key={def.id}>
                <div
                  role="button"
                  tabIndex={0}
                  onMouseEnter={() => setPreview({ kind: tab, id: def.id })}
                  onClick={() => setPreview({ kind: tab, id: def.id })}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setPreview({ kind: tab, id: def.id });
                    }
                  }}
                  className={cn(
                    "flex cursor-pointer items-center gap-3 rounded-2xl border border-l-4 border-border/70 bg-card p-3 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-amber-400/60",
                    RARITY_META[def.rarity].edge,
                    isActive && "bg-amber-400/10",
                    isPreviewing && !isActive && "bg-secondary/50",
                  )}
                >
                  <Thumb kind={tab} def={def} src={photo} name={name} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <p className="text-xs font-black text-foreground">{def.name}</p>
                      <RarityChip rarity={def.rarity} />
                    </div>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      <span className="font-bold text-foreground/80">Syarat:</span>{" "}
                      {describeRequirement(def.req, ctx)}
                    </p>
                    {!state.unlocked ? (
                      <div className="mt-1.5 flex items-center gap-2">
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-secondary">
                          <div
                            className={cn("h-full rounded-full", RARITY_META[def.rarity].bar)}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="font-mono text-[10px] text-muted-foreground">{pct}%</span>
                      </div>
                    ) : null}
                  </div>
                  {state.unlocked ? (
                    isActive ? (
                      <span className="inline-flex min-h-10 shrink-0 items-center gap-1 rounded-xl bg-amber-400 px-3 text-[11px] font-black text-zinc-950">
                        <Check className="h-3 w-3" />
                        Aktif
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          equip(tab, def.id);
                        }}
                        className="min-h-10 shrink-0 cursor-pointer rounded-xl border border-border bg-secondary px-3 text-[11px] font-bold text-foreground hover:bg-secondary/70"
                      >
                        Gunakan
                      </button>
                    )
                  ) : (
                    <span
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-border/70 text-muted-foreground"
                      aria-label="Terkunci"
                    >
                      <Lock className="h-3.5 w-3.5" />
                    </span>
                  )}
                </div>
              </li>
            );
          })}

          {items.length === 0 ? (
            <li className="py-8 text-center text-xs text-muted-foreground">
              Belum ada item di kategori ini.
            </li>
          ) : null}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
