import { useEffect } from "react";
import { useAuth } from "@/lib/firebase";
import { startActiveTimeTracking } from "@/lib/active-time";

/** Tidak menampilkan apa pun. Mencatat jam aktif akun yang sedang login. */
export function ActiveTimeTracker() {
  const { user } = useAuth();
  const uid = user?.uid;

  useEffect(() => {
    if (!uid) return;
    return startActiveTimeTracking(uid);
  }, [uid]);

  return null;
}
