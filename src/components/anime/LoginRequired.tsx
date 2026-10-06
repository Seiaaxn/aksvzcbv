import type { ReactNode } from "react";
import { Lock, LogIn, UserPlus, type LucideIcon } from "lucide-react";
import { useAuth } from "@/lib/firebase";
import { requestLogin } from "@/lib/auth-gate";

export function LoginRequired({
  icon: Icon = Lock,
  title,
  description,
}: {
  icon?: LucideIcon | undefined;
  title: string;
  description: string;
}) {
  return (
    <div className="mx-auto max-w-md space-y-5 rounded-3xl border border-border/80 bg-card p-8 text-center shadow-sm">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <Icon className="h-7 w-7" />
      </div>
      <div className="space-y-1.5">
        <h2 className="font-display text-base font-black text-foreground sm:text-lg">{title}</h2>
        <p className="text-xs leading-relaxed text-muted-foreground">{description}</p>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
        <button
          type="button"
          onClick={() => requestLogin("login")}
          className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-border bg-secondary px-4 py-2.5 text-xs font-bold text-foreground shadow-xs transition-colors hover:bg-secondary/80 cursor-pointer"
        >
          <LogIn className="h-3.5 w-3.5 text-primary" />
          <span>Masuk</span>
        </button>
        <button
          type="button"
          onClick={() => requestLogin("register")}
          className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 cursor-pointer"
        >
          <UserPlus className="h-3.5 w-3.5" />
          <span>Daftar Akun</span>
        </button>
      </div>
    </div>
  );
}

/** Membungkus halaman yang hanya boleh dibuka setelah login. */
export function AuthGate({
  icon,
  title,
  description,
  children,
}: {
  icon?: LucideIcon | undefined;
  title: string;
  description: string;
  children: ReactNode;
}) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="h-64 animate-pulse rounded-3xl bg-muted/60" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16">
        <LoginRequired icon={icon} title={title} description={description} />
      </div>
    );
  }

  return <>{children}</>;
}
