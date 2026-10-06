import { useEffect, useState } from "react";
import { Check, Flame, Gift, Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  formatCountdown,
  getCheckInReward,
  msUntilNextClaim,
  type ClaimResult,
} from "@/lib/gamification";
import { cn } from "@/lib/utils";

/** Muncul setelah klaim absen harian berhasil, dari halaman mana pun. */
export function DailyClaimDialog() {
  const [claim, setClaim] = useState<ClaimResult | null>(null);
  const [open, setOpen] = useState(false);
  const [, tick] = useState(0);

  useEffect(() => {
    const onClaimed = (e: Event) => {
      const detail = (e as CustomEvent<ClaimResult>).detail;
      if (!detail?.success) return;
      setClaim(detail);
      setOpen(true);
    };
    window.addEventListener("daily-claimed", onClaimed);
    return () => window.removeEventListener("daily-claimed", onClaimed);
  }, []);

  useEffect(() => {
    if (!open) return;
    const id = window.setInterval(() => tick((n) => n + 1), 30000);
    return () => window.clearInterval(id);
  }, [open]);

  if (!claim || claim.streak === undefined) return null;

  // Tampilkan 7 hari dalam siklus streak yang sedang berjalan.
  const streak = claim.streak;
  const base = Math.floor((streak - 1) / 7) * 7 + 1;
  const days = Array.from({ length: 7 }, (_, i) => base + i);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-sm gap-4 rounded-3xl p-5 text-center sm:p-6">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-400 text-zinc-950 shadow-lg shadow-amber-500/30">
          <Gift className="h-7 w-7" />
        </div>

        <div className="space-y-1">
          <DialogTitle className="font-display text-base font-black">Absen Berhasil</DialogTitle>
          <DialogDescription className="text-xs">
            Hadiah login harian hari ini sudah masuk ke akunmu.
          </DialogDescription>
        </div>

        <div className="flex items-center justify-center gap-3">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-amber-500/15 px-3.5 py-1.5 text-xs font-black text-amber-700 dark:text-amber-300">
            <Sparkles className="h-3.5 w-3.5" />+{claim.expGained} EXP
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-orange-500/40 bg-orange-500/15 px-3.5 py-1.5 text-xs font-black text-orange-700 dark:text-orange-300">
            <Flame className="h-3.5 w-3.5" />
            {streak} hari
          </span>
        </div>

        {claim.leveledUp ? (
          <p className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-2.5 text-[11px] font-bold text-emerald-700 dark:text-emerald-400">
            Level naik! Sekarang Level {claim.newLevel}
            {claim.rankTitle ? ` (${claim.rankTitle})` : ""}.
          </p>
        ) : null}

        <div className="grid grid-cols-7 gap-1.5" aria-label="Hadiah streak harian">
          {days.map((d) => {
            const done = d <= streak;
            const today = d === streak;
            return (
              <div
                key={d}
                className={cn(
                  "flex flex-col items-center gap-0.5 rounded-xl border px-0.5 py-2",
                  today
                    ? "border-amber-400 bg-amber-400/20"
                    : done
                      ? "border-emerald-500/40 bg-emerald-500/10"
                      : "border-border/70 bg-secondary/40",
                )}
              >
                <span className="text-[9px] font-bold text-muted-foreground">H{d}</span>
                {done ? (
                  <Check className="h-3 w-3 text-emerald-500" aria-label="Sudah diklaim" />
                ) : (
                  <Gift className="h-3 w-3 text-muted-foreground" aria-hidden="true" />
                )}
                <span className="font-mono text-[10px] font-bold text-foreground">
                  {getCheckInReward(d)}
                </span>
              </div>
            );
          })}
        </div>

        <p className="text-[11px] text-muted-foreground">
          Hadiah berikutnya bisa diklaim besok, {formatCountdown(msUntilNextClaim())} lagi. Jangan
          putus streak agar bonus EXP naik sampai +100.
        </p>

        <button
          type="button"
          onClick={() => setOpen(false)}
          className="min-h-10 cursor-pointer rounded-2xl bg-amber-400 px-4 text-xs font-black text-zinc-950 transition-colors hover:bg-amber-300"
        >
          Mantap
        </button>
      </DialogContent>
    </Dialog>
  );
}
