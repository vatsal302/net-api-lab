import { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, ImageOff, RefreshCw, Smartphone, Monitor, Wifi, WifiOff } from "lucide-react";
import type { Simulation, SimResult, Bandwidth } from "@/hooks/useSimulation";

const BANDWIDTH_IMG_DELAY: Record<Bandwidth, number> = {
  fast: 0,
  medium: 900,
  slow: 2200,
};

type ViewMode = "desktop" | "mobile";

interface FeedItem {
  id: number;
  user: string;
  handle: string;
  text: string;
  metric: string;
  imgOk: boolean;
  imgLoaded: boolean;
}

const SAMPLE_DATA: Omit<FeedItem, "imgOk" | "imgLoaded">[] = [
  { id: 1, user: "Lena Park", handle: "@lpark", text: "Shipped the new caching layer — p99 dropped 40%.", metric: "1.2k" },
  { id: 2, user: "Diego Alvarez", handle: "@dalv", text: "Reminder: idempotency keys are not optional.", metric: "847" },
  { id: 3, user: "Mira Okafor", handle: "@miraok", text: "Postmortem published. Lessons in retry storms.", metric: "2.4k" },
  { id: 4, user: "Sven Holt", handle: "@svenh", text: "Migrated to edge functions. Cold starts ~3ms.", metric: "612" },
];

type Status = "idle" | "loading" | "success" | "error" | "timeout" | "notfound";

export function AppPreview({ sim }: { sim: Simulation }) {
  const [view, setView] = useState<ViewMode>("desktop");
  const [status, setStatus] = useState<Status>("idle");
  const [items, setItems] = useState<FeedItem[]>([]);
  const [errorDetail, setErrorDetail] = useState<string>("");
  const [attempts, setAttempts] = useState(0);

  const imgTimers = useRef<number[]>([]);

  const clearImgTimers = () => {
    imgTimers.current.forEach((t) => clearTimeout(t));
    imgTimers.current = [];
  };

  const scheduleImageLoads = useCallback((data: FeedItem[]) => {
    clearImgTimers();
    const baseDelay = BANDWIDTH_IMG_DELAY[sim.bandwidth];
    data.forEach((it, idx) => {
      if (!it.imgOk) return; // failed images stay broken until retried
      // progressive: each image staggered, slower bandwidth = bigger gap
      const delay = baseDelay === 0 ? 0 : baseDelay + idx * (baseDelay * 0.35);
      const t = window.setTimeout(() => {
        setItems((prev) => prev.map((p) => (p.id === it.id ? { ...p, imgLoaded: true } : p)));
      }, delay);
      imgTimers.current.push(t);
    });
  }, [sim.bandwidth]);

  const fetchFeed = useCallback(async () => {
    setStatus("loading");
    setErrorDetail("");
    setAttempts((a) => a + 1);
    clearImgTimers();
    const res: SimResult = await sim.simulateRequest("/api/feed", "GET");

    if (res.status === 200) {
      // Apply packet loss to images per item
      const data: FeedItem[] = SAMPLE_DATA.map((it) => {
        const imgOk = Math.random() * 100 >= sim.packetLoss * 0.6;
        return { ...it, imgOk, imgLoaded: false };
      });
      setItems(data);
      setStatus("success");
      scheduleImageLoads(data);
    } else if (res.status === 404) {
      setStatus("notfound");
      setErrorDetail("Resource /api/feed could not be located on the origin.");
    } else if (res.status === "TIMEOUT") {
      setStatus("timeout");
      setErrorDetail("Request exceeded the 5000ms timeout threshold.");
    } else if (res.packetLost) {
      setStatus("error");
      setErrorDetail("Network error — packet lost in transit.");
    } else {
      setStatus("error");
      setErrorDetail("The server encountered an unexpected condition.");
    }
  }, [sim, scheduleImageLoads]);

  const retryImage = useCallback(async (id: number) => {
    sim.log({ level: "info", method: "GET", url: `/api/img/${id}`, message: `↻ retrying image #${id}` });
    const res = await sim.simulateRequest(`/api/img/${id}`, "GET");
    const ok = res.status === 200 && !res.packetLost && Math.random() * 100 >= sim.packetLoss * 0.4;
    setItems((prev) => prev.map((p) => (p.id === id ? { ...p, imgOk: ok, imgLoaded: ok } : p)));
    if (!ok) {
      sim.log({ level: "warn", method: "GET", url: `/api/img/${id}`, message: `✕ image #${id} retry failed` });
    } else {
      sim.log({ level: "success", method: "GET", url: `/api/img/${id}`, message: `✓ image #${id} recovered` });
    }
  }, [sim]);

  // initial fetch on mount
  useEffect(() => {
    fetchFeed();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isMobile = view === "mobile";

  return (
    <section className="glass rounded-xl overflow-hidden flex flex-col">
      {/* preview chrome */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/60 bg-background/40">
        <div className="flex items-center gap-3">
          <h3 className="text-xs font-semibold text-foreground tracking-tight">
            <span className="text-primary">▸</span> app_preview
          </h3>
          <NetIndicator sim={sim} />
        </div>

        <div className="flex items-center gap-2">
          <div className="flex rounded-md border border-border overflow-hidden">
            <button
              onClick={() => setView("desktop")}
              className={`px-2 py-1 text-[10px] flex items-center gap-1 transition-colors ${
                view === "desktop" ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Monitor className="h-3 w-3" /> desktop
            </button>
            <button
              onClick={() => setView("mobile")}
              className={`px-2 py-1 text-[10px] flex items-center gap-1 transition-colors ${
                view === "mobile" ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Smartphone className="h-3 w-3" /> mobile
            </button>
          </div>
          <button
            onClick={fetchFeed}
            disabled={status === "loading"}
            className="px-2.5 py-1 text-[10px] rounded-md bg-primary/10 border border-primary/30 text-primary hover:bg-primary/20 transition-all disabled:opacity-50"
          >
            <RefreshCw className={`h-3 w-3 inline ${status === "loading" ? "animate-spin" : ""}`} />
            <span className="ml-1">refetch</span>
          </button>
        </div>
      </div>

      {/* fake URL bar */}
      <div className="px-4 py-2 border-b border-border/60 bg-background/20 flex items-center gap-2">
        <span className="h-1.5 w-1.5 rounded-full bg-success" />
        <code className="text-[10px] text-muted-foreground">
          https://app.netlab.dev<span className="text-foreground">/feed</span>
        </code>
        <span className="ml-auto text-[10px] text-muted-foreground tabular-nums">
          attempt #{attempts}
        </span>
      </div>

      {/* viewport */}
      <div className="flex-1 p-6 bg-gradient-to-b from-background/20 to-background/60 min-h-[420px] flex justify-center items-start">
        <div
          className={`w-full transition-all duration-300 ${
            isMobile ? "max-w-[320px] border border-border/60 rounded-2xl p-4 bg-card/50" : ""
          }`}
        >
          <FeedHeader />

          {status === "loading" && <SkeletonFeed sim={sim} />}
          {status === "success" && <FeedList items={items} onRetryImage={retryImage} />}
          {(status === "error" || status === "notfound" || status === "timeout") && (
            <ErrorState
              status={status}
              detail={errorDetail}
              onRetry={fetchFeed}
            />
          )}
        </div>
      </div>
    </section>
  );
}

function NetIndicator({ sim }: { sim: Simulation }) {
  const bad = sim.packetLoss > 20 || sim.bandwidth === "slow" || sim.latency > 800;
  return (
    <div className="flex items-center gap-1.5 text-[10px] px-2 py-0.5 rounded-full border border-border bg-background/40">
      {bad ? (
        <WifiOff className="h-3 w-3 text-warning" />
      ) : (
        <Wifi className="h-3 w-3 text-success" />
      )}
      <span className="text-muted-foreground uppercase tracking-wider">{sim.bandwidth}</span>
      <span className="text-muted-foreground">·</span>
      <span className="text-foreground tabular-nums">{sim.latency}ms</span>
    </div>
  );
}

function FeedHeader() {
  return (
    <div className="mb-4 pb-3 border-b border-border/40">
      <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">dashboard</div>
      <h4 className="text-base font-semibold text-foreground mt-0.5">Engineering Feed</h4>
    </div>
  );
}

function SkeletonFeed({ sim }: { sim: Simulation }) {
  const slow = sim.bandwidth === "slow" || sim.latency > 1000;
  return (
    <div className="space-y-3">
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex gap-3 p-3 rounded-lg bg-secondary/30 border border-border/40">
          <div className={`h-9 w-9 rounded-full ${slow ? "shimmer" : "bg-muted animate-pulse"}`} />
          <div className="flex-1 space-y-2">
            <div className={`h-2.5 w-1/3 rounded ${slow ? "shimmer" : "bg-muted animate-pulse"}`} />
            <div className={`h-2 w-full rounded ${slow ? "shimmer" : "bg-muted animate-pulse"}`} />
            <div className={`h-2 w-4/5 rounded ${slow ? "shimmer" : "bg-muted animate-pulse"}`} />
          </div>
        </div>
      ))}
      <div className="text-[10px] text-center text-muted-foreground pt-1">
        loading<span className="terminal-cursor" />
      </div>
    </div>
  );
}

function FeedList({ items, onRetryImage }: { items: FeedItem[]; onRetryImage: (id: number) => void }) {
  return (
    <ul className="space-y-2.5">
      {items.map((it) => (
        <li
          key={it.id}
          className="flex gap-3 p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 border border-border/40 hover:border-border transition-all animate-slide-up"
        >
          {it.imgOk ? (
            it.imgLoaded ? (
              <div
                className="h-9 w-9 rounded-full shrink-0 flex items-center justify-center text-xs font-bold text-primary-foreground animate-fade-in"
                style={{ background: `linear-gradient(135deg, oklch(0.7 0.15 ${(it.id * 60) % 360}), oklch(0.6 0.18 ${(it.id * 60 + 40) % 360}))` }}
              >
                {it.user.split(" ").map((s) => s[0]).join("")}
              </div>
            ) : (
              <div className="h-9 w-9 rounded-full shrink-0 shimmer" title="image loading…" />
            )
          ) : (
            <button
              onClick={() => onRetryImage(it.id)}
              title="retry image"
              className="h-9 w-9 rounded-full shrink-0 bg-destructive/10 border border-destructive/30 hover:bg-destructive/20 hover:border-destructive/60 flex items-center justify-center transition-all group"
            >
              <ImageOff className="h-3.5 w-3.5 text-destructive group-hover:hidden" />
              <RefreshCw className="h-3.5 w-3.5 text-destructive hidden group-hover:block" />
            </button>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-1.5">
              <span className="text-xs font-semibold text-foreground">{it.user}</span>
              <span className="text-[10px] text-muted-foreground">{it.handle}</span>
            </div>
            <p className="text-xs text-foreground/80 mt-0.5 leading-snug">{it.text}</p>
            <div className="text-[10px] text-muted-foreground mt-1.5 flex items-center gap-2">
              <span>♥ {it.metric}</span>
              {!it.imgOk && (
                <span className="text-destructive/80">· image failed — click avatar to retry</span>
              )}
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

function ErrorState({
  status,
  detail,
  onRetry,
}: {
  status: "error" | "notfound" | "timeout";
  detail: string;
  onRetry: () => void;
}) {
  const config = {
    error: { code: "500", title: "Server Error", color: "destructive" },
    notfound: { code: "404", title: "Not Found", color: "warning" },
    timeout: { code: "⛔", title: "Request Timeout", color: "destructive" },
  }[status];

  const tone = config.color;

  return (
    <div className="text-center py-8 animate-fade-in">
      <div
        className="mx-auto h-16 w-16 rounded-full flex items-center justify-center mb-4 border"
        style={{
          backgroundColor: `color-mix(in oklab, var(--${tone}) 12%, transparent)`,
          borderColor: `color-mix(in oklab, var(--${tone}) 35%, transparent)`,
          boxShadow: `0 0 25px color-mix(in oklab, var(--${tone}) 45%, transparent)`,
        }}
      >
        <AlertTriangle className="h-7 w-7" style={{ color: `var(--${tone})` }} />
      </div>
      <div className="text-3xl font-bold tabular-nums" style={{ color: `var(--${tone})` }}>{config.code}</div>
      <div className="text-sm font-semibold text-foreground mt-1">{config.title}</div>
      <p className="text-xs text-muted-foreground mt-2 max-w-xs mx-auto">{detail}</p>
      <button
        onClick={onRetry}
        className="mt-5 inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-md bg-primary/10 border border-primary/30 text-primary hover:bg-primary/20 hover:border-primary/60 transition-all"
      >
        <RefreshCw className="h-3 w-3" /> retry request
      </button>
    </div>
  );
}
