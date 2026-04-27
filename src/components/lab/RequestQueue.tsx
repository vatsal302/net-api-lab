import type { Simulation } from "@/hooks/useSimulation";

export function RequestQueue({ sim }: { sim: Simulation }) {
  // tick is read to force re-render for progress
  void sim.tick;

  return (
    <section className="glass rounded-xl p-4 scanline">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-semibold text-foreground tracking-tight">
          <span className="text-primary">▸</span> request_queue
        </h3>
        <span className="text-[10px] text-muted-foreground tabular-nums">
          {sim.pending.length} in flight
        </span>
      </div>

      {sim.pending.length === 0 ? (
        <div className="text-[11px] text-muted-foreground py-3 text-center border border-dashed border-border/60 rounded-md">
          no pending requests · queue idle
        </div>
      ) : (
        <ul className="space-y-2">
          {sim.pending.map((req) => {
            const elapsed = Date.now() - req.startedAt;
            const pct = Math.min(99, (elapsed / req.expectedMs) * 100);
            return (
              <li key={req.id} className="space-y-1">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-muted-foreground truncate font-mono">{req.url}</span>
                  <span className="text-primary tabular-nums">{Math.round(elapsed)}ms</span>
                </div>
                <div className="h-1 bg-input rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-primary to-accent transition-[width] duration-100"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
