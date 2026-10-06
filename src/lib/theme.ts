const KEY = "nonton-theme";

export type Theme = "light" | "dark";

export function getStoredTheme(): Theme {
  if (typeof window === "undefined") return "dark";
  const stored = window.localStorage.getItem(KEY);
  if (stored === "light" || stored === "dark") return stored;
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

export function applyTheme(theme: Theme) {
  const root = document.documentElement;

  // Matikan semua transisi sesaat agar ratusan elemen tidak beranimasi warna bersamaan
  root.classList.add("theme-switching");
  root.classList.toggle("dark", theme === "dark");
  try {
    window.localStorage.setItem(KEY, theme);
  } catch {
    // penyimpanan tidak tersedia, abaikan
  }

  // Paksa browser menerapkan gaya baru dalam frame ini, lalu hidupkan transisi lagi
  void root.offsetHeight;
  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => root.classList.remove("theme-switching"));
  });
}
