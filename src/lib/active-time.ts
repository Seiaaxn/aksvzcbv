const PREFIX = "nonton-active-time-v1:";
const KEEP_DAYS = 90;

interface ActiveData {
  total: number; // detik
  days: Record<string, number>; // YYYY-MM-DD (waktu lokal) -> detik
}

let current: { uid: string; data: ActiveData; dirty: boolean } | null = null;

export function dayKey(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Awal minggu (Senin 00:00, waktu lokal). */
export function startOfWeek(d: Date = new Date()): Date {
  const s = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diff = (s.getDay() + 6) % 7;
  s.setDate(s.getDate() - diff);
  return s;
}

function load(uid: string): ActiveData {
  const empty: ActiveData = { total: 0, days: {} };
  if (typeof window === "undefined") return empty;
  try {
    const raw = window.localStorage.getItem(PREFIX + uid);
    if (!raw) return empty;
    const parsed = JSON.parse(raw) as Partial<ActiveData>;
    const days: Record<string, number> = {};
    const limit = dayKey(new Date(Date.now() - KEEP_DAYS * 86400000));
    for (const [k, v] of Object.entries(parsed.days ?? {})) {
      if (k >= limit && typeof v === "number" && v > 0) days[k] = v;
    }
    return { total: Number(parsed.total) || 0, days };
  } catch {
    return empty;
  }
}

function ensure(uid: string) {
  if (!current || current.uid !== uid) {
    current = { uid, data: load(uid), dirty: false };
  }
  return current;
}

function persist() {
  if (!current || !current.dirty || typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PREFIX + current.uid, JSON.stringify(current.data));
  } catch {
    // penyimpanan penuh atau diblokir: abaikan
  }
  current.dirty = false;
}

/** Hitung detik aktif hanya saat tab terlihat. Mengembalikan fungsi pembersih. */
export function startActiveTimeTracking(uid: string): () => void {
  if (typeof window === "undefined") return () => {};
  ensure(uid);

  const tick = window.setInterval(() => {
    if (document.visibilityState !== "visible") return;
    const c = ensure(uid);
    const key = dayKey();
    c.data.total += 1;
    c.data.days[key] = (c.data.days[key] ?? 0) + 1;
    c.dirty = true;
  }, 1000);
  const save = window.setInterval(persist, 5000);
  const onHide = () => {
    if (document.visibilityState === "hidden") persist();
  };
  document.addEventListener("visibilitychange", onHide);
  window.addEventListener("pagehide", persist);

  return () => {
    window.clearInterval(tick);
    window.clearInterval(save);
    document.removeEventListener("visibilitychange", onHide);
    window.removeEventListener("pagehide", persist);
    persist();
  };
}

export interface ActiveSnapshot {
  total: number;
  today: number;
  week: number;
  activeDays: number;
  weekActiveDays: number;
}

export function getActiveSnapshot(uid: string | null | undefined): ActiveSnapshot {
  if (!uid) return { total: 0, today: 0, week: 0, activeDays: 0, weekActiveDays: 0 };
  const { data } = ensure(uid);
  const weekStart = dayKey(startOfWeek());
  let week = 0;
  let weekActiveDays = 0;
  let activeDays = 0;
  for (const [k, v] of Object.entries(data.days)) {
    if (v > 0) activeDays += 1;
    if (k >= weekStart) {
      week += v;
      if (v > 0) weekActiveDays += 1;
    }
  }
  return {
    total: data.total,
    today: data.days[dayKey()] ?? 0,
    week,
    activeDays,
    weekActiveDays,
  };
      }
