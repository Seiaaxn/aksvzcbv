import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ThemeToggle } from "@/components/anime/ThemeToggle";
import { Switch } from "@/components/ui/switch";
import { AuthModal } from "@/components/anime/AuthModal";
import { readSubscriptions, removeSubscription, type SubscriptionItem } from "@/lib/subscriptions";
import { getNotificationPref, getPermission } from "@/lib/push";
import { disablePhoneNotifications, enablePhoneNotifications } from "@/lib/notifications";
import {
  countEpisodesSince,
  countWatchedEpisodes,
  readHistory,
  type HistoryItem,
} from "@/lib/history";
import {
  useAuth,
  signOutUser,
  useFirestoreUserProfile,
  useFirestoreWatchlist,
} from "@/lib/firebase";
import {
  claimDailyCheckIn,
  formatCountdown,
  msUntilNextClaim,
  type UserGamification,
} from "@/lib/gamification";
import { AvatarWithFrame, BorderShell, RankTagChip, RarityChip, TitleChip } from "@/components/anime/ProfileCosmetics";
import { CosmeticsDialog } from "@/components/anime/CosmeticsDialog";
import { ProfileSettingsDialog } from "@/components/anime/ProfileSettingsDialog";
import {
  RARITY_META,
  nextLevelBorder,
  resolveBorder,
  resolveFrame,
  resolveTitle,
  type BorderDef,
  type CosmeticContext,
  type FrameDef,
  type TitleDef,
} from "@/lib/cosmetics";
import { resolveIdentity, useProfilePrefs, type ProfilePrefs } from "@/lib/profile-prefs";
import { getRankInfo } from "@/lib/gamification";
import { dayKey, getActiveSnapshot, startOfWeek, type ActiveSnapshot } from "@/lib/active-time";
import {
  DAILY_BONUS,
  buildAchievements,
  buildDailyMissions,
  ACHIEVEMENT_CATEGORIES,
  buildWeeklyMissions,
  claimOnce,
  weekKey,
  type Achievement,
  type AchievementCategory,
  type Mission,
} from "@/lib/missions";
import { cn } from "@/lib/utils";
import type { User } from "firebase/auth";
import {
  ArrowLeft,
  Award,
  Bell,
  Bookmark,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  Gift,
  History,
  LogIn,
  LogOut,
  Palette,
  Play,
  Settings,
  Target,
  Timer,
  Trash2,
  Trophy,
  UserPlus,
  Zap,
} from "lucide-react";

type TabId = "profil" | "aktivitas" | "koleksi";

export const Route = createFileRoute("/profil")({
  head: () => ({
    meta: [
      { title: "Profil Pengguna : Nontonime" },
      {
        name: "description",
        content:
          "Lihat level, jam aktif, misi harian, riwayat tonton, dan pencapaian akun Nontonime kamu.",
      },
      { property: "og:title", content: "Profil Pengguna : Nontonime" },
      {
        property: "og:description",
        content:
          "Lihat level, jam aktif, misi harian, riwayat tonton, dan pencapaian akun Nontonime kamu.",
      },
    ],
  }),
  component: ProfilPage,
});

/* ───────── helper ───────── */

function formatDuration(sec: number) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return { h, m, s };
}

function formatShort(sec: number) {
  const { h, m } = formatDuration(sec);
  if (h > 0) return `${h} Jam ${m} Menit`;
  return `${m} Menit`;
}

function timeAgo(ts: number) {
  const s = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (s < 60) return "baru saja";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} menit lalu`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} jam lalu`;
  return `${Math.floor(h / 24)} hari lalu`;
}

function untilMidnight() {
  const now = new Date();
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const mins = Math.max(0, Math.ceil((end.getTime() - now.getTime()) / 60000));
  return `${Math.floor(mins / 60)} jam ${mins % 60} menit`;
}

function untilNextWeek() {
  const end = startOfWeek();
  end.setDate(end.getDate() + 7);
  const hours = Math.max(0, Math.ceil((end.getTime() - Date.now()) / 3600000));
  const d = Math.floor(hours / 24);
  return d > 0 ? `${d} hari ${hours % 24} jam` : `${hours} jam`;
}

/** Ambil snapshot jam aktif dan segarkan tiap `ms` milidetik. */
function useActiveSnapshot(uid: string, ms: number): ActiveSnapshot {
  const [snap, setSnap] = useState<ActiveSnapshot>(() => getActiveSnapshot(uid));
  useEffect(() => {
    const update = () => setSnap(getActiveSnapshot(uid));
    update();
    const id = window.setInterval(update, ms);
    return () => window.clearInterval(id);
  }, [uid, ms]);
  return snap;
}

function useHistory() {
  const [items, setItems] = useState<HistoryItem[]>([]);
  useEffect(() => {
    const sync = () => setItems(readHistory());
    sync();
    window.addEventListener("history-updated", sync);
    return () => window.removeEventListener("history-updated", sync);
  }, []);
  return items;
}

function useSubscriptionCount() {
  const [n, setN] = useState(0);
  useEffect(() => {
    const sync = () => setN(readSubscriptions().length);
    sync();
    window.addEventListener("subs-updated", sync);
    return () => window.removeEventListener("subs-updated", sync);
  }, []);
  return n;
}

/** Tanggal lokal hari ini. Berubah sendiri saat lewat tengah malam, tanpa perlu muat ulang. */
function useToday() {
  const [today, setToday] = useState(() => dayKey());
  useEffect(() => {
    const id = window.setInterval(() => setToday(dayKey()), 30000);
    return () => window.clearInterval(id);
  }, []);
  return today;
}

const card = "rounded-2xl border border-border/80 bg-card p-3.5 shadow-sm";

/* ───────── skeleton & signed-out ───────── */

function DashboardSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-72 animate-pulse rounded-3xl bg-muted/60" />
      <div className="h-14 animate-pulse rounded-2xl bg-muted/60" />
      <div className="h-64 animate-pulse rounded-3xl bg-muted/60" />
    </div>
  );
}

function SignedOutHero({ onOpenAuth }: { onOpenAuth: (mode: "login" | "register") => void }) {
  return (
    <section className="relative overflow-hidden rounded-3xl border border-border/80 bg-card shadow-sm">
      <div className="h-28 bg-gradient-to-br from-amber-400/40 via-amber-400/15 to-transparent" />
      <div className="space-y-5 px-6 pb-7 text-center">
        <div className="-mt-9 mx-auto flex h-[72px] w-[72px] items-center justify-center rounded-full border-4 border-card bg-amber-400 text-zinc-950 shadow-lg">
          <LogIn className="h-7 w-7" />
        </div>
        <div className="space-y-1.5">
          <h2 className="font-display text-base font-black text-foreground">
            Masuk ke Profil Nontonime
          </h2>
          <p className="mx-auto max-w-md text-[11px] leading-relaxed text-muted-foreground">
            Simpan <strong>Level, EXP, Watchlist</strong>, dan <strong>Riwayat Tontonan</strong> di
            akunmu supaya tersinkron di semua perangkat.
          </p>
        </div>
        <div className="flex flex-col justify-center gap-2 sm:flex-row">
          <button
            type="button"
            onClick={() => onOpenAuth("login")}
            className="inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-border bg-secondary px-5 py-2.5 text-[11px] font-bold text-foreground transition-colors hover:bg-secondary/80"
          >
            <LogIn className="h-3 w-3 text-amber-500" />
            <span>Masuk</span>
          </button>
          <button
            type="button"
            onClick={() => onOpenAuth("register")}
            className="inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-amber-400 px-5 py-2.5 text-[11px] font-bold text-zinc-950 transition-colors hover:bg-amber-300"
          >
            <UserPlus className="h-3 w-3" />
            <span>Buat Akun (+100 XP)</span>
          </button>
        </div>
      </div>
    </section>
  );
}

/* ───────── kartu profil (header) ───────── */

function ProfileHero({
  name,
  photo,
  gamification,
  prefs,
  frame,
  border,
  title,
  totalSec,
  bookmarkCount,
  episodeCount,
  onSettings,
  onCosmetics,
}: {
  name: string;
  photo: string;
  gamification: UserGamification;
  prefs: ProfilePrefs;
  frame: FrameDef;
  border: BorderDef;
  title: TitleDef;
  totalSec: number;
  bookmarkCount: number;
  episodeCount: number;
  onSettings: () => void;
  onCosmetics: () => void;
}) {
  const totalXp = gamification.totalExp ?? gamification.exp ?? 0;
  const hours = (totalSec / 3600).toFixed(1);
  const rank = getRankInfo(gamification.level);
  const pct = Math.min(
    100,
    Math.round((gamification.exp / Math.max(1, gamification.maxExp)) * 100),
  );

  const stats = [
    { value: `Lv.${gamification.level}`, label: `${totalXp.toLocaleString("id-ID")} XP` },
    { value: String(gamification.dailyStreak), label: "Streak" },
    { value: `${hours}h`, label: "Jam Aktif", accent: true },
    { value: String(bookmarkCount), label: "Bookmark" },
    { value: String(episodeCount), label: "Episode" },
  ];

  const iconBtn =
    "flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-background/60 text-foreground transition-colors hover:bg-background focus-visible:ring-2 focus-visible:ring-amber-400/60 outline-none";

  return (
    <BorderShell
      border={border}
      innerClassName="relative overflow-hidden bg-gradient-to-b from-secondary/70 to-card px-3 pb-3 pt-3"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-24"
        style={{
          background: `linear-gradient(180deg, color-mix(in srgb, ${border.colors[0]} 22%, transparent), transparent)`,
        }}
      />
      <div className="relative">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => window.history.back()}
            aria-label="Kembali"
            className={iconBtn}
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <h1 className="font-display text-xs font-black text-foreground">Profil Pengguna</h1>
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={onCosmetics}
              aria-label="Buka koleksi kosmetik"
              className={iconBtn}
            >
              <Palette className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={onSettings}
              aria-label="Buka pengaturan profil"
              className={iconBtn}
            >
              <Settings className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="mt-3 flex items-center gap-3 pb-1.5 text-left">
          <AvatarWithFrame
            src={photo}
            name={name}
            frame={frame}
            size={52}
          />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <h2 className="max-w-full break-words font-display text-sm font-black text-foreground">
                {name}
              </h2>
            </div>
            {prefs.showTitle ? <TitleChip name={title.name} className="mt-0.5" /> : null}
            {prefs.showRankTag ? (
              <div className="mt-1">
                <RankTagChip title={rank.title} gradient={rank.color} />
              </div>
            ) : null}
          </div>
        </div>

        <div className="mt-2 space-y-1 rounded-xl border border-border/60 bg-background/40 p-2">
          <div className="flex items-center justify-between text-[10px]">
            <span className="font-bold text-foreground">Menuju Level {(gamification.level + 1).toLocaleString("id-ID")}</span>
            <span className="font-mono font-bold text-muted-foreground">
              {gamification.exp} / {gamification.maxExp} XP
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500 transition-[width] duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        <div className="mt-2 grid grid-cols-5 border-t border-border/60 pt-2">
          {stats.map((s, idx) => (
            <div
              key={s.label}
              className={cn("px-1 text-center", idx > 0 && "border-l border-border/60")}
            >
              <p
                className={cn(
                  "font-display text-xs font-black",
                  s.accent ? "text-amber-500" : "text-foreground",
                )}
              >
                {s.value}
              </p>
              <p className="mt-0.5 truncate text-[10px] text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    </BorderShell>
  );
}

/* ───────── tab bar ───────── */

function TabBar({
  active,
  onChange,
  activityCount,
}: {
  active: TabId;
  onChange: (t: TabId) => void;
  activityCount: number;
}) {
  const tabs: { id: TabId; label: string; icon: typeof Play }[] = [
    { id: "profil", label: "Profil", icon: Settings },
    { id: "aktivitas", label: "Aktivitas", icon: Play },
    { id: "koleksi", label: "Koleksi", icon: Trophy },
  ];
  return (
    <div
      role="tablist"
      aria-label="Bagian profil"
      className="grid grid-cols-3 gap-1 rounded-2xl border border-border/80 bg-card p-1"
    >
      {tabs.map((t) => {
        const Icon = t.icon;
        const isActive = active === t.id;
        return (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(t.id)}
            className={cn(
              "flex min-h-10 cursor-pointer items-center justify-center gap-1.5 rounded-xl px-2 text-xs font-bold transition-colors",
              isActive
                ? "bg-amber-400 text-zinc-950"
                : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            <span>{t.label}</span>
            {t.id === "aktivitas" && activityCount > 0 ? (
              <span
                className={cn(
                  "flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-black",
                  isActive ? "bg-zinc-950 text-amber-300" : "bg-secondary text-foreground",
                )}
              >
                {activityCount}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

/* ───────── tab: profil ───────── */

function ActiveTimeCard({ uid }: { uid: string }) {
  const snap = useActiveSnapshot(uid, 1000);
  const { h, m, s } = formatDuration(snap.total);
  const dailyTarget = 30;
  const todayMin = Math.floor(snap.today / 60);
  const pct = Math.min(100, Math.round((todayMin / dailyTarget) * 100));

  return (
    <section className={cn(card, "space-y-4")}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-amber-400/15 text-amber-500">
            <Timer className="h-4 w-4" />
          </div>
          <div>
            <h3 className="font-display text-xs font-black uppercase text-foreground">
              Jam Aktif
            </h3>
            <p className="text-[11px] text-muted-foreground">
              Waktu nyata kamu di Nontonime, dihitung otomatis.
            </p>
          </div>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          Sedang aktif
        </span>
      </div>

      <div>
        <p className="font-display text-foreground">
          <span className="text-lg font-black">{h}</span>
          <span className="ml-1 mr-2 text-[11px] text-muted-foreground">jam</span>
          <span className="text-base font-black text-amber-500">{m}</span>
          <span className="ml-1 mr-2 text-[11px] text-muted-foreground">mnt</span>
          <span className="text-base font-black tabular-nums text-emerald-500">{s}</span>
          <span className="ml-1 text-[11px] text-muted-foreground">dtk</span>
        </p>
        <p className="mt-1 text-[11px] text-muted-foreground">Total sejak akun dibuat</p>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "Hari ini", value: formatShort(snap.today), icon: Clock },
          { label: "Minggu ini", value: formatShort(snap.week), icon: CalendarDays },
          { label: "Hari aktif", value: `${snap.activeDays} hari`, icon: Zap },
        ].map((x) => {
          const Icon = x.icon;
          return (
            <div key={x.label} className="rounded-2xl border border-border/70 bg-secondary/40 p-3">
              <p className="flex items-center gap-1 text-[10px] font-bold uppercase text-muted-foreground">
                <Icon className="h-3 w-3" />
                {x.label}
              </p>
              <p className="mt-1 text-xs font-black text-foreground">{x.value}</p>
            </div>
          );
        })}
      </div>

      <div className="space-y-2 rounded-2xl border border-border/70 bg-secondary/40 p-3.5">
        <div className="flex items-center justify-between text-[11px]">
          <span className="font-bold text-foreground">Target aktif hari ini</span>
          <span className="font-mono font-bold text-emerald-500">
            {Math.min(todayMin, dailyTarget)} / {dailyTarget} menit
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-background">
          <div
            className="h-full rounded-full bg-gradient-to-r from-amber-400 to-emerald-500 transition-[width] duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </section>
  );
}

function QuickLinks({
  watchlistCount,
  historyCount,
  checkedIn,
  nextEpisodeTitle,
  onClaim,
}: {
  watchlistCount: number;
  historyCount: number;
  checkedIn: boolean;
  nextEpisodeTitle: string | null;
  onClaim: () => void;
}) {
  const rowCls =
    "flex min-h-12 items-center gap-3 rounded-2xl px-1.5 py-2 text-left transition-colors hover:bg-secondary/40";
  const iconCls = "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border";

  // Segarkan hitung mundur klaim berikutnya.
  const [, force] = useState(0);
  useEffect(() => {
    if (!checkedIn) return;
    const id = window.setInterval(() => force((n) => n + 1), 30000);
    return () => window.clearInterval(id);
  }, [checkedIn]);

  return (
    <nav className={cn(card, "space-y-1 p-3")}>
      <Link to="/riwayat" className={rowCls}>
        <span className={cn(iconCls, "border-purple-500/30 bg-purple-500/15 text-purple-400")}>
          <Play className="h-4 w-4 fill-current" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-xs font-black text-foreground">Lanjutkan Menonton</span>
          <span className="block truncate text-[11px] text-muted-foreground">
            {nextEpisodeTitle ?? "Belum ada riwayat tonton"}
          </span>
        </span>
        <span className="rounded-full border border-purple-500/30 bg-purple-500/15 px-2.5 py-0.5 text-[10px] font-bold text-purple-400">
          {historyCount} Episode
        </span>
      </Link>

      <Link to="/watchlist" className={rowCls}>
        <span className={cn(iconCls, "border-amber-500/30 bg-amber-500/15 text-amber-500")}>
          <Bookmark className="h-4 w-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-xs font-black text-foreground">Daftar Bookmark Saya</span>
          <span className="block truncate text-[11px] text-muted-foreground">
            Simpanan anime favorit
          </span>
        </span>
        <span className="rounded-full border border-amber-500/30 bg-amber-500/15 px-2.5 py-0.5 text-[10px] font-bold text-amber-500">
          {watchlistCount} Judul
        </span>
      </Link>

      <Link to="/jadwal" className={rowCls}>
        <span className={cn(iconCls, "border-sky-500/30 bg-sky-500/15 text-sky-400")}>
          <CalendarDays className="h-4 w-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-xs font-black text-foreground">Jadwal Rilis</span>
          <span className="block truncate text-[11px] text-muted-foreground">
            Episode baru yang tayang minggu ini
          </span>
        </span>
        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
      </Link>

      <button
        type="button"
        onClick={onClaim}
        disabled={checkedIn}
        aria-label={
          checkedIn
            ? `Hadiah login harian sudah diklaim. Klaim lagi ${formatCountdown(msUntilNextClaim())} lagi`
            : "Klaim hadiah login harian"
        }
        className={cn(rowCls, "w-full disabled:cursor-default disabled:hover:bg-transparent")}
      >
        <span className={cn(iconCls, "border-rose-500/30 bg-rose-500/15 text-rose-400")}>
          <Gift className="h-4 w-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-xs font-black text-foreground">Hadiah Login Harian</span>
          <span className="block truncate text-[11px] text-muted-foreground">
            {checkedIn
              ? `Klaim lagi besok, ${formatCountdown(msUntilNextClaim())} lagi`
              : "Dapatkan EXP gratis tiap hari"}
          </span>
        </span>
        {checkedIn ? (
          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
            <Check className="h-3 w-3" />
            Sudah Klaim
          </span>
        ) : (
          <span className="rounded-full bg-amber-400 px-3 py-1 text-[10px] font-black text-zinc-950">
            Klaim
          </span>
        )}
      </button>
    </nav>
  );
}

function AccountDetails({
  user,
  name,
  gamification,
  episodeCount,
  totalSec,
}: {
  user: User;
  name: string;
  gamification: UserGamification;
  episodeCount: number;
  totalSec: number;
}) {
  const { h, m } = formatDuration(totalSec);
  const rows = [
    { label: "Email Terdaftar", value: user.email ?? "-" },
    { label: "Username Pengguna", value: name },
    { label: "Peringkat", value: gamification.rankTitle },
    { label: "Tontonan", value: `${episodeCount} episode dalam riwayat` },
    { label: "Jam Aktif di Web", value: `${h} Jam ${m} Menit` },
  ];
  return (
    <section className="space-y-2">
      <h2 className="px-1 text-[10px] font-black uppercase tracking-wider text-muted-foreground">
        Detail Informasi Akun
      </h2>
      <div className="divide-y divide-border/60 rounded-3xl border border-border/80 bg-card px-5 shadow-sm">
        {rows.map((r) => (
          <div key={r.label} className="py-3.5">
            <p className="text-[11px] text-muted-foreground">{r.label}</p>
            <p className="mt-0.5 break-all text-xs font-black text-foreground">{r.value}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function NotificationCard() {
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("default");
  const [prefOn, setPrefOn] = useState(true);
  const [subs, setSubs] = useState<SubscriptionItem[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const syncPerm = () => {
      setPermission(getPermission());
      setPrefOn(getNotificationPref());
    };
    syncPerm();
    const sync = () => setSubs(readSubscriptions());
    sync();
    window.addEventListener("subs-updated", sync);
    window.addEventListener("notification-pref-changed", syncPerm);
    return () => {
      window.removeEventListener("subs-updated", sync);
      window.removeEventListener("notification-pref-changed", syncPerm);
    };
  }, []);

  const isActive = permission === "granted" && prefOn;

  async function handleToggle(next: boolean) {
    if (busy) return;
    setBusy(true);
    try {
      if (next) {
        const res = await enablePhoneNotifications();
        setPermission(res.permission);
        setPrefOn(getNotificationPref());
      } else {
        await disablePhoneNotifications();
        setPrefOn(false);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4 rounded-3xl border border-border/80 bg-card p-5 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Bell className="h-3.5 w-3.5 text-primary" />
            <p className="text-xs font-bold text-card-foreground">Pusat Notifikasi & Update HP</p>
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {permission === "unsupported"
              ? "Browser ini tidak mendukung notifikasi web."
              : permission === "denied"
                ? "Notifikasi diblokir browser. Izinkan melalui pengaturan browser HP."
                : isActive
                  ? "Notifikasi update aktif di perangkat ini."
                  : "Nyalakan untuk menerima rilis episode & update website."}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Switch
            checked={isActive}
            onCheckedChange={handleToggle}
            disabled={busy || permission === "denied" || permission === "unsupported"}
            aria-label="Aktifkan atau nonaktifkan notifikasi"
          />
          <Link
            to="/notifikasi"
            className="rounded-xl border border-border/80 bg-secondary/50 px-3 py-1.5 text-[11px] font-semibold text-foreground hover:bg-secondary cursor-pointer"
          >
            Lihat Pembaruan
          </Link>
        </div>
      </div>

      {subs.length > 0 ? (
        <div className="space-y-2 border-t border-border pt-3">
          <p className="text-[11px] font-medium text-muted-foreground">
            Anime yang di-subscribe ({subs.length})
          </p>
          <ul className="space-y-1.5">
            {subs.map((item) => (
              <li key={item.animeId} className="flex items-center justify-between gap-2">
                <Link
                  to="/anime/$animeId"
                  params={{ animeId: item.animeId }}
                  className="line-clamp-1 text-xs text-card-foreground hover:text-primary"
                >
                  {item.animeTitle}
                </Link>
                <button
                  type="button"
                  onClick={() => removeSubscription(item.animeId)}
                  aria-label="Berhenti subscribe"
                  className="shrink-0 text-[11px] text-muted-foreground hover:text-destructive cursor-pointer p-1"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function SettingsSection({ onEditProfile }: { onEditProfile?: () => void }) {
  return (
    <section id="pengaturan" className="scroll-mt-24 space-y-3">
      <h2 className="px-1 text-[10px] font-black uppercase tracking-wider text-muted-foreground">
        Pengaturan
      </h2>
      {onEditProfile ? (
        <button
          type="button"
          onClick={onEditProfile}
          className="flex w-full cursor-pointer items-center justify-between gap-4 rounded-3xl border border-border/80 bg-card p-5 text-left shadow-sm transition-colors hover:bg-secondary/40"
        >
          <span className="flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-400/15 text-amber-500">
              <Settings className="h-4 w-4" />
            </span>
            <span>
              <span className="block text-xs font-bold text-card-foreground">Edit Profil</span>
              <span className="block text-[11px] text-muted-foreground">
                Ubah nama pengguna, foto, dan tag peringkat.
              </span>
            </span>
          </span>
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      ) : null}
      <div className="flex items-center justify-between gap-4 rounded-3xl border border-border/80 bg-card p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-400/15 text-amber-500">
            <Palette className="h-4 w-4" />
          </div>
          <div>
            <p className="text-xs font-bold text-card-foreground">Tema Tampilan</p>
            <p className="text-[11px] text-muted-foreground">
              Pilih mode terang atau gelap sesuai seleramu.
            </p>
          </div>
        </div>
        <ThemeToggle />
      </div>
      <NotificationCard />
    </section>
  );
}

/* ───────── tab: aktivitas ───────── */

function ContinueWatching({ history }: { history: HistoryItem[] }) {
  // Riwayat sudah terurut terbaru; ambil satu episode terakhir per anime.
  const items = useMemo(() => {
    const seen = new Set<string>();
    const out: HistoryItem[] = [];
    for (const h of history) {
      if (seen.has(h.animeId)) continue;
      seen.add(h.animeId);
      out.push(h);
      if (out.length >= 5) break;
    }
    return out;
  }, [history]);

  return (
    <section className={cn(card, "space-y-3")}>
      <div className="flex items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 font-display text-xs font-black uppercase text-foreground">
          <Play className="h-3.5 w-3.5 fill-purple-400 text-purple-400" />
          Lanjutkan Nonton
        </h3>
        <Link to="/riwayat" className="text-[11px] font-bold text-amber-500 hover:underline">
          Semua Riwayat →
        </Link>
      </div>

      {items.length === 0 ? (
        <p className="py-8 text-center text-xs text-muted-foreground">Belum ada riwayat tonton.</p>
      ) : (
        <ul className="space-y-2.5">
          {items.map((item) => (
            <li key={item.animeId}>
              <Link
                to="/watch/$episodeId"
                params={{ episodeId: item.episodeId }}
                search={{ a: item.animeId, autoplay: false }}
                className="flex gap-3 rounded-2xl border border-border/70 bg-background/40 p-3 transition-colors hover:bg-secondary/40"
              >
                {item.poster ? (
                  <img
                    src={item.poster}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    className="h-16 w-12 shrink-0 rounded-xl object-cover"
                  />
                ) : (
                  <div className="h-16 w-12 shrink-0 rounded-xl bg-secondary" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="rounded-md bg-secondary px-1.5 py-0.5 text-[10px] font-bold uppercase text-muted-foreground">
                      Anime
                    </span>
                    <p className="truncate text-xs font-black text-foreground">{item.animeTitle}</p>
                  </div>
                  <p className="mt-1 truncate text-[11px]">
                    <span className="font-bold text-amber-500">{item.episodeTitle}</span>
                    <span className="text-muted-foreground"> · {timeAgo(item.watchedAt)}</span>
                  </p>
                  <p className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold text-amber-500">
                    <Play className="h-3 w-3 fill-current" />
                    Lanjut Nonton
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/* ───────── tab: koleksi ───────── */

function MissionRow({ mission }: { mission: Mission }) {
  const done = mission.progress >= mission.target;
  const Icon =
    mission.id === "absen"
      ? CheckCircle2
      : mission.id.startsWith("aktif") || mission.id.startsWith("jam") || mission.id === "hari5"
        ? Clock
        : Play;
  const pct = Math.round((mission.progress / mission.target) * 100);

  return (
    <div
      className={cn(
        "rounded-2xl border p-3.5",
        done ? "border-emerald-500/40 bg-emerald-500/10" : "border-border/70 bg-background/40",
      )}
    >
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border",
            done
              ? "border-emerald-500/40 text-emerald-500"
              : "border-border/70 bg-secondary/50 text-muted-foreground",
          )}
        >
          <Icon className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p
              className={cn(
                "text-xs font-black",
                done ? "text-emerald-600 dark:text-emerald-400" : "text-foreground",
              )}
            >
              {mission.title}
            </p>
            {mission.reward !== null ? (
              <span
                className={cn(
                  "shrink-0 rounded-md px-2 py-0.5 font-mono text-[10px] font-bold",
                  done ? "bg-emerald-500/15 text-emerald-500" : "bg-amber-500/15 text-amber-500",
                )}
              >
                {done ? "✓" : "+"}
                {mission.reward} EXP
              </span>
            ) : null}
          </div>
          <p className="mt-0.5 text-[11px] text-muted-foreground">{mission.desc}</p>
          <div className="mt-2.5 flex items-center gap-3">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-secondary">
              <div
                className={cn(
                  "h-full rounded-full transition-[width] duration-500",
                  done ? "bg-emerald-500" : "bg-amber-400",
                )}
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="font-mono text-[10px] text-muted-foreground">
              {mission.progress}/{mission.target}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function MissionsCard({ daily, weekly }: { daily: Mission[]; weekly: Mission[] }) {
  const [period, setPeriod] = useState<"harian" | "mingguan">("harian");
  const [, force] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => force((n) => n + 1), 30000);
    return () => window.clearInterval(id);
  }, []);

  const list = period === "harian" ? daily : weekly;
  const doneOf = (l: Mission[]) => l.filter((m) => m.progress >= m.target).length;
  const coreDaily = daily.filter((m) => !m.extra);
  const allDailyDone = doneOf(coreDaily) === coreDaily.length;

  return (
    <section className={cn(card, "space-y-4")}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-500">
            <Target className="h-4 w-4" />
          </div>
          <div>
            <h3 className="font-display text-xs font-black uppercase text-foreground">
              Misi & Tantangan
            </h3>
            <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <Timer className="h-3 w-3" />
              Reset dalam {period === "harian" ? untilMidnight() : untilNextWeek()}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 rounded-xl border border-border/70 bg-background/40 p-0.5">
          {(
            [
              ["harian", `Harian ${doneOf(daily)}/${daily.length}`],
              ["mingguan", `Mingguan ${doneOf(weekly)}/${weekly.length}`],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setPeriod(id)}
              className={cn(
                "min-h-9 cursor-pointer rounded-lg px-2.5 text-[11px] font-bold transition-colors",
                period === id ? "bg-amber-400 text-zinc-950" : "text-muted-foreground",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2.5">
        {list.map((m) => (
          <MissionRow key={m.id} mission={m} />
        ))}
        {period === "harian" ? (
          <div
            className={cn(
              "flex items-center gap-3 rounded-2xl border border-dashed p-3.5",
              allDailyDone ? "border-emerald-500/50 bg-emerald-500/10" : "border-border",
            )}
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border/70 bg-secondary/50 text-amber-500">
              <Gift className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-black text-foreground">Bonus Semua Misi Harian</p>
              <p className="text-[11px] text-muted-foreground">
                {doneOf(coreDaily)}/{coreDaily.length} misi inti selesai · hadiah otomatis
              </p>
            </div>
            <span className="font-mono text-[10px] font-bold text-amber-500">
              +{DAILY_BONUS} EXP
            </span>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function CosmeticsEntryCard({ onOpen }: { onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        card,
        "flex w-full cursor-pointer items-center gap-3 text-left transition-colors hover:bg-secondary/40",
      )}
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-amber-400/15 text-amber-500">
        <Palette className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-display text-xs font-black uppercase text-foreground">
          Koleksi &amp; Kosmetik
        </span>
        <span className="block text-[11px] text-muted-foreground">
          Ganti julukan, frame avatar, dan border profil.
        </span>
      </span>
      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
    </button>
  );
}

function LevelCard({ gamification }: { gamification: UserGamification }) {
  const pct = Math.min(
    100,
    Math.round((gamification.exp / Math.max(1, gamification.maxExp)) * 100),
  );
  const nextBorder = nextLevelBorder(gamification.level);
  return (
    <section className={cn(card, "space-y-3")}>
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 font-display text-xs font-black uppercase text-foreground">
          <Trophy className="h-3.5 w-3.5 text-amber-500" />
          Level Komunitas
        </h3>
        <span className="text-xs font-black text-amber-500">Level {gamification.level}</span>
      </div>
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">
          Progress Menuju Level {gamification.level + 1}
        </span>
        <span className="font-mono text-[11px] font-bold text-foreground">
          {gamification.exp} / {gamification.maxExp} XP
        </span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-secondary">
        <div
          className="h-full rounded-full bg-amber-400 transition-[width] duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex items-center justify-between border-t border-border/60 pt-3 text-xs">
        <span className="text-muted-foreground">Peringkat Saat Ini:</span>
        <span className="font-black text-amber-500">{gamification.rankTitle}</span>
      </div>
      {nextBorder && nextBorder.req.kind === "level" ? (
        <div className="flex items-center justify-between gap-3 text-xs">
          <span className="text-muted-foreground">Border berikutnya:</span>
          <span className="truncate text-right font-bold text-foreground">
            {nextBorder.name}{" "}
            <span className="font-mono text-[11px] text-muted-foreground">
              (Lv.{nextBorder.req.level})
            </span>
          </span>
        </div>
      ) : null}
    </section>
  );
}

function AchievementsCard({ achievements }: { achievements: Achievement[] }) {
  const [cat, setCat] = useState<AchievementCategory | "semua">("semua");
  const done = achievements.filter((a) => a.done).length;
  const pct = Math.round((done / achievements.length) * 100);

  const visible = useMemo(
    () =>
      achievements
        .filter((a) => cat === "semua" || a.category === cat)
        .sort((a, b) => {
          if (a.done !== b.done) return a.done ? -1 : 1;
          return RARITY_META[a.rarity].order - RARITY_META[b.rarity].order;
        }),
    [achievements, cat],
  );

  const chips: { id: AchievementCategory | "semua"; label: string }[] = [
    { id: "semua", label: "Semua" },
    ...ACHIEVEMENT_CATEGORIES,
  ];

  return (
    <section className={cn(card, "space-y-3")}>
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 font-display text-xs font-black uppercase text-foreground">
          <Award className="h-3.5 w-3.5 text-amber-500" />
          Pencapaian
        </h3>
        <span className="text-xs font-black text-amber-500">
          {done} / {achievements.length} Selesai
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-secondary">
        <div
          className="h-full rounded-full bg-gradient-to-r from-amber-400 to-emerald-500 transition-[width] duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-0.5">
        {chips.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setCat(c.id)}
            className={cn(
              "min-h-9 shrink-0 cursor-pointer rounded-lg border px-3 text-[11px] font-bold transition-colors",
              cat === c.id
                ? "border-foreground bg-foreground text-background"
                : "border-border/80 text-muted-foreground hover:bg-secondary/60",
            )}
          >
            {c.label}
          </button>
        ))}
      </div>

      <ul className="grid gap-2 sm:grid-cols-2">
        {visible.map((a) => {
          const p = Math.round((a.progress / Math.max(1, a.target)) * 100);
          return (
            <li
              key={a.id}
              className={cn(
                "flex items-start gap-3 rounded-2xl border border-l-4 p-3",
                RARITY_META[a.rarity].edge,
                a.done ? "border-amber-500/40 bg-amber-500/10" : "border-border/70",
              )}
            >
              <span
                className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-xl",
                  a.done ? "bg-amber-400 text-zinc-950" : "bg-secondary text-muted-foreground",
                )}
              >
                {a.done ? <Check className="h-3.5 w-3.5" /> : <Award className="h-3.5 w-3.5" />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[11px] font-black text-foreground">{a.title}</span>
                  <RarityChip rarity={a.rarity} />
                </span>
                <span className="mt-0.5 block text-[10px] text-muted-foreground">{a.desc}</span>
                {a.done ? null : (
                  <span className="mt-1.5 flex items-center gap-2">
                    <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-secondary">
                      <span
                        className={cn("block h-full rounded-full", RARITY_META[a.rarity].bar)}
                        style={{ width: `${p}%` }}
                      />
                    </span>
                    <span className="font-mono text-[10px] text-muted-foreground">
                      {a.progressLabel}
                    </span>
                  </span>
                )}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/* ───────── dashboard ───────── */

function SignedInDashboard({ user }: { user: User }) {
  const uid = user.uid;
  const { gamification, ready } = useFirestoreUserProfile(uid);
  const { items: watchlistItems } = useFirestoreWatchlist(uid);
  const history = useHistory();
  const snap = useActiveSnapshot(uid, 5000);
  const prefs = useProfilePrefs(uid);
  const subscriptionCount = useSubscriptionCount();
  const today = useToday();
  const [tab, setTab] = useState<TabId>("profil");
  const [claimMsg, setClaimMsg] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [cosmeticsOpen, setCosmeticsOpen] = useState(false);

  const todayStart = new Date(
    new Date().getFullYear(),
    new Date().getMonth(),
    new Date().getDate(),
  );
  const weekStart = startOfWeek();
  const countSince = (from: Date) => countEpisodesSince(history, from.getTime());
  const episodesToday = countSince(todayStart);
  const episodesWeek = countSince(weekStart);

  // Tanggal lokal perangkat, sama dengan yang dipakai claimDailyCheckIn.
  const checkedIn = gamification.lastCheckIn === today;
  const statusOf = (i: { status?: string }) => i.status || "plan";
  const completedCount = watchlistItems.filter((i) => statusOf(i) === "completed").length;
  const animeWatched = history.length; // satu entri riwayat = satu anime
  const watchedEpisodeCount = countWatchedEpisodes(history);
  const ratedCount = watchlistItems.filter((i) => (i.userRating ?? 0) > 0).length;
  const notedCount = watchlistItems.filter((i) => (i.notes ?? "").trim().length > 0).length;

  const todayMin = Math.floor(snap.today / 60);
  const weekMin = Math.floor(snap.week / 60);
  const daily = useMemo(
    () => buildDailyMissions({ checkedIn, todaySec: todayMin * 60, episodesToday }),
    [checkedIn, todayMin, episodesToday],
  );
  const weekly = useMemo(
    () =>
      buildWeeklyMissions({
        weekActiveDays: snap.weekActiveDays,
        weekSec: weekMin * 60,
        episodesWeek,
      }),
    [snap.weekActiveDays, weekMin, episodesWeek],
  );
  const hasCustomPhoto = !!prefs.customPhoto;
  const achievements = useMemo(
    () =>
      buildAchievements({
        level: gamification.level,
        streak: gamification.dailyStreak,
        episodes: watchedEpisodeCount,
        animeWatched,
        watchlist: watchlistItems.length,
        completed: completedCount,
        activeSec: snap.total,
        activeDays: snap.activeDays,
        totalExp: gamification.totalExp ?? 0,
        rated: ratedCount,
        noted: notedCount,
        subscriptions: subscriptionCount,
        hasCustomPhoto,
      }),
    [
      gamification.level,
      gamification.dailyStreak,
      gamification.totalExp,
      watchedEpisodeCount,
      animeWatched,
      watchlistItems.length,
      completedCount,
      snap.total,
      snap.activeDays,
      ratedCount,
      notedCount,
      subscriptionCount,
      hasCustomPhoto,
    ],
  );

  const cosmeticCtx: CosmeticContext = useMemo(
    () => ({ level: gamification.level, achievements }),
    [gamification.level, achievements],
  );
  const frame = resolveFrame(prefs.equipped.frame, cosmeticCtx);
  const border = resolveBorder(prefs.equipped.border, cosmeticCtx);
  const title = resolveTitle(prefs.equipped.title, cosmeticCtx);
  const { name, photo } = resolveIdentity(user, prefs);

  // Hadiah misi diberikan otomatis, satu kali per hari atau per minggu.
  useEffect(() => {
    // Tunggu data server tiba supaya hadiah tidak dihitung dari salinan lokal yang usang.
    if (!ready) return;
    const dk = dayKey();
    const wk = weekKey();
    for (const m of daily) {
      if (m.reward !== null && m.progress >= m.target) {
        claimOnce(uid, `d:${dk}:${m.id}`, m.reward, `Misi: ${m.title}`);
      }
    }
    if (daily.filter((m) => !m.extra).every((m) => m.progress >= m.target)) {
      claimOnce(uid, `d:${dk}:bonus`, DAILY_BONUS, "Bonus Semua Misi Harian");
    }
    for (const m of weekly) {
      if (m.reward !== null && m.progress >= m.target) {
        claimOnce(uid, `w:${wk}:${m.id}`, m.reward, `Misi Mingguan: ${m.title}`);
      }
    }
  }, [uid, ready, daily, weekly]);

  // Klaim berhasil memunculkan dialog hadiah (DailyClaimDialog). Pesan di sini hanya untuk gagal.
  const handleClaim = () => {
    const res = claimDailyCheckIn();
    if (res.success) {
      setClaimMsg(null);
      return;
    }
    setClaimMsg(res.message);
    window.setTimeout(() => setClaimMsg(null), 4000);
  };

  const handleLogout = async () => {
    try {
      await signOutUser();
    } catch (err) {
      console.error("Logout error:", err);
    }
  };

  const activityCount = new Set(history.map((h) => h.animeId)).size;

  return (
    <div className="space-y-4">
      <ProfileHero
        name={name}
        photo={photo}
        gamification={gamification}
        prefs={prefs}
        frame={frame}
        border={border}
        title={title}
        totalSec={snap.total}
        bookmarkCount={watchlistItems.length}
        episodeCount={watchedEpisodeCount}
        onSettings={() => setSettingsOpen(true)}
        onCosmetics={() => setCosmeticsOpen(true)}
      />

      <TabBar active={tab} onChange={setTab} activityCount={activityCount} />

      {claimMsg ? (
        <div
          role="status"
          className="rounded-2xl border border-amber-500/30 bg-amber-500/15 p-3 text-[11px] font-medium text-amber-700 dark:text-amber-300"
        >
          {claimMsg}
        </div>
      ) : null}

      {tab === "profil" ? (
        <div className="space-y-4">
          <ActiveTimeCard uid={uid} />
          <QuickLinks
            watchlistCount={watchlistItems.length}
            historyCount={watchedEpisodeCount}
            checkedIn={checkedIn}
            nextEpisodeTitle={history[0] ? `${history[0].animeTitle}` : null}
            onClaim={handleClaim}
          />
          <AccountDetails
            user={user}
            name={name}
            gamification={gamification}
            episodeCount={watchedEpisodeCount}
            totalSec={snap.total}
          />
          <SettingsSection onEditProfile={() => setSettingsOpen(true)} />
          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex min-h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-2xl border border-border/80 bg-card px-4 text-xs font-bold text-muted-foreground transition-colors hover:border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Keluar</span>
          </button>
        </div>
      ) : null}

      {tab === "aktivitas" ? (
        <div className="space-y-4">
          <ContinueWatching history={history} />
        </div>
      ) : null}

      {tab === "koleksi" ? (
        <div className="space-y-4">
          <CosmeticsEntryCard onOpen={() => setCosmeticsOpen(true)} />
          <MissionsCard daily={daily} weekly={weekly} />
          <LevelCard gamification={gamification} />
          <AchievementsCard achievements={achievements} />
        </div>
      ) : null}

      <ProfileSettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        user={user}
        prefs={prefs}
        name={name}
        photo={photo}
        frame={frame}
        rankTitle={gamification.rankTitle}
        onOpenCosmetics={() => setCosmeticsOpen(true)}
      />
      <CosmeticsDialog
        open={cosmeticsOpen}
        onOpenChange={setCosmeticsOpen}
        uid={uid}
        name={name}
        photo={photo}
        level={gamification.level}
        ctx={cosmeticCtx}
        prefs={prefs}
      />
    </div>
  );
}

function ProfilPage() {
  const { user, loading } = useAuth();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authTab, setAuthTab] = useState<"login" | "register">("login");

  const handleOpenAuth = (mode: "login" | "register") => {
    setAuthTab(mode);
    setAuthModalOpen(true);
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-4 sm:py-8">
      {loading ? (
        <DashboardSkeleton />
      ) : user ? (
        <SignedInDashboard user={user} />
      ) : (
        <>
          <SignedOutHero onOpenAuth={handleOpenAuth} />
          <SettingsSection />
        </>
      )}

      <AuthModal open={authModalOpen} onOpenChange={setAuthModalOpen} initialTab={authTab} />
    </div>
  );
  }
