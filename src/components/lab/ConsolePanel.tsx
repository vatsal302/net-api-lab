import { useEffect, useRef } from "react";
import type { LogEntry, Simulation } from "@/hooks/useSimulation";

const LEVEL_COLOR: Record<LogEntry["level"], string> = {
  info: "text-info",
  success: "text-success",
  warn: "text-warning",
  error: "text-destructive",
};

const STATUS_COLOR = (s?: number | "TIMEOUT" | "ERR") => {
  if (s === undefined) return "text-muted-foreground";
  if (s === 200) return "text-success";
  if (s === 404) return "text-warning";
  if (s === 500) return "text-destructive";
  return "text-destructive";
};

const fmtTime = (ts: number) => {
  const d = new Date(ts);
  return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}:${d.getSeconds().toString().padStart(2, "0")}.${d.getMilliseconds().toString().padStart(3, "0")}`;
};

export function ConsolePanel({ sim }: { sim: Simulation }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.scrollTop = 0;
  }, [sim.logs]);

  return (
    <section className="glass rounded-xl flex flex-col h-full min-h-[400px]">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/60">
        <div className="flex items-center gap-2">
          <span className="flex gap-1">
            <span className="h-2.5 w-2.5 rounded-full bg-destructive/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-warning/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-success/70" />
          </span>
          <h3 className="text-xs font-semibold text-foreground tracking-tight ml-2">
            console <span className="text-muted-foreground">— /var/log/netlab</span>
          </h3>
        </div>
        <button
          onClick={sim.clearLogs}
          className="text-[10px] text-muted-foreground hover:text-foreground transition-colors uppercase tracking-wider"
        >
          clear
        </button>
      </div>

      <div
        ref={ref}
        className="flex-1 overflow-y-auto p-3 space-y-1 font-mono text-[11px] leading-relaxed"
      >
        {sim.logs.length === 0 ? (
          <div className="text-muted-foreground py-2">
            <span className="text-primary">netlab@dev</span>:<span className="text-info">~</span>${" "}
            <span className="terminal-cursor">awaiting input</span>
          </div>
        ) : (
          sim.logs.map((log) => (
            <div key={log.id} className="flex gap-2 animate-fade-in hover:bg-secondary/30 rounded px-1 -mx-1 transition-colors">
              <span className="text-muted-foreground/60 tabular-nums shrink-0">{fmtTime(log.ts)}</span>
              <span className={`shrink-0 uppercase ${LEVEL_COLOR[log.level]}`}>
                [{log.level}]
              </span>
              <span className="text-accent shrink-0">{log.method}</span>
              <span className="text-muted-foreground shrink-0 truncate max-w-[180px]">{log.url}</span>
              {log.status !== undefined && (
                <span className={`shrink-0 tabular-nums ${STATUS_COLOR(log.status)}`}>
                  {log.status}
                </span>
              )}
              <span className="text-foreground/90 truncate">{log.message}</span>
            </div>
          ))
        )}
      </div>

      <div className="px-4 py-2 border-t border-border/60 flex items-center justify-between text-[10px] text-muted-foreground">
        <span>{sim.logs.length} entries</span>
        <span className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
          streaming
        </span>
      </div>
    </section>
  );
}
