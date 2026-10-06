import type { ReactNode } from "react";
import {
  RARITY_META,
  animClass,
  borderStyle,
  frameStyle,
  type BorderDef,
  type FrameDef,
  type Rarity,
} from "@/lib/cosmetics";
import { cn } from "@/lib/utils";

/** Avatar bulat dengan frame berwarna. Frame `none` hanya menampilkan garis tipis. */
export function AvatarWithFrame({
  src,
  name,
  frame,
  size = 80,
  level,
  className,
}: {
  src?: string;
  name: string;
  frame: FrameDef;
  size?: number;
  level?: number;
  className?: string;
}) {
  const hasRing = frame.colors.length > 0;
  const pad = hasRing ? Math.max(3, Math.round(size * 0.06)) : 0;
  return (
    <div className={cn("relative shrink-0", className)} style={{ width: size, height: size }}>
      <div
        className={cn("rounded-full", animClass(frame.anim))}
        style={{ width: size, height: size, padding: pad, ...frameStyle(frame) }}
      >
        <div
          className={cn(
            "flex h-full w-full items-center justify-center overflow-hidden rounded-full border-2 bg-secondary",
            hasRing ? "border-card" : "border-border",
          )}
        >
          {src ? (
            <img
              src={src}
              alt={name}
              className="h-full w-full object-cover"
              referrerPolicy="no-referrer"
              decoding="async"
            />
          ) : (
            <span
              className="font-black text-foreground"
              style={{ fontSize: Math.round(size * 0.38) }}
              aria-hidden="true"
            >
              {name.charAt(0).toUpperCase()}
            </span>
          )}
        </div>
      </div>
      {level !== undefined ? (
        <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-black text-zinc-950 ring-2 ring-card">
          Lv.{level.toLocaleString("id-ID")}
        </span>
      ) : null}
    </div>
  );
}

/** Pembungkus kartu dengan border berwarna sesuai kosmetik. */
export function BorderShell({
  border,
  children,
  className,
  innerClassName,
  radius = "2rem",
}: {
  border: Pick<BorderDef, "colors" | "glow" | "anim">;
  children: ReactNode;
  className?: string;
  innerClassName?: string;
  radius?: string;
}) {
  const width = 2.5;
  return (
    <div
      className={cn("p-[2.5px]", animClass(border.anim), className)}
      style={{ ...borderStyle(border), borderRadius: radius }}
    >
      <div
        className={cn("bg-card", innerClassName)}
        style={{ borderRadius: `calc(${radius} - ${width}px)` }}
      >
        {children}
      </div>
    </div>
  );
}

/** Tag peringkat otomatis sesuai level, misalnya "Otaku Terampil". */
export function RankTagChip({ title, gradient }: { title: string; gradient: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border/80 bg-secondary/70 px-2.5 py-0.5 text-[10px] font-bold text-foreground">
      <span className={cn("h-2 w-2 rounded-full bg-gradient-to-br", gradient)} aria-hidden="true" />
      {title}
    </span>
  );
}

/** Julukan pilihan pengguna, tampil di bawah nama. */
export function TitleChip({ name, className }: { name: string; className?: string }) {
  return (
    <span
      className={cn(
        "text-xs font-black text-amber-700 dark:text-amber-300",
        className,
      )}
    >
      {"「"}
      {name}
      {"」"}
    </span>
  );
}

export function RarityChip({ rarity }: { rarity: Rarity }) {
  return (
    <span
      className={cn(
        "rounded-md border px-1.5 py-0.5 text-[10px] font-black tracking-wide",
        RARITY_META[rarity].chip,
      )}
    >
      {RARITY_META[rarity].label}
    </span>
  );
}
