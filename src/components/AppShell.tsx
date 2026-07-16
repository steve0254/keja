import { Link, useRouterState } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Home, Search, Map, MessageCircle, User, Plus } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

const tabs = [
  { to: "/", label: "Home", icon: Home, exact: true },
  { to: "/search", label: "Search", icon: Search, exact: false },
  { to: "/map", label: "Map", icon: Map, exact: false },
  { to: "/messages", label: "Messages", icon: MessageCircle, exact: false },
  { to: "/profile", label: "Profile", icon: User, exact: false },
] as const;

export function AppShell({ children, hideFab = false }: { children: ReactNode; hideFab?: boolean }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { isLandlord } = useAuth();
  const showFab = !hideFab && isLandlord;

  return (
    <div className="relative mx-auto flex min-h-screen w-full max-w-[440px] flex-col bg-background">
      <main className="flex-1 pb-28">{children}</main>

      {showFab && (
        <Link
          to="/add"
          aria-label="Add vacancy"
          className="press fixed bottom-24 left-1/2 z-30 -translate-x-1/2 sm:left-auto sm:right-6 sm:translate-x-0"
          style={{ marginLeft: "min(0px, calc(50vw - 220px + 92px))" }}
        >
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-pop">
            <Plus className="h-6 w-6" strokeWidth={2.4} />
          </span>
        </Link>
      )}

      <nav aria-label="Primary" className="glass fixed bottom-3 left-1/2 z-40 w-[calc(100%-1.5rem)] max-w-[420px] -translate-x-1/2 rounded-3xl px-2 py-2 shadow-float">
        <ul className="grid grid-cols-5">
          {tabs.map(({ to, label, icon: Icon, exact }) => {
            const active = exact ? pathname === to : pathname.startsWith(to);
            return (
              <li key={to}>
                <Link to={to} className="press group flex flex-col items-center gap-1 rounded-2xl px-1 py-2">
                  <span className={`flex h-9 w-9 items-center justify-center rounded-2xl transition-colors ${
                    active ? "bg-primary text-primary-foreground" : "text-muted-foreground group-hover:text-foreground"
                  }`}>
                    <Icon className="h-[18px] w-[18px]" strokeWidth={2.2} />
                  </span>
                  <span className={`text-[10px] font-medium tracking-wide ${active ? "text-foreground" : "text-muted-foreground"}`}>
                    {label}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
