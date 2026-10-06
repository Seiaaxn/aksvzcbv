import { auth } from "./firebase";

/** True hanya untuk akun Firebase asli (login atau daftar). */
export function isLoggedIn(): boolean {
  return typeof window !== "undefined" && Boolean(auth.currentUser);
}

/** Minta SiteHeader membuka modal login/daftar dari komponen mana pun. */
export function requestLogin(tab: "login" | "register" = "login") {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("open-auth-modal", { detail: { tab } }));
}
