import { useEffect, useRef } from "react";
import type { LogEntry, Simulation } from "@/hooks/useSimulation";

const LEVEL_COLOR: Record<LogEntry["level"], string> = {
  info: "text-info",
  success: "text-success",
  warn: "text-warning",
  error: "text-destructive",
};

const fmtTime = (ts: number) => {
  const d = new Date(ts);
  return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}:${d.getSeconds().toString().padStart(2, "0")}`;
};

export function ConsolePanel({ sim }: { sim: Simulation }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight;
  }, [sim.logs]);

  // Filter logs to remove some spam if necessary, or just format them better
  // Let's format them simply.
  const displayLogs = sim.logs.filter(log => log.method !== "SYS" || log.message.includes("scenario"));

  return (
    <section className="glass rounded-xl flex flex-col h-full min-h-[500px]">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/60">
        <div className="flex items-center gap-2">
          <span className="flex gap-1">
            <span className="h-3 w-3 rounded-full bg-destructive/70" />
            <span className="h-3 w-3 rounded-full bg-warning/70" />
            <span className="h-3 w-3 rounded-full bg-success/70" />
          </span>
          <h3 className="text-sm font-semibold text-foreground tracking-tight ml-2">
            console <span className="text-muted-foreground font-normal text-xs">— app output</span>
          </h3>
        </div>
        <button
          onClick={sim.clearLogs}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors uppercase tracking-wider font-medium bg-secondary/50 px-2 py-1 rounded"
        >
          clear
        </button>
      </div>

      <div
        ref={ref}
        className="flex-1 overflow-y-auto p-4 space-y-2 font-mono text-sm leading-relaxed"
      >
        {displayLogs.length === 0 ? (
          <div className="text-muted-foreground py-2 flex items-center">
            <span className="text-primary mr-2">❯</span> 
            <span className="terminal-cursor">Waiting for activity...</span>
          </div>
        ) : (
          displayLogs.map((log) => {
            let statusBadge = null;
            if (log.status) {
               let badgeColor = "bg-secondary text-foreground";
               if (log.status === 200) badgeColor = "bg-success/20 text-success";
               if (log.status === 404) badgeColor = "bg-warning/20 text-warning";
               if (log.status === 500 || log.status === "TIMEOUT") badgeColor = "bg-destructive/20 text-destructive";
               
               statusBadge = (
                 <span className={`px-1.5 py-0.5 rounded text-xs font-bold ${badgeColor} shrink-0`}>
                   {log.status}
                 </span>
               );
            }

            return (
              <div key={log.id} className="flex flex-col gap-1 animate-fade-in hover:bg-secondary/30 rounded p-2 transition-colors border border-transparent hover:border-border/50">
                <div className="flex items-start gap-2">
                  <span className="text-muted-foreground/60 tabular-nums shrink-0 text-xs mt-0.5">[{fmtTime(log.ts)}]</span>
                  <span className={`shrink-0 uppercase font-bold text-xs mt-0.5 ${LEVEL_COLOR[log.level]}`}>
                    {log.level}
                  </span>
                  {statusBadge && <div className="mt-0.5">{statusBadge}</div>}
                  <span className="text-foreground/90 font-medium whitespace-pre-wrap leading-relaxed">{log.message}</span>
                </div>
                {log.url && log.method !== "SYS" && (
                  <div className="text-muted-foreground text-xs ml-20 flex gap-2">
                    <span className="text-accent font-semibold">{log.method}</span>
                    <span>{log.url}</span>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      <div className="px-4 py-2 border-t border-border/60 flex items-center justify-between text-xs text-muted-foreground bg-background/30">
        <span>{displayLogs.length} messages</span>
        <span className="flex items-center gap-1.5 font-medium">
          <span className="h-2 w-2 rounded-full bg-success animate-pulse" />
          Live
        </span>
      </div>
    </section>
  );
}
