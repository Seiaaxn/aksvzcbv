import { useRef } from "react";
import { Link } from "@tanstack/react-router";
import type { AnimeSummary } from "@/lib/anime-types";
import { AnimeCard } from "./AnimeCard";
import { RowSkeleton } from "./StateViews";
import { ChevronLeft, ChevronRight } from "lucide-react";

export function Shelf({
  title,
  caption,
  items,
  isLoading,
  viewAllTo,
  viewAllSearch,
}: {
  title: string;
  caption?: string;
  items: AnimeSummary[];
  isLoading?: boolean;
  viewAllTo?: string;
  viewAllSearch?: Record<string, unknown>;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  if (!isLoading && items.length === 0) return null;

  const scroll = (direction: "left" | "right") => {
    scrollRef.current?.scrollBy({
      left: direction === "left" ? -520 : 520,
      behavior: "smooth",
    });
  };

  return (
    <section className="space-y-4">
      <div className="section-head">
        <div className="min-w-0">
          <h2 className="font-display text-xl text-foreground sm:text-2xl">{title}</h2>
          {caption ? <p className="mt-1 text-sm text-muted-foreground">{caption}</p> : null}
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {viewAllTo ? (
            <Link
              to={viewAllTo as never}
              search={viewAllSearch as never}
              className="inline-flex items-center gap-0.5 text-sm font-semibold text-primary hover:underline"
            >
              Lihat semua
              <ChevronRight className="h-4 w-4" />
            </Link>
          ) : null}
          <div className="ml-2 hidden items-center gap-1 sm:flex">
            <button
              type="button"
              onClick={() => scroll("left")}
              aria-label="Gulir ke kiri"
              className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition hover:bg-secondary hover:text-foreground"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => scroll("right")}
              aria-label="Gulir ke kanan"
              className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition hover:bg-secondary hover:text-foreground"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {isLoading ? (
        <RowSkeleton />
      ) : (
        <div
          ref={scrollRef}
          className="no-scrollbar -mx-4 flex items-stretch gap-4 overflow-x-auto overscroll-x-contain scroll-smooth px-4 pb-2"
        >
          {items.map((anime) => (
            <div key={anime.id} className="flex w-[8.75rem] shrink-0 flex-col sm:w-44">
              <AnimeCard anime={anime} showWatchlist={false} />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
