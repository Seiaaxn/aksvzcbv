import { useEffect, useRef, useState } from "react";
import type { User } from "firebase/auth";
import { Camera, Check, Loader2, Palette, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { AvatarWithFrame } from "@/components/anime/ProfileCosmetics";
import type { FrameDef } from "@/lib/cosmetics";
import {
  USERNAME_MAX,
  USERNAME_MIN,
  clearCustomPhoto,
  saveProfilePrefs,
  setCustomPhoto,
  updateUsername,
  validateUsername,
  type ProfilePrefs,
} from "@/lib/profile-prefs";
import { cn } from "@/lib/utils";

const sectionCls = "space-y-3 rounded-2xl border border-border/80 bg-card p-4";

export function ProfileSettingsDialog({
  open,
  onOpenChange,
  user,
  prefs,
  name,
  photo,
  frame,
  rankTitle,
  onOpenCosmetics,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: User;
  prefs: ProfilePrefs;
  name: string;
  photo: string;
  frame: FrameDef;
  rankTitle: string;
  onOpenCosmetics: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [draftName, setDraftName] = useState(name);
  const [nameBusy, setNameBusy] = useState(false);
  const [nameMsg, setNameMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoMsg, setPhotoMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [toggleError, setToggleError] = useState<string | null>(null);

  // Segarkan isian setiap dialog dibuka.
  useEffect(() => {
    if (open) {
      setDraftName(name);
      setNameMsg(null);
      setPhotoMsg(null);
      setToggleError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const draftError = draftName.trim() === name ? null : validateUsername(draftName);
  const nameChanged = draftName.trim() !== name;

  async function saveName() {
    if (!nameChanged || draftError || nameBusy) return;
    setNameBusy(true);
    setNameMsg(null);
    try {
      const synced = await updateUsername(user, draftName);
      setNameMsg({
        ok: true,
        text: synced
          ? "Nama pengguna diperbarui."
          : "Nama diperbarui di perangkat ini. Akan tersinkron saat koneksi stabil.",
      });
    } catch (err) {
      setNameMsg({
        ok: false,
        text: err instanceof Error ? err.message : "Gagal menyimpan nama. Coba lagi.",
      });
    } finally {
      setNameBusy(false);
    }
  }

  async function onPickPhoto(file: File | undefined) {
    if (!file) return;
    setPhotoBusy(true);
    setPhotoMsg(null);
    try {
      const synced = await setCustomPhoto(user.uid, file);
      setPhotoMsg({
        ok: true,
        text: synced
          ? "Foto profil sudah diperbarui."
          : "Foto sudah diperbarui di perangkat ini. Akan tersinkron saat koneksi stabil.",
      });
    } catch (err) {
      setPhotoMsg({
        ok: false,
        text: err instanceof Error ? err.message : "Gagal mengunggah foto. Coba lagi.",
      });
    } finally {
      setPhotoBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function removePhoto() {
    setPhotoBusy(true);
    setPhotoMsg(null);
    try {
      await clearCustomPhoto(user.uid);
      setPhotoMsg({ ok: true, text: "Foto kustom dihapus, kembali memakai foto akun." });
    } catch {
      setPhotoMsg({ ok: false, text: "Gagal menghapus foto. Coba lagi." });
    } finally {
      setPhotoBusy(false);
    }
  }

  async function toggle(patch: Partial<Pick<ProfilePrefs, "showRankTag" | "showTitle">>) {
    setToggleError(null);
    try {
      await saveProfilePrefs(user.uid, patch);
    } catch {
      setToggleError("Gagal menyimpan pengaturan. Periksa koneksi lalu coba lagi.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92dvh] max-w-md gap-4 overflow-y-auto rounded-3xl p-4 sm:p-6">
        <DialogHeader className="pr-8 text-left">
          <DialogTitle className="font-display text-base font-black">Pengaturan Profil</DialogTitle>
          <DialogDescription className="text-[11px]">
            Ubah nama, foto, dan tag yang tampil di profilmu.
          </DialogDescription>
        </DialogHeader>

        <section className={sectionCls} aria-labelledby="set-foto">
          <h3 id="set-foto" className="text-xs font-black text-foreground">
            Foto Profil
          </h3>
          <div className="flex items-center gap-4">
            <AvatarWithFrame src={photo} name={name} frame={frame} size={60} />
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(e) => onPickPhoto(e.target.files?.[0])}
                aria-label="Pilih foto profil"
              />
              <button
                type="button"
                disabled={photoBusy}
                onClick={() => fileRef.current?.click()}
                className="inline-flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-xl bg-amber-400 px-4 text-[11px] font-black text-zinc-950 transition-colors hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {photoBusy ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Camera className="h-3.5 w-3.5" />
                )}
                Ganti Foto
              </button>
              {prefs.customPhoto ? (
                <button
                  type="button"
                  disabled={photoBusy}
                  onClick={removePhoto}
                  className="inline-flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-xl border border-border/80 px-4 text-[11px] font-bold text-muted-foreground transition-colors hover:border-destructive/30 hover:bg-destructive/10 hover:text-destructive disabled:opacity-60"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Pakai Foto Akun
                </button>
              ) : null}
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground">
            Gambar dipotong persegi dan dikecilkan otomatis. Maksimal 8 MB.
          </p>
          {photoMsg ? (
            <p
              role="status"
              className={cn(
                "text-[11px] font-medium",
                photoMsg.ok ? "text-emerald-600 dark:text-emerald-400" : "text-destructive",
              )}
            >
              {photoMsg.text}
            </p>
          ) : null}
        </section>

        <section className={sectionCls} aria-labelledby="set-nama">
          <h3 id="set-nama" className="text-xs font-black text-foreground">
            Nama Pengguna
          </h3>
          <div className="flex gap-2">
            <input
              value={draftName}
              onChange={(e) => {
                setDraftName(e.target.value);
                setNameMsg(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") saveName();
              }}
              maxLength={USERNAME_MAX + 5}
              autoComplete="nickname"
              aria-label="Nama pengguna"
              aria-invalid={!!draftError}
              className="min-h-10 min-w-0 flex-1 rounded-xl border border-border bg-background px-3 text-xs font-semibold text-foreground outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60"
            />
            <button
              type="button"
              onClick={saveName}
              disabled={!nameChanged || !!draftError || nameBusy}
              className="inline-flex min-h-10 cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-amber-400 px-4 text-[11px] font-black text-zinc-950 transition-colors hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {nameBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
              Simpan
            </button>
          </div>
          <p className={cn("text-[10px]", draftError ? "text-destructive" : "text-muted-foreground")}>
            {draftError ?? `${USERNAME_MIN} sampai ${USERNAME_MAX} karakter. Boleh huruf, angka, spasi, titik, garis bawah, dan strip.`}
          </p>
          {nameMsg ? (
            <p
              role="status"
              className={cn(
                "text-[11px] font-medium",
                nameMsg.ok ? "text-emerald-600 dark:text-emerald-400" : "text-destructive",
              )}
            >
              {nameMsg.text}
            </p>
          ) : null}
        </section>

        <section className={sectionCls} aria-labelledby="set-tag">
          <h3 id="set-tag" className="text-xs font-black text-foreground">
            Tag di Profil
          </h3>
          <label className="flex min-h-10 cursor-pointer items-center justify-between gap-3">
            <span className="min-w-0">
              <span className="block text-xs font-bold text-foreground">Tag peringkat</span>
              <span className="block text-[11px] text-muted-foreground">
                Contoh: {rankTitle}. Disembunyikan dari profil dan header.
              </span>
            </span>
            <Switch
              checked={prefs.showRankTag}
              onCheckedChange={(v) => toggle({ showRankTag: v })}
              aria-label="Tampilkan tag peringkat"
            />
          </label>
          <label className="flex min-h-10 cursor-pointer items-center justify-between gap-3">
            <span className="min-w-0">
              <span className="block text-xs font-bold text-foreground">Julukan</span>
              <span className="block text-[11px] text-muted-foreground">
                Teks 「julukan」 di bawah namamu.
              </span>
            </span>
            <Switch
              checked={prefs.showTitle}
              onCheckedChange={(v) => toggle({ showTitle: v })}
              aria-label="Tampilkan julukan"
            />
          </label>
          {toggleError ? (
            <p role="alert" className="text-[11px] text-destructive">
              {toggleError}
            </p>
          ) : null}
        </section>

        <button
          type="button"
          onClick={() => {
            onOpenChange(false);
            onOpenCosmetics();
          }}
          className="inline-flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-2xl border border-border/80 bg-secondary/60 px-4 text-xs font-bold text-foreground transition-colors hover:bg-secondary"
        >
          <Palette className="h-3.5 w-3.5 text-amber-500" />
          Ganti Frame, Border, dan Julukan
        </button>
      </DialogContent>
    </Dialog>
  );
}
