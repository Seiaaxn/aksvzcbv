import type { CSSProperties } from "react";
import { RANKS } from "./ranks";
import type { Achievement } from "./missions";
import { EXTRA_ACHIEVEMENT_DEFS } from "./achievement-defs";

/* ───────── rarity ───────── */

export type Rarity = "common" | "uncommon" | "rare" | "epic" | "legendary";

export const RARITY_META: Record<
  Rarity,
  { label: string; chip: string; bar: string; edge: string; order: number }
> = {
  common: {
    label: "COMMON",
    chip: "border-zinc-500/40 bg-zinc-500/15 text-zinc-600 dark:text-zinc-300",
    bar: "bg-zinc-400",
    edge: "border-l-zinc-500",
    order: 0,
  },
  uncommon: {
    label: "UNCOMMON",
    chip: "border-emerald-500/40 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
    bar: "bg-emerald-400",
    edge: "border-l-emerald-500",
    order: 1,
  },
  rare: {
    label: "RARE",
    chip: "border-sky-500/40 bg-sky-500/15 text-sky-700 dark:text-sky-400",
    bar: "bg-sky-400",
    edge: "border-l-sky-500",
    order: 2,
  },
  epic: {
    label: "EPIC",
    chip: "border-purple-500/40 bg-purple-500/15 text-purple-700 dark:text-purple-400",
    bar: "bg-purple-400",
    edge: "border-l-purple-500",
    order: 3,
  },
  legendary: {
    label: "LEGENDARY",
    chip: "border-amber-500/40 bg-amber-500/15 text-amber-700 dark:text-amber-400",
    bar: "bg-amber-400",
    edge: "border-l-amber-400",
    order: 4,
  },
};

/* ───────── syarat membuka ───────── */

export type Requirement =
  | { kind: "default" }
  | { kind: "level"; level: number }
  | { kind: "achievement"; id: string };

export interface CosmeticContext {
  level: number;
  achievements: Achievement[];
}

export interface RequirementState {
  unlocked: boolean;
  progress: number;
  target: number;
}

export function requirementState(req: Requirement, ctx: CosmeticContext): RequirementState {
  if (req.kind === "default") return { unlocked: true, progress: 1, target: 1 };
  if (req.kind === "level") {
    return {
      unlocked: ctx.level >= req.level,
      progress: Math.min(ctx.level, req.level),
      target: req.level,
    };
  }
  const a = ctx.achievements.find((x) => x.id === req.id);
  return { unlocked: !!a?.done, progress: a?.progress ?? 0, target: a?.target ?? 1 };
}

export function describeRequirement(req: Requirement, ctx: CosmeticContext): string {
  if (req.kind === "default") return "Default";
  if (req.kind === "level") return `Level ${req.level}`;
  const a = ctx.achievements.find((x) => x.id === req.id);
  return a ? `Pencapaian: ${a.title} (${a.desc.replace(/\.$/, "")})` : "Pencapaian khusus";
}

/* ───────── tipe kosmetik ───────── */

export type Anim = "shift" | "pulse";

interface BaseDef {
  id: string;
  name: string;
  rarity: Rarity;
  req: Requirement;
}

export type TitleDef = BaseDef;

export interface FrameDef extends BaseDef {
  colors: string[];
  glow?: string;
  anim?: Anim;
}

export interface BorderDef extends BaseDef {
  colors: string[];
  glow: string;
  anim?: Anim;
}

export type CosmeticKind = "title" | "frame" | "border";

/** Nilai `auto` berarti memakai yang tertinggi sesuai level. */
export const AUTO_ID = "auto";

export interface EquippedCosmetics {
  title: string;
  frame: string;
  border: string;
}

export const DEFAULT_EQUIPPED: EquippedCosmetics = {
  title: AUTO_ID,
  frame: AUTO_ID,
  border: AUTO_ID,
};

/* ───────── julukan ───────── */

function rankRarity(minLevel: number): Rarity {
  if (minLevel <= 3) return "common";
  if (minLevel <= 8) return "uncommon";
  if (minLevel <= 12) return "rare";
  if (minLevel <= 24) return "epic";
  return "legendary";
}

export const TITLES: TitleDef[] = [
  ...RANKS.map(
    (r): TitleDef => ({
      id: `rank-${r.minLevel}`,
      name: r.title,
      rarity: rankRarity(r.minLevel),
      req: { kind: "level", level: r.minLevel },
    }),
  ),
  { id: "t-ep100", name: "Maniak Episode", rarity: "epic", req: { kind: "achievement", id: "ep100" } },
  { id: "t-wl20", name: "Kurator Agung", rarity: "rare", req: { kind: "achievement", id: "wl20" } },
  { id: "t-sub3", name: "Pemburu Rilis", rarity: "uncommon", req: { kind: "achievement", id: "sub3" } },
  { id: "t-day60", name: "Veteran Web", rarity: "epic", req: { kind: "achievement", id: "day60" } },
  { id: "t-done15", name: "Raja Tamat", rarity: "epic", req: { kind: "achievement", id: "done15" } },
  { id: "t-streak60", name: "Penjaga Api", rarity: "legendary", req: { kind: "achievement", id: "streak60" } },
  { id: "t-xp10k", name: "Sang Legenda", rarity: "legendary", req: { kind: "achievement", id: "xp10k" } },
  { id: "t-act250", name: "Sang Abadi", rarity: "legendary", req: { kind: "achievement", id: "act250" } },
  { id: "t-trofi", name: "Kolektor Trofi Agung", rarity: "legendary", req: { kind: "achievement", id: "trofi" } },
  { id: "t-ep1", name: "Langkah Pertama", rarity: "common", req: { kind: "achievement", id: "ep1" } },
  { id: "t-ep25", name: "Penonton Rajin", rarity: "uncommon", req: { kind: "achievement", id: "ep25" } },
  { id: "t-ep50", name: "Penonton Setia", rarity: "rare", req: { kind: "achievement", id: "ep50" } },
  { id: "t-ep200", name: "Pecandu Episode", rarity: "epic", req: { kind: "achievement", id: "ep200" } },
  { id: "t-ep500", name: "Legenda Layar", rarity: "legendary", req: { kind: "achievement", id: "ep500" } },
  { id: "t-an10", name: "Petualang Judul", rarity: "uncommon", req: { kind: "achievement", id: "an10" } },
  { id: "t-an25", name: "Perpustakaan Berjalan", rarity: "rare", req: { kind: "achievement", id: "an25" } },
  { id: "t-an50", name: "Katalog Hidup", rarity: "epic", req: { kind: "achievement", id: "an50" } },
  { id: "t-an100", name: "Ensiklopedia Anime", rarity: "legendary", req: { kind: "achievement", id: "an100" } },
  { id: "t-streak7", name: "Seminggu Penuh", rarity: "uncommon", req: { kind: "achievement", id: "streak7" } },
  { id: "t-streak14", name: "Konsisten", rarity: "rare", req: { kind: "achievement", id: "streak14" } },
  { id: "t-streak30", name: "Sebulan Tanpa Putus", rarity: "epic", req: { kind: "achievement", id: "streak30" } },
  { id: "t-streak100", name: "Seratus Hari", rarity: "legendary", req: { kind: "achievement", id: "streak100" } },
  { id: "t-act10", name: "Betah Nonton", rarity: "uncommon", req: { kind: "achievement", id: "act10" } },
  { id: "t-act50", name: "Penghuni Tetap", rarity: "rare", req: { kind: "achievement", id: "act50" } },
  { id: "t-act100", name: "Warga Abadi", rarity: "epic", req: { kind: "achievement", id: "act100" } },
  { id: "t-act500", name: "Penghuni Abadi", rarity: "legendary", req: { kind: "achievement", id: "act500" } },
  { id: "t-wl5", name: "Kolektor", rarity: "uncommon", req: { kind: "achievement", id: "wl5" } },
  { id: "t-wl50", name: "Perpustakaan Pribadi", rarity: "epic", req: { kind: "achievement", id: "wl50" } },
  { id: "t-done5", name: "Penamat Handal", rarity: "rare", req: { kind: "achievement", id: "done5" } },
  { id: "t-done30", name: "Pemburu Tamat", rarity: "legendary", req: { kind: "achievement", id: "done30" } },
  { id: "t-rate10", name: "Kritikus Tetap", rarity: "rare", req: { kind: "achievement", id: "rate10" } },
  { id: "t-note10", name: "Jurnalis Anime", rarity: "rare", req: { kind: "achievement", id: "note10" } },
  { id: "t-sub10", name: "Radar Rilis", rarity: "rare", req: { kind: "achievement", id: "sub10" } },
  { id: "t-xp5k", name: "Penimbun EXP", rarity: "rare", req: { kind: "achievement", id: "xp5k" } },
  { id: "t-xp25k", name: "Samudra EXP", rarity: "legendary", req: { kind: "achievement", id: "xp25k" } },
  { id: "t-photo", name: "Wajah Baru", rarity: "common", req: { kind: "achievement", id: "photo" } },
  { id: "t-trofi40", name: "Penguasa Trofi", rarity: "legendary", req: { kind: "achievement", id: "trofi40" } },
  { id: "t-trofi60", name: "Raja Trofi", rarity: "legendary", req: { kind: "achievement", id: "trofi60" } },
  { id: "t-trofi100", name: "Maharaja Trofi", rarity: "legendary", req: { kind: "achievement", id: "trofi100" } },
  // Julukan dari pencapaian tambahan (lib/achievement-defs.ts)
  ...EXTRA_ACHIEVEMENT_DEFS.filter((d) => d.julukan).map(
    (d): TitleDef => ({
      id: `t-${d.id}`,
      name: d.julukan as string,
      rarity: d.rarity,
      req: { kind: "achievement", id: d.id },
    }),
  ),
];

/* ───────── frame avatar ───────── */

const RAINBOW = ["#22d3ee", "#a78bfa", "#f472b6", "#fbbf24", "#22d3ee"];

export const FRAMES: FrameDef[] = [
  { id: "none", name: "Tanpa Frame", rarity: "common", req: { kind: "default" }, colors: [] },
  { id: "newcomer", name: "Newcomer Ring", rarity: "common", req: { kind: "level", level: 1 }, colors: ["#a1a1aa", "#d4d4d8"] },
  { id: "bronze", name: "Bronze Ring", rarity: "common", req: { kind: "level", level: 2 }, colors: ["#b45309", "#f59e0b"] },
  { id: "silver", name: "Silver Ring", rarity: "common", req: { kind: "level", level: 3 }, colors: ["#e4e4e7", "#71717a", "#e4e4e7"] },
  { id: "active", name: "Active Pulse", rarity: "uncommon", req: { kind: "level", level: 4 }, colors: ["#34d399", "#10b981"], glow: "#10b981", anim: "pulse" },
  { id: "emerald", name: "Emerald Loop", rarity: "uncommon", req: { kind: "level", level: 6 }, colors: ["#10b981", "#06b6d4", "#10b981"], glow: "#06b6d4", anim: "shift" },
  { id: "sapphire", name: "Sapphire Glow", rarity: "rare", req: { kind: "level", level: 8 }, colors: ["#60a5fa", "#2563eb"], glow: "#3b82f6", anim: "pulse" },
  { id: "sunburst", name: "Sunburst Gold", rarity: "epic", req: { kind: "level", level: 10 }, colors: ["#fde047", "#f59e0b", "#fde047"], glow: "#f59e0b", anim: "shift" },
  { id: "aurora", name: "Aurora Prisma", rarity: "epic", req: { kind: "level", level: 15 }, colors: ["#22d3ee", "#a78bfa", "#f472b6", "#22d3ee"], glow: "#a78bfa", anim: "shift" },
  { id: "hokage", name: "Hokage Crimson", rarity: "legendary", req: { kind: "level", level: 20 }, colors: ["#fb7185", "#dc2626", "#f59e0b", "#fb7185"], glow: "#ef4444", anim: "pulse" },
  { id: "celestial", name: "Celestial Ring", rarity: "legendary", req: { kind: "level", level: 35 }, colors: RAINBOW, glow: "#f472b6", anim: "shift" },
  { id: "mint", name: "Mint Halo", rarity: "uncommon", req: { kind: "level", level: 5 }, colors: ["#6ee7b7", "#14b8a6"], glow: "#14b8a6" },
  { id: "violet", name: "Violet Orbit", rarity: "rare", req: { kind: "level", level: 7 }, colors: ["#c4b5fd", "#7c3aed", "#c4b5fd"], glow: "#8b5cf6", anim: "shift" },
  { id: "rose", name: "Rose Quartz", rarity: "rare", req: { kind: "level", level: 9 }, colors: ["#fda4af", "#e11d48"], glow: "#f43f5e", anim: "pulse" },
  { id: "ocean", name: "Ocean Wave", rarity: "rare", req: { kind: "level", level: 12 }, colors: ["#67e8f9", "#0284c7", "#67e8f9"], glow: "#0ea5e9", anim: "shift" },
  { id: "storm", name: "Storm Bolt", rarity: "epic", req: { kind: "level", level: 18 }, colors: ["#fde047", "#6366f1", "#fde047"], glow: "#818cf8", anim: "pulse" },
  { id: "shadow", name: "Shadow Reaper", rarity: "epic", req: { kind: "level", level: 24 }, colors: ["#475569", "#7c3aed", "#0f172a", "#475569"], glow: "#7c3aed", anim: "shift" },
  { id: "goldcrown", name: "Golden Crown", rarity: "legendary", req: { kind: "level", level: 28 }, colors: ["#fef08a", "#eab308", "#a16207", "#fef08a"], glow: "#eab308", anim: "shift" },
  { id: "isekai", name: "Isekai Portal", rarity: "legendary", req: { kind: "level", level: 32 }, colors: ["#22d3ee", "#3b82f6", "#a855f7", "#22d3ee"], glow: "#3b82f6", anim: "shift" },
  { id: "legend", name: "Legend Flare", rarity: "legendary", req: { kind: "level", level: 40 }, colors: ["#fbbf24", "#f43f5e", "#a855f7", "#fbbf24"], glow: "#f43f5e", anim: "pulse" },
  { id: "multiverse", name: "Multiverse Rift", rarity: "legendary", req: { kind: "level", level: 50 }, colors: RAINBOW, glow: "#22d3ee", anim: "shift" },
  { id: "marathon", name: "Marathon Neon", rarity: "epic", req: { kind: "achievement", id: "ep200" }, colors: ["#22d3ee", "#e879f9", "#22d3ee"], glow: "#22d3ee", anim: "shift" },
  { id: "catalog", name: "Catalog Prism", rarity: "epic", req: { kind: "achievement", id: "an50" }, colors: ["#34d399", "#60a5fa", "#a78bfa", "#34d399"], glow: "#60a5fa", anim: "shift" },
  { id: "devoted", name: "Devoted Ember", rarity: "epic", req: { kind: "achievement", id: "streak30" }, colors: ["#fb923c", "#dc2626", "#fb923c"], glow: "#f97316", anim: "pulse" },
  { id: "photo", name: "Polaroid", rarity: "common", req: { kind: "achievement", id: "photo" }, colors: ["#fafafa", "#a1a1aa", "#fafafa"], glow: "#d4d4d8" },
  { id: "flame", name: "Flame Keeper", rarity: "legendary", req: { kind: "achievement", id: "streak60" }, colors: ["#f97316", "#ef4444", "#fbbf24", "#f97316"], glow: "#f97316", anim: "pulse" },
  { id: "trophy", name: "Trophy Aurora", rarity: "legendary", req: { kind: "achievement", id: "trofi" }, colors: RAINBOW, glow: "#a78bfa", anim: "shift" },
];

/* frame tambahan untuk level tinggi (di atas 50) */

const EXTRA_FRAME_NAMES: Record<number, string> = {
  60: "Dimension Ring",
  70: "Emperor Crest",
  80: "Sensei Halo",
  90: "Yonko Storm",
  100: "Centurion Blaze",
  150: "Archmage Sigil",
  200: "Titan Forge",
  300: "War God Flare",
  500: "Demigod Radiance",
  750: "Cosmos Blueprint",
  1000: "Millennium Gate",
  2000: "Genesis Spark",
  3000: "Reality Weave",
  5000: "Absolute Form",
  7500: "Multiverse Gate",
  9999: "Supreme Deity",
};

for (const [lv, name] of Object.entries(EXTRA_FRAME_NAMES)) {
  const level = Number(lv);
  const hue = (level * 53) % 360;
  const c1 = `hsl(${hue} 90% 65%)`;
  const c2 = `hsl(${(hue + 50) % 360} 85% 52%)`;
  const c3 = `hsl(${(hue + 100) % 360} 90% 62%)`;
  FRAMES.push({
    id: `f-lv${level}`,
    name,
    rarity: "legendary",
    req: { kind: "level", level },
    colors: [c1, c2, c3, c1],
    glow: c2,
    anim: level % 2 === 0 ? "shift" : "pulse",
  });
}

/* ───────── border profil ───────── */

export const BORDERS: BorderDef[] = [
  { id: "b-lv1", name: "Kertas Polos", rarity: "common", req: { kind: "level", level: 1 }, colors: ["#52525b", "#71717a"], glow: "#71717a" },
  { id: "b-lv2", name: "Perunggu Tua", rarity: "common", req: { kind: "level", level: 2 }, colors: ["#b45309", "#d97706"], glow: "#d97706" },
  { id: "b-lv3", name: "Perak Murni", rarity: "common", req: { kind: "level", level: 3 }, colors: ["#e4e4e7", "#a1a1aa", "#e4e4e7"], glow: "#d4d4d8" },
  { id: "b-lv4", name: "Hijau Rimba", rarity: "uncommon", req: { kind: "level", level: 4 }, colors: ["#22c55e", "#15803d"], glow: "#22c55e" },
  { id: "b-lv5", name: "Biru Samudra", rarity: "uncommon", req: { kind: "level", level: 5 }, colors: ["#38bdf8", "#1d4ed8"], glow: "#3b82f6" },
  { id: "b-lv6", name: "Teal Lagoon", rarity: "rare", req: { kind: "level", level: 6 }, colors: ["#2dd4bf", "#0891b2", "#2dd4bf"], glow: "#14b8a6", anim: "shift" },
  { id: "b-lv7", name: "Ungu Senja", rarity: "rare", req: { kind: "level", level: 7 }, colors: ["#c084fc", "#7c3aed", "#c084fc"], glow: "#a855f7", anim: "shift" },
  { id: "b-lv8", name: "Crimson Blood Moon", rarity: "epic", req: { kind: "level", level: 8 }, colors: ["#fb7185", "#be123c"], glow: "#e11d48", anim: "pulse" },
  { id: "b-lv9", name: "Royal Amethyst", rarity: "epic", req: { kind: "level", level: 9 }, colors: ["#a78bfa", "#6d28d9", "#e879f9"], glow: "#8b5cf6", anim: "pulse" },
  { id: "b-lv10", name: "Dragon Flame", rarity: "epic", req: { kind: "level", level: 10 }, colors: ["#fde047", "#f97316", "#fde047"], glow: "#f59e0b", anim: "shift" },
  { id: "b-lv15", name: "Aurora Borealis", rarity: "legendary", req: { kind: "level", level: 15 }, colors: ["#34d399", "#22d3ee", "#a78bfa", "#34d399"], glow: "#22d3ee", anim: "shift" },
  { id: "b-lv20", name: "Hokage Inferno", rarity: "legendary", req: { kind: "level", level: 20 }, colors: ["#fb7185", "#dc2626", "#f59e0b", "#fb7185"], glow: "#ef4444", anim: "pulse" },
  { id: "b-lv28", name: "Sepuh Emas", rarity: "legendary", req: { kind: "level", level: 28 }, colors: ["#fef08a", "#eab308", "#a16207", "#fef08a"], glow: "#eab308", anim: "shift" },
  { id: "b-lv35", name: "Dewa Prisma", rarity: "legendary", req: { kind: "level", level: 35 }, colors: RAINBOW, glow: "#f472b6", anim: "shift" },
  { id: "b-ink", name: "Gulungan Tinta", rarity: "epic", req: { kind: "achievement", id: "ep100" }, colors: ["#e7e5e4", "#57534e", "#e7e5e4"], glow: "#a8a29e" },
  { id: "b-neon", name: "Neon Maraton", rarity: "epic", req: { kind: "achievement", id: "act50" }, colors: ["#22d3ee", "#e879f9", "#22d3ee"], glow: "#22d3ee", anim: "shift" },
  { id: "b-flame", name: "Api Abadi", rarity: "epic", req: { kind: "achievement", id: "streak30" }, colors: ["#f97316", "#ef4444", "#fbbf24", "#f97316"], glow: "#f97316", anim: "pulse" },
];

/* border tambahan untuk level yang belum punya, supaya hampir tiap level terasa berbeda */

const EXTRA_BORDER_NAMES: Record<number, string> = {
  11: "Matahari Terbit",
  12: "Zamrud Dalam",
  13: "Langit Senja",
  14: "Sakura Gugur",
  16: "Kristal Es",
  17: "Petir Biru",
  18: "Lava Mengalir",
  19: "Gerhana Ungu",
  21: "Taman Neon",
  22: "Fajar Samudra",
  23: "Bara Hitam",
  24: "Jubah Shinigami",
  25: "Perak Bulan",
  26: "Zirah Naga",
  27: "Mawar Langit",
  29: "Cahaya Suci",
  30: "Singgasana Emas",
  31: "Nebula Jingga",
  32: "Gerbang Isekai",
  33: "Kilat Merah",
  34: "Bintang Jatuh",
  36: "Aurora Kosmik",
  37: "Samudra Galaksi",
  38: "Api Biru Abadi",
  39: "Mahkota Bintang",
  40: "Legenda Hidup",
  45: "Retakan Dimensi",
  50: "Penguasa Multiverse",
  60: "Gerbang Dimensi",
  70: "Mahkota Kaisar",
  80: "Aura Sensei",
  90: "Badai Yonko",
  100: "Seratus Cahaya",
  125: "Portal Isekai Agung",
  150: "Lingkaran Archmage",
  200: "Zirah Titan",
  250: "Fajar Tanpa Tidur",
  300: "Murka Dewa Perang",
  400: "Singgasana Langit",
  500: "Bara Setengah Dewa",
  600: "Gulungan Kronik",
  750: "Cetak Biru Semesta",
  900: "Jam Pasir Maharaja",
  1000: "Gerbang Seribu",
  1250: "Pusaran Galaksi",
  1500: "Nadi Kosmik",
  2000: "Percikan Penciptaan",
  2500: "Benang Takdir",
  3000: "Kendali Realitas",
  4000: "Takhta di Atas Dewa",
  5000: "Wujud Tanpa Batas",
  6000: "Lingkar Omni",
  7500: "Gerbang Multiverse",
  9000: "Singgasana Terakhir",
  9999: "Dewa Tertinggi",
};

const EXTRA_BORDERS: BorderDef[] = Object.entries(EXTRA_BORDER_NAMES).map(([lv, name]) => {
  const level = Number(lv);
  const hue = (level * 47) % 360;
  const c1 = `hsl(${hue} 85% 62%)`;
  const c2 = `hsl(${(hue + 40) % 360} 80% 48%)`;
  const c3 = `hsl(${(hue + 80) % 360} 85% 60%)`;
  return {
    id: `b-lv${level}`,
    name,
    rarity: level <= 20 ? "epic" : "legendary",
    req: { kind: "level", level },
    colors: [c1, c2, c3, c1],
    glow: c2,
    anim: level % 2 === 0 ? "shift" : "pulse",
  } satisfies BorderDef;
});

for (const b of EXTRA_BORDERS) {
  // Jangan menimpa border yang sudah ditulis manual (b-lv15, b-lv20, b-lv28, b-lv35, dst).
  if (!BORDERS.some((x) => x.id === b.id)) BORDERS.push(b);
}
BORDERS.sort((a, b) => {
  const la = a.req.kind === "level" ? a.req.level : 1000;
  const lb = b.req.kind === "level" ? b.req.level : 1000;
  return la - lb;
});

/* ───────── pemilihan item yang dipakai ───────── */

type AnyDef = TitleDef | FrameDef | BorderDef;

/** Item bertipe level tertinggi yang sudah terbuka. */
function autoPick<T extends AnyDef>(list: T[], ctx: CosmeticContext): T {
  const byLevel = list
    .filter((d): d is T & { req: { kind: "level"; level: number } } => d.req.kind === "level")
    .sort((a, b) => a.req.level - b.req.level);
  let picked: T | undefined;
  for (const d of byLevel) {
    if (requirementState(d.req, ctx).unlocked) picked = d;
  }
  return picked ?? (list[0] as T);
}

/**
 * `trust` dipakai komponen yang tidak punya data pencapaian (misalnya header):
 * pilihan tersimpan dianggap sudah divalidasi saat dipasang di halaman profil.
 */
function resolve<T extends AnyDef>(list: T[], id: string, ctx: CosmeticContext, trust = false): T {
  if (id !== AUTO_ID) {
    const found = list.find((d) => d.id === id);
    if (found && (trust || requirementState(found.req, ctx).unlocked)) return found;
  }
  return autoPick(list, ctx);
}

export const resolveTitle = (id: string, ctx: CosmeticContext, trust = false) =>
  resolve(TITLES, id, ctx, trust);
export const resolveFrame = (id: string, ctx: CosmeticContext, trust = false) =>
  resolve(FRAMES, id, ctx, trust);
export const resolveBorder = (id: string, ctx: CosmeticContext, trust = false) =>
  resolve(BORDERS, id, ctx, trust);

/** Border level berikutnya yang belum terbuka, untuk teaser di kartu level. */
export function nextLevelBorder(level: number): BorderDef | null {
  const next = BORDERS.filter((b) => b.req.kind === "level" && b.req.level > level).sort(
    (a, b) =>
      (a.req.kind === "level" ? a.req.level : 0) - (b.req.kind === "level" ? b.req.level : 0),
  )[0];
  return next ?? null;
}

/* ───────── gaya visual ───────── */

export function animClass(anim?: Anim): string {
  if (anim === "shift") return "cosmetic-anim-shift";
  if (anim === "pulse") return "cosmetic-anim-pulse";
  return "";
}

function gradient(colors: string[], angle = 135): string | undefined {
  if (colors.length === 0) return undefined;
  if (colors.length === 1) return colors[0];
  return `linear-gradient(${angle}deg, ${colors.join(", ")})`;
}

export function frameStyle(def: Pick<FrameDef, "colors" | "glow" | "anim">): CSSProperties {
  const bg = gradient(def.colors);
  return {
    background: bg ?? "transparent",
    backgroundSize: def.anim === "shift" ? "250% 250%" : undefined,
    ["--cosmetic-glow" as string]: def.glow ?? "transparent",
    boxShadow: def.glow && def.anim !== "pulse" ? `0 0 14px -2px ${def.glow}` : undefined,
  } as CSSProperties;
}

export function borderStyle(def: Pick<BorderDef, "colors" | "glow" | "anim">): CSSProperties {
  return {
    background: gradient(def.colors),
    backgroundSize: def.anim === "shift" ? "250% 250%" : undefined,
    ["--cosmetic-glow" as string]: def.glow,
    boxShadow: def.anim !== "pulse" ? `0 0 22px -6px ${def.glow}` : undefined,
  } as CSSProperties;
}
