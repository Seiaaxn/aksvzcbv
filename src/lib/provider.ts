/**
 * Provider Configuration & Helper.
 * Nontonime punya dua sumber: Otakudesu (utama) dan AnimeIn.
 */
import { useCallback, useSyncExternalStore } from "react";

export type AnimeProvider = "otakudesu" | "animein";

export interface ProviderMeta {
  id: AnimeProvider;
  name: string;
  badge: string;
  shortName: string;
  description: string;
  accentClass: string;
}

export const PROVIDERS: ProviderMeta[] = [
  {
    id: "otakudesu",
    name: "Otakudesu",
    badge: "Otaku",
    shortName: "Otakudesu",
    description:
      "Koleksi anime subtitle Indonesia terlengkap, update rilis harian, dan navigasi episode stabil",
    accentClass: "text-primary bg-primary/10 border-primary/30",
  },
  {
    id: "animein",
    name: "AnimeIn",
    badge: "AnimeIn",
    shortName: "AnimeIn",
    description: "Katalog AnimeIn dengan jadwal tayang mingguan, statistik penonton, dan banyak server",
    accentClass: "text-sky-500 bg-sky-500/10 border-sky-500/30",
  },
];

const EVENT = "provider-updated";
const DEFAULT_PROVIDER: AnimeProvider = "otakudesu";

/**
 * Pemilih sumber sudah dihapus dari UI, jadi daftar anime selalu memulai dari Otakudesu; kalau gagal atau kosong, server otomatis mencoba AnimeIn (lihat withFallback di anime.functions.ts).
 * Pilihan lama di localStorage diabaikan supaya pengguna lama tidak terkunci di AnimeIn.
 */
export function getStoredProvider(): AnimeProvider {
  return DEFAULT_PROVIDER;
}

export function setStoredProvider(provider: AnimeProvider): void {
  if (typeof window === "undefined") return;
  void provider;
  window.dispatchEvent(new Event(EVENT));
}

/**
 * Penyedia dari bentuk ID. ID anime dan episode AnimeIn selalu angka murni,
 * sedangkan slug Otakudesu tidak pernah angka murni. Dengan begitu link yang dibagikan,
 * riwayat tonton, dan watchlist selalu membuka sumber yang benar tanpa bergantung pada pilihan pengguna.
 */
export function providerForId(id: string | null | undefined): AnimeProvider {
  return id && /^\d+$/.test(id) ? "animein" : "otakudesu";
}

function subscribe(cb: () => void) {
  window.addEventListener(EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}

/**
 * Hook provider untuk halaman daftar (beranda, ongoing, tamat, cari, genre, jadwal).
 * Render server dan render pertama di browser selalu memakai provider bawaan supaya hidrasi cocok;
 * setelah itu pilihan tersimpan dipakai.
 */
export function useAnimeProvider() {
  const provider = useSyncExternalStore(subscribe, getStoredProvider, () => DEFAULT_PROVIDER);
  const setProvider = useCallback((p: AnimeProvider) => setStoredProvider(p), []);
  const toggleProvider = useCallback(
    () => setStoredProvider(getStoredProvider() === "animein" ? "otakudesu" : "animein"),
    [],
  );
  const meta = PROVIDERS.find((p) => p.id === provider) ?? (PROVIDERS[0] as ProviderMeta);
  return {
    provider,
    setProvider,
    toggleProvider,
    meta,
    isAnimein: provider === "animein",
    isSamehadaku: false,
    isOtakudesu: provider === "otakudesu",
  };
}
