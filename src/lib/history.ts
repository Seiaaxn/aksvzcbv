import { auth } from "./firebase";

const STORAGE_KEY = "nonton-history-v1";
const MAX_ANIME = 100;

/**
 * Riwayat tontonan disimpan SATU entri per anime (bukan per episode) supaya daftar
 * tidak penuh dengan episode anime yang sama. Entri berisi episode TERAKHIR yang
 * ditonton, plus log semua episode unik yang pernah dibuka beserta waktunya (`episodes`).
 */
export interface HistoryItem {
  /** Episode terakhir yang ditonton (dipakai tombol "Lanjutkan"). */
  episodeId: string;
  animeId: string;
  animeTitle: string;
  episodeTitle: string;
  poster: string;
  watchedAt: number;
  /** Log episode unik yang pernah ditonton untuk anime ini (termasuk episode terakhir). */
  episodes?: HistoryEpisode[];
}

export interface HistoryEpisode {
  id: string;
  at: number;
}

/** Kunci pengelompokan: judul yang dinormalkan, cadangannya animeId. */
export function historyKey(item: Pick<HistoryItem, "animeId" | "animeTitle">): string {
  const title = (item.animeTitle || "")
    .toLowerCase()
    .replace(/\b(sub(title)?\s*indo(nesia)?|nonton|streaming)\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
  return title || item.animeId || "";
}

/** Jumlah episode unik yang pernah ditonton (bukan jumlah entri anime). */
export function countWatchedEpisodes(items: HistoryItem[]): number {
  let total = 0;
  for (const item of items) total += item.episodes?.length ?? 1;
  return total;
}

/** Jumlah episode unik yang ditonton sejak waktu tertentu (untuk misi harian/mingguan). */
export function countEpisodesSince(items: HistoryItem[], since: number): number {
  let total = 0;
  for (const item of items) {
    const log = item.episodes?.length ? item.episodes : [{ id: item.episodeId, at: item.watchedAt }];
    for (const ep of log) if (ep.at >= since) total += 1;
  }
  return total;
}

/**
 * Gabungkan entri lama (satu per episode) maupun baru (satu per anime) menjadi satu entri per anime.
 * Entri terbaru menang untuk episode terakhir/poster; daftar episode digabung tanpa duplikat.
 * Aman dipanggil berulang kali (idempoten) dan dipakai juga saat sinkron dengan Firestore.
 */
export function collapseHistory(items: HistoryItem[]): HistoryItem[] {
  const sorted = [...items]
    .filter((i) => i && i.episodeId)
    .sort((a, b) => b.watchedAt - a.watchedAt);
  const map = new Map<string, HistoryItem>();
  for (const item of sorted) {
    const key = historyKey(item) || item.episodeId;
    const log: HistoryEpisode[] = item.episodes?.length
      ? item.episodes
      : [{ id: item.episodeId, at: item.watchedAt }];
    const existing = map.get(key);
    if (!existing) {
      map.set(key, { ...item, episodes: mergeEpisodes(log) });
      continue;
    }
    existing.episodes = mergeEpisodes([...(existing.episodes ?? []), ...log]);
    if (!existing.poster && item.poster) existing.poster = item.poster;
  }
  return Array.from(map.values()).sort((a, b) => b.watchedAt - a.watchedAt);
}

/** Satu episode hanya dicatat sekali; waktu yang dipakai adalah yang paling baru. */
function mergeEpisodes(log: HistoryEpisode[]): HistoryEpisode[] {
  const byId = new Map<string, number>();
  for (const ep of log) byId.set(ep.id, Math.max(byId.get(ep.id) ?? 0, ep.at));
  return Array.from(byId, ([id, at]) => ({ id, at })).sort((a, b) => b.at - a.at);
}

let cachedHistory: HistoryItem[] | null = null;

function invalidateCache() {
  cachedHistory = null;
}

if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key === STORAGE_KEY) invalidateCache();
  });
}

export function readHistory(): HistoryItem[] {
  if (typeof window === "undefined") return [];
  if (cachedHistory) return cachedHistory;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      cachedHistory = [];
      return [];
    }
    const parsed = JSON.parse(raw) as HistoryItem[];
    // collapseHistory juga merapikan data lama yang masih satu entri per episode.
    const items = Array.isArray(parsed) ? collapseHistory(parsed) : [];
    cachedHistory = items;
    return items;
  } catch {
    cachedHistory = [];
    return [];
  }
}

function write(items: HistoryItem[]) {
  cachedHistory = items;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, MAX_ANIME)));
  window.dispatchEvent(new Event("history-updated"));
}

export function saveHistory(item: HistoryItem) {
  if (typeof window === "undefined" || !auth.currentUser) return;
  // Satu anime = satu entri. Episode baru menggantikan episode terakhir, episode lama ikut tercatat.
  write(collapseHistory([{ ...item, episodes: undefined }, ...readHistory()]));
}

/** Hapus seluruh riwayat anime yang memuat episode ini. */
export function removeHistory(episodeId: string) {
  if (!auth.currentUser) return;
  write(
    readHistory().filter(
      (entry) =>
        entry.episodeId !== episodeId && !(entry.episodes ?? []).some((ep) => ep.id === episodeId),
    ),
  );
}

export function clearHistory() {
  if (!auth.currentUser) return;
  write([]);
}

/** Hapus salinan lokal (dipanggil saat logout agar data tidak bocor ke akun lain). */
export function resetLocalHistory() {
  if (typeof window === "undefined") return;
  invalidateCache();
  window.localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new Event("history-updated"));
}
