// Daftar pencapaian tambahan. Sengaja tanpa impor lain supaya bisa dipakai missions.ts
// dan cosmetics.ts sekaligus tanpa membuat circular import.
// Untuk menambah pencapaian baru, cukup tambah satu baris di tabel yang sesuai di bawah.

export type MetricKey =
  | "level"
  | "streak"
  | "episodes"
  | "animeWatched"
  | "watchlist"
  | "completed"
  | "activeSec"
  | "activeDays"
  | "totalExp"
  | "rated"
  | "noted"
  | "subscriptions";

export type DefRarity = "common" | "uncommon" | "rare" | "epic" | "legendary";
export type DefCategory = "tonton" | "rutin" | "level" | "koleksi" | "lainnya";

export interface ExtraAchievementDef {
  id: string;
  title: string;
  desc: string;
  category: DefCategory;
  rarity: DefRarity;
  metric: MetricKey;
  target: number;
  /** Tampilkan progres dalam jam (target disimpan dalam detik). */
  hours?: boolean;
  /** Julukan yang terbuka dari pencapaian ini. Kosong = tidak ada julukan baru. */
  julukan?: string;
}

const fmt = (n: number) => n.toLocaleString("id-ID");

function rarityByIndex(i: number, total: number): DefRarity {
  const r = i / Math.max(1, total - 1);
  if (r < 0.2) return "rare";
  if (r < 0.6) return "epic";
  return "legendary";
}

type Row = [target: number, title: string, julukan?: string];

function table(
  prefix: string,
  metric: MetricKey,
  category: DefCategory,
  descOf: (target: number) => string,
  rows: Row[],
  opts: { hours?: boolean; idOf?: (t: number) => string } = {},
): ExtraAchievementDef[] {
  return rows.map(([target, title, julukan], i) => ({
    id: opts.idOf ? opts.idOf(target) : `${prefix}${target}`,
    title,
    desc: descOf(target),
    category,
    rarity: rarityByIndex(i, rows.length),
    metric,
    target: opts.hours ? target * 3600 : target,
    ...(opts.hours ? { hours: true } : {}),
    ...(julukan ? { julukan } : {}),
  }));
}

const levelRows: Row[] = [
  [30, "Sesepuh Wibu"],
  [40, "Legenda Hidup"],
  [60, "Pengembara Dimensi"],
  [70, "Kaisar Otaku"],
  [80, "Sensei Agung"],
  [90, "Yonko Anime"],
  [100, "Centurion Wibu"],
  [150, "Archmage Maraton"],
  [200, "Titan Streaming"],
  [250, "Pahlawan Tanpa Tidur"],
  [300, "Dewa Perang Episode"],
  [400, "Kaisar Langit"],
  [500, "Setengah Dewa Anime"],
  [750, "Arsitek Alam Semesta"],
  [1000, "Transenden Seribu"],
  [1500, "Entitas Kosmik"],
  [2000, "Pencipta Dunia Baru"],
  [3000, "Pengendali Realitas"],
  [5000, "Wujud Absolut"],
  [7500, "Pencipta Multiverse"],
  [9999, "Dewa Tertinggi Nontonime"],
];

export const EXTRA_ACHIEVEMENT_DEFS: ExtraAchievementDef[] = [
  ...table("lv", "level", "level", (t) => `Capai level ${fmt(t)}.`, levelRows),
  ...table("ep", "episodes", "tonton", (t) => `Tonton ${fmt(t)} episode.`, [
    [300, "Tiga Ratus Episode", "Pelahap Episode"],
    [750, "Hampir Seribu", "Penjelajah Waktu"],
    [2000, "Dua Ribu Episode", "Tak Kenal Lelah"],
    [3000, "Tiga Ribu Episode", "Rekor Dunia Wibu"],
    [5000, "Lima Ribu Episode", "Penghuni Layar"],
  ]),
  ...table("an", "animeWatched", "tonton", (t) => `Tonton ${fmt(t)} judul anime berbeda.`, [
    [75, "Tujuh Puluh Lima Judul", "Kolektor Judul"],
    [150, "Seratus Lima Puluh Judul", "Arsip Berjalan"],
    [200, "Dua Ratus Judul", "Penjaga Katalog"],
    [300, "Tiga Ratus Judul", "Perpustakaan Raksasa"],
  ]),
  ...table("streak", "streak", "rutin", (t) => `Streak absen ${fmt(t)} hari.`, [
    [45, "Empat Puluh Lima Hari", "Disiplin Baja"],
    [90, "Sembilan Puluh Hari", "Tiga Bulan Tanpa Putus"],
    [150, "Seratus Lima Puluh Hari", "Api Tak Padam"],
    [200, "Dua Ratus Hari", "Dua Ratus Matahari"],
    [365, "Setahun Penuh", "Setahun Tanpa Putus"],
    [500, "Lima Ratus Hari", "Penjaga Waktu"],
    [1000, "Seribu Hari", "Abadi di Kalender"],
  ]),
  ...table(
    "act",
    "activeSec",
    "rutin",
    (t) => `Kumpulkan ${fmt(t)} jam waktu aktif.`,
    [
      [25, "Dua Puluh Lima Jam", "Penghuni Sementara"],
      [150, "Seratus Lima Puluh Jam", "Warga Senior"],
      [750, "Tujuh Ratus Lima Puluh Jam", "Penjaga Layar"],
      [1000, "Seribu Jam", "Seribu Jam Bersama"],
      [2500, "Dua Ribu Lima Ratus Jam", "Roh Penghuni"],
    ],
    { hours: true },
  ),
  ...table("day", "activeDays", "rutin", (t) => `Aktif di ${fmt(t)} hari berbeda.`, [
    [21, "Tiga Minggu Bareng", "Teman Lama"],
    [45, "Empat Puluh Lima Hari Bareng", "Langganan Tetap"],
    [150, "Seratus Lima Puluh Hari Bareng", "Sahabat Web"],
    [200, "Dua Ratus Hari Bareng", "Keluarga Nontonime"],
    [365, "Setahun Bareng", "Sahabat Setahun"],
    [500, "Lima Ratus Hari Bareng", "Sesepuh Komunitas"],
    [730, "Dua Tahun Bareng", "Sahabat Dua Tahun"],
  ]),
  ...table(
    "xp",
    "totalExp",
    "level",
    (t) => `Kumpulkan total ${fmt(t)} EXP.`,
    [
      [50000, "Lima Puluh Ribu EXP", "Gudang EXP"],
      [100000, "Seratus Ribu EXP", "Bendungan EXP"],
      [250000, "Dua Ratus Lima Puluh Ribu EXP", "Gunung EXP"],
      [500000, "Lima Ratus Ribu EXP", "Lautan Tanpa Dasar"],
      [1000000, "Sejuta EXP", "Jutawan EXP"],
      [5000000, "Lima Juta EXP", "Miliarder Bintang"],
      [10000000, "Sepuluh Juta EXP", "Raja EXP"],
    ],
    {
      idOf: (t) =>
        t >= 1000000 ? `xp${t / 1000000}m` : `xp${t / 1000}k`,
    },
  ),
  ...table("wl", "watchlist", "koleksi", (t) => `Simpan ${fmt(t)} anime di watchlist.`, [
    [100, "Seratus Watchlist", "Kurator Utama"],
    [200, "Dua Ratus Watchlist", "Penjaga Rak"],
    [500, "Lima Ratus Watchlist", "Pustakawan Agung"],
  ]),
  ...table("done", "completed", "koleksi", (t) => `Selesaikan ${fmt(t)} anime.`, [
    [50, "Lima Puluh Tamat", "Pembasmi Tamat"],
    [75, "Tujuh Puluh Lima Tamat", "Penutup Cerita"],
    [100, "Seratus Tamat", "Penamat Legendaris"],
    [200, "Dua Ratus Tamat", "Penakluk Ending"],
  ]),
  ...table("rate", "rated", "koleksi", (t) => `Beri rating pada ${fmt(t)} anime.`, [
    [25, "Penilai Andal", "Juri Anime"],
    [50, "Penilai Handal", "Kritikus Senior"],
    [100, "Penilai Agung", "Hakim Agung Anime"],
  ]),
  ...table("note", "noted", "koleksi", (t) => `Tulis catatan pada ${fmt(t)} anime.`, [
    [25, "Penulis Catatan", "Pencatat Setia"],
    [50, "Penulis Tekun", "Penulis Jurnal"],
    [100, "Penulis Agung", "Penjaga Arsip"],
  ]),
  ...table(
    "sub",
    "subscriptions",
    "lainnya",
    (t) => `Subscribe ${fmt(t)} anime untuk notifikasi rilis.`,
    [
      [25, "Pengintai Rilis", "Menara Pengawas"],
      [50, "Pengintai Agung", "Penjaga Jadwal"],
    ],
  ),
];
