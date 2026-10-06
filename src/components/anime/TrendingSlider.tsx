import { useRef } from "react";
import { Link } from "@tanstack/react-router";
import type { AnimeSummary } from "@/lib/anime-types";
import { ChevronLeft, ChevronRight, Film, Star } from "lucide-react";

/** Peringkat nyata: urutan data sudah berdasarkan jumlah penonton, jadi nomor di sini bermakna. */
export function TrendingSlider({ items }: { items: AnimeSummary[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);

  if (!items || items.length === 0) return null;

  const scroll = (dir: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: dir === "left" ? -el.clientWidth * 0.8 : el.clientWidth * 0.8, behavior: "smooth" });
  };

  return (
    <section className="space-y-4">
      <div className="section-head">
        <div>
          <h2 className="font-display text-xl text-foreground sm:text-2xl">Sedang ramai</h2>
          <p className="mt-1 text-sm text-muted-foreground">Paling banyak ditonton saat ini</p>
        </div>
        <div className="hidden items-center gap-1 sm:flex">
          <button
            type="button"
            onClick={() => scroll("left")}
            aria-label="Geser ke kiri"
            className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => scroll("right")}
            aria-label="Geser ke kanan"
            className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <ol
        ref={scrollRef}
        className="no-scrollbar -mx-4 flex snap-x gap-5 overflow-x-auto overscroll-x-contain scroll-smooth px-4 pb-2"
      >
        {items.map((anime, index) => (
          <li key={anime.id} className="w-[15.5rem] shrink-0 snap-start sm:w-64">
            <Link
              to="/anime/$animeId"
              params={{ animeId: anime.id }}
              className="group flex items-center gap-3"
            >
              <span
                aria-hidden="true"
                className="font-display w-9 shrink-0 text-right text-5xl leading-none text-muted-foreground/40 transition-colors group-hover:text-primary"
              >
                {index + 1}
              </span>
              <span className="relative block aspect-[2/3] w-20 shrink-0 overflow-hidden rounded-md bg-muted ring-1 ring-border/70 group-hover:ring-primary/60">
                {anime.poster ? (
                  <img
                    src={anime.poster}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="flex h-full w-full items-center justify-center">
                    <Film className="h-5 w-5 text-muted-foreground/40" />
                  </span>
                )}
              </span>
              <span className="min-w-0 space-y-1">
                <span className="line-clamp-3 block text-sm font-semibold leading-snug text-foreground group-hover:text-primary">
                  {anime.title}
                </span>
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  {anime.score ? (
                    <span className="inline-flex items-center gap-0.5 font-semibold text-foreground">
                      <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                      {anime.score}
                    </span>
                  ) : null}
                  <span className="truncate">{anime.type || "TV"}</span>
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}
