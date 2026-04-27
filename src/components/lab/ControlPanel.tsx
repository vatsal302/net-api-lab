import type { ApiScenario, Bandwidth, Simulation } from "@/hooks/useSimulation";
import { CheckCircle2, Clock, XCircle, Zap, Ban } from "lucide-react";

const SCENARIOS: Array<{
  id: ApiScenario;
  label: string;
  hint: string;
  Icon: React.ComponentType<{ className?: string }>;
  tone: string;
}> = [
  { id: "success", label: "200 Success", hint: "happy path", Icon: CheckCircle2, tone: "success" },
  { id: "delayed", label: "Delayed", hint: "+1.5–2.7s", Icon: Clock, tone: "warning" },
  { id: "notfound", label: "404 Not Found", hint: "missing resource", Icon: XCircle, tone: "warning" },
  { id: "server", label: "500 Server Error", hint: "backend exploded", Icon: Zap, tone: "destructive" },
  { id: "timeout", label: "Timeout", hint: "5000ms hang", Icon: Ban, tone: "destructive" },
];

const BANDWIDTHS: Bandwidth[] = ["fast", "medium", "slow"];

export function ControlPanel({ sim }: { sim: Simulation }) {
  return (
    <section className="glass rounded-xl p-5 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-foreground tracking-tight">
            <span className="text-primary">▸</span> control_panel
          </h2>
          <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mt-0.5">
            input · simulation parameters
          </p>
        </div>
        <span className="text-[10px] px-2 py-0.5 rounded bg-success/10 text-success border border-success/30">
          LIVE
        </span>
      </div>

      {/* Latency */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <label className="text-muted-foreground uppercase tracking-wider">latency</label>
          <span className="font-bold text-primary tabular-nums">{sim.latency}ms</span>
        </div>
        <input
          type="range"
          min={0}
          max={2000}
          step={10}
          value={sim.latency}
          onChange={(e) => sim.setLatency(Number(e.target.value))}
          className="w-full h-1.5 bg-input rounded-full appearance-none cursor-pointer accent-primary
            [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4
            [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary
            [&::-webkit-slider-thumb]:shadow-[0_0_12px_var(--primary)] [&::-webkit-slider-thumb]:cursor-grab
            [&::-webkit-slider-thumb]:transition-transform hover:[&::-webkit-slider-thumb]:scale-125"
        />
        <div className="flex justify-between text-[10px] text-muted-foreground">
          <span>0ms</span><span>500</span><span>1000</span><span>1500</span><span>2000ms</span>
        </div>
      </div>

      {/* Bandwidth */}
      <div className="space-y-2">
        <label className="text-xs text-muted-foreground uppercase tracking-wider">bandwidth</label>
        <div className="grid grid-cols-3 gap-2">
          {BANDWIDTHS.map((b) => (
            <button
              key={b}
              onClick={() => sim.setBandwidth(b)}
              className={`px-3 py-2 text-xs font-medium rounded-md border transition-all ${
                sim.bandwidth === b
                  ? "bg-primary/15 border-primary text-primary glow-primary"
                  : "bg-secondary/40 border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
              }`}
            >
              {b}
            </button>
          ))}
        </div>
      </div>

      {/* Packet loss */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <label className="text-muted-foreground uppercase tracking-wider">packet_loss</label>
          <span className={`font-bold tabular-nums ${sim.packetLoss > 30 ? "text-destructive" : sim.packetLoss > 0 ? "text-warning" : "text-muted-foreground"}`}>
            {sim.packetLoss}%
          </span>
        </div>
        <input
          type="range"
          min={0}
          max={100}
          step={5}
          value={sim.packetLoss}
          onChange={(e) => sim.setPacketLoss(Number(e.target.value))}
          className="w-full h-1.5 bg-input rounded-full appearance-none cursor-pointer
            [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4
            [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-destructive
            [&::-webkit-slider-thumb]:shadow-[0_0_12px_var(--destructive)] [&::-webkit-slider-thumb]:cursor-grab
            [&::-webkit-slider-thumb]:transition-transform hover:[&::-webkit-slider-thumb]:scale-125"
        />
      </div>

      {/* Scenario */}
      <div className="space-y-2">
        <label className="text-xs text-muted-foreground uppercase tracking-wider">api_response</label>
        <div className="grid grid-cols-1 gap-1.5">
          {SCENARIOS.map(({ id, label, hint, Icon, tone }) => {
            const active = sim.scenario === id;
            const activeStyle = active
              ? {
                  color: `var(--${tone})`,
                  borderColor: `color-mix(in oklab, var(--${tone}) 60%, transparent)`,
                  backgroundColor: `color-mix(in oklab, var(--${tone}) 12%, transparent)`,
                  boxShadow: `0 0 18px color-mix(in oklab, var(--${tone}) 35%, transparent)`,
                }
              : undefined;
            return (
              <button
                key={id}
                onClick={() => sim.setScenario(id)}
                className={`flex items-center gap-3 px-3 py-2 rounded-md border text-left transition-all group ${
                  active
                    ? ""
                    : "bg-secondary/30 border-border text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
                }`}
                style={activeStyle}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium">{label}</div>
                  <div className="text-[10px] opacity-70">{hint}</div>
                </div>
                {active && <span className="text-[10px]">●</span>}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
