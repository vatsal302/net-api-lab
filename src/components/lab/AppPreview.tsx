import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, RefreshCw, Smartphone, Monitor, Wifi, WifiOff, Loader2 } from "lucide-react";
import type { Simulation, SimResult } from "@/hooks/useSimulation";

type ViewMode = "desktop" | "mobile";

interface FeedItem {
  id: number;
  title: string;
  text: string;
  failedDueToPacketLoss: boolean;
}

const SAMPLE_DATA: Omit<FeedItem, "failedDueToPacketLoss">[] = [
  { id: 1, title: "Post 1", text: "This is a simple content block to test API response." },
  { id: 2, title: "Post 2", text: "Here is another simple post in the feed." },
  { id: 3, title: "Post 3", text: "Testing latency and packet loss effects on this item." },
  { id: 4, title: "Post 4", text: "Final post for the feed preview display." },
];

type Status = "idle" | "loading" | "success" | "error" | "timeout" | "notfound";

export function AppPreview({ sim }: { sim: Simulation }) {
  const [view, setView] = useState<ViewMode>("desktop");
  const [status, setStatus] = useState<Status>("idle");
  const [items, setItems] = useState<FeedItem[]>([]);
  const [attempts, setAttempts] = useState(0);

  const fetchFeed = useCallback(async () => {
    setStatus("loading");
    setAttempts((a) => a + 1);
    
    const res: SimResult = await sim.simulateRequest("/api/feed", "GET");

    if (res.status === 200) {
      // Apply packet loss to individual posts
      const data: FeedItem[] = SAMPLE_DATA.map((it) => {
        const failedDueToPacketLoss = Math.random() * 100 < sim.packetLoss;
        return { ...it, failedDueToPacketLoss };
      });
      setItems(data);
      setStatus("success");
    } else if (res.status === 404) {
      setStatus("notfound");
    } else if (res.status === "TIMEOUT") {
      setStatus("timeout");
    } else {
      setStatus("error");
    }
  }, [sim]);

  // initial fetch on mount
  useEffect(() => {
    fetchFeed();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isMobile = view === "mobile";

  return (
    <section className="glass rounded-xl overflow-hidden flex flex-col h-full min-h-[500px]">
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
      <div className="flex-1 p-6 bg-gradient-to-b from-background/20 to-background/60 flex justify-center items-start overflow-y-auto">
        <div
          className={`w-full transition-all duration-300 ${
            isMobile ? "max-w-[320px] border border-border/60 rounded-2xl p-4 bg-card/50" : ""
          }`}
        >
          <FeedHeader />

          {status === "loading" && (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin mb-4" />
              <p className="text-sm">Loading feed...</p>
            </div>
          )}
          
          {status === "success" && <FeedList items={items} />}
          
          {status === "notfound" && (
            <div className="text-center py-12 text-warning">
              <h4 className="text-lg font-bold">Data Not Found (404)</h4>
              <p className="text-sm mt-2">The requested feed could not be found.</p>
            </div>
          )}
          
          {status === "error" && (
            <div className="text-center py-12 text-destructive">
              <h4 className="text-lg font-bold">Server Error (500)</h4>
              <p className="text-sm mt-2 mb-4">An error occurred while fetching data.</p>
              <button
                onClick={fetchFeed}
                className="px-4 py-2 bg-destructive/10 text-destructive border border-destructive/30 rounded-md hover:bg-destructive/20 text-sm font-medium"
              >
                Retry
              </button>
            </div>
          )}
          
          {status === "timeout" && (
            <div className="text-center py-12 text-destructive">
              <h4 className="text-lg font-bold">Request Timeout</h4>
              <p className="text-sm mt-2 mb-4">The server took too long to respond.</p>
              <button
                onClick={fetchFeed}
                className="px-4 py-2 bg-destructive/10 text-destructive border border-destructive/30 rounded-md hover:bg-destructive/20 text-sm font-medium"
              >
                Retry
              </button>
            </div>
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
      <h4 className="text-base font-semibold text-foreground mt-0.5">Content Feed</h4>
    </div>
  );
}

function FeedList({ items }: { items: FeedItem[] }) {
  return (
    <div className="space-y-4">
      {items.map((it) => (
        <div
          key={it.id}
          className="p-4 rounded-md bg-secondary/30 border border-border/40"
        >
          {it.failedDueToPacketLoss ? (
            <div className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm font-medium">Failed to load content due to packet loss</span>
            </div>
          ) : (
            <div>
              <h5 className="font-semibold text-foreground mb-1">{it.title}</h5>
              <p className="text-sm text-foreground/80">{it.text}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

