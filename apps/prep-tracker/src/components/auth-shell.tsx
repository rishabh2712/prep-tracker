"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/auth/browser";
import { getSupabaseRedirectUrl } from "@/lib/auth/env";

type AuthMode = "login" | "signup" | "forgot-password" | "reset-password";

type AuthShellProps = {
  mode: AuthMode;
};

function titleForMode(mode: AuthMode) {
  if (mode === "login") return "Welcome back";
  if (mode === "signup") return "Create your account";
  if (mode === "forgot-password") return "Reset your password";
  return "Choose a new password";
}

function subtitleForMode(mode: AuthMode) {
  if (mode === "login") return "Sign in to access your shared prep bank and personal progress.";
  if (mode === "signup") return "Create an account to save notes, reviews, goals, and sessions.";
  if (mode === "forgot-password") return "We’ll email you a reset link.";
  return "Your reset link already signed you in. Set a new password to continue.";
}

export function AuthShell({ mode }: AuthShellProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = useMemo(() => searchParams.get("next") ?? "/", [searchParams]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleLogin() {
    const supabase = getSupabaseBrowserClient();
    const { error: loginError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (loginError) throw loginError;
    router.push(next);
    router.refresh();
  }

  async function handleSignup() {
    const supabase = getSupabaseBrowserClient();
    const { error: signupError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo: getSupabaseRedirectUrl(),
        data: {
          display_name: displayName.trim() || email.trim().split("@")[0],
        },
      },
    });
    if (signupError) throw signupError;
    setMessage("Check your inbox to verify your email before signing in.");
  }

  async function handleForgotPassword() {
    const supabase = getSupabaseBrowserClient();
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${getSupabaseRedirectUrl()}?next=/reset-password`,
    });
    if (resetError) throw resetError;
    setMessage("Password reset email sent.");
  }

  async function handleResetPassword() {
    const supabase = getSupabaseBrowserClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) throw updateError;
    setMessage("Password updated. Redirecting…");
    router.push("/");
    router.refresh();
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      if (mode === "login") {
        await handleLogin();
      } else if (mode === "signup") {
        await handleSignup();
      } else if (mode === "forgot-password") {
        await handleForgotPassword();
      } else {
        await handleResetPassword();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-md items-center justify-center">
      <div className="w-full rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_24px_80px_rgba(15,23,42,0.18)]">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">PrepSprint 60</p>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">{titleForMode(mode)}</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">{subtitleForMode(mode)}</p>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          {(mode === "login" || mode === "signup" || mode === "forgot-password") && (
            <label className="block text-sm font-medium text-slate-700">
              Email
              <input
                required
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-slate-950 outline-none ring-0 transition focus:border-sky-400"
              />
            </label>
          )}

          {mode === "signup" && (
            <label className="block text-sm font-medium text-slate-700">
              Display name
              <input
                type="text"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-slate-950 outline-none ring-0 transition focus:border-sky-400"
              />
            </label>
          )}

          {(mode === "login" || mode === "signup" || mode === "reset-password") && (
            <label className="block text-sm font-medium text-slate-700">
              Password
              <input
                required
                minLength={8}
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-slate-950 outline-none ring-0 transition focus:border-sky-400"
              />
            </label>
          )}

          {error ? <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}
          {message ? <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</p> : null}

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
          >
            {busy
              ? "Working…"
              : mode === "login"
                ? "Sign in"
                : mode === "signup"
                  ? "Create account"
                  : mode === "forgot-password"
                    ? "Send reset link"
                    : "Update password"}
          </button>
        </form>

        <div className="mt-5 flex flex-wrap gap-3 text-sm text-slate-600">
          {mode !== "login" ? <Link href="/login" className="font-medium text-sky-700 hover:underline">Sign in</Link> : null}
          {mode !== "signup" ? <Link href="/signup" className="font-medium text-sky-700 hover:underline">Create account</Link> : null}
          {mode !== "forgot-password" ? (
            <Link href="/forgot-password" className="font-medium text-sky-700 hover:underline">
              Forgot password
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}
