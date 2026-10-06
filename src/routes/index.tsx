import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { HeroSlider } from "@/components/anime/HeroSlider";
import { TrendingSlider } from "@/components/anime/TrendingSlider";
import { Shelf } from "@/components/anime/Shelf";
import { ErrorState } from "@/components/anime/StateViews";
import { RecentlyWatchedSection } from "@/components/anime/RecentlyWatchedSection";
import { homeQuery, currentDayName } from "@/lib/queries";
import {
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Film,
  Flame,
  History,
  Play,
} from "lucide-react";
import { useAnimeProvider } from "@/lib/provider";

function HomeErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="mx-auto max-w-7xl px-4 py-16 text-center space-y-4">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/15 text-destructive border border-destructive/20 shadow-xs">
        <AlertTriangle className="h-7 w-7" />
      </div>
      <h2 className="font-display text-lg sm:text-xl font-bold text-foreground">
        Katalog Sedang Mengalami Kendala Jaringan
      </h2>
      <p className="mx-auto max-w-md text-xs sm:text-sm text-muted-foreground leading-relaxed">
        {error?.message ||
          "Koneksi ke penyedia data sedang sibuk. Silakan coba muat ulang halaman."}
      </p>
      <div className="flex items-center justify-center gap-3 pt-2">
        <button
          type="button"
          onClick={() => {
            if (typeof window !== "undefined") window.location.reload();
            else reset();
          }}
          className="inline-flex h-9 items-center justify-center rounded-xl bg-primary px-5 text-xs font-bold text-primary-foreground shadow-sm hover:bg-primary/90 transition cursor-pointer"
        >
          Muat Ulang Halaman
        </button>
      </div>
    </div>
  );
}

export const Route = createFileRoute("/")({
  loader: async ({ context }) => {
    try {
      await context.queryClient.ensureQueryData(homeQuery());
    } catch {
      // In case of transient network error during SSR prefetch, let client query handle fallback
    }
  },
  errorComponent: HomeErrorComponent,
  head: () => ({
    meta: [
      { title: "Nontonime: Streaming Anime Subtitle Indonesia Terbaru" },
      {
        name: "description",
        content:
          "Nonton anime subtitle Indonesia terlengkap dan terupdate gratis. Streaming lancar dengan pilihan kualitas 360p, 480p, hingga 720p HD.",
      },
      { property: "og:title", content: "Nontonime: Streaming Anime Subtitle Indonesia Terbaru" },
      {
        property: "og:description",
        content:
          "Nonton anime subtitle Indonesia terlengkap dan terupdate gratis. Streaming lancar dengan berbagai pilihan server.",
      },
    ],
  }),
  component: HomePage,
});

// Clean text-only popular genres (strictly no font-awesome icons)
const POPULAR_GENRES = [
  { id: "action", name: "Action" },
  { id: "isekai", name: "Isekai" },
  { id: "fantasy", name: "Fantasy" },
  { id: "romance", name: "Romance" },
  { id: "comedy", name: "Comedy" },
  { id: "shounen", name: "Shounen" },
  { id: "adventure", name: "Adventure" },
  { id: "slice-of-life", name: "Slice of Life" },
  { id: "supernatural", name: "Supernatural" },
  { id: "sci-fi", name: "Sci-Fi" },
  { id: "mystery", name: "Mystery" },
  { id: "drama", name: "Drama" },
  { id: "school", name: "School" },
  { id: "sports", name: "Sports" },
];

function HomePage() {
  const { provider } = useAnimeProvider();
  const { data, isPending, error, refetch } = useQuery(homeQuery(undefined, provider));
  const todayDay = currentDayName();

  return (
    <div className="mx-auto max-w-7xl space-y-8 sm:space-y-12 px-4 py-4 sm:py-6">
      {/* Hero Section Loading / Carousel */}
      {isPending ? (
        <div className="aspect-[16/9] w-full animate-pulse rounded-2xl sm:rounded-3xl bg-muted/60 sm:aspect-[21/9]" />
      ) : null}

      {error ? <ErrorState error={error} onRetry={() => refetch()} /> : null}

      {data && data.slider.length > 0 ? <HeroSlider items={data.slider.slice(0, 7)} /> : null}

      {/* High-Quality Trending Anime Horizontal Slider */}
      {data && (data.hot.length > 0 || data.slider.length > 0) ? (
        <TrendingSlider
          items={data.hot.length > 0 ? data.hot.slice(0, 10) : data.slider.slice(0, 10)}
        />
      ) : null}

      {/* Recently Watched Section */}
      <RecentlyWatchedSection />

      {/* Popular Genres Quick Navigation Bar */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-base sm:text-lg font-bold tracking-tight text-foreground">
              Jelajahi Berdasarkan Genre
            </h2>
            <p className="text-xs text-muted-foreground">
              Pilih kategori favorit untuk menemukan anime pilihan terbaik
            </p>
          </div>
          <Link
            to="/genre"
            className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary/80 transition-colors"
          >
            <span>Semua Genre</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <div className="edge-fade no-scrollbar -mx-4 flex items-center gap-2 overflow-x-auto px-4 pb-1">
          {POPULAR_GENRES.map((g) => (
            <Link
              key={g.id}
              to="/genre/$genreId"
              params={{ genreId: g.id }}
              search={{ page: 1, name: g.name }}
              className="inline-flex h-8 shrink-0 items-center rounded-lg border border-border/80 bg-card px-3 text-xs font-medium text-foreground transition-colors hover:border-primary/60 hover:bg-secondary hover:text-primary active:scale-95 shadow-2xs"
            >
              {g.name}
            </Link>
          ))}
          <Link
            to="/genre"
            className="inline-flex h-8 shrink-0 items-center rounded-lg border border-dashed border-border bg-secondary/40 px-3 text-xs font-semibold text-muted-foreground transition-colors hover:border-primary hover:text-primary hover:bg-secondary"
          >
            +30 Genre Lainnya
          </Link>
        </div>
      </section>

      {/* Ongoing / Tayang Section */}
      <Shelf
        title={`Tayang Hari ${todayDay}`}
        icon={CalendarDays}
        items={data?.today ?? []}
        isLoading={isPending}
        viewAllTo="/jadwal"
      />

      <Shelf
        title="Sedang Tayang (Ongoing)"
        icon={Flame}
        items={data?.hot ?? []}
        isLoading={isPending}
        viewAllTo="/ongoing"
        viewAllSearch={{ page: 1 }}
      />

      <Shelf
        title="Anime Tamat Terbaru (Completed)"
        icon={CheckCircle2}
        items={data?.popular ?? []}
        isLoading={isPending}
        viewAllTo="/tamat"
        viewAllSearch={{ page: 1 }}
      />

      <Shelf
        title="Rekomendasi Pilihan"
        icon={Film}
        items={data?.new ?? []}
        isLoading={isPending}
      />
    </div>
  );
}
