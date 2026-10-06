import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { HeroSlider } from "@/components/anime/HeroSlider";
import { TrendingSlider } from "@/components/anime/TrendingSlider";
import { Shelf } from "@/components/anime/Shelf";
import { ErrorState } from "@/components/anime/StateViews";
import { RecentlyWatchedSection } from "@/components/anime/RecentlyWatchedSection";
import { homeQuery, currentDayName } from "@/lib/queries";
import { AlertTriangle, ChevronRight } from "lucide-react";
import { useAnimeProvider } from "@/lib/provider";

function HomeErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="mx-auto max-w-7xl px-4 py-16 text-center space-y-4">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
        <AlertTriangle className="h-7 w-7" />
      </div>
      <h2 className="font-display text-xl text-foreground">
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
          className="inline-flex h-10 items-center justify-center rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground hover:opacity-90 transition cursor-pointer"
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

// Genre populer (teks saja)
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
    <div className="mx-auto max-w-7xl space-y-10 px-4 py-5 sm:space-y-14 sm:py-8">
      {isPending ? <div className="aspect-[16/10] w-full animate-pulse rounded-xl bg-muted/60 sm:aspect-[21/9]" /> : null}

      {error ? <ErrorState error={error} onRetry={() => refetch()} /> : null}

      {data && data.slider.length > 0 ? <HeroSlider items={data.slider.slice(0, 7)} /> : null}

      <RecentlyWatchedSection />

      <Shelf
        title={`Tayang hari ${todayDay}`}
        caption="Rilis terbaru sesuai jadwal hari ini"
        items={data?.today ?? []}
        isLoading={isPending}
        viewAllTo="/jadwal"
      />

      {data && (data.hot.length > 0 || data.slider.length > 0) ? (
        <TrendingSlider
          items={data.hot.length > 0 ? data.hot.slice(0, 10) : data.slider.slice(0, 10)}
        />
      ) : null}

      <section className="space-y-4" aria-labelledby="genre-heading">
        <div className="section-head">
          <h2 id="genre-heading" className="font-display text-xl text-foreground sm:text-2xl">
            Jelajahi genre
          </h2>
          <Link
            to="/genre"
            className="inline-flex items-center gap-0.5 text-sm font-semibold text-primary hover:underline"
          >
            Semua genre
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="no-scrollbar -mx-4 flex flex-wrap gap-2 px-4 sm:mx-0 sm:px-0">
          {POPULAR_GENRES.map((g) => (
            <Link
              key={g.id}
              to="/genre/$genreId"
              params={{ genreId: g.id }}
              search={{ page: 1, name: g.name }}
              className="inline-flex h-9 items-center rounded-full border border-border bg-card px-4 text-sm font-medium text-foreground transition-colors hover:border-primary hover:text-primary"
            >
              {g.name}
            </Link>
          ))}
        </div>
      </section>

      <Shelf
        title="Sedang tayang"
        caption="Anime ongoing dengan episode terbaru"
        items={data?.hot ?? []}
        isLoading={isPending}
        viewAllTo="/ongoing"
        viewAllSearch={{ page: 1 }}
      />

      <Shelf
        title="Tamat terbaru"
        caption="Siap ditonton sampai episode terakhir"
        items={data?.popular ?? []}
        isLoading={isPending}
        viewAllTo="/tamat"
        viewAllSearch={{ page: 1 }}
      />

      <Shelf title="Rekomendasi" items={data?.new ?? []} isLoading={isPending} />
    </div>
  );
}
