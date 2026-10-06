import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Bell, Film, X } from "lucide-react";
import { homeQuery } from "@/lib/queries";
import { useAnimeProvider } from "@/lib/provider";
import { detectNewAnime, markNewAnimeRead, type NewAnimeEntry } from "@/lib/new-anime";
import { isNotificationActive } from "@/lib/notifications";
import { showLocalNotification } from "@/lib/push";
import type { AnimeSummary } from "@/lib/anime-types";

const CHECK_EVERY_MS = 5 * 60 * 1000;
const TOAST_MS = 9000;

function label(entry: NewAnimeEntry) {
  return entry.kind === "episode"
    ? `Episode ${entry.episodeCount ?? "baru"} sudah rilis`
    : "Anime baru ditambahkan";
}

/**
 * Memantau data beranda di latar belakang (tiap 5 menit dan saat tab kembali aktif).
 * Jika ada anime atau episode baru: tampil banner di dalam situs, masuk ke halaman Notifikasi,
 * dan dikirim sebagai notifikasi HP/browser bila pengguna sudah mengaktifkannya.
 */
export function NewAnimeNotifier() {
  const { provider } = useAnimeProvider();
  const [queue, setQueue] = useState<NewAnimeEntry[]>([]);
  const lastSignature = useRef("");

  const { data } = useQuery({
    ...homeQuery(undefined, provider),
    staleTime: CHECK_EVERY_MS / 2,
    refetchInterval: CHECK_EVERY_MS,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
  });

  useEffect(() => {
    if (!data) return;
    const all: AnimeSummary[] = [...data.today, ...data.new, ...data.hot, ...data.slider];
    const unique = Array.from(new Map(all.map((a) => [a.id, a])).values());

    // lewati jika data sama persis dengan pemeriksaan sebelumnya
    const signature = unique.map((a) => `${a.id}:${a.episodeCount ?? 0}`).join("|");
    if (signature === lastSignature.current) return;
    lastSignature.current = signature;

    const fresh = detectNewAnime(unique);
    if (fresh.length === 0) return;

    setQueue((prev) => [...fresh.slice(0, 3), ...prev].slice(0, 3));

    if (isNotificationActive()) {
      if (fresh.length === 1) {
        const [one] = fresh;
        void showLocalNotification(one.title, {
          body: label(one),
          tag: one.key,
          data: { url: `/anime/${one.animeId}` },
        });
      } else {
        void showLocalNotification(`${fresh.length} pembaruan anime baru`, {
          body: fresh
            .slice(0, 3)
            .map((e) => e.title)
            .join(", "),
          tag: "new-anime-batch",
          data: { url: "/notifikasi" },
        });
      }
    }
  }, [data]);

  const current = queue[0];

  useEffect(() => {
    if (!current) return;
    const t = window.setTimeout(() => setQueue((q) => q.slice(1)), TOAST_MS);
    return () => window.clearTimeout(t);
  }, [current]);

  if (!current) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-3 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-50 mx-auto max-w-sm lg:inset-x-auto lg:bottom-6 lg:right-6 lg:mx-0"
    >
      <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 shadow-lg">
        <Link
          to="/anime/$animeId"
          params={{ animeId: current.animeId }}
          onClick={() => {
            markNewAnimeRead(current.key);
            setQueue((q) => q.slice(1));
          }}
          className="flex min-w-0 flex-1 items-center gap-3"
        >
          <span className="relative block h-16 w-11 shrink-0 overflow-hidden rounded-md bg-muted">
            {current.poster ? (
              <img src={current.poster} alt="" className="h-full w-full object-cover" />
            ) : (
              <Film className="m-auto mt-5 h-5 w-5 text-muted-foreground/50" />
            )}
          </span>
          <span className="min-w-0">
            <span className="flex items-center gap-1 text-xs font-semibold text-primary">
              <Bell className="h-3 w-3" />
              {label(current)}
            </span>
            <span className="line-clamp-2 text-sm font-semibold leading-snug text-card-foreground">
              {current.title}
            </span>
          </span>
        </Link>
        <button
          type="button"
          onClick={() => setQueue((q) => q.slice(1))}
          aria-label="Tutup notifikasi"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
