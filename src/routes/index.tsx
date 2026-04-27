import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useState } from "react";
import { useSimulation, type ApiScenario, type Bandwidth } from "@/hooks/useSimulation";
import { LabHeader } from "@/components/lab/LabHeader";
import { ControlPanel } from "@/components/lab/ControlPanel";
import { RequestQueue } from "@/components/lab/RequestQueue";
import { AppPreview } from "@/components/lab/AppPreview";
import { ConsolePanel } from "@/components/lab/ConsolePanel";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "netlab — Network & API Simulation Lab for Developers" },
      {
        name: "description",
        content:
          "Interactive browser-based simulator to test network latency, bandwidth, packet loss, and API responses (200/404/500/timeout) with a live app preview and console.",
      },
      { property: "og:title", content: "netlab — Network & API Simulation Lab" },
      {
        property: "og:description",
        content:
          "Tweak latency, bandwidth, packet loss and API scenarios. Watch a live app react in real time.",
      },
    ],
  }),
  component: Lab,
});

function Lab() {
  const sim = useSimulation();
  const [scenarioRunning, setScenarioRunning] = useState(false);

  const runScenario = useCallback(async () => {
    setScenarioRunning(true);
    sim.log({ level: "info", method: "SYS", url: "/scenario", message: "▶ test scenario started" });

    const steps: Array<{
      label: string;
      latency: number;
      bandwidth: Bandwidth;
      packetLoss: number;
      scenario: ApiScenario;
      wait: number;
    }> = [
      { label: "1/5 baseline fast",    latency: 80,   bandwidth: "fast",   packetLoss: 0,  scenario: "success",  wait: 1200 },
      { label: "2/5 slow 3G",          latency: 1200, bandwidth: "slow",   packetLoss: 5,  scenario: "delayed",  wait: 3500 },
      { label: "3/5 lossy network",    latency: 400,  bandwidth: "medium", packetLoss: 60, scenario: "success",  wait: 2200 },
      { label: "4/5 backend on fire",  latency: 300,  bandwidth: "fast",   packetLoss: 0,  scenario: "server",   wait: 2200 },
      { label: "5/5 timeout abyss",    latency: 200,  bandwidth: "medium", packetLoss: 0,  scenario: "timeout",  wait: 5500 },
    ];

    for (const step of steps) {
      sim.setLatency(step.latency);
      sim.setBandwidth(step.bandwidth);
      sim.setPacketLoss(step.packetLoss);
      sim.setScenario(step.scenario);
      sim.log({ level: "info", method: "SYS", url: "/scenario", message: `step ${step.label}` });
      // fire a request so the preview reacts
      sim.simulateRequest("/api/feed", "GET");
      await new Promise((r) => setTimeout(r, step.wait));
    }

    sim.log({ level: "success", method: "SYS", url: "/scenario", message: "✓ scenario complete" });
    setScenarioRunning(false);
  }, [sim]);

  return (
    <div className="relative min-h-screen">
      <LabHeader onReset={sim.reset} onRunScenario={runScenario} scenarioRunning={scenarioRunning} />

      <main className="relative z-10 mx-auto max-w-[1600px] px-6 py-6">
        <div className="grid grid-cols-12 gap-5">
          {/* Left: Controls */}
          <div className="col-span-12 lg:col-span-3 space-y-5">
            <ControlPanel sim={sim} />
            <RequestQueue sim={sim} />
            <StatsCard sim={sim} />
          </div>

          {/* Center: App Preview */}
          <div className="col-span-12 lg:col-span-4">
            <AppPreview sim={sim} />
          </div>

          {/* Right: Console */}
          <div className="col-span-12 lg:col-span-5">
            <ConsolePanel sim={sim} />
          </div>
        </div>

        <footer className="mt-8 pb-4 text-center text-[10px] text-muted-foreground tracking-wider uppercase">
          netlab · simulation lab · all requests are simulated client-side
        </footer>
      </main>
    </div>
  );
}

function StatsCard({ sim }: { sim: ReturnType<typeof useSimulation> }) {
  const total = sim.logs.filter((l) => l.status !== undefined).length;
  const ok = sim.logs.filter((l) => l.status === 200).length;
  const errs = sim.logs.filter((l) => typeof l.status === "number" && l.status >= 400).length;
  const timeouts = sim.logs.filter((l) => l.status === "TIMEOUT").length;
  const successRate = total > 0 ? Math.round((ok / total) * 100) : 0;

  return (
    <section className="glass rounded-xl p-4">
      <h3 className="text-xs font-semibold text-foreground tracking-tight mb-3">
        <span className="text-primary">▸</span> session_metrics
      </h3>
      <div className="grid grid-cols-2 gap-2">
        <Metric label="requests" value={total} tone="info" />
        <Metric label="success%" value={`${successRate}%`} tone="success" />
        <Metric label="errors" value={errs} tone="destructive" />
        <Metric label="timeouts" value={timeouts} tone="warning" />
      </div>
    </section>
  );
}

function Metric({ label, value, tone }: { label: string; value: number | string; tone: string }) {
  return (
    <div className="rounded-md p-2.5 bg-secondary/40 border border-border">
      <div className="text-lg font-bold tabular-nums" style={{ color: `var(--${tone})` }}>{value}</div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
    </div>
  );
}
