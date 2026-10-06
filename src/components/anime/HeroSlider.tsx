import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import useEmblaCarousel from "embla-carousel-react";
import type { AnimeSummary } from "@/lib/anime-types";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, Play, Star } from "lucide-react";

export function HeroSlider({ items }: { items: AnimeSummary[] }) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true, duration: 25 });
  const [selected, setSelected] = useState(0);
  const [paused, setPaused] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!emblaApi) return;
    const onSelect = () => setSelected(emblaApi.selectedScrollSnap());
    emblaApi.on("select", onSelect);
    onSelect();
    return () => {
      emblaApi.off("select", onSelect);
    };
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi || items.length <= 1 || paused) return;
    const reduce =
      typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;

    const start = () => {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        if (!document.hidden) emblaApi.scrollNext();
      }, 7000);
    };
    start();
    const onVisibility = () => {
      if (document.hidden) {
        if (timerRef.current) clearInterval(timerRef.current);
      } else {
        start();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [emblaApi, items.length, paused]);

  if (items.length === 0) return null;

  return (
    <section
      id="home-hero-slider"
      aria-label="Anime pilihan"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      className="relative overflow-hidden rounded-xl border border-border bg-card"
    >
      <div ref={emblaRef} className="overflow-hidden">
        <div className="flex">
          {items.map((anime) => {
            const isOngoing =
              /ongoing|tayang/i.test(anime.status ?? "") || Boolean(anime.releaseDay);
            const meta = [
              isOngoing ? "Ongoing" : "Tamat",
              anime.type,
              anime.episodeCount ? `${anime.episodeCount} episode` : null,
              anime.releaseDay,
            ]
              .filter(Boolean)
              .join(" · ");

            return (
              <article key={anime.id} className="relative min-w-0 shrink-0 grow-0 basis-full">
                {anime.poster ? (
                  <div aria-hidden="true" className="pointer-events-none absolute inset-0">
                    <img
                      src={anime.poster}
                      alt=""
                      decoding="async"
                      loading="lazy"
                      className="h-full w-full scale-110 object-cover opacity-20 blur-2xl"
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-card via-card/90 to-card/40" />
                  </div>
                ) : null}

                <div className="relative grid items-center gap-5 p-5 sm:p-8 md:grid-cols-[1fr_auto] lg:p-10">
                  <div className="flex items-start gap-4 md:block">
                    {anime.poster ? (
                      <Link
                        to="/anime/$animeId"
                        params={{ animeId: anime.id }}
                        className="block w-24 shrink-0 overflow-hidden rounded-lg ring-1 ring-border md:hidden"
                      >
                        <img
                          src={anime.poster}
                          alt={anime.title}
                          className="aspect-[2/3] h-full w-full object-cover"
                        />
                      </Link>
                    ) : null}

                    <div className="min-w-0 space-y-3 md:max-w-2xl">
                      <p className="flex items-center gap-2 text-sm text-muted-foreground">
                        {anime.score ? (
                          <span className="inline-flex items-center gap-1 font-semibold text-foreground">
                            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                            {anime.score}
                          </span>
                        ) : null}
                        <span className="truncate">{meta}</span>
                      </p>

                      <h1 className="font-display line-clamp-3 text-2xl text-foreground sm:text-3xl lg:text-5xl">
                        {anime.title}
                      </h1>

                      <p className="line-clamp-2 max-w-xl text-sm leading-relaxed text-muted-foreground sm:line-clamp-3 sm:text-base">
                        {anime.synopsis ||
                          `Tonton ${anime.title} subtitle Indonesia dengan pilihan kualitas 360p sampai 720p.`}
                      </p>

                      <div className="flex items-center gap-4 pt-1">
                        <Link
                          to="/anime/$animeId"
                          params={{ animeId: anime.id }}
                          className="inline-flex h-11 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 active:scale-[0.98]"
                        >
                          <Play className="h-4 w-4 fill-current" />
                          Tonton sekarang
                        </Link>
                        <Link
                          to="/anime/$animeId"
                          params={{ animeId: anime.id }}
                          className="text-sm font-semibold text-foreground underline-offset-4 hover:underline"
                        >
                          Lihat detail
                        </Link>
                      </div>
                    </div>
                  </div>

                  {anime.poster ? (
                    <Link
                      to="/anime/$animeId"
                      params={{ animeId: anime.id }}
                      className="hidden w-44 overflow-hidden rounded-lg ring-1 ring-border md:block lg:w-52"
                    >
                      <img
                        src={anime.poster}
                        alt={anime.title}
                        decoding="async"
                        loading="lazy"
                        className="aspect-[2/3] h-full w-full object-cover"
                      />
                    </Link>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      </div>

      <div className="relative flex items-center justify-between gap-3 border-t border-border px-5 py-3 sm:px-8 lg:px-10">
        <div className="flex items-center gap-1.5" role="tablist" aria-label="Pilih slide">
          {items.map((slide, index) => (
            <button
              key={slide.id}
              type="button"
              role="tab"
              aria-selected={index === selected}
              aria-label={`Slide ${index + 1}: ${slide.title}`}
              onClick={() => emblaApi?.scrollTo(index)}
              className="flex h-6 items-center"
            >
              <span
                className={cn(
                  "block h-1 rounded-full transition-all duration-300",
                  index === selected ? "w-8 bg-primary" : "w-4 bg-foreground/20",
                )}
              />
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => emblaApi?.scrollPrev()}
            aria-label="Anime sebelumnya"
            className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => emblaApi?.scrollNext()}
            aria-label="Anime berikutnya"
            className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </section>
  );
}
