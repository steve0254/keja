import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { BadgeCheck, Heart, Bell, Shield, HelpCircle, ChevronRight, LogOut, Home, Building2, Building, CalendarDays } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useAuth, type AppRole } from "@/hooks/use-auth";
import { useNotifications } from "@/hooks/use-notifications";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/profile")({
  head: () => ({ meta: [{ title: "Profile — Keja" }] }),
  component: Profile,
});

const roleDefs: { role: AppRole; label: string; desc: string; icon: typeof Home }[] = [
  { role: "tenant", label: "Tenant", desc: "Find a home", icon: Home },
  { role: "landlord", label: "Landlord", desc: "List a unit", icon: Building },
  { role: "agency", label: "Agency", desc: "Manage portfolio", icon: Building2 },
];

function Profile() {
  const navigate = useNavigate();
  const { user, roles, reloadRoles } = useAuth();
  const { data: notifs = [] } = useNotifications(user?.id);
  const unread = notifs.filter((n) => !n.read_at).length;

  const items = [
    { icon: CalendarDays, label: "Viewings", meta: "", to: "/viewings" as const },
    { icon: Bell, label: "Notifications", meta: unread > 0 ? `${unread} new` : "", to: "/notifications" as const },
    { icon: Heart, label: "Saved homes", meta: "", to: null },
    { icon: Shield, label: "Verification", meta: "Verified", to: null },
    { icon: HelpCircle, label: "Help & support", meta: "", to: null },
  ] as const;

  async function signOut() {
    await supabase.auth.signOut();
    toast.success("Signed out");
    navigate({ to: "/" });
  }

  async function toggleRole(role: AppRole) {
    if (!user) return;
    if (roles.includes(role)) {
      if (role === "tenant") return; // keep tenant baseline
      const { error } = await supabase.from("user_roles").delete().eq("user_id", user.id).eq("role", role);
      if (error) return toast.error(error.message);
    } else {
      const { error } = await supabase.from("user_roles").insert({ user_id: user.id, role });
      if (error) return toast.error(error.message);
    }
    await reloadRoles();
  }

  if (!user) {
    return (
      <AppShell>
        <header className="animate-fade px-5 pt-8">
          <h1 className="text-[26px] font-semibold tracking-tight">Profile</h1>
        </header>
        <section className="animate-fade-up mt-6 px-5">
          <div className="rounded-3xl bg-card p-6 text-center shadow-soft">
            <p className="text-sm font-semibold">Sign in to save homes and list vacancies</p>
            <p className="mt-1 text-xs text-muted-foreground">One account for tenants, landlords, and agencies.</p>
            <Link to="/auth" className="press mt-5 inline-flex rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-pop">
              Sign in or create account
            </Link>
          </div>
        </section>
      </AppShell>
    );
  }

  const fullName = (user.user_metadata?.full_name as string) ?? user.email?.split("@")[0] ?? "You";
  const inits = fullName.split(" ").slice(0, 2).map((w: string) => w[0]?.toUpperCase()).join("");

  return (
    <AppShell>
      <header className="animate-fade px-5 pt-8">
        <h1 className="text-[26px] font-semibold tracking-tight">Profile</h1>
      </header>

      <section className="animate-fade-up mt-6 px-5">
        <div className="rounded-3xl bg-card p-5 shadow-soft">
          <div className="flex items-center gap-4">
            <span className="flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-primary to-[oklch(0.40_0.15_142.1)] text-lg font-semibold text-primary-foreground">
              {inits || "N"}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <p className="truncate text-lg font-semibold">{fullName}</p>
                <BadgeCheck className="h-4 w-4 text-primary" />
              </div>
              <p className="truncate text-xs text-muted-foreground">{user.email}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="animate-fade-up mt-6 px-5">
        <div className="mb-2 flex items-end justify-between">
          <h2 className="text-sm font-semibold tracking-tight">Your roles on Keja</h2>
          <span className="text-[11px] text-muted-foreground">Tap to toggle</span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {roleDefs.map(({ role, label, desc, icon: Icon }) => {
            const active = roles.includes(role);
            return (
              <button key={role} onClick={() => toggleRole(role)}
                className={`press rise flex flex-col items-start gap-2 rounded-2xl p-3 text-left shadow-soft ${
                  active ? "bg-primary text-primary-foreground" : "bg-card"
                }`}>
                <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${active ? "bg-white/15" : "bg-muted"}`}>
                  <Icon className="h-4 w-4" />
                </span>
                <span className="block text-sm font-semibold">{label}</span>
                <span className={`block text-[11px] ${active ? "opacity-85" : "text-muted-foreground"}`}>{desc}</span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="animate-fade-up mt-6 px-5">
        <div className="overflow-hidden rounded-3xl bg-card shadow-soft">
          {items.map(({ icon: Icon, label, meta, to }, i) => {
            const inner = (
              <>
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-muted">
                  <Icon className="h-4 w-4" />
                </span>
                <span className="flex-1 text-sm font-medium">{label}</span>
                {meta && <span className="text-xs text-muted-foreground">{meta}</span>}
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </>
            );
            const cls = `press flex w-full items-center gap-3 p-4 text-left hover:bg-muted ${i > 0 ? "border-t border-border" : ""}`;
            return to ? (
              <Link key={label} to={to} className={cls}>{inner}</Link>
            ) : (
              <button key={label} className={cls}>{inner}</button>
            );
          })}
        </div>

        <button onClick={signOut} className="press mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-border py-3 text-sm font-medium text-muted-foreground">
          <LogOut className="h-4 w-4" /> Sign out
        </button>
      </section>
    </AppShell>
  );
}
