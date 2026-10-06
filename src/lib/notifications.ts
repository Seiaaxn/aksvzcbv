import {
  showLocalNotification,
  requestNotificationPermission,
  unsubscribeFromPush,
  getPermission,
  getNotificationPref,
  setNotificationPref,
} from "./push";
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from "./firebase";

export interface SiteUpdateItem {
  id: string;
  version: string;
  title: string;
  description: string;
  date: string;
  tag: "fitur" | "server" | "jadwal" | "sistem";
  unread?: boolean;
  /** Rincian perubahan yang tampil di halaman /notifikasi */
  changes?: string[];
}

export const RECENT_SITE_UPDATES: SiteUpdateItem[] = [
  {
    id: "update-v19",
    version: "v1.9",
    title: "Tampilan Baru Lebih Bersih & Notifikasi Anime Baru",
    description:
      "Beranda, detail anime, pemutar, dan profil didesain ulang dengan palet Graphite Cyan. Kamu juga mendapat pemberitahuan saat ada anime atau episode baru.",
    date: "6 Okt 2026",
    tag: "fitur",
    changes: [
      "Tampilan lebih tenang: warna lebih sedikit, kartu lebih ringan, huruf lebih jelas.",
      "Semua emoji diganti ikon vektor yang konsisten di setiap perangkat.",
      "Situs memeriksa anime dan episode baru tiap 5 menit, lalu memberi tahu lewat banner, lonceng, dan notifikasi HP.",
    ],
  },
  {
    id: "update-v18",
    version: "v1.8",
    title: "Halaman Notifikasi Baru & Saklar Aktif/Nonaktif",
    description:
      "Tombol lonceng kini membuka halaman Notifikasi berisi daftar perubahan situs, dan kamu bisa menyalakan atau mematikan notifikasi kapan saja.",
    date: "5 Okt 2026",
    tag: "sistem",
    changes: [
      "Tombol lonceng di navbar membuka halaman /notifikasi, bukan pop-up lagi.",
      "Ada saklar untuk mengaktifkan atau menonaktifkan notifikasi HP & browser.",
      "Jika diblokir browser, halaman memberi tahu cara mengizinkannya kembali.",
    ],
  },
  {
    id: "update-v17",
    version: "v1.7",
    title: "Scroll Lebih Mulus & Ganti Tema Instan",
    description:
      "Efek blur berat dihapus dari kartu, header, dan menu bawah supaya scroll tidak patah-patah, dan pergantian tema terang/gelap kini langsung.",
    date: "5 Okt 2026",
    tag: "sistem",
    changes: [
      "Kartu anime, header, dan menu bawah lebih ringan dirender.",
      "Tombol terang/gelap berpindah tema seketika tanpa jeda.",
      'Animasi otomatis mengikuti pengaturan "kurangi animasi" di perangkat.',
    ],
  },
  {
    id: "update-v16",
    version: "v1.6",
    title: "Watchlist, Riwayat & EXP Kini Wajib Login",
    description:
      "Fitur yang menyimpan data pribadi hanya tersedia untuk akun terdaftar agar datamu aman dan tersinkron di semua perangkat.",
    date: "5 Okt 2026",
    tag: "fitur",
    changes: [
      "Bookmark, Riwayat Tontonan, dan EXP butuh akun (login atau daftar).",
      "Mode tamu dihapus; akun Email atau Google yang dipakai.",
      "Beranda dibuat lebih bersih: gacha, download, panduan, dan footer dihapus.",
    ],
  },
  {
    id: "update-v15",
    version: "v1.5",
    title: "Sistem Level, EXP, Rank & Akun Email Resmi Hadir!",
    description:
      "Kini kamu bisa masuk lewat Email atau Google, mengumpulkan EXP dari nonton anime & absen harian, serta menaikkan rank wibu kamu.",
    date: "Hari ini",
    tag: "fitur",
  },
  {
    id: "update-v14",
    version: "v1.4",
    title: "Auto-Next Episode & Pelindung Anti-Iklan Pop-up",
    description:
      "Episode selanjutnya otomatis diputar setelah selesai. Player video kini terlindungi sandbox dari pop-up dan redirect paksa.",
    date: "Kemarin",
    tag: "fitur",
  },
  {
    id: "update-v13",
    version: "v1.3",
    title: "Server Streaming Cepat 720p HD & Multi-Cadangan",
    description:
      "Peningkatan kecepatan pemutaran video dengan caching cerdas dan opsi pilihan resolusi 360p, 480p, hingga 720p.",
    date: "3 hari lalu",
    tag: "server",
  },
  {
    id: "update-v12",
    version: "v1.2",
    title: "Jadwal Rilis Harian & Sinkronisasi Cloud Firebase",
    description:
      "Pantau anime favorit yang rilis tiap hari dari Senin sampai Minggu dengan sinkronisasi otomatis ke akun Google.",
    date: "Minggu lalu",
    tag: "jadwal",
  },
];

const READ_UPDATES_KEY = "nonton-read-updates-v1";

export function getReadUpdateIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(READ_UPDATES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function markUpdateAsRead(id: string) {
  if (typeof window === "undefined") return;
  const list = getReadUpdateIds();
  if (!list.includes(id)) {
    list.push(id);
    localStorage.setItem(READ_UPDATES_KEY, JSON.stringify(list));
    window.dispatchEvent(new Event("site-updates-read-changed"));
  }
}

export function markAllUpdatesAsRead() {
  if (typeof window === "undefined") return;
  const allIds = RECENT_SITE_UPDATES.map((u) => u.id);
  localStorage.setItem(READ_UPDATES_KEY, JSON.stringify(allIds));
  window.dispatchEvent(new Event("site-updates-read-changed"));
}

export function getUnreadUpdatesCount(): number {
  const read = getReadUpdateIds();
  return RECENT_SITE_UPDATES.filter((u) => !read.includes(u.id)).length;
}

async function saveNotificationSetting(enabled: boolean) {
  if (!auth.currentUser) return;
  try {
    await setDoc(
      doc(db, "users", auth.currentUser.uid, "settings", "notifications"),
      {
        enabled,
        updatedAt: new Date().toISOString(),
        device: navigator.userAgent,
      },
      { merge: true },
    );
  } catch (err) {
    console.warn("Could not save push preference to Firestore:", err);
  }
}

/** True jika izin browser diberikan DAN saklar aplikasi sedang menyala. */
export function isNotificationActive(): boolean {
  return getPermission() === "granted" && getNotificationPref();
}

export async function disablePhoneNotifications(): Promise<{ success: boolean; message: string }> {
  setNotificationPref(false);
  try {
    await unsubscribeFromPush();
  } catch (err) {
    console.warn("Could not unsubscribe from push:", err);
  }
  await saveNotificationSetting(false);
  return {
    success: true,
    message: "Notifikasi dimatikan. Kamu tidak akan menerima pemberitahuan.",
  };
}

export async function enablePhoneNotifications(): Promise<{
  success: boolean;
  permission: NotificationPermission | "unsupported";
  message: string;
}> {
  const perm = await requestNotificationPermission();

  if (perm === "granted") {
    setNotificationPref(true);

    // Send welcome confirmation push notification to phone
    await showLocalNotification("Notifikasi Nontonime aktif", {
      body: "Kamu akan menerima info anime baru, episode terbaru, dan pembaruan situs.",
      tag: "welcome-notification",
    });

    // Simpan status ke Firebase jika user login
    await saveNotificationSetting(true);

    return {
      success: true,
      permission: "granted",
      message: "Notifikasi berhasil diaktifkan untuk perangkat ini!",
    };
  }

  return {
    success: false,
    permission: perm,
    message:
      perm === "denied"
        ? "Notifikasi diblokir oleh browser/HP. Harap izinkan di setelan situs browser kamu."
        : "Izin notifikasi tidak diberikan.",
  };
}

export async function sendTestUpdateNotification(): Promise<boolean> {
  if (!isNotificationActive()) return false;
  const latest = RECENT_SITE_UPDATES[0];
  return showLocalNotification(`Nontonime ${latest.version}`, {
    body: `${latest.title}: ${latest.description}`,
    tag: "test-site-update",
  });
}
