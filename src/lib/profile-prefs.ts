import { useEffect, useState } from "react";
import { doc, setDoc } from "firebase/firestore";
import { updateProfile, type User } from "firebase/auth";
import { db } from "./firebase";
import { DEFAULT_EQUIPPED, type EquippedCosmetics } from "./cosmetics";

export interface ProfilePrefs {
  /** Nama tampilan buatan pengguna. Kosong berarti pakai nama akun. */
  displayName?: string | undefined;
  /** Foto profil kustom (data URL JPEG kecil). Kosong berarti pakai foto akun. */
  customPhoto?: string | undefined;
  showRankTag: boolean;
  showTitle: boolean;
  equipped: EquippedCosmetics;
}

export const DEFAULT_PREFS: ProfilePrefs = {
  showRankTag: true,
  showTitle: true,
  equipped: DEFAULT_EQUIPPED,
};

const KEY_PREFIX = "nonton-profile-prefs-v1:";
const EVENT = "profile-prefs-updated";

export const USERNAME_MIN = 3;
export const USERNAME_MAX = 20;

function normalize(raw: Partial<ProfilePrefs> | null | undefined): ProfilePrefs {
  return {
    displayName: typeof raw?.displayName === "string" ? raw.displayName : undefined,
    customPhoto: typeof raw?.customPhoto === "string" && raw.customPhoto ? raw.customPhoto : undefined,
    showRankTag: raw?.showRankTag !== false,
    showTitle: raw?.showTitle !== false,
    equipped: { ...DEFAULT_EQUIPPED, ...(raw?.equipped ?? {}) },
  };
}

export function readProfilePrefs(uid: string): ProfilePrefs {
  if (typeof window === "undefined") return DEFAULT_PREFS;
  try {
    const raw = window.localStorage.getItem(KEY_PREFIX + uid);
    return normalize(raw ? (JSON.parse(raw) as Partial<ProfilePrefs>) : null);
  } catch {
    return DEFAULT_PREFS;
  }
}

function writeLocal(uid: string, prefs: ProfilePrefs) {
  try {
    window.localStorage.setItem(KEY_PREFIX + uid, JSON.stringify(prefs));
  } catch {
    // Penyimpanan penuh atau diblokir: abaikan, data tetap tersimpan di Firestore.
  }
  window.dispatchEvent(new Event(EVENT));
}

/** Dipanggil saat dokumen user dari Firestore berubah. Tidak menulis balik ke Firestore. */
export function applyRemotePrefs(uid: string, remote: Partial<ProfilePrefs> | undefined) {
  if (typeof window === "undefined" || !remote) return;
  writeLocal(uid, normalize(remote));
}

/** Batas tunggu balasan server. Lewat dari ini, perubahan tetap tersimpan lokal dan dikirim di latar belakang. */
const SYNC_TIMEOUT_MS = 6000;

/**
 * setDoc/updateProfile baru selesai setelah server membalas. Di koneksi lambat atau terblokir,
 * promise-nya menggantung dan tombol terlihat loading terus. Fungsi ini menunggu paling lama
 * `ms`, lalu menyerah dengan hasil `false` (bukan error). Kegagalan sungguhan tetap dilempar.
 */
async function settleWithin(task: Promise<unknown>, ms = SYNC_TIMEOUT_MS): Promise<boolean> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<false>((resolve) => {
    timer = setTimeout(() => resolve(false), ms);
  });
  try {
    const done = task.then(() => true as const);
    return await Promise.race([done, timeout]);
  } finally {
    if (timer) clearTimeout(timer);
    // Cegah unhandled rejection kalau task gagal setelah timeout.
    task.catch((err) => console.warn("Sinkronisasi tertunda gagal:", err));
  }
}

/**
 * Gabungkan perubahan, simpan lokal (langsung tampil di layar), lalu sinkronkan ke Firestore.
 * Mengembalikan `true` jika server sudah membalas, `false` jika masih tertunda (koneksi lambat).
 */
export async function saveProfilePrefs(uid: string, patch: Partial<ProfilePrefs>): Promise<boolean> {
  const current = readProfilePrefs(uid);
  const next = normalize({
    ...current,
    ...patch,
    equipped: { ...current.equipped, ...(patch.equipped ?? {}) },
  });
  writeLocal(uid, next);
  return settleWithin(
    setDoc(
      doc(db, "users", uid),
      {
        profilePrefs: {
          displayName: next.displayName ?? "",
          customPhoto: next.customPhoto ?? "",
          showRankTag: next.showRankTag,
          showTitle: next.showTitle,
          equipped: next.equipped,
        },
        updatedAt: new Date().toISOString(),
      },
      { merge: true },
    ),
  );
}

export function useProfilePrefs(uid: string | null | undefined): ProfilePrefs {
  const [prefs, setPrefs] = useState<ProfilePrefs>(DEFAULT_PREFS);
  useEffect(() => {
    if (!uid) {
      setPrefs(DEFAULT_PREFS);
      return;
    }
    const sync = () => setPrefs(readProfilePrefs(uid));
    sync();
    window.addEventListener(EVENT, sync);
    return () => window.removeEventListener(EVENT, sync);
  }, [uid]);
  return prefs;
}

/** Nama dan foto yang tampil: pilihan pengguna lebih dulu, lalu data akun. */
export function resolveIdentity(user: User, prefs: ProfilePrefs) {
  const name =
    prefs.displayName?.trim() || user.displayName || user.email?.split("@")[0] || "Pengguna";
  const photo = prefs.customPhoto || user.photoURL || "";
  return { name, photo };
}

/* ───────── nama pengguna ───────── */

export function validateUsername(raw: string): string | null {
  const name = raw.trim();
  if (name.length < USERNAME_MIN) return `Minimal ${USERNAME_MIN} karakter.`;
  if (name.length > USERNAME_MAX) return `Maksimal ${USERNAME_MAX} karakter.`;
  if (!/^[\p{L}\p{N} ._-]+$/u.test(name)) {
    return "Hanya huruf, angka, spasi, titik, garis bawah, dan strip.";
  }
  return null;
}

export async function updateUsername(user: User, raw: string): Promise<boolean> {
  const error = validateUsername(raw);
  if (error) throw new Error(error);
  const name = raw.trim().replace(/\s+/g, " ");
  // Tampilkan nama baru lebih dulu; sisanya disinkronkan tanpa membuat tombol menggantung.
  const prefsSynced = await saveProfilePrefs(user.uid, { displayName: name });
  const authSynced = await settleWithin(
    Promise.all([
      updateProfile(user, { displayName: name }),
      setDoc(
        doc(db, "users", user.uid),
        { displayName: name, updatedAt: new Date().toISOString() },
        { merge: true },
      ),
    ]),
  );
  return prefsSynced && authSynced;
}

/* ───────── foto profil ───────── */

const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
const AVATAR_SIZE = 256;
const MAX_DATA_URL_CHARS = 120_000;

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    // Format yang tidak bisa didekode kadang tidak memicu onload maupun onerror.
    const timer = setTimeout(() => {
      URL.revokeObjectURL(url);
      reject(new Error("Gambar terlalu lama dibaca. Coba file JPG atau PNG."));
    }, 15000);
    img.onload = () => {
      clearTimeout(timer);
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      clearTimeout(timer);
      URL.revokeObjectURL(url);
      reject(new Error("File gambar tidak bisa dibaca."));
    };
    img.src = url;
  });
}

/** Potong jadi persegi di tengah, kecilkan ke 256px, simpan sebagai JPEG. */
export async function fileToAvatarDataUrl(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("Pilih file gambar (JPG, PNG, atau WebP).");
  if (file.size > MAX_UPLOAD_BYTES) throw new Error("Ukuran gambar maksimal 8 MB.");

  const img = await loadImage(file);
  const side = Math.min(img.naturalWidth, img.naturalHeight);
  const sx = (img.naturalWidth - side) / 2;
  const sy = (img.naturalHeight - side) / 2;

  const canvas = document.createElement("canvas");
  canvas.width = AVATAR_SIZE;
  canvas.height = AVATAR_SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Browser tidak mendukung pemrosesan gambar.");
  ctx.fillStyle = "#18181b";
  ctx.fillRect(0, 0, AVATAR_SIZE, AVATAR_SIZE);
  ctx.drawImage(img, sx, sy, side, side, 0, 0, AVATAR_SIZE, AVATAR_SIZE);

  for (const quality of [0.85, 0.7, 0.55]) {
    const dataUrl = canvas.toDataURL("image/jpeg", quality);
    if (dataUrl.length <= MAX_DATA_URL_CHARS) return dataUrl;
  }
  throw new Error("Gambar terlalu besar setelah dikecilkan. Coba gambar lain.");
}

/** Mengembalikan true jika sudah tersinkron ke server, false jika masih menunggu koneksi. */
export async function setCustomPhoto(uid: string, file: File): Promise<boolean> {
  const dataUrl = await fileToAvatarDataUrl(file);
  return saveProfilePrefs(uid, { customPhoto: dataUrl });
}

export async function clearCustomPhoto(uid: string): Promise<boolean> {
  return saveProfilePrefs(uid, { customPhoto: undefined });
}
