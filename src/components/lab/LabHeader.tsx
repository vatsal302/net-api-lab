import { Activity } from "lucide-react";

export function LabHeader({ onReset, onRunScenario, scenarioRunning }: {
  onReset: () => void;
  onRunScenario: () => void;
  scenarioRunning: boolean;
}) {
  return (
    <header className="relative z-10 border-b border-border/60 backdrop-blur-xl bg-background/40">
      <div className="mx-auto max-w-[1600px] px-6 py-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="h-9 w-9 rounded-md glass flex items-center justify-center glow-primary">
              <Activity className="h-4 w-4 text-primary" strokeWidth={2.5} />
            </div>
            <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-success animate-pulse-glow" />
          </div>
          <div>
            <h1 className="text-sm font-semibold tracking-tight text-foreground">
              <span className="text-muted-foreground">$</span> netlab
              <span className="text-primary">::</span>simulator
            </h1>
            <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              Network · API · Latency Testing Lab
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onRunScenario}
            disabled={scenarioRunning}
            className="px-3 py-1.5 text-xs font-medium rounded-md bg-primary/10 text-primary border border-primary/30 hover:bg-primary/20 hover:border-primary/60 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {scenarioRunning ? "▸ running..." : "▶ run test scenario"}
          </button>
          <button
            onClick={onReset}
            className="px-3 py-1.5 text-xs font-medium rounded-md bg-secondary/60 text-secondary-foreground border border-border hover:bg-secondary transition-all"
          >
            ↻ reset
          </button>
        </div>
      </div>
    </header>
  );
}
