import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Mail, Lock, User as UserIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Sign in — Keja" }] }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { full_name: name },
          },
        });
        if (error) throw error;
        toast.success("Account created — welcome to Keja");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Welcome back");
      }
      navigate({ to: "/" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setLoading(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast.error(result.error.message ?? "Google sign in failed");
      setLoading(false);
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/" });
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[440px] flex-col bg-background px-5 pb-10 pt-8">
      <Link to="/" className="press flex h-10 w-10 items-center justify-center rounded-2xl bg-card shadow-soft">
        <ArrowLeft className="h-4 w-4" />
      </Link>

      <div className="animate-fade-up mt-10">
        <img src="/logo-icon.png" alt="Keja" className="h-14 w-auto" />
        <h1 className="mt-6 text-3xl font-semibold tracking-tight">
          {mode === "signin" ? "Welcome back" : "Create your Keja"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {mode === "signin" ? "Sign in to book viewings and list vacancies." : "One account for tenants, landlords, and agencies."}
        </p>
      </div>

      <button
        onClick={handleGoogle}
        disabled={loading}
        className="press mt-8 flex items-center justify-center gap-3 rounded-2xl border border-border bg-card py-3.5 text-sm font-semibold shadow-soft disabled:opacity-50"
      >
        <svg className="h-4 w-4" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.5 12.3c0-.8-.1-1.5-.2-2.2H12v4.2h5.9c-.3 1.4-1 2.5-2.2 3.3v2.8h3.5c2.1-1.9 3.3-4.7 3.3-8.1z"/><path fill="#34A853" d="M12 23c3 0 5.5-1 7.3-2.7l-3.5-2.8c-1 .7-2.3 1.1-3.8 1.1-2.9 0-5.4-2-6.3-4.6H2v2.9C3.8 20.5 7.6 23 12 23z"/><path fill="#FBBC05" d="M5.7 13.9c-.2-.7-.4-1.4-.4-2.2s.1-1.5.4-2.2V6.6H2c-.8 1.5-1.3 3.3-1.3 5.2s.5 3.7 1.3 5.2l3.7-2.9z"/><path fill="#EA4335" d="M12 5.4c1.6 0 3.1.6 4.2 1.6l3.1-3.1C17.5 2.1 15 1 12 1 7.6 1 3.8 3.5 2 7l3.7 2.9c.9-2.6 3.4-4.5 6.3-4.5z"/></svg>
        Continue with Google
      </button>

      <div className="my-6 flex items-center gap-3">
        <span className="h-px flex-1 bg-border" />
        <span className="text-[11px] uppercase tracking-widest text-muted-foreground">or</span>
        <span className="h-px flex-1 bg-border" />
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        {mode === "signup" && (
          <label className="relative block">
            <UserIcon className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Full name"
              required
              className="w-full rounded-2xl border border-border bg-card py-3.5 pl-11 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </label>
        )}
        <label className="relative block">
          <Mail className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            required
            className="w-full rounded-2xl border border-border bg-card py-3.5 pl-11 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        </label>
        <label className="relative block">
          <Lock className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            minLength={6}
            required
            className="w-full rounded-2xl border border-border bg-card py-3.5 pl-11 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        </label>
        <button
          type="submit"
          disabled={loading}
          className="press w-full rounded-2xl bg-primary py-3.5 text-sm font-semibold text-primary-foreground shadow-pop disabled:opacity-50"
        >
          {loading ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
        </button>
      </form>

      <button
        onClick={() => setMode((m) => (m === "signin" ? "signup" : "signin"))}
        className="mt-6 text-center text-sm text-muted-foreground"
      >
        {mode === "signin" ? (
          <>New to Keja? <span className="font-semibold text-primary">Create an account</span></>
        ) : (
          <>Already have an account? <span className="font-semibold text-primary">Sign in</span></>
        )}
      </button>
    </div>
  );
}
