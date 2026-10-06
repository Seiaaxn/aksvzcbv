import { useState, useEffect, memo } from "react";
import { Link } from "@tanstack/react-router";
import type { AnimeSummary } from "@/lib/anime-types";
import { cn } from "@/lib/utils";
import { Check, Film, Info, Star } from "lucide-react";
import { WatchlistButton } from "./WatchlistButton";
import { AnimeQuickPreviewModal } from "./AnimeQuickPreviewModal";
import { readHistory, type HistoryItem } from "@/lib/history";

export const AnimeCard = memo(function AnimeCard({
  anime,
  featured = false,
  showWatchlist = true,
}: {
  anime: AnimeSummary;
  featured?: boolean;
  showWatchlist?: boolean;
}) {
  const [imgError, setImgError] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  // Modal pratinjau baru dipasang setelah pertama kali dibuka (hemat ratusan komponen di grid)
  const [previewMounted, setPreviewMounted] = useState(false);
  const [historyItem, setHistoryItem] = useState<HistoryItem | null>(null);

  const isOngoing = /ongoing|tayang/i.test(anime.status ?? "") || Boolean(anime.releaseDay);
  const isCompleted = /tamat|complete/i.test(anime.status ?? "");

  useEffect(() => {
    const found = readHistory().find((h) => h.animeId === anime.id);
    setHistoryItem(found ?? null);
  }, [anime.id]);

  const episodeLabel = anime.episodeCount ? `Eps ${anime.episodeCount}` : null;

  const meta = [
    anime.type || "TV",
    anime.releaseDay || anime.day || anime.latestReleaseDate || (isCompleted ? "Tamat" : null),
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <>
      <div className="group relative flex h-full flex-col gap-2.5">
        <div className="relative">
        <Link
          to="/anime/$animeId"
          params={{ animeId: anime.id }}
          className="relative block aspect-[2/3] w-full overflow-hidden rounded-lg bg-muted ring-1 ring-border/70 transition-shadow group-hover:ring-primary/60"
        >
          {anime.poster && !imgError ? (
            <img
              src={anime.poster}
              alt={anime.title}
              loading="lazy"
              decoding="async"
              onError={() => setImgError(true)}
              className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
            />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center gap-2 p-3 text-center text-muted-foreground">
              <Film className="h-6 w-6 opacity-40" />
              <span className="line-clamp-2 text-xs leading-tight">{anime.title}</span>
            </div>
          )}

          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/70 to-transparent" />

          {/* Status: satu penanda kecil saja */}
          {isOngoing ? (
            <span className="absolute left-2 top-2 inline-flex items-center gap-1.5 rounded-md bg-black/70 px-1.5 py-0.5 text-[10px] font-semibold text-white">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              Ongoing
            </span>
          ) : null}

          {episodeLabel ? (
            <span className="absolute bottom-2 left-2 text-[11px] font-semibold text-white">
              {episodeLabel}
            </span>
          ) : null}

          {historyItem ? (
            <>
              <span className="absolute bottom-2 right-2 inline-flex items-center gap-1 text-[10px] font-semibold text-white">
                <Check className="h-3 w-3 text-primary" strokeWidth={3} />
                Ditonton
              </span>
              <span className="absolute inset-x-0 bottom-0 h-0.5 bg-primary" />
            </>
          ) : null}
        </Link>

        {showWatchlist ? (
          <div className="absolute right-2 top-2 z-10">
            <WatchlistButton
              animeId={anime.id}
              title={anime.title}
              poster={anime.poster}
              variant="card-overlay"
              size="sm"
            />
          </div>
        ) : null}

        {/* Pratinjau cepat: hanya muncul saat hover di desktop */}
        <button
          type="button"
          onClick={() => {
            setPreviewMounted(true);
            setPreviewOpen(true);
          }}
          aria-label={`Pratinjau ${anime.title}`}
          className="absolute bottom-8 right-2 z-10 hidden h-8 w-8 items-center justify-center rounded-full bg-black/70 text-white opacity-0 transition-opacity hover:bg-primary hover:text-primary-foreground focus-visible:opacity-100 group-hover:opacity-100 md:flex"
        >
          <Info className="h-4 w-4" />
        </button>
        </div>

        <div className="min-w-0 space-y-0.5">
          <Link to="/anime/$animeId" params={{ animeId: anime.id }} className="block">
            <h3
              className={cn(
                "line-clamp-2 text-[13px] font-semibold leading-snug text-card-foreground transition-colors group-hover:text-primary sm:text-sm",
                featured && "text-sm sm:text-base",
              )}
              title={anime.title}
            >
              {anime.title}
            </h3>
          </Link>
          <p className="flex items-center gap-1.5 truncate text-xs text-muted-foreground">
            {anime.score ? (
              <span className="inline-flex items-center gap-0.5 font-semibold text-foreground">
                <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                {anime.score}
              </span>
            ) : null}
            <span className="truncate">{meta}</span>
          </p>
        </div>
      </div>

      {previewMounted ? (
        <AnimeQuickPreviewModal anime={anime} open={previewOpen} onOpenChange={setPreviewOpen} />
      ) : null}
    </>
  );
});
