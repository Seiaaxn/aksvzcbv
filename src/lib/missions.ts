import { addExp } from "./gamification";
import { dayKey, startOfWeek } from "./active-time";
import type { Rarity } from "./cosmetics";
import { EXTRA_ACHIEVEMENT_DEFS } from "./achievement-defs";

export interface Mission {
  id: string;
  title: string;
  desc: string;
  /** EXP tambahan saat selesai. null = hadiah sudah diberikan oleh fitur lain. */
  reward: number | null;
  progress: number;
  target: number;
  /** Misi tambahan: tetap memberi hadiah sendiri, tapi tidak dihitung untuk Bonus Semua Misi. */
  extra?: boolean;
}

export interface DailyInput {
  checkedIn: boolean;
  todaySec: number;
  episodesToday: number;
}

export interface WeeklyInput {
  weekActiveDays: number;
  weekSec: number;
  episodesWeek: number;
}

export const DAILY_BONUS = 20;

export function buildDailyMissions(i: DailyInput): Mission[] {
  return [
    {
      id: "absen",
      title: "Absen Harian",
      desc: "Klaim hadiah login harian.",
      reward: null,
      progress: i.checkedIn ? 1 : 0,
      target: 1,
    },
    {
      id: "aktif30",
      title: "Aktif 30 Menit",
      desc: "Habiskan 30 menit aktif di Nontonime hari ini.",
      reward: 15,
      progress: Math.min(30, Math.floor(i.todaySec / 60)),
      target: 30,
    },
    {
      id: "aktif15",
      title: "Mampir 15 Menit",
      desc: "Habiskan 15 menit aktif di Nontonime hari ini.",
      reward: 10,
      progress: Math.min(15, Math.floor(i.todaySec / 60)),
      target: 15,
    },
    {
      id: "episode1",
      title: "Satu Episode",
      desc: "Tonton 1 episode anime hari ini.",
      reward: 10,
      progress: Math.min(1, i.episodesToday),
      target: 1,
    },
    {
      id: "episode3",
      title: "Tiga Episode",
      desc: "Tonton 3 episode anime hari ini.",
      reward: 15,
      progress: Math.min(3, i.episodesToday),
      target: 3,
    },
    {
      id: "aktif60",
      title: "Betah Satu Jam",
      desc: "Habiskan 60 menit aktif di Nontonime hari ini.",
      reward: 25,
      progress: Math.min(60, Math.floor(i.todaySec / 60)),
      target: 60,
    },
    {
      id: "episode5",
      title: "Maraton Lima Episode",
      desc: "Tonton 5 episode anime hari ini.",
      reward: 25,
      progress: Math.min(5, i.episodesToday),
      target: 5,
    },
    {
      id: "aktif5",
      title: "Sapa Dulu",
      desc: "Habiskan 5 menit aktif di Nontonime hari ini.",
      reward: 5,
      progress: Math.min(5, Math.floor(i.todaySec / 60)),
      target: 5,
      extra: true,
    },
    {
      id: "episode8",
      title: "Delapan Episode",
      desc: "Tonton 8 episode anime hari ini.",
      reward: 40,
      progress: Math.min(8, i.episodesToday),
      target: 8,
      extra: true,
    },
    {
      id: "aktif120",
      title: "Dua Jam Penuh",
      desc: "Habiskan 120 menit aktif di Nontonime hari ini.",
      reward: 40,
      progress: Math.min(120, Math.floor(i.todaySec / 60)),
      target: 120,
      extra: true,
    },
    {
      id: "episode12",
      title: "Maraton Dua Belas Episode",
      desc: "Tonton 12 episode anime hari ini.",
      reward: 60,
      progress: Math.min(12, i.episodesToday),
      target: 12,
      extra: true,
    },
    {
      id: "aktif180",
      title: "Tiga Jam Nonstop",
      desc: "Habiskan 180 menit aktif di Nontonime hari ini.",
      reward: 60,
      progress: Math.min(180, Math.floor(i.todaySec / 60)),
      target: 180,
      extra: true,
    },
    {
      id: "episode20",
      title: "Maraton Dua Puluh Episode",
      desc: "Tonton 20 episode anime hari ini.",
      reward: 100,
      progress: Math.min(20, i.episodesToday),
      target: 20,
      extra: true,
    },
  ];
}

export function buildWeeklyMissions(i: WeeklyInput): Mission[] {
  return [
    {
      id: "hari5",
      title: "Aktif 5 Hari",
      desc: "Buka Nontonime di 5 hari berbeda minggu ini.",
      reward: 30,
      progress: Math.min(5, i.weekActiveDays),
      target: 5,
    },
    {
      id: "jam2",
      title: "Dua Jam Aktif",
      desc: "Kumpulkan 2 jam waktu aktif minggu ini.",
      reward: 30,
      progress: Math.min(120, Math.floor(i.weekSec / 60)),
      target: 120,
    },
    {
      id: "hari3",
      title: "Aktif 3 Hari",
      desc: "Buka Nontonime di 3 hari berbeda minggu ini.",
      reward: 20,
      progress: Math.min(3, i.weekActiveDays),
      target: 3,
    },
    {
      id: "episode10",
      title: "Sepuluh Episode",
      desc: "Tonton 10 episode anime minggu ini.",
      reward: 40,
      progress: Math.min(10, i.episodesWeek),
      target: 10,
    },
    {
      id: "hari7",
      title: "Aktif Tujuh Hari",
      desc: "Buka Nontonime setiap hari selama seminggu penuh.",
      reward: 60,
      progress: Math.min(7, i.weekActiveDays),
      target: 7,
    },
    {
      id: "jam5",
      title: "Lima Jam Aktif",
      desc: "Kumpulkan 5 jam waktu aktif minggu ini.",
      reward: 60,
      progress: Math.min(300, Math.floor(i.weekSec / 60)),
      target: 300,
    },
    {
      id: "episode25",
      title: "Dua Puluh Lima Episode",
      desc: "Tonton 25 episode anime minggu ini.",
      reward: 90,
      progress: Math.min(25, i.episodesWeek),
      target: 25,
    },
    {
      id: "hari6",
      title: "Aktif Enam Hari",
      desc: "Buka Nontonime di 6 hari berbeda minggu ini.",
      reward: 45,
      progress: Math.min(6, i.weekActiveDays),
      target: 6,
      extra: true,
    },
    {
      id: "jam3",
      title: "Tiga Jam Aktif",
      desc: "Kumpulkan 3 jam waktu aktif minggu ini.",
      reward: 40,
      progress: Math.min(180, Math.floor(i.weekSec / 60)),
      target: 180,
      extra: true,
    },
    {
      id: "episode15",
      title: "Lima Belas Episode",
      desc: "Tonton 15 episode anime minggu ini.",
      reward: 50,
      progress: Math.min(15, i.episodesWeek),
      target: 15,
      extra: true,
    },
    {
      id: "jam10",
      title: "Sepuluh Jam Aktif",
      desc: "Kumpulkan 10 jam waktu aktif minggu ini.",
      reward: 120,
      progress: Math.min(600, Math.floor(i.weekSec / 60)),
      target: 600,
      extra: true,
    },
    {
      id: "episode50",
      title: "Lima Puluh Episode",
      desc: "Tonton 50 episode anime minggu ini.",
      reward: 150,
      progress: Math.min(50, i.episodesWeek),
      target: 50,
      extra: true,
    },
    {
      id: "jam15",
      title: "Lima Belas Jam Aktif",
      desc: "Kumpulkan 15 jam waktu aktif minggu ini.",
      reward: 180,
      progress: Math.min(900, Math.floor(i.weekSec / 60)),
      target: 900,
      extra: true,
    },
    {
      id: "episode75",
      title: "Tujuh Puluh Lima Episode",
      desc: "Tonton 75 episode anime minggu ini.",
      reward: 220,
      progress: Math.min(75, i.episodesWeek),
      target: 75,
      extra: true,
    },
  ];
}

export function weekKey(): string {
  return dayKey(startOfWeek());
}

const CLAIM_PREFIX = "nonton-mission-claims-v1:";

function readClaims(uid: string): Record<string, true> {
  try {
    return JSON.parse(window.localStorage.getItem(CLAIM_PREFIX + uid) || "{}");
  } catch {
    return {};
  }
}

/** Beri EXP satu kali per periode. Mengembalikan true jika baru diberikan. */
export function claimOnce(uid: string, key: string, amount: number, reason: string): boolean {
  if (typeof window === "undefined" || amount <= 0) return false;
  const claims = readClaims(uid);
  if (claims[key]) return false;
  claims[key] = true;
  // Simpan 40 klaim terakhir saja agar tidak membengkak.
  const keys = Object.keys(claims).slice(-40);
  const trimmed: Record<string, true> = {};
  for (const k of keys) trimmed[k] = true;
  try {
    window.localStorage.setItem(CLAIM_PREFIX + uid, JSON.stringify(trimmed));
  } catch {
    return false;
  }
  addExp(amount, reason);
  return true;
}

export interface AchievementInput {
  level: number;
  streak: number;
  episodes: number;
  /** Jumlah judul anime berbeda di riwayat tonton. */
  animeWatched: number;
  watchlist: number;
  completed: number;
  activeSec: number;
  activeDays: number;
  totalExp: number;
  /** Anime di watchlist yang sudah diberi rating. */
  rated: number;
  /** Anime di watchlist yang punya catatan. */
  noted: number;
  subscriptions: number;
  hasCustomPhoto: boolean;
}

export type AchievementCategory = "tonton" | "rutin" | "level" | "koleksi" | "lainnya";

export const ACHIEVEMENT_CATEGORIES: { id: AchievementCategory; label: string }[] = [
  { id: "tonton", label: "Menonton" },
  { id: "rutin", label: "Rutinitas" },
  { id: "level", label: "Level & EXP" },
  { id: "koleksi", label: "Koleksi" },
  { id: "lainnya", label: "Lainnya" },
];

export interface Achievement {
  id: string;
  title: string;
  desc: string;
  category: AchievementCategory;
  rarity: Rarity;
  done: boolean;
  progress: number;
  target: number;
  /** Teks progres siap tampil, misalnya "3 / 10 jam". */
  progressLabel: string;
}

function mk(
  id: string,
  title: string,
  desc: string,
  category: AchievementCategory,
  rarity: Rarity,
  current: number,
  target: number,
  unit?: { div: number; text: string },
): Achievement {
  const progress = Math.min(current, target);
  const label = unit
    ? `${Math.floor(progress / unit.div)} / ${target / unit.div} ${unit.text}`
    : `${progress.toLocaleString("id-ID")} / ${target.toLocaleString("id-ID")}`;
  return { id, title, desc, category, rarity, done: current >= target, progress, target, progressLabel: label };
}

const HOUR = { div: 3600, text: "jam" };

export function buildAchievements(i: AchievementInput): Achievement[] {
  const list: Achievement[] = [
    // Menonton
    mk("ep1", "Episode Pertama", "Tonton 1 episode.", "tonton", "common", i.episodes, 1),
    mk("ep10", "Maraton Kecil", "Tonton 10 episode.", "tonton", "common", i.episodes, 10),
    mk("ep25", "Penonton Rajin", "Tonton 25 episode.", "tonton", "uncommon", i.episodes, 25),
    mk("ep50", "Penonton Setia", "Tonton 50 episode.", "tonton", "rare", i.episodes, 50),
    mk("ep100", "Maniak Episode", "Tonton 100 episode.", "tonton", "epic", i.episodes, 100),
    mk("an3", "Penjelajah", "Tonton 3 judul anime berbeda.", "tonton", "common", i.animeWatched, 3),
    mk("an10", "Petualang Judul", "Tonton 10 judul anime berbeda.", "tonton", "uncommon", i.animeWatched, 10),
    mk("an25", "Perpustakaan Berjalan", "Tonton 25 judul anime berbeda.", "tonton", "rare", i.animeWatched, 25),
    // Rutinitas
    mk("streak3", "Rajin Absen", "Streak absen 3 hari.", "rutin", "common", i.streak, 3),
    mk("streak7", "Seminggu Penuh", "Streak absen 7 hari.", "rutin", "uncommon", i.streak, 7),
    mk("streak14", "Dua Minggu Konsisten", "Streak absen 14 hari.", "rutin", "rare", i.streak, 14),
    mk("streak30", "Sebulan Tanpa Putus", "Streak absen 30 hari.", "rutin", "epic", i.streak, 30),
    mk("streak60", "Penjaga Api", "Streak absen 60 hari.", "rutin", "legendary", i.streak, 60),
    mk("act1", "Mampir Sebentar", "Kumpulkan 1 jam waktu aktif.", "rutin", "common", i.activeSec, 3600, HOUR),
    mk("act10", "Betah Nonton", "Kumpulkan 10 jam waktu aktif.", "rutin", "uncommon", i.activeSec, 36000, HOUR),
    mk("act50", "Penghuni Tetap", "Kumpulkan 50 jam waktu aktif.", "rutin", "rare", i.activeSec, 180000, HOUR),
    mk("act100", "Warga Abadi", "Kumpulkan 100 jam waktu aktif.", "rutin", "epic", i.activeSec, 360000, HOUR),
    mk("act250", "Sang Abadi", "Kumpulkan 250 jam waktu aktif.", "rutin", "legendary", i.activeSec, 900000, HOUR),
    mk("day7", "Seminggu Bareng", "Aktif di 7 hari berbeda.", "rutin", "common", i.activeDays, 7),
    mk("day30", "Langganan Setia", "Aktif di 30 hari berbeda.", "rutin", "rare", i.activeDays, 30),
    mk("day60", "Veteran Web", "Aktif di 60 hari berbeda.", "rutin", "epic", i.activeDays, 60),
    // Level & EXP
    mk("lv3", "Mulai Naik", "Capai level 3.", "level", "common", i.level, 3),
    mk("lv5", "Naik Kelas", "Capai level 5.", "level", "uncommon", i.level, 5),
    mk("lv10", "Otaku Terampil", "Capai level 10.", "level", "rare", i.level, 10),
    mk("lv15", "Wibu Elit", "Capai level 15.", "level", "epic", i.level, 15),
    mk("lv20", "Hokage Anime", "Capai level 20.", "level", "epic", i.level, 20),
    mk("lv35", "Dewa Anime", "Capai level 35.", "level", "legendary", i.level, 35),
    mk("xp1k", "Pengumpul EXP", "Kumpulkan total 1.000 EXP.", "level", "uncommon", i.totalExp, 1000),
    mk("xp10k", "Sang Legenda", "Kumpulkan total 10.000 EXP.", "level", "legendary", i.totalExp, 10000),
    // Koleksi
    mk("wl1", "Mulai Koleksi", "Simpan 1 anime di watchlist.", "koleksi", "common", i.watchlist, 1),
    mk("wl5", "Kolektor", "Simpan 5 anime di watchlist.", "koleksi", "uncommon", i.watchlist, 5),
    mk("wl20", "Kurator Agung", "Simpan 20 anime di watchlist.", "koleksi", "rare", i.watchlist, 20),
    mk("done1", "Tamat", "Selesaikan 1 anime.", "koleksi", "common", i.completed, 1),
    mk("done5", "Penamat Handal", "Selesaikan 5 anime.", "koleksi", "rare", i.completed, 5),
    mk("done15", "Raja Tamat", "Selesaikan 15 anime.", "koleksi", "epic", i.completed, 15),
    mk("rate3", "Kritikus Pemula", "Beri rating pada 3 anime.", "koleksi", "uncommon", i.rated, 3),
    mk("note3", "Pencatat Rapi", "Tulis catatan pada 3 anime.", "koleksi", "uncommon", i.noted, 3),
    // Lainnya
    mk("sub3", "Pemburu Rilis", "Subscribe 3 anime untuk notifikasi rilis.", "lainnya", "uncommon", i.subscriptions, 3),
    mk("photo", "Wajah Baru", "Pasang foto profil kustom.", "lainnya", "common", i.hasCustomPhoto ? 1 : 0, 1),
    mk("ep200", "Pecandu Episode", "Tonton 200 episode.", "tonton", "epic", i.episodes, 200),
    mk("ep500", "Legenda Layar", "Tonton 500 episode.", "tonton", "legendary", i.episodes, 500),
    mk("ep1000", "Seribu Episode", "Tonton 1.000 episode.", "tonton", "legendary", i.episodes, 1000),
    mk("an50", "Katalog Hidup", "Tonton 50 judul anime berbeda.", "tonton", "epic", i.animeWatched, 50),
    mk("an100", "Ensiklopedia Anime", "Tonton 100 judul anime berbeda.", "tonton", "legendary", i.animeWatched, 100),
    mk("streak100", "Seratus Hari", "Streak absen 100 hari.", "rutin", "legendary", i.streak, 100),
    mk("streak21", "Tiga Minggu Solid", "Streak absen 21 hari.", "rutin", "epic", i.streak, 21),
    mk("act500", "Penghuni Abadi", "Kumpulkan 500 jam waktu aktif.", "rutin", "legendary", i.activeSec, 1800000, HOUR),
    mk("day100", "Seratus Hari Bareng", "Aktif di 100 hari berbeda.", "rutin", "legendary", i.activeDays, 100),
    mk("day14", "Dua Minggu Bareng", "Aktif di 14 hari berbeda.", "rutin", "uncommon", i.activeDays, 14),
    mk("lv7", "Wibu Berkembang", "Capai level 7.", "level", "uncommon", i.level, 7),
    mk("lv12", "Otaku Mapan", "Capai level 12.", "level", "rare", i.level, 12),
    mk("lv25", "Veteran Anime", "Capai level 25.", "level", "epic", i.level, 25),
    mk("lv28", "Wibu Sepuh", "Capai level 28.", "level", "epic", i.level, 28),
    mk("lv50", "Batas Langit", "Capai level 50.", "level", "legendary", i.level, 50),
    mk("xp5k", "Penimbun EXP", "Kumpulkan total 5.000 EXP.", "level", "rare", i.totalExp, 5000),
    mk("xp25k", "Samudra EXP", "Kumpulkan total 25.000 EXP.", "level", "legendary", i.totalExp, 25000),
    mk("wl10", "Rak Penuh", "Simpan 10 anime di watchlist.", "koleksi", "uncommon", i.watchlist, 10),
    mk("wl50", "Perpustakaan Pribadi", "Simpan 50 anime di watchlist.", "koleksi", "epic", i.watchlist, 50),
    mk("done10", "Penamat Sejati", "Selesaikan 10 anime.", "koleksi", "epic", i.completed, 10),
    mk("done30", "Pemburu Tamat", "Selesaikan 30 anime.", "koleksi", "legendary", i.completed, 30),
    mk("rate10", "Kritikus Tetap", "Beri rating pada 10 anime.", "koleksi", "rare", i.rated, 10),
    mk("note10", "Jurnalis Anime", "Tulis catatan pada 10 anime.", "koleksi", "rare", i.noted, 10),
    mk("sub10", "Radar Rilis", "Subscribe 10 anime untuk notifikasi rilis.", "lainnya", "rare", i.subscriptions, 10),
  ];
  for (const d of EXTRA_ACHIEVEMENT_DEFS) {
    list.push(
      mk(d.id, d.title, d.desc, d.category, d.rarity, i[d.metric], d.target, d.hours ? HOUR : undefined),
    );
  }
  const doneCount = list.filter((a) => a.done).length;
  list.push(
    mk("trofi", "Kolektor Trofi Agung", "Selesaikan 20 pencapaian lain.", "lainnya", "legendary", doneCount, 20),
    mk("trofi40", "Penguasa Trofi", "Selesaikan 40 pencapaian lain.", "lainnya", "legendary", doneCount, 40),
    mk("trofi60", "Raja Trofi", "Selesaikan 60 pencapaian lain.", "lainnya", "legendary", doneCount, 60),
    mk("trofi100", "Maharaja Trofi", "Selesaikan 100 pencapaian lain.", "lainnya", "legendary", doneCount, 100),
  );
  return list;
  }
