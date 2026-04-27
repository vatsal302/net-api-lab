import { useCallback, useEffect, useRef, useState } from "react";

export type ApiScenario = "success" | "delayed" | "notfound" | "server" | "timeout";
export type Bandwidth = "fast" | "medium" | "slow";
export type LogLevel = "info" | "success" | "warn" | "error";

export interface LogEntry {
  id: string;
  ts: number;
  level: LogLevel;
  method: string;
  url: string;
  message: string;
  durationMs?: number;
  status?: number | "TIMEOUT" | "ERR";
  attempt?: number;
}

export interface PendingRequest {
  id: string;
  url: string;
  startedAt: number;
  expectedMs: number;
}

export interface SimResult {
  ok: boolean;
  status: number | "TIMEOUT" | "ERR";
  durationMs: number;
  packetLost: boolean;
}

const BANDWIDTH_MULT: Record<Bandwidth, number> = {
  fast: 1,
  medium: 2.2,
  slow: 4.5,
};

const SCENARIO_LABEL: Record<ApiScenario, string> = {
  success: "200 OK",
  delayed: "200 OK (delayed)",
  notfound: "404 Not Found",
  server: "500 Internal Error",
  timeout: "TIMEOUT",
};

let _id = 0;
const uid = () => `${Date.now().toString(36)}-${(_id++).toString(36)}`;

export interface SimState {
  latency: number;
  bandwidth: Bandwidth;
  packetLoss: number;
  scenario: ApiScenario;
}

export function useSimulation() {
  const [latency, setLatency] = useState(120);
  const [bandwidth, setBandwidth] = useState<Bandwidth>("fast");
  const [packetLoss, setPacketLoss] = useState(0);
  const [scenario, setScenario] = useState<ApiScenario>("success");

  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [pending, setPending] = useState<PendingRequest[]>([]);
  const [tick, setTick] = useState(0);

  const stateRef = useRef<SimState>({ latency, bandwidth, packetLoss, scenario });
  useEffect(() => {
    stateRef.current = { latency, bandwidth, packetLoss, scenario };
  }, [latency, bandwidth, packetLoss, scenario]);

  // tick for pending progress bars
  useEffect(() => {
    const i = setInterval(() => setTick((t) => t + 1), 80);
    return () => clearInterval(i);
  }, []);

  const log = useCallback((entry: Omit<LogEntry, "id" | "ts">) => {
    setLogs((l) => {
      const next = [...l, { id: uid(), ts: Date.now(), ...entry }];
      return next.length > 200 ? next.slice(next.length - 200) : next;
    });
  }, []);

  const computeDuration = (s: SimState) => {
    const base = s.latency * BANDWIDTH_MULT[s.bandwidth];
    const jitter = base * (Math.random() * 0.25);
    let extra = 0;
    if (s.scenario === "delayed") extra = 1500 + Math.random() * 1200;
    if (s.scenario === "timeout") extra = 5000;
    return Math.round(base + jitter + extra);
  };

  const simulateRequest = useCallback(
    (url: string, method = "GET"): Promise<SimResult> => {
      const s = stateRef.current;
      const id = uid();
      const duration = computeDuration(s);
      const expectedMs = s.scenario === "timeout" ? 5000 : duration;

      const getLatencyText = (l: number) => {
        if (l < 400) return `${l} ms (Normal)`;
        if (l < 800) return `${l} ms (High delay)`;
        if (l < 1500) return `${l} ms (Very high)`;
        return `${l} ms (Extreme)`;
      };

      const getLossText = (l: number) => {
        if (l === 0) return `0% (Perfect)`;
        if (l <= 10) return `${l}% (Minor issues possible)`;
        if (l <= 20) return `${l}% (Stable/Acceptable)`;
        if (l <= 40) return `${l}% (Unstable)`;
        return `${l}% (Unstable connection)`;
      };

      const getBandwidthText = (bw: string) => {
        if (bw === "fast") return "Fast";
        if (bw === "medium") return "Medium speed";
        return "Slow";
      };

      const networkStatus = `Network Status:
Latency: ${getLatencyText(s.latency)}
Bandwidth: ${getBandwidthText(s.bandwidth)}
Packet Loss: ${getLossText(s.packetLoss)}`;

      log({
        level: "info",
        method,
        url,
        message: `Request Sent\nConnecting to server...\n\n${networkStatus}\n\nFetching data...`,
      });

      setPending((p) => [...p, { id, url, startedAt: Date.now(), expectedMs }]);

      return new Promise((resolve) => {
        setTimeout(() => {
          setPending((p) => p.filter((r) => r.id !== id));

          const lost = Math.random() * 100 < s.packetLoss;
          if (lost) {
            log({
              level: "warn",
              method,
              url,
              status: "ERR",
              durationMs: duration,
              message: `⚠ Network instability detected\n\n✔ Request Partially Completed\nSome data could not be loaded\n\nStatus: Partial Success`,
            });
            return resolve({ ok: false, status: "ERR", durationMs: duration, packetLost: true });
          }

          if (s.scenario === "timeout") {
            log({
              level: "error",
              method,
              url,
              status: "TIMEOUT",
              durationMs: 5000,
              message: `⌛ Request Timed Out\n\nThe server took too long to respond\nThis may be due to high latency\n\nPlease retry the request\n[ Retry ]`,
            });
            return resolve({ ok: false, status: "TIMEOUT", durationMs: 5000, packetLost: false });
          }
          if (s.scenario === "notfound") {
            log({
              level: "warn",
              method,
              url,
              status: 404,
              durationMs: duration,
              message: `✖ Request Failed\nStatus Code: 404 Not Found\n\nResource missing on server\n\nPlease try again\n[ Retry ]`,
            });
            return resolve({ ok: false, status: 404, durationMs: duration, packetLost: false });
          }
          if (s.scenario === "server") {
            log({
              level: "error",
              method,
              url,
              status: 500,
              durationMs: duration,
              message: `✖ Request Failed\nStatus Code: 500 Server Error\n\nPossible reasons:\n- Server issue\n- Poor network conditions\n\nPlease try again\n[ Retry ]`,
            });
            return resolve({ ok: false, status: 500, durationMs: duration, packetLost: false });
          }

          if (duration > 800) {
            log({
              level: "success",
              method,
              url,
              status: 200,
              durationMs: duration,
              message: `Slow network detected\nLoading may take longer than usual...\n\n✔ Request Completed\nStatus Code: 200 OK\nResponse Time: ${duration} ms\n\nData loaded successfully`,
            });
          } else {
            log({
              level: "success",
              method,
              url,
              status: 200,
              durationMs: duration,
              message: `✔ Request Completed Successfully\nStatus Code: 200 OK\nResponse Time: ${duration} ms\n\nAll data loaded correctly\nDisplaying latest posts`,
            });
          }
          resolve({ ok: true, status: 200, durationMs: duration, packetLost: false });
        }, expectedMs);
      });
    },
    [log],
  );

  const reset = useCallback(() => {
    setLatency(120);
    setBandwidth("fast");
    setPacketLoss(0);
    setScenario("success");
    setLogs([]);
    setPending([]);
    log({ level: "info", method: "SYS", url: "/simulator", message: "↻ simulation reset to defaults" });
  }, [log]);

  const clearLogs = useCallback(() => setLogs([]), []);

  return {
    // state
    latency, setLatency,
    bandwidth, setBandwidth,
    packetLoss, setPacketLoss,
    scenario, setScenario,
    logs, pending, tick,
    // actions
    simulateRequest, log, reset, clearLogs,
  };
}

export type Simulation = ReturnType<typeof useSimulation>;
