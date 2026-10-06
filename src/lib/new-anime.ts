import type { AnimeSummary } from "./anime-types";

/**
 * Deteksi anime baru dan episode baru di beranda.
 * Cara kerja: tiap kali data beranda dimuat, daftar anime dibandingkan dengan
 * catatan terakhir di perangkat ini.
 *  - id yang belum pernah dicatat   -> "anime"   (anime baru muncul)
 *  - jumlah episode naik             -> "episode" (episode baru rilis)
 * Pemuatan pertama hanya membuat catatan awal supaya pengguna baru tidak dibanjiri notifikasi.
 */

const SEEN_KEY = "nonton-seen-anime-v1";
const FEED_KEY = "nonton-new-anime-feed-v1";
const FEED_EVENT = "new-anime-feed-changed";
const MAX_SEEN = 600;
const MAX_FEED = 40;

export interface NewAnimeEntry {
  /** unik per kejadian: `${kind}:${animeId}:${episodeCount}` */
  key: string;
  kind: "anime" | "episode";
  animeId: string;
  title: string;
  poster: string | null;
  episodeCount: number | null;
  detectedAt: number;
  read: boolean;
}

type SeenMap = Record<string, number>; // animeId -> episodeCount terakhir (0 jika tidak diketahui)

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // penyimpanan penuh atau tidak tersedia, abaikan
  }
}

export function readNewAnimeFeed(): NewAnimeEntry[] {
  const list = readJson<NewAnimeEntry[]>(FEED_KEY, []);
  return Array.isArray(list) ? list : [];
}

export function getUnreadNewAnimeCount(): number {
  return readNewAnimeFeed().filter((e) => !e.read).length;
}

export function markNewAnimeRead(key?: string) {
  if (typeof window === "undefined") return;
  const next = readNewAnimeFeed().map((e) => (!key || e.key === key ? { ...e, read: true } : e));
  writeJson(FEED_KEY, next);
  window.dispatchEvent(new Event(FEED_EVENT));
}

export function clearNewAnimeFeed() {
  if (typeof window === "undefined") return;
  writeJson(FEED_KEY, []);
  window.dispatchEvent(new Event(FEED_EVENT));
}

export function onNewAnimeFeedChange(handler: () => void) {
  window.addEventListener(FEED_EVENT, handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener(FEED_EVENT, handler);
    window.removeEventListener("storage", handler);
  };
}

/** Bandingkan daftar terbaru dengan catatan lama. Mengembalikan kejadian baru (kosong saat pemuatan pertama). */
export function detectNewAnime(items: AnimeSummary[]): NewAnimeEntry[] {
  if (typeof window === "undefined" || items.length === 0) return [];

  const rawSeen = window.localStorage.getItem(SEEN_KEY);
  const firstRun = rawSeen === null;
  const seen = readJson<SeenMap>(SEEN_KEY, {});
  const found: NewAnimeEntry[] = [];
  const now = Date.now();

  for (const item of items) {
    const count = Number(item.episodeCount) || 0;
    const prev = seen[item.id];

    if (prev === undefined) {
      if (!firstRun) {
        found.push({
          key: `anime:${item.id}:${count}`,
          kind: "anime",
          animeId: item.id,
          title: item.title,
          poster: item.poster,
          episodeCount: count || null,
          detectedAt: now,
          read: false,
        });
      }
    } else if (count > prev && prev > 0) {
      found.push({
        key: `episode:${item.id}:${count}`,
        kind: "episode",
        animeId: item.id,
        title: item.title,
        poster: item.poster,
        episodeCount: count,
        detectedAt: now,
        read: false,
      });
    }
    seen[item.id] = Math.max(count, prev ?? 0);
  }

  // batasi ukuran catatan: buang id paling lama (urutan insert objek)
  const ids = Object.keys(seen);
  if (ids.length > MAX_SEEN) {
    for (const id of ids.slice(0, ids.length - MAX_SEEN)) delete seen[id];
  }
  writeJson(SEEN_KEY, seen);

  if (found.length > 0) {
    const existing = readNewAnimeFeed();
    const known = new Set(existing.map((e) => e.key));
    const fresh = found.filter((e) => !known.has(e.key));
    if (fresh.length > 0) {
      writeJson(FEED_KEY, [...fresh, ...existing].slice(0, MAX_FEED));
      window.dispatchEvent(new Event(FEED_EVENT));
    }
    return fresh;
  }
  return [];
}
