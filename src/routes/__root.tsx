import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="max-w-sm text-center">
        <img src="/logo-icon.png" alt="Keja" className="mx-auto h-14 w-auto" />
        <h1 className="mt-6 text-3xl font-semibold tracking-tight text-foreground">Nothing here yet</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          This page moved or never existed. Let's get you back to finding a home.
        </p>
        <Link
          to="/"
          className="press mt-6 inline-flex items-center justify-center rounded-2xl bg-primary px-5 py-3 text-sm font-medium text-primary-foreground shadow-soft"
        >
          Back to Keja
        </Link>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="max-w-sm text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Something paused</h1>
        <p className="mt-3 text-sm text-muted-foreground">A quick refresh usually does it.</p>
        <div className="mt-6 flex justify-center gap-2">
          <button
            onClick={() => { router.invalidate(); reset(); }}
            className="press rounded-2xl bg-primary px-5 py-3 text-sm font-medium text-primary-foreground shadow-soft"
          >
            Try again
          </button>
          <a href="/" className="press rounded-2xl border border-border bg-card px-5 py-3 text-sm font-medium">Home</a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { name: "theme-color", content: "#FAFAFB" },
      { title: "Keja — Find a home, live" },
      { name: "description", content: "Real-time rental availability. Discover vacant homes in your city and book viewings in minutes." },
      { name: "author", content: "Keja" },
      { property: "og:title", content: "Keja — Find a home, live" },
      { property: "og:description", content: "Real-time rental availability. Discover vacant homes in your city and book viewings in minutes." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Keja — Find a home, live" },
      { name: "twitter:description", content: "Real-time rental availability. Discover vacant homes in your city and book viewings in minutes." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/23aa79f4-67d6-4566-8b41-eddc93dfa913/id-preview-df2dd7f6--d41e0eb8-edb5-4fc1-98e5-a675fe21e12b.lovable.app-1783581801063.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/23aa79f4-67d6-4566-8b41-eddc93dfa913/id-preview-df2dd7f6--d41e0eb8-edb5-4fc1-98e5-a675fe21e12b.lovable.app-1783581801063.png" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@500;600;700;800&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
        <script
          dangerouslySetInnerHTML={{ __html: "window.__splashStart = Date.now();" }}
        />
      </head>
      <body>
        <div
          id="app-splash"
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "#16a34a",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
          }}
        >
          <img
            src="/logo-icon.png"
            alt="Keja"
            style={{ width: 80, height: 80, marginBottom: 24 }}
          />
          <h1
            style={{
              fontSize: 48,
              fontWeight: 600,
              color: "white",
              margin: 0,
              letterSpacing: "-0.02em",
            }}
          >
            keja
          </h1>
          <p
            style={{
              color: "rgba(255,255,255,0.7)",
              fontSize: 14,
              marginTop: 8,
              fontWeight: 300,
            }}
          >
            Find a home, live
          </p>
        </div>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  useEffect(() => {
    const splash = document.getElementById("app-splash");
    if (!splash) return;

    const minDisplayMs = 400;
    const start = (window as unknown as { __splashStart?: number }).__splashStart ?? Date.now();
    const remaining = Math.max(0, minDisplayMs - (Date.now() - start));

    const timer = setTimeout(() => {
      splash.style.transition = "opacity 200ms ease";
      splash.style.opacity = "0";
      setTimeout(() => splash.remove(), 200);
    }, remaining);

    return () => clearTimeout(timer);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <Outlet />
      <SonnerToaster />
    </QueryClientProvider>
  );
}

import { Toaster as SonnerToaster } from "sonner";
