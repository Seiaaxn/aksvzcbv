import { arrayUnion, doc, setDoc } from "firebase/firestore";
import { auth, db } from "./firebase";
import { addExp } from "./gamification";

/**
 * Buku catatan hadiah EXP satu kali.
 * Setiap hadiah punya kunci unik, misalnya "ep:12345" untuk menonton episode 12345.
 * Kunci yang sudah tercatat tidak akan memberi EXP lagi, walau episodenya ditonton ulang,
 * halaman dimuat ulang, atau akun dibuka di perangkat lain (kunci ikut disimpan di Firestore).
 */

const KEY_PREFIX = "nonton-exp-ledger-v1:";
const MAX_KEYS = 5000;

const cache = new Map<string, Set<string>>();

function load(uid: string): Set<string> {
  const hit = cache.get(uid);
  if (hit) return hit;
  let set = new Set<string>();
  if (typeof window !== "undefined") {
    try {
      const raw = window.localStorage.getItem(KEY_PREFIX + uid);
      const parsed: unknown = raw ? JSON.parse(raw) : [];
      if (Array.isArray(parsed)) set = new Set(parsed.filter((k): k is string => typeof k === "string"));
    } catch {
      // data rusak: mulai dari kosong
    }
  }
  cache.set(uid, set);
  return set;
}

function persist(uid: string, set: Set<string>) {
  if (typeof window === "undefined") return;
  const keys = Array.from(set).slice(-MAX_KEYS);
  try {
    window.localStorage.setItem(KEY_PREFIX + uid, JSON.stringify(keys));
  } catch {
    // penyimpanan penuh: abaikan, kunci tetap ada di memori dan Firestore
  }
}

export function hasRewarded(uid: string, key: string): boolean {
  return load(uid).has(key);
}

/** Jumlah kunci berawalan tertentu, misalnya countRewarded(uid, "ep:") = jumlah episode unik. */
export function countRewarded(uid: string, prefix: string): number {
  let n = 0;
  for (const k of load(uid)) if (k.startsWith(prefix)) n += 1;
  return n;
}

/** Gabungkan kunci dari Firestore ke salinan lokal. Dipanggil saat dokumen user diterima. */
export function applyRemoteLedger(uid: string, remote: unknown) {
  if (!Array.isArray(remote)) return;
  const set = load(uid);
  let changed = false;
  for (const k of remote) {
    if (typeof k === "string" && !set.has(k)) {
      set.add(k);
      changed = true;
    }
  }
  if (changed) persist(uid, set);
}

/**
 * Beri EXP hanya jika kunci ini belum pernah dihadiahi.
 * Mengembalikan true kalau EXP baru saja diberikan.
 */
export function rewardOnce(
  key: string,
  amount: number,
  reason: string,
  opts: { silent?: boolean } = {},
): boolean {
  const user = auth.currentUser;
  if (!user || amount <= 0) return false;
  const set = load(user.uid);
  if (set.has(key)) return false;

  // Catat dulu sebelum memberi EXP, supaya pemanggilan ganda tidak lolos.
  set.add(key);
  persist(user.uid, set);
  setDoc(
    doc(db, "users", user.uid),
    { expLedger: arrayUnion(key), updatedAt: new Date().toISOString() },
    { merge: true },
  ).catch((err) => console.warn("Gagal menyimpan catatan hadiah:", err));

  addExp(amount, reason, opts);
  return true;
}
