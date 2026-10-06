import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db } from "./firebase";
import { dayKey } from "./active-time";
import { RANKS } from "./ranks";

export { RANKS };

export interface UserGamification {
  level: number;
  exp: number; // current exp in this level
  maxExp: number; // exp needed to reach next level
  totalExp: number;
  rankTitle: string;
  rankBadgeColor: string;
  dailyStreak: number;
  lastCheckIn?: string; // YYYY-MM-DD
}

const STORAGE_KEY = "nonton-gamification-v1";

export function getRankInfo(level: number) {
  let matched = RANKS[0] as (typeof RANKS)[number];
  for (const r of RANKS) {
    if (level >= r.minLevel) {
      matched = r;
    }
  }
  return matched;
}

/**
 * EXP yang dibutuhkan untuk naik dari level N ke level N+1.
 * Indeks 0 = level 1 ke 2, indeks 1 = level 2 ke 3, dan seterusnya.
 * Ubah angka di sini kalau mau menyetel kecepatan naik level.
 */
export const LEVEL_EXP: readonly number[] = [
  150, 200, 260, 330, 410, 500, 600, 710, 830, 960, // level 1 sampai 11
  1100, 1250, 1410, 1580, 1760, 1950, 2150, 2360, 2580, 2810, // level 11 sampai 21
];

/** Dari level 22 sampai 50, tiap level butuh 260 EXP lebih banyak dari level sebelumnya. */
const EXP_STEP_AFTER_TABLE = 260;
/** Mulai level 51 kenaikannya diperhalus jadi 60 EXP per level supaya level 9999 dan seterusnya tetap masuk akal. */
const SOFT_CAP_LEVEL = 50;
const EXP_STEP_AFTER_SOFT_CAP = 60;

/** Level tertinggi yang punya julukan sendiri. Level di atasnya tetap bisa naik tanpa batas. */
export const MAX_NAMED_LEVEL = 9999;

export function getMaxExpForLevel(level: number): number {
  const lv = Math.max(1, Math.floor(level));
  const fromTable = LEVEL_EXP[lv - 1];
  if (fromTable !== undefined) return fromTable;
  const last = LEVEL_EXP[LEVEL_EXP.length - 1] as number;
  if (lv <= SOFT_CAP_LEVEL) return last + (lv - LEVEL_EXP.length) * EXP_STEP_AFTER_TABLE;
  const atSoftCap = last + (SOFT_CAP_LEVEL - LEVEL_EXP.length) * EXP_STEP_AFTER_TABLE;
  return atSoftCap + (lv - SOFT_CAP_LEVEL) * EXP_STEP_AFTER_SOFT_CAP;
}

/**
 * Rapikan data EXP dari penyimpanan (lokal atau Firestore).
 * maxExp selalu dihitung ulang dari tabel, jadi perubahan tabel langsung berlaku untuk semua akun.
 * Level tidak pernah turun; kalau EXP sisa sudah melewati batas level, level dinaikkan.
 */
export function normalizeGamification(
  raw: Partial<UserGamification> | null | undefined,
): UserGamification {
  let level = Math.max(1, Math.floor(raw?.level || 1));
  let exp = Math.max(0, Math.floor(raw?.exp || 0));
  while (exp >= getMaxExpForLevel(level)) {
    exp -= getMaxExpForLevel(level);
    level += 1;
  }
  const rank = getRankInfo(level);
  return {
    level,
    exp,
    maxExp: getMaxExpForLevel(level),
    totalExp: Math.max(0, Math.floor(raw?.totalExp ?? raw?.exp ?? 0)),
    rankTitle: rank.title,
    rankBadgeColor: rank.color,
    dailyStreak: raw?.dailyStreak || 0,
    lastCheckIn: raw?.lastCheckIn,
  };
}

const DEFAULT_GAMIFICATION: UserGamification = {
  level: 1,
  exp: 0,
  maxExp: LEVEL_EXP[0] as number,
  totalExp: 0,
  rankTitle: "Penonton Pemula",
  rankBadgeColor: "from-zinc-500 to-zinc-600",
  dailyStreak: 0,
};

export function readGamification(): UserGamification {
  if (typeof window === "undefined") return DEFAULT_GAMIFICATION;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_GAMIFICATION;
    return normalizeGamification(JSON.parse(raw));
  } catch {
    return DEFAULT_GAMIFICATION;
  }
}

/** Simpan salinan lokal saja (dipakai saat menerima data dari Firestore, agar tidak menulis balik). */
export function cacheGamificationLocally(data: UserGamification) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  window.dispatchEvent(new CustomEvent("gamification-updated", { detail: data }));
}

export function saveGamification(data: UserGamification) {
  if (typeof window === "undefined") return;
  cacheGamificationLocally(data);

  // Sync to Firestore if authenticated
  if (auth.currentUser) {
    const userRef = doc(db, "users", auth.currentUser.uid);
    setDoc(
      userRef,
      {
        gamification: data,
        updatedAt: new Date().toISOString(),
      },
      { merge: true },
    ).catch((err) => {
      console.warn("Failed to sync gamification to Firestore:", err);
    });
  }
}

/** Hapus salinan lokal (dipanggil saat logout agar EXP tidak bocor ke akun lain). */
export function resetLocalGamification() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new CustomEvent("gamification-updated", { detail: DEFAULT_GAMIFICATION }));
}

export async function fetchRemoteGamification(userId: string): Promise<UserGamification | null> {
  try {
    const userRef = doc(db, "users", userId);
    const snap = await getDoc(userRef);
    if (snap.exists()) {
      const data = snap.data();
      if (data?.gamification) {
        return data.gamification as UserGamification;
      }
    }
  } catch (e) {
    console.warn("Could not fetch remote gamification:", e);
  }
  return null;
}

export interface AddExpResult {
  newLevel: number;
  leveledUp: boolean;
  expGained: number;
  reason: string;
}

export function addExp(
  amount: number,
  reason: string,
  opts: { silent?: boolean } = {},
): AddExpResult {
  const current = readGamification();
  // EXP hanya dihitung untuk akun yang sudah login
  if (!auth.currentUser) {
    return { newLevel: current.level, leveledUp: false, expGained: 0, reason };
  }
  let level = current.level;
  let exp = current.exp + amount;
  const totalExp = current.totalExp + amount;
  let leveledUp = false;

  while (exp >= getMaxExpForLevel(level)) {
    exp -= getMaxExpForLevel(level);
    level += 1;
    leveledUp = true;
  }

  const rank = getRankInfo(level);
  const updated: UserGamification = {
    ...current,
    level,
    exp,
    maxExp: getMaxExpForLevel(level),
    totalExp,
    rankTitle: rank.title,
    rankBadgeColor: rank.color,
  };

  saveGamification(updated);

  // Dispatch celebratory event for UI banner
  if (typeof window !== "undefined" && !opts.silent) {
    window.dispatchEvent(
      new CustomEvent("exp-gained", {
        detail: {
          expGained: amount,
          reason,
          leveledUp,
          newLevel: level,
          rankTitle: rank.title,
        },
      }),
    );
  }

  return {
    newLevel: level,
    leveledUp,
    expGained: amount,
    reason,
  };
}

/** EXP absen harian: 60 di hari pertama, naik 10 per hari streak, maksimal 100. */
export function getCheckInReward(streak: number): number {
  return 50 + Math.min(streak * 10, 50);
}

/** Milidetik sampai tengah malam waktu lokal (saat klaim berikutnya terbuka). */
export function msUntilNextClaim(now: Date = new Date()): number {
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  return Math.max(0, next.getTime() - now.getTime());
}

export function formatCountdown(ms: number): string {
  const mins = Math.max(0, Math.ceil(ms / 60000));
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h} jam ${m} menit` : `${m} menit`;
}

/** True jika absen hari ini (tanggal lokal perangkat) sudah diklaim. */
export function hasClaimedToday(g: Pick<UserGamification, "lastCheckIn">): boolean {
  return g.lastCheckIn === dayKey();
}

export interface ClaimResult {
  success: boolean;
  expGained: number;
  message: string;
  streak?: number;
  leveledUp?: boolean;
  newLevel?: number;
  rankTitle?: string;
}

let claiming = false;

export function claimDailyCheckIn(): ClaimResult {
  if (!auth.currentUser) {
    return {
      success: false,
      expGained: 0,
      message: "Masuk ke akun dulu untuk klaim absen harian dan mengumpulkan EXP.",
    };
  }
  if (claiming) {
    return { success: false, expGained: 0, message: "Klaim sedang diproses." };
  }

  const current = readGamification();
  if (hasClaimedToday(current)) {
    return {
      success: false,
      expGained: 0,
      message: `Hadiah hari ini sudah kamu klaim. Klaim berikutnya terbuka besok, ${formatCountdown(msUntilNextClaim())} lagi.`,
    };
  }

  claiming = true;
  try {
    const now = new Date();
    const today = dayKey(now);
    const yesterday = dayKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1));
    const newStreak = current.lastCheckIn === yesterday ? current.dailyStreak + 1 : 1;
    const expReward = getCheckInReward(newStreak);

    // Tandai sudah klaim lebih dulu supaya klik ganda atau dua tab tidak memberi EXP dua kali.
    saveGamification({ ...current, dailyStreak: newStreak, lastCheckIn: today });
    const result = addExp(expReward, `Absen Harian ke-${newStreak}`, { silent: true });
    const rank = getRankInfo(result.newLevel);

    const claim: ClaimResult = {
      success: true,
      expGained: expReward,
      streak: newStreak,
      leveledUp: result.leveledUp,
      newLevel: result.newLevel,
      rankTitle: rank.title,
      message: `Berhasil absen. +${expReward} EXP (streak ${newStreak} hari).`,
    };
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("daily-claimed", { detail: claim }));
    }
    return claim;
  } finally {
    claiming = false;
  }
  }
