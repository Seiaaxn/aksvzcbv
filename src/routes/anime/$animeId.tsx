import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Film,
  LayoutGrid,
  List,
  Package,
  Play,
  Search,
  Star,
} from "lucide-react";
import { AnimeCard } from "@/components/anime/AnimeCard";
import { WatchlistButton } from "@/components/anime/WatchlistButton";
import { ShareButton } from "@/components/anime/ShareButton";
import { ErrorState, LoadingState } from "@/components/anime/StateViews";
import { animeDetailQuery } from "@/lib/queries";
import { readHistory, type HistoryItem } from "@/lib/history";
import { cn } from "@/lib/utils";
import { providerForId } from "@/lib/provider";

export const Route = createFileRoute("/anime/$animeId")({
  head: ({ params }) => {
    const name = params.animeId.replace(/-/g, " ");
    return {
      meta: [
        { title: `${name} : Nontonime` },
        {
          name: "description",
          content: `Streaming dan unduh anime ${name} subtitle Indonesia. Sinopsis lengkap, jadwal, dan daftar episode.`,
        },
        { property: "og:title", content: `${name} : Nontonime` },
        {
          property: "og:description",
          content: `Streaming anime ${name} subtitle Indonesia.`,
        },
      ],
    };
  },
  component: AnimeDetailPage,
});

export function AnimeDetailPage() {
  const { animeId } = Route.useParams();
  const {
    data: anime,
    isPending,
    error,
    refetch,
  } = useQuery(animeDetailQuery(animeId, providerForId(animeId)));

  const [historyItem, setHistoryItem] = useState<HistoryItem | null>(null);
  const [synopsisOpen, setSynopsisOpen] = useState(false);
  const [episodeSearch, setEpisodeSearch] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  useEffect(() => {
    const history = readHistory();
    const found = history.find((h) => h.animeId === animeId);
    setHistoryItem(found ?? null);
  }, [animeId]);

  const episodes = useMemo(() => {
    return anime?.episodes ?? [];
  }, [anime?.episodes]);

  const sortedEpisodes = useMemo(() => {
    return [...episodes].sort((a, b) => a.number - b.number);
  }, [episodes]);

  const filteredEpisodes = useMemo(() => {
    if (!episodeSearch.trim()) return sortedEpisodes;
    const q = episodeSearch.toLowerCase().trim();
    return sortedEpisodes.filter(
      (ep) => String(ep.number).includes(q) || ep.title.toLowerCase().includes(q),
    );
  }, [sortedEpisodes, episodeSearch]);

  const firstEpisode = sortedEpisodes[0] ?? null;
  const continueEpisode = historyItem
    ? episodes.find((ep) => ep.id === historyItem.episodeId)
    : undefined;

  const targetEpisode = continueEpisode ?? firstEpisode;
  const targetLabel = continueEpisode
    ? `Lanjutkan Episode ${continueEpisode.number}`
    : firstEpisode
      ? `Nonton Episode ${firstEpisode.number}`
      : "Nonton Sekarang";

  if (isPending) return <LoadingState label="Memuat informasi anime..." />;
  if (error || !anime) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <ErrorState error={error || new Error("Anime tidak ditemukan")} onRetry={() => refetch()} />
      </div>
    );
  }

  const isOngoing = /ongoing|tayang/i.test(anime.status ?? "");

  const quickFacts = [
    isOngoing ? "Ongoing" : "Tamat",
    anime.type,
    anime.totalEpisodes ? `${anime.totalEpisodes} episode` : null,
    anime.duration,
    anime.studio,
  ].filter(Boolean) as string[];

  return (
    <div className="mx-auto max-w-7xl space-y-10 px-4 py-5 sm:py-8">
      {/* Kepala: poster + judul + aksi utama */}
      <header className="relative overflow-hidden rounded-xl border border-border bg-card">
        {anime.poster ? (
          <div aria-hidden="true" className="pointer-events-none absolute inset-0">
            <img
              src={anime.poster}
              alt=""
              className="h-full w-full scale-110 object-cover opacity-20 blur-2xl"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-card via-card/90 to-card/50" />
          </div>
        ) : null}

        <div className="relative flex flex-col items-center gap-6 p-5 sm:p-8 md:flex-row md:items-start lg:gap-10 lg:p-10">
          <div className="w-40 shrink-0 overflow-hidden rounded-lg bg-muted ring-1 ring-border sm:w-52 lg:w-60">
            {anime.poster ? (
              <img
                src={anime.poster}
                alt={anime.title}
                className="aspect-[2/3] h-full w-full object-cover"
              />
            ) : (
              <div className="flex aspect-[2/3] items-center justify-center text-muted-foreground">
                <Film className="h-10 w-10 opacity-40" />
              </div>
            )}
          </div>

          <div className="w-full min-w-0 flex-1 space-y-4 text-center md:text-left">
            <div className="space-y-2">
              {anime.japanese ? (
                <p className="text-sm text-muted-foreground">{anime.japanese}</p>
              ) : null}
              <h1 className="font-display text-2xl text-foreground sm:text-3xl lg:text-4xl">
                {anime.title}
              </h1>
            </div>

            <p className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-sm text-muted-foreground md:justify-start">
              {anime.score ? (
                <span className="inline-flex items-center gap-1 font-semibold text-foreground">
                  <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                  {anime.score}
                </span>
              ) : null}
              <span>{quickFacts.join(" · ")}</span>
            </p>

            {anime.genres && anime.genres.length > 0 ? (
              <div className="flex flex-wrap justify-center gap-2 md:justify-start">
                {anime.genres.map((g) => (
                  <Link
                    key={g}
                    to="/genre/$genreId"
                    params={{ genreId: g.toLowerCase().replace(/\s+/g, "-") }}
                    className="rounded-full border border-border bg-background/70 px-3 py-1 text-xs font-medium text-muted-foreground transition-colors hover:border-primary hover:text-primary"
                  >
                    {g}
                  </Link>
                ))}
              </div>
            ) : null}

            <div className="flex flex-wrap items-center justify-center gap-3 pt-1 md:justify-start">
              {targetEpisode ? (
                <Link
                  to="/watch/$episodeId"
                  params={{ episodeId: targetEpisode.id }}
                  search={{ a: anime.id }}
                  className="press-soft inline-flex h-11 items-center gap-2 rounded-lg bg-primary px-6 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
                >
                  <Play className="h-4 w-4 fill-current" />
                  {targetLabel}
                </Link>
              ) : null}

              <WatchlistButton
                animeId={anime.id}
                title={anime.title}
                poster={anime.poster}
                variant="outline"
              />

              {anime.batch ? (
                <Link
                  to="/download/$batchId"
                  params={{ batchId: anime.batch.batchId }}
                  className="press-soft inline-flex h-11 items-center gap-2 rounded-lg border border-border bg-background/70 px-4 text-sm font-semibold text-foreground transition-colors hover:border-primary hover:text-primary"
                >
                  <Package className="h-4 w-4" />
                  Unduh batch
                </Link>
              ) : null}

              <ShareButton title={anime.title} />
            </div>
          </div>
        </div>
      </header>

      <div className="grid gap-10 lg:grid-cols-12">
        <div className="space-y-10 lg:col-span-8">
          {anime.synopsis ? (
            <section className="space-y-3">
              <h2 className="section-head font-display text-xl text-foreground sm:text-2xl">
                Sinopsis
              </h2>
              <p
                className={cn(
                  "max-w-prose whitespace-pre-line text-[15px] leading-relaxed text-muted-foreground",
                  !synopsisOpen && "line-clamp-4",
                )}
              >
                {anime.synopsis}
              </p>
              <button
                type="button"
                onClick={() => setSynopsisOpen((v) => !v)}
                className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
              >
                {synopsisOpen ? "Tutup" : "Baca selengkapnya"}
                {synopsisOpen ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </button>
            </section>
          ) : null}

          <section className="space-y-4">
            <div className="section-head">
              <h2 className="font-display text-xl text-foreground sm:text-2xl">
                Episode
                <span className="ml-2 text-base text-muted-foreground">
                  {sortedEpisodes.length}
                </span>
              </h2>

              <div className="flex items-center gap-2">
                {sortedEpisodes.length > 6 ? (
                  <label className="relative block w-36 sm:w-48">
                    <span className="sr-only">Cari episode</span>
                    <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Cari episode"
                      value={episodeSearch}
                      onChange={(e) => setEpisodeSearch(e.target.value)}
                      className="h-9 w-full rounded-lg border border-border bg-background pl-8 pr-2 text-sm text-foreground placeholder:text-muted-foreground"
                    />
                  </label>
                ) : null}

                <div className="flex items-center rounded-lg border border-border bg-background p-0.5">
                  {(
                    [
                      ["grid", LayoutGrid, "Tampilan kotak"],
                      ["list", List, "Tampilan daftar"],
                    ] as const
                  ).map(([mode, Icon, label]) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setViewMode(mode)}
                      aria-label={label}
                      aria-pressed={viewMode === mode}
                      className={cn(
                        "flex h-8 w-8 items-center justify-center rounded-md transition-colors",
                        viewMode === mode
                          ? "bg-secondary text-primary"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {filteredEpisodes.length > 0 ? (
              viewMode === "grid" ? (
                <div className="grid grid-cols-[repeat(auto-fill,minmax(56px,1fr))] gap-2 sm:grid-cols-[repeat(auto-fill,minmax(64px,1fr))]">
                  {filteredEpisodes.map((ep) => {
                    const isLastWatched = historyItem?.episodeId === ep.id;
                    return (
                      <Link
                        key={ep.id}
                        to="/watch/$episodeId"
                        params={{ episodeId: ep.id }}
                        search={{ a: anime.id }}
                        title={ep.title}
                        className={cn(
                          "flex aspect-square items-center justify-center rounded-lg border text-sm font-semibold transition-colors",
                          isLastWatched
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border bg-card text-card-foreground hover:border-primary hover:text-primary",
                        )}
                      >
                        {ep.number}
                      </Link>
                    );
                  })}
                </div>
              ) : (
                <ul className="divide-y divide-border rounded-xl border border-border bg-card">
                  {filteredEpisodes.map((ep) => {
                    const isLastWatched = historyItem?.episodeId === ep.id;
                    return (
                      <li key={ep.id}>
                        <Link
                          to="/watch/$episodeId"
                          params={{ episodeId: ep.id }}
                          search={{ a: anime.id }}
                          className={cn(
                            "flex items-center justify-between gap-3 p-3 transition-colors hover:bg-secondary/60",
                            isLastWatched && "bg-primary/10",
                          )}
                        >
                          <span className="flex min-w-0 items-center gap-3">
                            <span className="w-8 shrink-0 text-sm font-semibold text-muted-foreground">
                              {ep.number}
                            </span>
                            <span className="truncate text-sm font-medium text-foreground">
                              {ep.title}
                            </span>
                          </span>
                          <Play className="h-4 w-4 shrink-0 text-primary" />
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )
            ) : (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Episode tidak ditemukan.
              </p>
            )}
          </section>
        </div>

        <aside className="space-y-10 lg:col-span-4">
          <section className="space-y-3">
            <h2 className="section-head font-display text-xl text-foreground">Informasi</h2>
            <dl className="divide-y divide-border text-sm">
              {(
                [
                  ["Status", anime.status],
                  ["Rilis", anime.aired],
                  ["Studio", anime.studio],
                  ["Produser", anime.producers],
                  ["Total episode", anime.totalEpisodes],
                ] as const
              )
                .filter(([, value]) => Boolean(value))
                .map(([label, value]) => (
                  <div key={label} className="flex justify-between gap-4 py-2.5">
                    <dt className="text-muted-foreground">{label}</dt>
                    <dd className="text-right font-medium text-foreground">{value}</dd>
                  </div>
                ))}
            </dl>
          </section>

          {anime.recommended && anime.recommended.length > 0 ? (
            <section className="space-y-4">
              <h2 className="section-head font-display text-xl text-foreground">
                Mirip dengan ini
              </h2>
              <div className="grid grid-cols-2 gap-4">
                {anime.recommended.slice(0, 4).map((rec) => (
                  <AnimeCard key={rec.id} anime={rec} showWatchlist={false} />
                ))}
              </div>
            </section>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
