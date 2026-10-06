import { useEffect, useState } from "react";
import { isInWatchlist, toggleWatchlist } from "@/lib/watchlist";
import { isLoggedIn, requestLogin } from "@/lib/auth-gate";
import { cn } from "@/lib/utils";
import { Bookmark } from "lucide-react";
import { toast } from "sonner";

export function WatchlistButton({
  animeId,
  title,
  poster,
  variant = "solid",
  size = "md",
  showToast = true,
  className,
}: {
  animeId: string;
  title: string;
  poster: string | null;
  variant?: "solid" | "glass" | "outline" | "card-overlay";
  size?: "sm" | "md" | "lg";
  showToast?: boolean;
  className?: string;
}) {
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setSaved(isInWatchlist(animeId));

    const handleSync = () => {
      setSaved(isInWatchlist(animeId));
    };

    window.addEventListener("watchlist-updated", handleSync);
    return () => window.removeEventListener("watchlist-updated", handleSync);
  }, [animeId]);

  const handleToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isLoggedIn()) {
      toast.info("Masuk dulu untuk memakai Watchlist", {
        description: "Login atau daftar akun supaya Watchlist-mu tersimpan.",
      });
      requestLogin("login");
      return;
    }

    const nowSaved = toggleWatchlist(animeId, title, poster ?? "");
    setSaved(nowSaved);

    if (nowSaved) {
      if (showToast) {
        toast.success(`"${title}" disimpan ke Watchlist`, {
          description: "Dapat diakses di profil dan menu Watchlist.",
          icon: <Bookmark className="h-4 w-4 fill-primary text-primary" />,
        });
      }
    } else {
      if (showToast) {
        toast.info(`"${title}" dihapus dari Watchlist`);
      }
    }
  };

  const sizeClasses = {
    sm: "h-8 w-8 rounded-full",
    md: "h-11 w-11 rounded-lg",
    lg: "h-12 w-12 rounded-lg",
  }[size];

  const iconSizes = {
    sm: "h-3.5 w-3.5",
    md: "h-4 w-4",
    lg: "h-5 w-5",
  }[size];

  return (
    <button
      type="button"
      onClick={handleToggle}
      aria-pressed={saved}
      aria-label={saved ? "Hapus dari watchlist" : "Simpan ke watchlist"}
      title={saved ? "Tersimpan di Watchlist" : "Simpan ke Watchlist"}
      className={cn(
        "press-soft relative inline-flex shrink-0 cursor-pointer select-none items-center justify-center border transition-colors",
        sizeClasses,
        variant === "glass" && "border-white/20 bg-black/50 text-white hover:bg-black/70",
        variant === "solid" &&
          "border-border bg-secondary/60 text-foreground hover:bg-secondary hover:text-primary",
        variant === "outline" &&
          "border-border bg-background/70 text-foreground hover:border-primary hover:text-primary",
        variant === "card-overlay" && "border-transparent bg-black/65 text-white hover:bg-black/85",
        saved &&
          (variant === "card-overlay"
            ? "bg-primary text-primary-foreground hover:bg-primary"
            : "border-primary text-primary"),
        className,
      )}
    >
      <Bookmark className={cn(iconSizes, saved && "fill-current")} />
    </button>
  );
}
