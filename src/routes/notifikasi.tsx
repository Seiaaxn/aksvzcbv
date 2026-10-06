import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Bell,
  BellOff,
  Calendar,
  CheckCheck,
  Layers,
  Loader2,
  Send,
  Server,
  Smartphone,
  Sparkles,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Switch } from "@/components/ui/switch";
import {
  clearNewAnimeFeed,
  markNewAnimeRead,
  onNewAnimeFeedChange,
  readNewAnimeFeed,
  type NewAnimeEntry,
} from "@/lib/new-anime";
import { SectionTitle } from "@/components/anime/StateViews";
import {
  RECENT_SITE_UPDATES,
  disablePhoneNotifications,
  enablePhoneNotifications,
  getReadUpdateIds,
  markAllUpdatesAsRead,
  markUpdateAsRead,
  sendTestUpdateNotification,
  type SiteUpdateItem,
} from "@/lib/notifications";
import { getNotificationPref, getPermission } from "@/lib/push";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/notifikasi")({
  head: () => ({
    meta: [
      { title: "Notifikasi & Pembaruan : Nontonime" },
      {
        name: "description",
        content: "Lihat apa saja yang berubah di Nontonime dan atur notifikasi HP & browser kamu.",
      },
      { property: "og:title", content: "Notifikasi & Pembaruan : Nontonime" },
    ],
  }),
  component: NotificationsPage,
});

type Permission = NotificationPermission | "unsupported";
type TagFilter = "semua" | SiteUpdateItem["tag"];

const TAG_META: Record<SiteUpdateItem["tag"], { label: string; icon: typeof Sparkles }> = {
  fitur: { label: "Fitur", icon: Sparkles },
  server: { label: "Server", icon: Server },
  jadwal: { label: "Jadwal", icon: Calendar },
  sistem: { label: "Sistem", icon: Layers },
};

const FILTERS: { key: TagFilter; label: string }[] = [
  { key: "semua", label: "Semua" },
  { key: "fitur", label: "Fitur" },
  { key: "server", label: "Server" },
  { key: "jadwal", label: "Jadwal" },
  { key: "sistem", label: "Sistem" },
];

function NotificationsPage() {
  const [readIds, setReadIds] = useState<string[]>([]);
  const [permission, setPermission] = useState<Permission>("default");
  const [prefOn, setPrefOn] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);
  const [filter, setFilter] = useState<TagFilter>("semua");
  const [feed, setFeed] = useState<NewAnimeEntry[]>([]);

  // Baca dari localStorage/browser hanya di klien agar tidak bentrok saat hydration
  useEffect(() => {
    const sync = () => {
      setReadIds(getReadUpdateIds());
      setPermission(getPermission());
      setPrefOn(getNotificationPref());
    };
    sync();
    window.addEventListener("site-updates-read-changed", sync);
    window.addEventListener("notification-pref-changed", sync);
    return () => {
      window.removeEventListener("site-updates-read-changed", sync);
      window.removeEventListener("notification-pref-changed", sync);
    };
  }, []);

  useEffect(() => {
    const syncFeed = () => setFeed(readNewAnimeFeed());
    syncFeed();
    return onNewAnimeFeedChange(syncFeed);
  }, []);

  const isActive = permission === "granted" && prefOn;
  const isBlocked = permission === "denied";
  const isUnsupported = permission === "unsupported";

  const unreadCount = RECENT_SITE_UPDATES.filter((u) => !readIds.includes(u.id)).length;

  const visibleUpdates = useMemo(
    () => RECENT_SITE_UPDATES.filter((u) => filter === "semua" || u.tag === filter),
    [filter],
  );

  async function handleToggle(next: boolean) {
    if (busy) return;
    setBusy(true);
    setMessage(null);
    try {
      if (next) {
        const res = await enablePhoneNotifications();
        setPermission(res.permission);
        setPrefOn(getNotificationPref());
        setMessage({ text: res.message, ok: res.success });
      } else {
        const res = await disablePhoneNotifications();
        setPrefOn(false);
        setMessage({ text: res.message, ok: res.success });
      }
    } catch {
      setMessage({ text: "Terjadi kesalahan. Coba lagi sebentar lagi.", ok: false });
    } finally {
      setBusy(false);
    }
  }

  async function handleTest() {
    setBusy(true);
    setMessage(null);
    try {
      const sent = await sendTestUpdateNotification();
      setMessage(
        sent
          ? { text: "Notifikasi uji coba terkirim! Cek status bar HP atau laptop kamu.", ok: true }
          : { text: "Notifikasi uji coba gagal dikirim.", ok: false },
      );
    } finally {
      setBusy(false);
    }
  }

  function handleReadAll() {
    markAllUpdatesAsRead();
    setReadIds(RECENT_SITE_UPDATES.map((u) => u.id));
  }

  function handleRead(id: string) {
    markUpdateAsRead(id);
    setReadIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
  }

  const statusText = isUnsupported
    ? "Browser ini tidak mendukung notifikasi web."
    : isBlocked
      ? "Notifikasi diblokir oleh browser atau HP."
      : isActive
        ? "Aktif. Kamu akan menerima info episode terbaru dan pembaruan situs."
        : "Nonaktif. Nyalakan untuk menerima info episode terbaru dan pembaruan situs.";

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <SectionTitle title="Notifikasi & Pembaruan" icon={Bell} />
          <p className="mt-1 text-xs text-muted-foreground">
            Lihat apa saja yang berubah di Nontonime dan atur notifikasi di perangkat ini.
          </p>
        </div>
        {unreadCount > 0 ? (
          <button
            type="button"
            onClick={handleReadAll}
            className="press-soft inline-flex items-center gap-1.5 rounded-full border border-border/80 bg-secondary/60 px-3.5 py-1.5 text-xs font-bold text-foreground transition-colors hover:bg-secondary cursor-pointer"
          >
            <CheckCheck className="h-3.5 w-3.5 text-primary" />
            <span>Tandai semua dibaca</span>
          </button>
        ) : null}
      </div>

      {/* Pengaturan notifikasi */}
      <section className="space-y-3 rounded-xl border border-border/80 bg-card p-5 ">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div
              className={cn(
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                isActive ? "bg-primary/10 text-primary" : "bg-secondary text-muted-foreground",
              )}
            >
              {isActive ? <Smartphone className="h-5 w-5" /> : <BellOff className="h-5 w-5" />}
            </div>
            <div className="space-y-0.5">
              <h3 className="text-sm font-bold text-card-foreground">Notifikasi HP & Browser</h3>
              <p className="text-xs leading-relaxed text-muted-foreground">{statusText}</p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2 pt-1">
            {busy ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> : null}
            <Switch
              id="notifications-switch"
              checked={isActive}
              onCheckedChange={handleToggle}
              disabled={busy || isBlocked || isUnsupported}
              aria-label="Aktifkan atau nonaktifkan notifikasi"
            />
          </div>
        </div>

        {isBlocked ? (
          <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-[11px] leading-relaxed text-amber-700 dark:text-amber-300">
            Untuk mengaktifkan lagi, buka pengaturan situs di browser (ikon gembok di address bar),
            ubah izin Notifikasi menjadi "Izinkan", lalu muat ulang halaman ini.
          </p>
        ) : null}

        {isActive ? (
          <button
            type="button"
            onClick={handleTest}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-secondary px-3.5 py-2 text-xs font-semibold text-foreground transition-colors hover:bg-secondary/80 cursor-pointer disabled:opacity-50"
          >
            <Send className="h-3.5 w-3.5" />
            <span>Kirim tes notifikasi</span>
          </button>
        ) : null}

        {message ? (
          <p
            role="status"
            className={cn(
              "rounded-xl p-2.5 text-[11px]",
              message.ok
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                : "bg-destructive/10 text-destructive",
            )}
          >
            {message.text}
          </p>
        ) : null}
      </section>

      {/* Anime & episode baru */}
      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-display text-lg text-foreground">Anime dan episode baru</h2>
          {feed.length > 0 ? (
            <button
              type="button"
              onClick={() => clearNewAnimeFeed()}
              className="text-xs font-semibold text-muted-foreground hover:text-foreground"
            >
              Hapus semua
            </button>
          ) : null}
        </div>
        {feed.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border p-5 text-center text-sm text-muted-foreground">
            Belum ada anime atau episode baru. Situs memeriksanya otomatis tiap 5 menit selama
            terbuka.
          </p>
        ) : (
          <ul className="divide-y divide-border rounded-xl border border-border bg-card">
            {feed.slice(0, 15).map((entry) => (
              <li key={entry.key}>
                <Link
                  to="/anime/$animeId"
                  params={{ animeId: entry.animeId }}
                  onClick={() => markNewAnimeRead(entry.key)}
                  className="flex items-center gap-3 p-3 transition-colors hover:bg-secondary/60"
                >
                  <span className="block h-14 w-10 shrink-0 overflow-hidden rounded-md bg-muted">
                    {entry.poster ? (
                      <img src={entry.poster} alt="" className="h-full w-full object-cover" />
                    ) : null}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs font-semibold text-primary">
                      {entry.kind === "episode"
                        ? `Episode ${entry.episodeCount ?? "baru"} rilis`
                        : "Anime baru"}
                    </span>
                    <span className="line-clamp-1 text-sm font-semibold text-card-foreground">
                      {entry.title}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Intl.DateTimeFormat("id-ID", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      }).format(new Date(entry.detectedAt))}
                    </span>
                  </span>
                  {!entry.read ? (
                    <span className="h-2 w-2 shrink-0 rounded-full bg-primary" aria-label="Belum dibaca" />
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Log perubahan */}
      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">
            Apa saja yang berubah
          </h2>
          {unreadCount > 0 ? (
            <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-black text-primary-foreground">
              {unreadCount} Baru
            </span>
          ) : null}
        </div>

        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className={cn(
                "shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors cursor-pointer",
                filter === f.key
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border/80 bg-secondary/50 text-foreground hover:bg-secondary",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          {visibleUpdates.map((item) => {
            const isUnread = !readIds.includes(item.id);
            const TagIcon = TAG_META[item.tag].icon;
            return (
              <article
                key={item.id}
                onClick={() => handleRead(item.id)}
                className={cn(
                  "relative cursor-pointer space-y-2 rounded-xl border p-4 transition-colors",
                  isUnread
                    ? "border-primary/50 bg-primary/5"
                    : "border-border/60 bg-card/60 hover:bg-card",
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1 rounded-md border border-border/80 bg-background px-1.5 py-0.5 text-[10px] font-bold text-foreground">
                      <TagIcon className="h-3 w-3 text-primary" />
                      {TAG_META[item.tag].label}
                    </span>
                    <span className="rounded-md bg-secondary px-1.5 py-0.5 text-[10px] font-black text-foreground">
                      {item.version}
                    </span>
                    <span className="text-[10px] text-muted-foreground">{item.date}</span>
                  </div>
                  {isUnread ? (
                    <span className="h-2 w-2 shrink-0 rounded-full bg-primary ring-4 ring-primary/20" />
                  ) : null}
                </div>

                <h3 className="font-display text-sm text-foreground">{item.title}</h3>
                <p className="text-xs leading-relaxed text-muted-foreground">{item.description}</p>

                {item.changes && item.changes.length > 0 ? (
                  <ul className="space-y-1 border-t border-border/50 pt-2">
                    {item.changes.map((change) => (
                      <li
                        key={change}
                        className="flex items-start gap-2 text-xs leading-relaxed text-foreground/90"
                      >
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                        <span>{change}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </article>
            );
          })}

          {visibleUpdates.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border/80 p-6 text-center text-xs text-muted-foreground">
              Belum ada pembaruan di kategori ini.
            </p>
          ) : null}
        </div>
      </section>
    </div>
  );
        }
